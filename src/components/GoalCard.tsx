import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, ChevronRight, Trophy, XCircle } from 'lucide-react'
import { db, type Goal } from '../db'
import { calcPace, statusLabel, statusColor, statusBg } from '../lib/pace'
import { getEffectiveDates } from '../lib/repeat'
import { Sparkline } from './Sparkline'

interface Props {
  goal: Goal
  onNavigate: (id: number) => void
}

export function GoalCard({ goal, onNavigate }: Props) {
  const { startDate, endDate } = getEffectiveDates(goal)
  const unit = goal.unit || '回'
  const isFinished = goal.result === 'completed' || goal.result === 'missed'

  const records = useLiveQuery(
    () =>
      db.records
        .where('goalId')
        .equals(goal.id!)
        .and(r => r.date >= startDate && r.date <= endDate)
        .toArray(),
    [goal.id, startDate, endDate],
  )

  const totalDone = records?.reduce((s, r) => s + r.count, 0) ?? 0
  const pace = calcPace(goal.targetCount, totalDone, startDate, endDate)

  // Sparkline: last 7 days
  const last7 = useLiveQuery(() => {
    const days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().slice(0, 10))
    }
    return db.records
      .where('goalId')
      .equals(goal.id!)
      .and(r => days.includes(r.date))
      .toArray()
      .then(recs => {
        return days.map(day => recs.filter(r => r.date === day).reduce((s, r) => s + r.count, 0))
      })
  }, [goal.id])

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const today = new Date().toISOString().slice(0, 10)
    await db.records.add({
      goalId: goal.id!,
      count: 1,
      date: today,
      memo: '',
      createdAt: Date.now(),
    })
  }

  return (
    <div
      onClick={() => onNavigate(goal.id!)}
      className={`bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] active:scale-[0.98] transition-transform cursor-pointer ${
        isFinished ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base truncate">{goal.name}</h3>
            {goal.result === 'completed' && <Trophy size={14} className="text-emerald-500 shrink-0" />}
            {goal.result === 'missed' && <XCircle size={14} className="text-red-400 shrink-0" />}
          </div>
          {isFinished ? (
            <span className={`text-sm font-medium ${goal.result === 'completed' ? 'text-emerald-500' : 'text-red-400'}`}>
              {goal.result === 'completed' ? '達成' : '未達成'}
            </span>
          ) : (
            <span className={`text-sm font-medium ${statusColor[pace.status]}`}>
              {statusLabel[pace.status]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          {!isFinished && (
            <button
              onClick={handleIncrement}
              className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg"
            >
              <Plus size={20} />
            </button>
          )}
          <ChevronRight size={18} className="text-[var(--color-text-secondary)]" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[var(--color-border)] rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFinished
              ? goal.result === 'completed' ? 'bg-emerald-500' : 'bg-red-400'
              : statusBg[pace.status]
          }`}
          style={{ width: `${pace.progress * 100}%` }}
        />
      </div>

      <div className="flex items-end justify-between">
        <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
          <div>
            <span className="text-lg font-bold text-[var(--color-text)]">{totalDone}</span>
            <span className="ml-0.5">/ {goal.targetCount} {unit}</span>
          </div>
          {!isFinished && (
            <div>
              残り <span className="font-semibold text-[var(--color-text)]">{pace.remainingDays}</span> 日
            </div>
          )}
        </div>
        {last7 && <Sparkline data={last7} />}
      </div>
    </div>
  )
}
