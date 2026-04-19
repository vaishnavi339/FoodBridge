'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

// Custom Icons
const createPulseIcon = () => new L.DivIcon({
  html: `<div class="w-4 h-4 bg-[#1D9E75] rounded-full shadow-[0_0_0_4px_rgba(29,158,117,0.3)] animate-pulse"></div>`,
  className: 'custom-div-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const createPinIcon = (color) => new L.DivIcon({
  html: `<div style="background-color: ${color};" class="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md"></div>`,
  className: 'custom-div-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Helper component to auto-fit bounds
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, positions]);
  return null;
}

export default function DeliveryMap({ volunteerLocation, pickupLocation, dropLocation }) {
  // Safe default coordinates (Delhi)
  const defaultCenter = [28.6139, 77.2090];
  
  const positions = [
    volunteerLocation,
    pickupLocation,
    dropLocation
  ].filter(Boolean); // Only use truthy coords

  const polylineCoords = [pickupLocation, dropLocation].filter(Boolean);

  return (
    <div className="w-full h-full relative z-0">
      <style>{`
        .leaflet-container { background: #0d1117; }
        .custom-div-icon { background: none; border: none; }
      `}</style>
      <MapContainer 
        center={positions[0] || defaultCenter} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {volunteerLocation && (
          <Marker position={volunteerLocation} icon={createPulseIcon()} />
        )}
        
        {pickupLocation && (
          <Marker position={pickupLocation} icon={createPinIcon('#EF9F27')} /> // Orange Pin
        )}
        
        {dropLocation && (
          <Marker position={dropLocation} icon={createPinIcon('#378ADD')} /> // Blue Flag (color mapped)
        )}

        {polylineCoords.length === 2 && (
          <Polyline 
            positions={polylineCoords} 
            pathOptions={{ color: '#1D9E75', weight: 3, dashArray: '8, 8' }} 
          />
        )}
        
        <FitBounds positions={positions} />
      </MapContainer>
    </div>
  );
}
