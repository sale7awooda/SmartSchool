'use server'

import { createClient } from '@/lib/supabase/server'

export interface SchoolSubscriptionInfo {
  planName: string
  planDescription: string | null
  price: number
  billingType: 'monthly' | 'yearly' | 'one_time'
  maxStudents: number
  maxStaff: number
  storageLimitMb: number
  enabledModules: string[]
  status: string
  startDate: string
  endDate: string | null
  trialEndDate: string | null
  daysRemaining: number | null
  isExpired: boolean
  isExpiringSoon: boolean
}

export async function getSchoolSubscriptionAction(): Promise<{
  subscription: SchoolSubscriptionInfo | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { subscription: null, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .maybeSingle()

    const schoolId = profile?.school_id
    if (!schoolId) {
      return { subscription: null, error: 'No school assigned' }
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return { subscription: null, error: error?.message }
    }

    const plan = data.subscription_plans as any
    const now = new Date()
    const endDate = data.end_date ? new Date(data.end_date) : null

    let daysRemaining: number | null = null
    if (endDate) {
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    const isExpired = data.status === 'expired' || (endDate !== null && endDate < now)
    const isExpiringSoon = !isExpired && daysRemaining !== null && daysRemaining <= 14

    return {
      subscription: {
        planName: plan?.name || 'Unknown',
        planDescription: plan?.description || null,
        price: plan?.price || 0,
        billingType: (plan?.billing_type as 'monthly' | 'yearly' | 'one_time') || 'monthly',
        maxStudents: plan?.max_students || -1,
        maxStaff: plan?.max_staff || -1,
        storageLimitMb: plan?.storage_limit_mb || 500,
        enabledModules: (plan?.enabled_modules as string[]) || [],
        status: data.status,
        startDate: data.start_date,
        endDate: data.end_date,
        trialEndDate: data.trial_end_date,
        daysRemaining,
        isExpired,
        isExpiringSoon,
      },
    }
  } catch (err: any) {
    return { subscription: null, error: err.message }
  }
}

export async function getSystemAnnouncementsAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { announcements: [] }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', user.id)
      .maybeSingle()

    const schoolId = profile?.school_id

    const { data, error } = await supabase
      .from('system_announcements')
      .select('*')
      .eq('is_active', true)
      .or(`school_id.is.null${schoolId ? `,school_id.eq.${schoolId}` : ''}`)
      .order('created_at', { ascending: false })

    if (error) {
      return { announcements: [], error: error.message }
    }

    return { announcements: data || [] }
  } catch (err: any) {
    return { announcements: [], error: err.message }
  }
}

export async function getUserNotificationsAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { notifications: [] }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return { notifications: [] }
    }

    // Get subscription info
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(name)')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const notifications: Array<{ id: string; type: 'subscription' | 'announcement'; title: string; message: string; severity: 'info' | 'warning' | 'error'; createdAt: string }> = []

    // Subscription notifications
    if (subData) {
      const now = new Date()
      const endDate = subData.end_date ? new Date(subData.end_date) : null
      const planName = (subData.subscription_plans as any)?.name || 'Subscription'

      if (subData.status === 'expired' || (endDate && endDate < now)) {
        notifications.push({
          id: `sub-expired-${subData.id}`,
          type: 'subscription',
          title: 'Subscription Expired',
          message: `Your ${planName} plan has expired. Please contact the administration to renew.`,
          severity: 'error',
          createdAt: new Date().toISOString(),
        })
      } else if (endDate) {
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysLeft <= 7 && daysLeft > 0) {
          notifications.push({
            id: `sub-expiring-${subData.id}`,
            type: 'subscription',
            title: 'Subscription Expiring Soon',
            message: `Your ${planName} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Please renew to avoid service interruption.`,
            severity: 'warning',
            createdAt: new Date().toISOString(),
          })
        } else if (daysLeft <= 14) {
          notifications.push({
            id: `sub-expiring-soon-${subData.id}`,
            type: 'subscription',
            title: 'Subscription Renewal Reminder',
            message: `Your ${planName} plan will expire in ${daysLeft} days.`,
            severity: 'info',
            createdAt: new Date().toISOString(),
          })
        }
      }
    }

    return { notifications }
  } catch (err: any) {
    return { notifications: [], error: err.message }
  }
}
