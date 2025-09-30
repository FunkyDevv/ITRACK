import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, initialLocation }) => {
  const [position, setPosition] = useState<[number, number]>(
    initialLocation ? [initialLocation.latitude, initialLocation.longitude] : [14.5995, 120.9842] // Manila coordinates
  );
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Add search input dark mode styles
  const searchInputStyle = {
    backgroundColor: 'var(--input)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
    padding: '0.5rem',
    borderRadius: 'var(--radius)',
    width: '100%'
  };

  // Reverse geocoding function
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      const fullAddress = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fullAddress);
      onLocationSelect({
        address: fullAddress,
        latitude: lat,
        longitude: lng,
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      onLocationSelect({
        address: fallbackAddress,
        latitude: lat,
        longitude: lng,
      });
    }
  };

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      // Create map
      const map = L.map(mapRef.current).setView(position, 13);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Add marker
      const marker = L.marker(position).addTo(map);
      marker.bindPopup(`Selected location: ${address || `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`}`).openPopup();

      // Handle map clicks
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        handleLocationUpdate(lat, lng);
      });

      leafletMapRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update marker position when position changes
  useEffect(() => {
    if (leafletMapRef.current && markerRef.current) {
      markerRef.current.setLatLng(position);
      markerRef.current.setPopupContent(`Selected location: ${address || `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`}`);
      leafletMapRef.current.setView(position);
    }
  }, [position, address]);

  // Handle location updates from map clicks
  const handleLocationUpdate = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    reverseGeocode(lat, lng);
  };

  // Search function
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Philippines')}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPosition: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPosition);
        setAddress(display_name);
        onLocationSelect({
          address: display_name,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  useEffect(() => {
    if (initialLocation) {
      setPosition([initialLocation.latitude, initialLocation.longitude]);
      setAddress(initialLocation.address);
    }
  }, [initialLocation]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a location in Philippines..."
          className="flex-1 px-3 py-2 bg-input border border-input text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Search
        </button>
      </div>

      {/* Selected Address Display */}
      {address && (
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
          <strong>Selected Location:</strong> {address}
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapRef}
        className="h-64 w-full border border-input rounded-md overflow-hidden"
        style={{ height: '256px', width: '100%' }}
      />

      <p className="text-xs text-muted-foreground">
        Click on the map to select a location, or use the search box above.
      </p>
    </div>
  );
};

export default LocationPicker;
