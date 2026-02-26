import { collection, getDocs, addDoc, writeBatch } from 'firebase/firestore'
import { firestore, auth } from '../firebase'

function getUid(): string {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.uid
}

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
  const uid = getUid()
  const goalsSnap = await getDocs(collection(firestore, 'users', uid, 'goals'))
  const recordsSnap = await getDocs(collection(firestore, 'users', uid, 'records'))

  const goals = goalsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const records = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  const data = { goals, records, exportedAt: new Date().toISOString() }
  const timestamp = new Date().toISOString().slice(0, 10)
  download(JSON.stringify(data, null, 2), `pace-tracker-${timestamp}.json`, 'application/json')
}

export async function exportCSV() {
  const uid = getUid()
  const goalsSnap = await getDocs(collection(firestore, 'users', uid, 'goals'))
  const recordsSnap = await getDocs(collection(firestore, 'users', uid, 'records'))

  const goalMap = new Map(goalsSnap.docs.map(d => [d.id, (d.data().name as string) ?? '']))
  const records = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{
    id: string; goalId: string; date: string; count: number; memo: string
  }>

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

  const uid = getUid()
  const goalsCol = collection(firestore, 'users', uid, 'goals')
  const recordsCol = collection(firestore, 'users', uid, 'records')

  // Delete existing data
  const [existingGoals, existingRecords] = await Promise.all([
    getDocs(goalsCol),
    getDocs(recordsCol),
  ])

  const deleteBatch = writeBatch(firestore)
  existingGoals.docs.forEach(d => deleteBatch.delete(d.ref))
  existingRecords.docs.forEach(d => deleteBatch.delete(d.ref))
  await deleteBatch.commit()

  // Add goals and build ID mapping
  const oldToNew = new Map<string, string>()
  for (const goal of data.goals) {
    const { id: oldId, ...rest } = goal as { id: string; [k: string]: unknown }
    const ref = await addDoc(goalsCol, rest)
    if (oldId) oldToNew.set(String(oldId), ref.id)
  }

  // Add records with remapped goalIds
  for (const rec of data.records) {
    const { id: _, goalId, ...rest } = rec as { id: string; goalId: string; [k: string]: unknown }
    const mappedGoalId = oldToNew.get(String(goalId)) ?? goalId
    await addDoc(recordsCol, { ...rest, goalId: mappedGoalId })
  }
}
