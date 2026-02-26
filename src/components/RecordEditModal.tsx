import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { db, type TrackingRecord } from '../db'

interface Props {
  record: TrackingRecord | null
  onClose: () => void
}

export function RecordEditModal({ record, onClose }: Props) {
  const [date, setDate] = useState('')
  const [count, setCount] = useState('')
  const [memo, setMemo] = useState('')

  useEffect(() => {
    if (record) {
      setDate(record.date)
      setCount(String(record.count))
      setMemo(record.memo || '')
    }
  }, [record])

  if (!record) return null

  const handleSave = async () => {
    const c = Number(count)
    if (!c || c < 1) return
    await db.records.update(record.id!, { date, count: c, memo: memo.trim() })
    onClose()
  }

  const handleDelete = async () => {
    await db.records.delete(record.id!)
    onClose()
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-[var(--color-surface)] rounded-2xl p-5 shadow-2xl max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">記録を編集</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">日付</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">回数</label>
            <input type="number" value={count} onChange={e => setCount(e.target.value)} min="1" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">メモ</label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="メモを追加..." className={inputClass} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleDelete}
            className="flex-1 py-2.5 rounded-xl border border-red-400 text-red-400 text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            削除
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            保存
          </button>
        </div>
      </div>
    </>
  )
}
