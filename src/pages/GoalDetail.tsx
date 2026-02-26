import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Minus } from 'lucide-react'
import { db } from '../db'
import { calcPace, statusLabel, statusColor, statusBg } from '../lib/pace'
import { getEffectiveDates } from '../lib/repeat'
import { Sparkline } from '../components/Sparkline'

export function GoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const goalId = Number(id)

  const goal = useLiveQuery(() => db.goals.get(goalId), [goalId])

  const dates = goal ? getEffectiveDates(goal) : null
  const records = useLiveQuery(
    () =>
      dates
        ? db.records
            .where('goalId')
            .equals(goalId)
            .and(r => r.date >= dates.startDate && r.date <= dates.endDate)
            .reverse()
            .sortBy('createdAt')
        : [],
    [goalId, dates?.startDate, dates?.endDate],
  )

  const totalDone = records?.reduce((s, r) => s + r.count, 0) ?? 0
  const pace = dates ? calcPace(goal!.targetCount, totalDone, dates.startDate, dates.endDate) : null

  // Sparkline: last 14 days
  const spark = useLiveQuery(() => {
    const days: string[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().slice(0, 10))
    }
    return db.records
      .where('goalId')
      .equals(goalId)
      .and(r => days.includes(r.date))
      .toArray()
      .then(recs =>
        days.map(day => recs.filter(r => r.date === day).reduce((s, r) => s + r.count, 0)),
      )
  }, [goalId])

  const handleIncrement = async () => {
    const today = new Date().toISOString().slice(0, 10)
    await db.records.add({ goalId, count: 1, date: today, createdAt: Date.now() })
  }

  const handleDeleteRecord = async (recordId: number) => {
    await db.records.delete(recordId)
  }

  if (!goal || !pace) {
    return (
      <div className="flex items-center justify-center min-h-full text-[var(--color-text-secondary)]">
        読み込み中...
      </div>
    )
  }

  // Group records by date
  const grouped = new Map<string, typeof records>()
  for (const rec of records ?? []) {
    const arr = grouped.get(rec.date) ?? []
    arr.push(rec)
    grouped.set(rec.date, arr)
  }

  return (
    <div className="min-h-full pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/80 backdrop-blur-md px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold truncate flex-1">{goal.name}</h1>
        <button
          onClick={() => navigate(`/edit/${goal.id}`)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
        >
          <Pencil size={16} />
        </button>
      </header>

      <div className="px-4 space-y-5">
        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${statusBg[pace.status]}`}
          >
            {statusLabel[pace.status]}
          </span>
          {pace.remaining <= 0 && (
            <span className="text-sm font-semibold text-emerald-500">達成!</span>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[var(--color-text-secondary)]">進捗</span>
            <span className="font-semibold">
              {totalDone} / {goal.targetCount}
            </span>
          </div>
          <div className="w-full h-3 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusBg[pace.status]}`}
              style={{ width: `${pace.progress * 100}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="残り回数" value={pace.remaining} />
          <StatBox label="残り日数" value={`${pace.remainingDays}日`} />
          <StatBox
            label="現在のペース"
            value={`${pace.currentPace}/日`}
            className={statusColor[pace.status]}
          />
          <StatBox label="必要ペース" value={`${pace.dailyNeeded}/日`} />
        </div>

        {/* Sparkline */}
        {spark && (
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              直近14日間
            </h3>
            <div className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]">
              <Sparkline data={spark} width={280} height={48} />
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">記録履歴</h3>
          {grouped.size === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] py-4 text-center">
              まだ記録がありません
            </p>
          )}
          <div className="space-y-2">
            {[...grouped.entries()].map(([date, recs]) => (
              <div
                key={date}
                className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{formatDate(date)}</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {recs!.reduce((s, r) => s + r.count, 0)} 回
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recs!.map(rec => (
                    <button
                      key={rec.id}
                      onClick={() => handleDeleteRecord(rec.id!)}
                      className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-[var(--color-border)] text-[var(--color-text-secondary)] active:bg-red-100 active:text-red-500 transition-colors"
                    >
                      <Minus size={10} />
                      {rec.count}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating increment button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20">
        <button
          onClick={handleIncrement}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold shadow-xl active:scale-95 transition-transform"
        >
          <Plus size={20} /> 記録する
        </button>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  className = '',
}: {
  label: string
  value: string | number
  className?: string
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]">
      <div className="text-xs text-[var(--color-text-secondary)] mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${className}`}>{value}</div>
    </div>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})`
}
