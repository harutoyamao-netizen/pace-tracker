import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { db, type Goal } from '../db'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const unitPresets = ['回', 'ページ', '冊', '問', 'km', '分', '時間', '個']

export function GoalForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [targetCount, setTargetCount] = useState('')
  const [unit, setUnit] = useState('回')
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState('')
  const [repeat, setRepeat] = useState<Goal['repeat']>('none')

  useEffect(() => {
    if (id) {
      db.goals.get(Number(id)).then(g => {
        if (g) {
          setName(g.name)
          setTargetCount(String(g.targetCount))
          setUnit(g.unit || '回')
          setStartDate(g.startDate)
          setEndDate(g.endDate)
          setRepeat(g.repeat)
        }
      })
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const count = Number(targetCount)
    if (!count || count < 1) return

    const effectiveEnd = endDate || startDate
    if (repeat === 'none' && effectiveEnd < startDate) return

    if (isEdit) {
      await db.goals.update(Number(id), {
        name: name.trim(),
        targetCount: count,
        unit,
        startDate,
        endDate: effectiveEnd,
        repeat,
      })
    } else {
      await db.goals.add({
        name: name.trim(),
        targetCount: count,
        unit,
        startDate,
        endDate: effectiveEnd,
        repeat,
        result: 'active',
        createdAt: Date.now(),
      })
    }
    navigate('/', { replace: true })
  }

  const handleDelete = async () => {
    if (!confirm('この目標を削除しますか？')) return
    await db.records.where('goalId').equals(Number(id)).delete()
    await db.goals.delete(Number(id))
    navigate('/', { replace: true })
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow'

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/80 backdrop-blur-md px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">{isEdit ? '目標を編集' : '新しい目標'}</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
            目標名
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：年間100冊読破"
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
              目標回数
            </label>
            <input
              type="number"
              value={targetCount}
              onChange={e => setTargetCount(e.target.value)}
              placeholder="100"
              min="1"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
              単位
            </label>
            <input
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="回"
              required
              className={inputClass}
              list="unit-presets"
            />
            <datalist id="unit-presets">
              {unitPresets.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
            繰り返し
          </label>
          <select
            value={repeat}
            onChange={e => setRepeat(e.target.value as Goal['repeat'])}
            className={inputClass}
          >
            <option value="none">なし（1回限り）</option>
            <option value="weekly">毎週</option>
            <option value="monthly">毎月</option>
            <option value="yearly">毎年</option>
          </select>
        </div>

        {repeat === 'none' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
                開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-secondary)]">
                期限
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                required
                className={inputClass}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold active:scale-[0.98] transition-transform"
        >
          {isEdit ? '更新する' : '作成する'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-3 rounded-xl border border-red-400 text-red-400 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Trash2 size={16} /> 削除する
          </button>
        )}
      </form>
    </div>
  )
}
