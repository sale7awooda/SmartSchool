import { NextResponse } from 'next/server';
import { getAllSubscriptions } from '@/lib/api/push-subscriptions-store';

export async function GET() {
  try {
    const list = await getAllSubscriptions();
    
    // Aggregate subscriptions by role
    const byRole: Record<string, number> = {
      admin: 0,
      teacher: 0,
      student: 0,
      parent: 0,
      anonymous: 0
    };

    list.forEach(item => {
      const r = (item.userRole || 'anonymous').toLowerCase();
      if (byRole[r] !== undefined) {
        byRole[r]++;
      } else {
        byRole[r] = (byRole[r] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      totalSubscribers: list.length,
      byRole,
      subscribers: list.map(item => ({
        id: item.id,
        userName: item.userName,
        userRole: item.userRole,
        subscribedAt: item.subscribedAt,
        endpointTail: item.subscription.endpoint.substring(item.subscription.endpoint.length - 20)
      }))
    });
  } catch (error: any) {
    console.error('Error in /api/push/subscribers:', error);
    return NextResponse.json({ error: 'Failed to fetch subscribers list' }, { status: 500 });
  }
}
