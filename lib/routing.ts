export async function fetchRoute(coordinates: {lat: number, lng: number}[]) {
  if (coordinates.length < 2) return null;

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || (typeof window !== 'undefined' ? localStorage.getItem('MAPBOX_ACCESS_TOKEN') : null);
  
  if (!mapboxToken) {
    console.warn('Mapbox token not found. Please configure it in your environment variables.');
    return null;
  }

  const coordString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?overview=full&geometries=geojson&access_token=${mapboxToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0];
      // Mapbox returns coordinates as [lng, lat], Leaflet needs [lat, lng]
      const routeCoordinates = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
      
      // Calculate ETAs for each stop (legs)
      const etas = [];
      let totalDuration = 0;
      for (let i = 0; i < route.legs.length; i++) {
        totalDuration += route.legs[i].duration; // duration in seconds
        etas.push(totalDuration);
      }

      return {
        routeCoordinates,
        distance: route.distance, // meters
        duration: route.duration, // seconds
        etas // array of seconds from start to each stop
      };
    }
  } catch (error) {
    console.error('Error fetching route:', error);
  }
  return null;
}

export async function searchAddress(query: string) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || (typeof window !== 'undefined' ? localStorage.getItem('MAPBOX_ACCESS_TOKEN') : null);
  
  if (!mapboxToken) {
    // Fallback to Nominatim if no Mapbox token
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.map((item: any) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
    } catch (error) {
      console.error('Error searching address:', error);
      return [];
    }
  }

  // Use Mapbox Geocoding API
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.features.map((item: any) => ({
      name: item.place_name,
      lat: item.center[1],
      lng: item.center[0]
    }));
  } catch (error) {
    console.error('Error searching address:', error);
    return [];
  }
}
