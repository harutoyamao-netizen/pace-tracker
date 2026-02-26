import Dexie from 'dexie'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { firestore } from '../firebase'

const MIGRATION_KEY = 'pace-tracker-migrated'

export async function runMigration(uid: string): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY)) return

  // Check if old Dexie DB exists
  const databases = await Dexie.getDatabaseNames()
  if (!databases.includes('PaceTrackerDB')) {
    localStorage.setItem(MIGRATION_KEY, '1')
    return
  }

  // Check if Firestore already has data (avoid duplicate migration)
  const goalsSnap = await getDocs(collection(firestore, 'users', uid, 'goals'))
  if (!goalsSnap.empty) {
    localStorage.setItem(MIGRATION_KEY, '1')
    return
  }

  // Open old DB
  const oldDb = new Dexie('PaceTrackerDB')
  oldDb.version(3).stores({
    goals: '++id, name, createdAt, result',
    records: '++id, goalId, date, createdAt, [goalId+date]',
  })

  try {
    const oldGoals = await oldDb.table('goals').toArray()
    const oldRecords = await oldDb.table('records').toArray()

    if (oldGoals.length === 0) {
      localStorage.setItem(MIGRATION_KEY, '1')
      oldDb.close()
      return
    }

    // Migrate goals and build ID mapping
    const idMap = new Map<number, string>()
    for (const goal of oldGoals) {
      const { id: oldId, ...data } = goal
      // Ensure defaults
      if (!data.unit) data.unit = '回'
      if (!data.result) data.result = 'active'
      const ref = await addDoc(collection(firestore, 'users', uid, 'goals'), data)
      idMap.set(oldId, ref.id)
    }

    // Migrate records with remapped goalId
    for (const rec of oldRecords) {
      const { id: _oldId, goalId: oldGoalId, ...data } = rec
      if (data.memo === undefined) data.memo = ''
      const newGoalId = idMap.get(oldGoalId)
      if (!newGoalId) continue // Skip orphaned records
      await addDoc(collection(firestore, 'users', uid, 'records'), {
        ...data,
        goalId: newGoalId,
      })
    }

    localStorage.setItem(MIGRATION_KEY, '1')
    console.log(`Migrated ${oldGoals.length} goals and ${oldRecords.length} records`)
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    oldDb.close()
  }
}
