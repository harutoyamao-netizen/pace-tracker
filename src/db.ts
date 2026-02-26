import Dexie, { type EntityTable } from 'dexie'

export interface Goal {
  id?: number
  name: string
  targetCount: number
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  repeat: 'none' | 'weekly' | 'monthly' | 'yearly'
  createdAt: number
}

export interface TrackingRecord {
  id?: number
  goalId: number
  count: number
  date: string        // YYYY-MM-DD
  createdAt: number
}

const db = new Dexie('PaceTrackerDB') as Dexie & {
  goals: EntityTable<Goal, 'id'>
  records: EntityTable<TrackingRecord, 'id'>
}

db.version(1).stores({
  goals: '++id, name, createdAt',
  records: '++id, goalId, date, createdAt, [goalId+date]',
})

export { db }
