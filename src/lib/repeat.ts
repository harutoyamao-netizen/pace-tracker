import type { Goal } from '../db'

export function getEffectiveDates(goal: Goal): { startDate: string; endDate: string } {
  if (goal.repeat === 'none') {
    return { startDate: goal.startDate, endDate: goal.endDate }
  }

  const now = new Date()
  let start: Date
  let end: Date

  if (goal.repeat === 'weekly') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1 // Monday start
    start = new Date(now)
    start.setDate(now.getDate() - diff)
    end = new Date(start)
    end.setDate(start.getDate() + 6)
  } else if (goal.repeat === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31)
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return { startDate: fmt(start), endDate: fmt(end) }
}
