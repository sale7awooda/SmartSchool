'use client'

import { useEffect, useState } from 'react'
import { getSchoolSubscriptionAction, type SchoolSubscriptionInfo } from '@/app/actions/subscription'

type PlanTier = 'free' | 'basic' | 'pro' | 'full'

function getPlanTier(name: string): PlanTier {
  const lower = name.toLowerCase()
  if (lower.includes('free')) return 'free'
  if (lower.includes('basic')) return 'basic'
  if (lower.includes('pro')) return 'pro'
  if (lower.includes('full') || lower.includes('unlimited')) return 'full'
  return 'free'
}

function getPlanColor(tier: PlanTier): string {
  switch (tier) {
    case 'free': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    case 'basic': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    case 'pro': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700'
    case 'full': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700'
  }
}

function getStatusBadge(status: string, isExpired: boolean, isExpiringSoon: boolean) {
  if (isExpired) return <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Expired</span>
  if (isExpiringSoon) return <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Expiring</span>
  if (status === 'trial') return <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Trial</span>
  return null
}

export function SubscriptionBadge() {
  const [sub, setSub] = useState<SchoolSubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSchoolSubscriptionAction().then(res => {
      setSub(res.subscription)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="h-7 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
    )
  }

  if (!sub) return null

  const tier = getPlanTier(sub.planName)
  const colorClasses = getPlanColor(tier)

  return (
    <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${colorClasses}`}>
      <span>{sub.planName}</span>
      {getStatusBadge(sub.status, sub.isExpired, sub.isExpiringSoon)}
      {sub.daysRemaining !== null && !sub.isExpired && (
        <span className="text-[10px] opacity-70">
          {sub.daysRemaining}d
        </span>
      )}
    </div>
  )
}
