export async function fetchRoute(coordinates: {lat: number, lng: number}[]) {
  if (coordinates.length < 2) return null;

  const coordString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0];
      // OSRM returns coordinates as [lng, lat], Leaflet needs [lat, lng]
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
