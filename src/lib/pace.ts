export type PaceStatus = 'fast' | 'slightly-fast' | 'on-track' | 'slightly-slow' | 'slow'

export interface PaceInfo {
  totalDone: number
  targetCount: number
  remaining: number
  totalDays: number
  elapsedDays: number
  remainingDays: number
  expectedByNow: number
  dailyNeeded: number
  currentPace: number
  status: PaceStatus
  progress: number // 0-1
}

export function calcPace(
  targetCount: number,
  totalDone: number,
  startDate: string,
  endDate: string,
): PaceInfo {
  const now = new Date()
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T23:59:59')

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
  const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86400000))
  const remainingDays = Math.max(0, totalDays - elapsedDays)
  const remaining = Math.max(0, targetCount - totalDone)
  const progress = targetCount > 0 ? Math.min(1, totalDone / targetCount) : 0

  const expectedByNow = totalDays > 0 ? (targetCount / totalDays) * elapsedDays : targetCount
  const dailyNeeded = remainingDays > 0 ? remaining / remainingDays : remaining
  const currentPace = elapsedDays > 0 ? totalDone / elapsedDays : 0

  const idealPace = targetCount / totalDays
  let status: PaceStatus
  if (remaining <= 0) {
    status = 'fast'
  } else if (idealPace === 0) {
    status = 'on-track'
  } else {
    const ratio = currentPace / idealPace
    if (ratio >= 1.2) status = 'fast'
    else if (ratio >= 1.05) status = 'slightly-fast'
    else if (ratio >= 0.85) status = 'on-track'
    else if (ratio >= 0.6) status = 'slightly-slow'
    else status = 'slow'
  }

  return {
    totalDone,
    targetCount,
    remaining,
    totalDays,
    elapsedDays,
    remainingDays,
    expectedByNow: Math.round(expectedByNow * 10) / 10,
    dailyNeeded: Math.round(dailyNeeded * 10) / 10,
    currentPace: Math.round(currentPace * 10) / 10,
    status,
    progress,
  }
}

export const statusLabel: Record<PaceStatus, string> = {
  'fast': '速い',
  'slightly-fast': '速め',
  'on-track': '順調',
  'slightly-slow': '遅め',
  'slow': '遅い',
}

export const statusColor: Record<PaceStatus, string> = {
  'fast': 'text-emerald-500',
  'slightly-fast': 'text-green-400',
  'on-track': 'text-blue-400',
  'slightly-slow': 'text-amber-400',
  'slow': 'text-red-400',
}

export const statusBg: Record<PaceStatus, string> = {
  'fast': 'bg-emerald-500',
  'slightly-fast': 'bg-green-400',
  'on-track': 'bg-blue-400',
  'slightly-slow': 'bg-amber-400',
  'slow': 'bg-red-400',
}
