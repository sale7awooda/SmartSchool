'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function saveRouteAction(data: {
  id?: string;
  name: string;
  route_number: string;
  bus_number?: string;
  driver_id: string;
  attendant_id?: string;
  status?: string;
  stops: {
    id?: string;
    name: string;
    latitude: number | undefined;
    longitude: number | undefined;
    arrival_time?: string;
    student_id?: string | null;
    order_index: number;
  }[];
}): Promise<{ success: boolean; error?: string; routeId?: string }> {
  const supabase = createAdminClient();

  if (!data.route_number || !data.bus_number || !data.driver_id) {
    return { success: false, error: 'Route number, bus number, and driver are required' };
  }

  try {
    if (data.id) {
      const { error } = await supabase
        .from('bus_routes')
        .update({
          name: data.name || data.route_number,
          route_number: data.route_number,
          bus_number: data.bus_number,
          driver_id: data.driver_id,
          attendant_id: data.attendant_id || null,
        })
        .eq('id', data.id);

      if (error) throw error;

      await supabase.from('bus_stops').delete().eq('route_id', data.id);

      if (data.stops.length > 0) {
        const stopsToInsert = data.stops.map(s => ({
          route_id: data.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          arrival_time: s.arrival_time || null,
          student_id: s.student_id || null,
          order_index: s.order_index,
        }));
        const { error: stopsError } = await supabase.from('bus_stops').insert(stopsToInsert);
        if (stopsError) throw stopsError;
      }

      return { success: true, routeId: data.id };
    } else {
      const { data: newRoute, error } = await supabase
        .from('bus_routes')
        .insert([{
          name: data.name || data.route_number,
          route_number: data.route_number,
          bus_number: data.bus_number,
          driver_id: data.driver_id,
          attendant_id: data.attendant_id || null,
          status: data.status || 'Not Started',
        }])
        .select()
        .single();

      if (error) throw error;

      if (data.stops.length > 0) {
        const stopsToInsert = data.stops.map(s => ({
          route_id: newRoute.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          arrival_time: s.arrival_time || null,
          student_id: s.student_id || null,
          order_index: s.order_index,
        }));
        const { error: stopsError } = await supabase.from('bus_stops').insert(stopsToInsert);
        if (stopsError) throw stopsError;
      }

      return { success: true, routeId: newRoute.id };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save route' };
  }
}

export async function deleteRouteAction(routeId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    await supabase.from('student_transport').delete().eq('bus_route_id', routeId);
    await supabase.from('bus_stops').delete().eq('route_id', routeId);
    const { error } = await supabase.from('bus_routes').delete().eq('id', routeId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete route' };
  }
}

export async function updateRouteStatusAction(routeId: string, status: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('bus_routes')
    .update({ status })
    .eq('id', routeId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getPaginatedRoutesAction(page = 1, limit = 10, search = ''): Promise<{
  success: boolean; error?: string; data?: any[]; count?: number; totalPages?: number
}> {
  const supabase = createAdminClient();

  try {
    let query = supabase
      .from('bus_routes')
      .select(`
        *,
        stops:bus_stops(*),
        driver:users!bus_routes_driver_id_fkey(id, name, phone, role),
        attendant:users!bus_routes_attendant_id_fkey(id, name, phone, role)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,route_number.ilike.%${search}%,bus_number.ilike.%${search}%`);
    }

    const countResult = await query;
    const totalCount = countResult.count || 0;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('bus_routes')
      .select(`
        *,
        stops:bus_stops(*),
        driver:users!bus_routes_driver_id_fkey(id, name, phone, role),
        attendant:users!bus_routes_attendant_id_fkey(id, name, phone, role)
      `, { count: 'exact' })
      .order('route_number')
      .range(from, to);

    if (error) throw error;

    if (search) {
      const searchQuery = supabase
        .from('bus_routes')
        .select(`
          *,
          stops:bus_stops(*),
          driver:users!bus_routes_driver_id_fkey(id, name, phone, role),
          attendant:users!bus_routes_attendant_id_fkey(id, name, phone, role)
        `, { count: 'exact' })
        .or(`name.ilike.%${search}%,route_number.ilike.%${search}%,bus_number.ilike.%${search}%`)
        .order('route_number')
        .range(from, to);

      const { data: searchData, error: searchError, count: searchCount } = await searchQuery;
      if (searchError) throw searchError;
      return {
        success: true,
        data: searchData || [],
        count: searchCount || 0,
        totalPages: Math.ceil((searchCount || 0) / limit),
      };
    }

    return {
      success: true,
      data: data || [],
      count: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addStopToRouteAction(routeId: string, stop: {
  name: string;
  latitude?: number;
  longitude?: number;
  arrival_time?: string;
  student_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    const { data: existingStops } = await supabase
      .from('bus_stops')
      .select('order_index')
      .eq('route_id', routeId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = existingStops && existingStops.length > 0 ? existingStops[0].order_index + 1 : 1;

    const { error } = await supabase.from('bus_stops').insert([{
      route_id: routeId,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      arrival_time: stop.arrival_time || null,
      student_id: stop.student_id || null,
      order_index: nextOrder,
    }]);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add stop' };
  }
}
