'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue in Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for the bus
const busIcon = L.divIcon({
  html: `<div style="background-color: #4f46e5; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
  className: 'bus-marker-animated',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

interface TransportMapProps {
  stops: { lat: number; lng: number; name: string; studentName?: string; eta?: string }[];
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  liveBusLocation?: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][]; // Array of [lat, lng] for the polyline
}

function MapEvents({ onLocationSelect }: { onLocationSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function TransportMap({ 
  stops, 
  interactive = false, 
  onLocationSelect, 
  selectedLocation,
  liveBusLocation,
  routeCoordinates = []
}: TransportMapProps) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('MAPBOX_ACCESS_TOKEN') : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) setMapboxToken(token);
  }, []);

  // Center on the first stop, or a default location (e.g., Springfield)
  const defaultCenter: [number, number] = stops.length > 0 
    ? [stops[0].lat, stops[0].lng] 
    : [39.7817, -89.6501]; // Springfield, IL coordinates as a fallback

  const tileUrl = mapboxToken 
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  
  const attribution = mapboxToken
    ? 'Map data &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="w-full h-full rounded-xl overflow-hidden z-0 relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution={attribution}
          url={tileUrl}
        />
        
        {interactive && <MapEvents onLocationSelect={onLocationSelect} />}

        {/* Draw the route line */}
        {routeCoordinates.length > 0 && (
          <Polyline positions={routeCoordinates} color="#4f46e5" weight={5} opacity={0.7} />
        )}

        {/* Draw the stops */}
        {stops.map((stop, idx) => (
          <Marker key={idx} position={[stop.lat, stop.lng]} icon={icon}>
            <Popup>
              <div className="font-sans">
                <p className="font-bold text-sm m-0">{stop.name}</p>
                {stop.studentName && <p className="text-xs text-gray-600 m-0 mt-1">Student: {stop.studentName}</p>}
                {stop.eta && <p className="text-xs text-indigo-600 font-bold m-0 mt-1">ETA: {stop.eta}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Draw the selected location pin (when adding a new stop) */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={icon}>
            <Popup>Selected Location</Popup>
          </Marker>
        )}

        {/* Draw the live bus location */}
        {liveBusLocation && (
          <Marker position={[liveBusLocation.lat, liveBusLocation.lng]} icon={busIcon}>
            <Popup>Live Bus Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
