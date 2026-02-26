import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, MessageSquare, Trophy, XCircle } from 'lucide-react'
import { type TrackingRecord, updateGoal } from '../db'
import { calcPace, statusLabel, statusDescription, statusColor, statusBg } from '../lib/pace'
import { getEffectiveDates } from '../lib/repeat'
import { Sparkline } from '../components/Sparkline'
import { AddRecordModal } from '../components/AddRecordModal'
import { RecordEditModal } from '../components/RecordEditModal'
import { useGoal, useRecordsByGoal } from '../hooks/useFirestoreQuery'

export function GoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const goalId = id!
  const [showAdd, setShowAdd] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TrackingRecord | null>(null)

  const goal = useGoal(goalId)
  const dates = goal ? getEffectiveDates(goal) : null
  const allRecords = useRecordsByGoal(goalId)
  const records = allRecords && dates
    ? allRecords
        .filter(r => r.date >= dates.startDate && r.date <= dates.endDate)
        .sort((a, b) => b.createdAt - a.createdAt)
    : undefined

  const totalDone = records?.reduce((s, r) => s + r.count, 0) ?? 0
  const pace = goal && dates ? calcPace(goal.targetCount, totalDone, dates.startDate, dates.endDate) : null

  // Sparkline: last 14 days
  const spark = (() => {
    if (!allRecords) return null
    const days: string[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
    return days.map(day =>
      allRecords.filter(r => r.date === day).reduce((s, r) => s + r.count, 0),
    )
  })()

  const handleMarkResult = async (result: 'active' | 'completed' | 'missed') => {
    await updateGoal(goalId, { result })
  }

  if (!goal || !pace) {
    return (
      <div className="flex items-center justify-center min-h-full text-[var(--color-text-secondary)]">
        読み込み中...
      </div>
    )
  }

  const unit = goal.unit || '回'
  const isFinished = goal.result === 'completed' || goal.result === 'missed'

  // Group records by date
  const grouped = new Map<string, TrackingRecord[]>()
  for (const rec of records ?? []) {
    const arr = grouped.get(rec.date) ?? []
    arr.push(rec)
    grouped.set(rec.date, arr)
  }

  // Prediction message
  const predictionMsg = (() => {
    if (pace.remaining <= 0) return '目標を達成しました！'
    if (!pace.predictedEndDate) return 'まだ記録がありません。最初の一歩を踏み出しましょう。'
    const endD = new Date(goal.endDate + 'T23:59:59')
    const predD = new Date(pace.predictedEndDate + 'T00:00:00')
    if (predD <= endD) {
      return `このペースなら ${formatDateShort(pace.predictedEndDate)} 頃に達成見込みです。`
    }
    return `このペースだと期限に間に合いません。1日あたり ${pace.dailyNeeded}${unit} が必要です。`
  })()

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
        {/* Result badge for finished goals */}
        {isFinished && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
            goal.result === 'completed'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-red-400/10 text-red-400'
          }`}>
            {goal.result === 'completed' ? <Trophy size={18} /> : <XCircle size={18} />}
            <span className="font-semibold text-sm">
              {goal.result === 'completed' ? '達成！' : '未達成'}
            </span>
            <button
              onClick={() => handleMarkResult('active')}
              className="ml-auto text-xs underline opacity-60"
            >
              取消
            </button>
          </div>
        )}

        {/* Status badge + description */}
        {!isFinished && (
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${statusBg[pace.status]}`}>
                {statusLabel[pace.status]}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {statusDescription[pace.status]}
            </p>
          </div>
        )}

        {/* Prediction */}
        <div className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]">
          <p className={`text-sm font-medium ${pace.remaining <= 0 ? 'text-emerald-500' : statusColor[pace.status]}`}>
            {predictionMsg}
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[var(--color-text-secondary)]">進捗</span>
            <span className="font-semibold">
              {totalDone} / {goal.targetCount} {unit}
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
          <StatBox label="残り" value={`${pace.remaining} ${unit}`} />
          <StatBox label="残り日数" value={`${pace.remainingDays}日`} />
          <StatBox
            label="現在のペース"
            value={`${pace.currentPace}${unit}/日`}
            className={statusColor[pace.status]}
          />
          <StatBox label="必要ペース" value={`${pace.dailyNeeded}${unit}/日`} />
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

        {/* Mark completed/missed */}
        {!isFinished && pace.isOverdue && (
          <div className="flex gap-2">
            <button
              onClick={() => handleMarkResult('completed')}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            >
              <Trophy size={15} /> 達成
            </button>
            <button
              onClick={() => handleMarkResult('missed')}
              className="flex-1 py-2.5 rounded-xl bg-red-400 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            >
              <XCircle size={15} /> 未達成
            </button>
          </div>
        )}
        {!isFinished && !pace.isOverdue && pace.remaining <= 0 && (
          <button
            onClick={() => handleMarkResult('completed')}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
          >
            <Trophy size={15} /> 目標達成としてマーク
          </button>
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
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{formatDate(date)}</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    +{recs.reduce((s, r) => s + r.count, 0)} {unit}
                  </span>
                </div>
                <div className="space-y-1">
                  {recs.map(rec => (
                    <button
                      key={rec.id}
                      onClick={() => setEditingRecord(rec)}
                      className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors"
                    >
                      <span className="text-xs font-semibold text-[var(--color-primary)]">
                        +{rec.count}
                      </span>
                      {rec.memo && (
                        <span className="flex items-center gap-0.5 text-xs text-[var(--color-text-secondary)] truncate">
                          <MessageSquare size={10} />
                          {rec.memo}
                        </span>
                      )}
                      <Pencil size={10} className="ml-auto text-[var(--color-text-secondary)] opacity-40 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating add button */}
      {!isFinished && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold shadow-xl active:scale-95 transition-transform"
          >
            <Plus size={20} /> 記録する
          </button>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddRecordModal goalId={goalId} unit={unit} onClose={() => setShowAdd(false)} />
      )}
      <RecordEditModal record={editingRecord} onClose={() => setEditingRecord(null)} />
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

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
