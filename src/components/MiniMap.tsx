import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MiniMapProps {
    latitude: number;
    longitude: number;
    radius?: number; // Radius in meters for tolerance circle
    zoom?: number;
    height?: string;
    className?: string;
}

// Component to recenter map when coordinates change
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();

    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], map.getZoom());
        }
    }, [lat, lng, map]);

    return null;
}

const MiniMap = ({
    latitude,
    longitude,
    radius,
    zoom = 16,
    height = '200px',
    className = ''
}: MiniMapProps) => {
    // Don't render if coordinates are invalid
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return (
            <div
                className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}
                style={{ height }}
            >
                <p className="text-sm text-slate-400 dark:text-slate-500">
                    Localização não definida
                </p>
            </div>
        );
    }

    return (
        <div
            className={`rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
            style={{ height }}
        >
            <MapContainer
                center={[latitude, longitude]}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                dragging={true}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[latitude, longitude]} />
                {radius && radius > 0 && (
                    <Circle
                        center={[latitude, longitude]}
                        radius={radius}
                        pathOptions={{
                            color: '#3b82f6',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.15,
                            weight: 2
                        }}
                    />
                )}
                <RecenterMap lat={latitude} lng={longitude} />
            </MapContainer>
        </div>
    );
};

export default MiniMap;
