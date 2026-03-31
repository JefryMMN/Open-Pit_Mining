import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '../store/useAppStore';

// Fix marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const FitBounds: React.FC<{ coords: [number, number][] | null }> = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords && coords.length > 0) {
            map.fitBounds(coords, { padding: [80, 80] });
        }
    }, [map, coords]);
    return null;
};

// Component to show mouse position coordinates
const MousePosition: React.FC = () => {
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

    useMapEvents({
        mousemove(e) {
            setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
        mouseout() {
            setPosition(null);
        },
    });

    if (!position) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(30, 58, 95, 0.95)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
            <strong>Lat:</strong> {position.lat.toFixed(6)} | <strong>Lng:</strong> {position.lng.toFixed(6)}
        </div>
    );
};

export const MapView: React.FC = () => {
    const { boundaryPolygon, miningZones, gridCells, layers } = useAppStore();

    const boundaryPositions = boundaryPolygon
        ? (boundaryPolygon.geometry.coordinates[0] as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number])
        : null;

    return (
        <MapContainer
            center={[9.85, 76.97]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
        >
            {/* Satellite Layer */}
            <TileLayer
                attribution='Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />

            {/* Mouse Position Display */}
            <MousePosition />

            {boundaryPositions && <FitBounds coords={boundaryPositions} />}

            {/* Lease Boundary - Yellow dashed */}
            {boundaryPositions && (
                <Polygon
                    positions={boundaryPositions}
                    pathOptions={{
                        color: '#ca8a04',
                        weight: 3,
                        fillColor: '#fef08a',
                        fillOpacity: 0.15,
                        dashArray: '8, 6',
                    }}
                >
                    <Popup>
                        <strong>Authorized Boundary</strong>
                        <p style={{ fontSize: '11px', margin: '4px 0 0' }}>Mining permitted within this zone</p>
                    </Popup>
                </Polygon>
            )}

            {/* Grid Cells */}
            {layers.grid && gridCells.map((cell) => {
                const coords = cell.polygon.geometry.coordinates[0] as [number, number][];
                const positions = coords.map(([lng, lat]) => [lat, lng] as [number, number]);

                let pathOptions: L.PathOptions = {
                    color: '#64748b',
                    weight: 0.5,
                    fillOpacity: 0,
                };

                if (cell.status === 'Potential Illegal') {
                    pathOptions = {
                        color: '#ef4444',
                        weight: 1,
                        fillColor: '#ef4444',
                        fillOpacity: 0.25,
                    };
                } else if (cell.status === 'Legal') {
                    pathOptions = {
                        color: '#22c55e',
                        weight: 1,
                        fillColor: '#22c55e',
                        fillOpacity: 0.2,
                    };
                }

                return (
                    <Polygon key={cell.id} positions={positions} pathOptions={pathOptions}>
                        <Popup>
                            <strong>{cell.id}</strong>
                            <p style={{ fontSize: '11px', margin: '4px 0 0' }}>
                                Mining: {cell.miningDetected ? 'Yes' : 'No'}<br />
                                Status: <span style={{ color: cell.status === 'Potential Illegal' ? '#ef4444' : '#22c55e' }}>{cell.status}</span>
                            </p>
                        </Popup>
                    </Polygon>
                );
            })}

            {/* Legal Mining Zones - Green */}
            {layers.mining && miningZones.filter(z => z.isLegal).map((zone) => {
                const coords = zone.polygon.geometry.coordinates[0] as [number, number][];
                const positions = coords.map(([lng, lat]) => [lat, lng] as [number, number]);

                return (
                    <Polygon
                        key={zone.id}
                        positions={positions}
                        pathOptions={{
                            color: '#22c55e',
                            weight: 3,
                            fillColor: '#22c55e',
                            fillOpacity: 0.45,
                        }}
                    >
                        <Popup>
                            <strong style={{ color: '#22c55e' }}>Compliant Mining Area</strong>
                            <p style={{ fontSize: '11px', margin: '4px 0 0' }}>Zone ID: {zone.id}</p>
                        </Popup>
                    </Polygon>
                );
            })}

            {/* Illegal Mining Zones - Red */}
            {layers.illegal && miningZones.filter(z => !z.isLegal).map((zone) => {
                const coords = zone.polygon.geometry.coordinates[0] as [number, number][];
                const positions = coords.map(([lng, lat]) => [lat, lng] as [number, number]);

                return (
                    <Polygon
                        key={zone.id}
                        positions={positions}
                        pathOptions={{
                            color: '#ef4444',
                            weight: 3,
                            fillColor: '#ef4444',
                            fillOpacity: 0.5,
                        }}
                    >
                        <Popup>
                            <strong style={{ color: '#ef4444' }}>⚠ Illegal Mining Area</strong>
                            <p style={{ fontSize: '11px', margin: '4px 0 0' }}>Zone ID: {zone.id}</p>
                            <p style={{ fontSize: '11px', color: '#ef4444' }}>Outside authorized boundary</p>
                        </Popup>
                    </Polygon>
                );
            })}
        </MapContainer>
    );
};

