import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { firestore, auth } from './firebase'

// ---------- Types ----------

export interface Goal {
  id: string
  name: string
  targetCount: number
  unit: string
  startDate: string
  endDate: string
  repeat: 'none' | 'weekly' | 'monthly' | 'yearly'
  result: 'active' | 'completed' | 'missed'
  createdAt: number
}

export interface TrackingRecord {
  id: string
  goalId: string
  count: number
  date: string
  memo: string
  createdAt: number
}

// ---------- Helpers ----------

function getUid(): string {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.uid
}

function goalsCol() {
  return collection(firestore, 'users', getUid(), 'goals')
}

function recordsCol() {
  return collection(firestore, 'users', getUid(), 'records')
}

// ---------- Goal CRUD ----------

export async function addGoal(data: Omit<Goal, 'id'>): Promise<string> {
  const ref = await addDoc(goalsCol(), data)
  return ref.id
}

export async function getGoal(id: string): Promise<Goal | null> {
  const snap = await getDoc(doc(goalsCol(), id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Goal
}

export async function updateGoal(id: string, data: Partial<Omit<Goal, 'id'>>): Promise<void> {
  await updateDoc(doc(goalsCol(), id), data)
}

export async function deleteGoal(id: string): Promise<void> {
  // Delete associated records first
  const q = query(recordsCol(), where('goalId', '==', id))
  const snap = await getDocs(q)
  const batch = writeBatch(firestore)
  snap.docs.forEach(d => batch.delete(d.ref))
  batch.delete(doc(goalsCol(), id))
  await batch.commit()
}

export async function getAllGoals(): Promise<Goal[]> {
  const snap = await getDocs(goalsCol())
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal))
}

// ---------- Record CRUD ----------

export async function addRecord(data: Omit<TrackingRecord, 'id'>): Promise<string> {
  const ref = await addDoc(recordsCol(), data)
  return ref.id
}

export async function updateRecord(id: string, data: Partial<Omit<TrackingRecord, 'id'>>): Promise<void> {
  await updateDoc(doc(recordsCol(), id), data)
}

export async function deleteRecord(id: string): Promise<void> {
  await deleteDoc(doc(recordsCol(), id))
}

export async function getAllRecords(): Promise<TrackingRecord[]> {
  const snap = await getDocs(recordsCol())
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TrackingRecord))
}

// ---------- Batch (for import) ----------

export async function clearAndImport(goals: Omit<Goal, 'id'>[], records: (Omit<TrackingRecord, 'id'> & { _oldGoalId?: string })[], oldToNewGoalId?: Map<string, string>): Promise<void> {
  // Delete all existing data
  const [existingGoals, existingRecords] = await Promise.all([
    getDocs(goalsCol()),
    getDocs(recordsCol()),
  ])

  // Firestore batch limit is 500, chunk if needed
  const deleteBatch = writeBatch(firestore)
  existingGoals.docs.forEach(d => deleteBatch.delete(d.ref))
  existingRecords.docs.forEach(d => deleteBatch.delete(d.ref))
  await deleteBatch.commit()

  // Add new goals
  const idMap = oldToNewGoalId ?? new Map<string, string>()
  for (const goal of goals) {
    const ref = await addDoc(goalsCol(), goal)
    // If goal had an _oldId, map it
    const oldId = (goal as Goal & { _oldId?: string })._oldId
    if (oldId) idMap.set(oldId, ref.id)
  }

  // Add new records with remapped goalIds
  for (const rec of records) {
    const { _oldGoalId, ...data } = rec
    const mappedGoalId = _oldGoalId ? (idMap.get(_oldGoalId) ?? data.goalId) : data.goalId
    await addDoc(recordsCol(), { ...data, goalId: mappedGoalId })
  }
}
