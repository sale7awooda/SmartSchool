import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mocks.mockSupabaseClient,
}));

const mockRouteId = 'r-1';
const mockStopId = 'st-1';
const mockStudentId = 'stu-1';

let mockData: Record<string, any[]> = {
  bus_routes: [{ id: mockRouteId, name: 'Route A', route_number: 'R-101', bus_number: 'BUS-01', driver_id: 'u-1', attendant_id: 'u-2', status: 'Not Started' }],
  bus_stops: [{ id: mockStopId, route_id: mockRouteId, name: 'Stop 1', latitude: 39.78, longitude: -89.65, order_index: 0, student_id: null, arrival_time: '07:30 AM' }],
  student_transport: [{ id: 'st-t-1', student_id: mockStudentId, bus_route_id: mockRouteId }],
  students: [{ id: mockStudentId, name: 'Test Student', grade: 'Grade 5' }],
  users: [{ id: 'u-1', name: 'Driver', role: 'staff', phone: '555-0100' }, { id: 'u-2', name: 'Attendant', role: 'staff' }],
};

function createThenable(data: any) {
  const thenable: any = (onfulfilled: any) =>
    Promise.resolve({ data, error: null }).then(onfulfilled);
  thenable.then = thenable;
  return thenable;
}

function makeChainable(table: string) {
  const chainable: any = {};
  chainable.select = vi.fn().mockReturnValue(chainable);
  chainable.order = vi.fn().mockReturnValue(createThenable(mockData[table] || []));
  chainable.eq = vi.fn().mockReturnValue(chainable);
  chainable.single = vi.fn().mockReturnValue(createThenable((mockData[table] || [])[0] || null));
  chainable.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  chainable.insert = vi.fn().mockReturnValue(chainable);
  chainable.delete = vi.fn().mockReturnValue(chainable);
  chainable.update = vi.fn().mockReturnValue(chainable);
  chainable.range = vi.fn().mockReturnValue(chainable);
  chainable.ilike = vi.fn().mockReturnValue(chainable);
  chainable.limit = vi.fn().mockReturnValue(chainable);
  chainable.maybeSingle = vi.fn().mockReturnValue(createThenable(null));
  chainable.or = vi.fn().mockReturnValue(chainable);
  chainable.then = createThenable(mockData[table] || []);
  return chainable;
}

const mockSupabaseClient = {
  from: vi.fn((table: string) => makeChainable(table)),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
};

const mocks = { mockSupabaseClient };

