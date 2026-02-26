import { useState, useEffect } from 'react'
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { firestore } from '../firebase'
import { useAuth } from './useAuth'
import type { Goal, TrackingRecord } from '../db'

function mapDoc<T>(d: DocumentData & { id: string }): T {
  return { id: d.id, ...d.data() } as T
}

export function useGoals(): Goal[] | undefined {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[] | undefined>()

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(firestore, 'users', user.uid, 'goals'),
      orderBy('createdAt'),
    )
    return onSnapshot(q, snap => {
      setGoals(snap.docs.map(d => mapDoc<Goal>(d)))
    })
  }, [user])

  return goals
}

export function useGoal(goalId: string | undefined): Goal | undefined {
  const { user } = useAuth()
  const [goal, setGoal] = useState<Goal | undefined>()

  useEffect(() => {
    if (!user || !goalId) return
    return onSnapshot(
      doc(firestore, 'users', user.uid, 'goals', goalId),
      snap => {
        if (snap.exists()) {
          setGoal({ id: snap.id, ...snap.data() } as Goal)
        } else {
          setGoal(undefined)
        }
      },
    )
  }, [user, goalId])

  return goal
}

export function useRecordsByGoal(goalId: string | undefined): TrackingRecord[] | undefined {
  const { user } = useAuth()
  const [records, setRecords] = useState<TrackingRecord[] | undefined>()

  useEffect(() => {
    if (!user || !goalId) return
    const q = query(
      collection(firestore, 'users', user.uid, 'records'),
      where('goalId', '==', goalId),
      orderBy('createdAt'),
    )
    return onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => mapDoc<TrackingRecord>(d)))
    })
  }, [user, goalId])

  return records
}

export function useAllRecords(): TrackingRecord[] | undefined {
  const { user } = useAuth()
  const [records, setRecords] = useState<TrackingRecord[] | undefined>()

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(firestore, 'users', user.uid, 'records'),
      orderBy('createdAt'),
    )
    return onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => mapDoc<TrackingRecord>(d)))
    })
  }, [user])

  return records
}
