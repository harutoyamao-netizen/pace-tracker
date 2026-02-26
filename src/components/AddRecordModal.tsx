import { useState } from 'react'
import { X } from 'lucide-react'
import { addRecord } from '../db'

interface Props {
  goalId: string
  unit: string
  onClose: () => void
}

export function AddRecordModal({ goalId, unit, onClose }: Props) {
  const [count, setCount] = useState('1')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const handleSave = async () => {
    const c = Number(count)
    if (!c || c < 1) return
    await addRecord({
      goalId,
      count: c,
      date,
      memo: memo.trim(),
      createdAt: Date.now(),
    })
    onClose()
  }

  const presets = [1, 2, 3, 5, 10]

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-6 z-50 bg-[var(--color-surface)] rounded-2xl p-5 shadow-2xl max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">記録を追加</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)]">
            <X size={18} />
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 mb-4">
          {presets.map(n => (
            <button
              key={n}
              onClick={() => setCount(String(n))}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                count === String(n)
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              +{n}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">数量（{unit}）</label>
              <input type="number" value={count} onChange={e => setCount(e.target.value)} min="1" className={inputClass} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">日付</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">メモ</label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="メモを追加..." className={inputClass} />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-4 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold active:scale-[0.97] transition-transform"
        >
          記録する
        </button>
      </div>
    </>
  )
}
