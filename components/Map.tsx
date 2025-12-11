"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Patient } from "@/types";

// Component to fit bounds
function FitBounds({ patients }: { patients: Patient[] }) {
    const map = useMap();

    useEffect(() => {
        const validPoints = patients
            .filter(p => p.coordinates)
            .map(p => [p.coordinates!.lat, p.coordinates!.lng] as [number, number]);

        if (validPoints.length > 0) {
            map.fitBounds(validPoints, { padding: [50, 50] });
        }
    }, [patients, map]);

    return null;
}

interface MapProps {
    patients: Patient[];
    selectedPatientId?: string | null;
    onPatientSelect: (id: string) => void;
    routePath?: [number, number][]; // Array of [lat, lng]
}

export default function Map({ patients, selectedPatientId, onPatientSelect, routePath }: MapProps) {
    const [mounted, setMounted] = useState(false);
    const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

    useEffect(() => {
        setMounted(true);
    }, []);

    // Create memoized icons to avoid recreation on every render
    const createIcon = (index: number, isSelected: boolean) => {
        return L.divIcon({
            className: 'custom-div-icon', // Empty class to avoid default styles interfering
            html: `
                <div class="relative flex items-center justify-center">
                    ${isSelected ? `<div class="absolute w-full h-full bg-emerald-400 rounded-full animate-ping opacity-75"></div>` : ''}
                    <div class="relative flex items-center justify-center w-${isSelected ? '10' : '8'} h-${isSelected ? '10' : '8'} 
                                ${isSelected ? 'bg-emerald-600 text-white z-20' : 'bg-white text-emerald-700 border-2 border-emerald-500 z-10'} 
                                rounded-full shadow-lg transition-all duration-300 transform font-bold text-sm">
                        ${index + 1}
                    </div>
                    ${isSelected ? '<div class="absolute -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-600"></div>' : ''}
                </div>
            `,
            iconSize: isSelected ? [40, 40] : [32, 32],
            iconAnchor: isSelected ? [20, 25] : [16, 16],
            popupAnchor: [0, -20],
        });
    };

    if (!mounted) return <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />;

    const defaultCenter: [number, number] = [-21.115, 55.536];

    return (
        <MapContainer
            center={defaultCenter}
            zoom={10}
            className="h-full w-full z-0"
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            <FitBounds patients={patients} />

            {/* Render Route Polyline Under Markers */}
            {routePath && routePath.length > 1 && (
                <Polyline
                    positions={routePath}
                    pathOptions={{
                        color: "#10b981",
                        weight: 6,
                        opacity: 0.6,
                        lineCap: 'round',
                        dashArray: '10, 10'
                    }}
                />
            )}

            {patients.map((patient, index) => (
                patient.coordinates && (
                    <Marker
                        key={patient.id}
                        position={[patient.coordinates.lat, patient.coordinates.lng]}
                        icon={createIcon(index, selectedPatientId === patient.id)}
                        zIndexOffset={selectedPatientId === patient.id ? 1000 : 0}
                        ref={(element) => {
                            if (element) {
                                markerRefs.current[patient.id] = element;
                            }
                        }}
                        eventHandlers={{
                            click: () => onPatientSelect(patient.id),
                        }}
                    >
                        <Tooltip
                            direction="top"
                            offset={[0, -20]}
                            opacity={1}
                            className="bg-white px-3 py-1 shadow-xl rounded-lg border-0 text-slate-800 font-bold text-xs"
                        >
                            {index + 1}. {patient.firstName} {patient.lastName}
                        </Tooltip>
                    </Marker>
                )
            ))}
        </MapContainer>
    );
}
