import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Moon, Sun, Download, Upload, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { GoalCard } from '../components/GoalCard'
import { calcPace } from '../lib/pace'
import { getEffectiveDates } from '../lib/repeat'
import { exportJSON, exportCSV, importJSON } from '../lib/export'

interface Props {
  dark: boolean
  toggleDark: () => void
}

export function Home({ dark, toggleDark }: Props) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const goals = useLiveQuery(() => db.goals.orderBy('createdAt').toArray())
  const allRecords = useLiveQuery(() => db.records.toArray())

  // 今日やるべき回数のサマリー
  const todaySummary = (() => {
    if (!goals || !allRecords) return null
    let totalNeeded = 0
    for (const goal of goals) {
      const { startDate, endDate } = getEffectiveDates(goal)
      const recs = allRecords.filter(
        r => r.goalId === goal.id && r.date >= startDate && r.date <= endDate,
      )
      const done = recs.reduce((s, r) => s + r.count, 0)
      const pace = calcPace(goal.targetCount, done, startDate, endDate)
      totalNeeded += Math.max(0, Math.ceil(pace.dailyNeeded))
    }
    return totalNeeded
  })()

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importJSON(file)
      setMenuOpen(false)
    } catch {
      alert('ファイルの読み込みに失敗しました')
    }
    e.target.value = ''
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/80 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Pace Tracker</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDark}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-30 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden">
                    <button
                      onClick={() => { exportCSV(); setMenuOpen(false) }}
                      className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-border)] transition-colors"
                    >
                      <Download size={15} /> CSVエクスポート
                    </button>
                    <button
                      onClick={() => { exportJSON(); setMenuOpen(false) }}
                      className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-border)] transition-colors"
                    >
                      <Download size={15} /> JSONエクスポート
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 hover:bg-[var(--color-border)] transition-colors"
                    >
                      <Upload size={15} /> JSONインポート
                    </button>
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
        </div>
        {todaySummary !== null && goals && goals.length > 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            今日のノルマ: <span className="font-semibold text-[var(--color-text)]">{todaySummary}</span> 回
          </p>
        )}
      </header>

      {/* Goal list */}
      <main className="flex-1 px-4 pb-24 space-y-3">
        {goals?.length === 0 && (
          <div className="text-center py-20 text-[var(--color-text-secondary)]">
            <p className="text-lg mb-1">目標がありません</p>
            <p className="text-sm">右下の＋ボタンから追加しましょう</p>
          </div>
        )}
        {goals?.map(goal => (
          <GoalCard key={goal.id} goal={goal} onNavigate={id => navigate(`/goal/${id}`)} />
        ))}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/new')}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform z-20"
      >
        <Plus size={28} />
      </button>
    </div>
  )
}
