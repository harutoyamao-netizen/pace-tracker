import Dexie, { type EntityTable } from 'dexie'

export interface Goal {
  id?: number
  name: string
  targetCount: number
  unit: string        // e.g. '回', 'ページ', 'km'
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  repeat: 'none' | 'weekly' | 'monthly' | 'yearly'
  result: 'active' | 'completed' | 'missed'
  createdAt: number
}

export interface TrackingRecord {
  id?: number
  goalId: number
  count: number
  date: string        // YYYY-MM-DD
  memo: string
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

db.version(2).stores({
  goals: '++id, name, createdAt, result',
  records: '++id, goalId, date, createdAt, [goalId+date]',
}).upgrade(tx => {
  return tx.table('goals').toCollection().modify(goal => {
    if (!goal.unit) goal.unit = '回'
    if (!goal.result) goal.result = 'active'
  })
})

db.version(3).stores({
  goals: '++id, name, createdAt, result',
  records: '++id, goalId, date, createdAt, [goalId+date]',
}).upgrade(tx => {
  return tx.table('records').toCollection().modify(rec => {
    if (rec.memo === undefined) rec.memo = ''
  })
})

export { db }