describe('Transport Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = {
      bus_routes: [{ id: mockRouteId, name: 'Route A', route_number: 'R-101', bus_number: 'BUS-01', driver_id: 'u-1', attendant_id: 'u-2', status: 'Not Started' }],
      bus_stops: [{ id: mockStopId, route_id: mockRouteId, name: 'Stop 1', latitude: 39.78, longitude: -89.65, order_index: 0, student_id: null, arrival_time: '07:30 AM' }],
      student_transport: [{ id: 'st-t-1', student_id: mockStudentId, bus_route_id: mockRouteId }],
      students: [{ id: mockStudentId, name: 'Test Student', grade: 'Grade 5' }],
      users: [{ id: 'u-1', name: 'Driver', role: 'staff', phone: '555-0100' }, { id: 'u-2', name: 'Attendant', role: 'staff' }],
    };
  });

  describe('saveRouteAction', () => {
    it('should create a new route with stops', async () => {
      (mockSupabaseClient as any).from = vi.fn((table: string) => {
        const c = makeChainable(table);
        if (table === 'bus_routes') {
          c.insert = vi.fn().mockReturnValue(c);
          c.select = vi.fn().mockReturnValue(c);
          c.single = vi.fn().mockResolvedValue({ data: { id: 'new-gen-id' }, error: null });
        }
        return c;
      });

      const { saveRouteAction } = await import('@/app/actions/transport');
      const result = await saveRouteAction({
        name: 'New Route',
        route_number: 'R-200',
        bus_number: 'BUS-02',
        driver_id: 'u-1',
        stops: [{ name: 'Stop 1', latitude: 39.78, longitude: -89.65, order_index: 0, student_id: null }],
      });

      expect(result.success).toBe(true);
      expect(result.routeId).toBe('new-gen-id');
    });

    it('should update an existing route and replace stops', async () => {
      const { saveRouteAction } = await import('@/app/actions/transport');
      const result = await saveRouteAction({
        id: mockRouteId,
        name: 'Updated Route',
        route_number: 'R-101',
        bus_number: 'BUS-01',
        driver_id: 'u-1',
        stops: [{ name: 'New Stop', latitude: 40.0, longitude: -90.0, order_index: 0, student_id: null }],
      });

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bus_routes');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bus_stops');
    });

    it('should return error when required fields are missing', async () => {
      const { saveRouteAction } = await import('@/app/actions/transport');
      const result = await saveRouteAction({
        name: 'Bad Route',
        route_number: '',
        bus_number: '',
        driver_id: '',
        stops: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deleteRouteAction', () => {
    it('should cascade delete route, stops, and student_transport', async () => {
      const { deleteRouteAction } = await import('@/app/actions/transport');
      const result = await deleteRouteAction(mockRouteId);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('student_transport');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bus_stops');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bus_routes');
    });
  });

  describe('updateRouteStatusAction', () => {
    it('should update route status', async () => {
      const { updateRouteStatusAction } = await import('@/app/actions/transport');
      const result = await updateRouteStatusAction(mockRouteId, 'In Transit');

      expect(result.success).toBe(true);
    });
  });

  describe('getPaginatedRoutesAction', () => {
    it('should return paginated routes', async () => {
      const mockCount = 1;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'bus_routes') {
          c.order = vi.fn().mockReturnThis();
          c.range = vi.fn().mockReturnValue({
            ...createThenable(mockData.bus_routes),
            count: mockCount,
          });
          c.or = vi.fn().mockReturnThis();
          c.select = vi.fn().mockReturnValue(c);
        }
        return c;
      });

      const { getPaginatedRoutesAction } = await import('@/app/actions/transport');
      const result = await getPaginatedRoutesAction(1, 10, '');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('addStopToRouteAction', () => {
    it('should add a stop to an existing route', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const c = makeChainable(table);
        if (table === 'bus_stops') {
          c.order = vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue(createThenable([{ order_index: 0 }])),
          });
          c.insert = vi.fn().mockResolvedValue({ data: null, error: null });
        }
        return c;
      });

      const { addStopToRouteAction } = await import('@/app/actions/transport');
      const result = await addStopToRouteAction(mockRouteId, {
        name: 'New Stop',
        latitude: 40.0,
        longitude: -90.0,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Transport Component Logic', () => {
  describe('Route filtering', () => {
    it('should filter routes by name (Arabic support)', () => {
      const routes = [
        { route_number: 'R-101', name: ' route 1', bus_number: 'BUS-01' },
        { route_number: 'R-102', name: ' route 2', bus_number: 'BUS-02' },
        { route_number: 'R-103', name: ' خط', bus_number: 'BUS-03' },
      ];

      const searchArabic = 'خط';
      const searchEnglish = 'R-101';
      const searchBus = 'BUS-02';

      const filterRoutes = (routes: any[], q: string) =>
        routes.filter(r =>
          (r.name || '').toLowerCase().includes(q.toLowerCase()) ||
          r.route_number.toLowerCase().includes(q.toLowerCase()) ||
          (r.bus_number || '').toLowerCase().includes(q.toLowerCase())
        );

      expect(filterRoutes(routes, searchArabic)).toHaveLength(1);
      expect(filterRoutes(routes, searchArabic)[0].route_number).toBe('R-103');
      expect(filterRoutes(routes, searchEnglish)).toHaveLength(1);
      expect(filterRoutes(routes, searchBus)).toHaveLength(1);
      expect(filterRoutes(routes, searchBus)[0].route_number).toBe('R-102');
    });
  });

  describe('Default stops creation', () => {
    it('should create start and end points for new route', () => {
      const createDefaultStops = () => [
        { id: 'start', name: 'Start Point' },
        { id: 'end', name: 'End Point' },
      ];

      const stops = createDefaultStops();
      expect(stops).toHaveLength(2);
      expect(stops[0].name).toBe('Start Point');
      expect(stops[1].name).toBe('End Point');
    });
  });

  describe('Stop reordering', () => {
    it('should reorder stops via drag and drop', () => {
      const stops = [
        { id: '1', name: 'A', order_index: 0 },
        { id: '2', name: 'B', order_index: 1 },
        { id: '3', name: 'C', order_index: 2 },
      ];

      const reorder = (arr: any[], from: number, to: number) => {
        const result = [...arr];
        const [moved] = result.splice(from, 1);
        result.splice(to, 0, moved);
        return result;
      };

      const reordered = reorder(stops, 2, 0);
      expect(reordered[0].name).toBe('C');
      expect(reordered[1].name).toBe('A');
      expect(reordered[2].name).toBe('B');
    });

    it('should not change array when moving item to same index', () => {
      const stops = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ];
      const reorder = (arr: any[], from: number, to: number) => {
        const result = [...arr];
        const [moved] = result.splice(from, 1);
        result.splice(to, 0, moved);
        return result;
      };

      expect(reorder(stops, 0, 0)).toEqual(stops);
    });
  });

  describe('Stop progress from GPS', () => {
    it('should compute current stop index from bus location', () => {
      const stops = [
        { id: '1', coordinates: { lat: 39.78, lng: -89.65 } },
        { id: '2', coordinates: { lat: 39.79, lng: -89.66 } },
        { id: '3', coordinates: { lat: 39.80, lng: -89.67 } },
      ];

      const busLocation = { lat: 39.785, lng: -89.655 };

      let currentStopIndex = -1;
      let minDist = Infinity;
      stops.forEach((stop, idx) => {
        if (stop.coordinates) {
          const d = Math.hypot(
            busLocation.lat - stop.coordinates.lat,
            busLocation.lng - stop.coordinates.lng
          );
          if (d < minDist) { minDist = d; currentStopIndex = idx; }
        }
      });

      const completed = stops.map((_, idx) => currentStopIndex >= 0 ? idx < currentStopIndex : idx < 1);
      const next = stops.map((_, idx) => currentStopIndex >= 0 ? idx === currentStopIndex : idx === 1);

      expect(currentStopIndex).toBe(0);
      expect(completed).toEqual([false, false, false]);
      expect(next).toEqual([true, false, false]);
    });
  });

  describe('Distance calculation', () => {
    it('should calculate distance between two points', () => {
      const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
          Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const dist = getDistanceMeters(39.78, -89.65, 39.79, -89.66);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(2000); // ~1.3km
    });
  });
});
