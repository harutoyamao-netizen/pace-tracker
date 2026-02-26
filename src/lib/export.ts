import { db } from '../db'

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportJSON() {
  const goals = await db.goals.toArray()
  const records = await db.records.toArray()
  const data = { goals, records, exportedAt: new Date().toISOString() }
  const timestamp = new Date().toISOString().slice(0, 10)
  download(JSON.stringify(data, null, 2), `pace-tracker-${timestamp}.json`, 'application/json')
}

export async function exportCSV() {
  const goals = await db.goals.toArray()
  const records = await db.records.toArray()
  const goalMap = new Map(goals.map(g => [g.id, g.name]))

  const header = 'date,goal_name,count,memo'
  const rows = records
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => {
      const name = (goalMap.get(r.goalId) ?? '').replace(/"/g, '""')
      const memo = (r.memo || '').replace(/"/g, '""')
      return `${r.date},"${name}",${r.count},"${memo}"`
    })

  const timestamp = new Date().toISOString().slice(0, 10)
  download([header, ...rows].join('\n'), `pace-tracker-${timestamp}.csv`, 'text/csv')
}

export async function importJSON(file: File) {
  const text = await file.text()
  const data = JSON.parse(text)

  if (!Array.isArray(data.goals) || !Array.isArray(data.records)) {
    throw new Error('Invalid file format')
  }

  await db.transaction('rw', db.goals, db.records, async () => {
    await db.goals.clear()
    await db.records.clear()
    const addedIds = await db.goals.bulkAdd(
      data.goals.map((g: { id?: unknown; [k: string]: unknown }) => {
        const { id: _, ...rest } = g
        return rest
      }),
      { allKeys: true },
    )
    // Re-map goal IDs using bulkAdd return values
    const oldToNew = new Map<number, number>()
    data.goals.forEach((old: { id: number }, i: number) => {
      if (addedIds[i] != null) oldToNew.set(old.id, addedIds[i] as number)
    })
    await db.records.bulkAdd(
      data.records.map((r: { id?: unknown; goalId?: unknown; [k: string]: unknown }) => {
        const { id: _, goalId, ...rest } = r
        return { ...rest, goalId: oldToNew.get(goalId as number) ?? goalId }
      }),
    )
  })
}
