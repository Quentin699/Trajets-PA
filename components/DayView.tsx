"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Patient, DayRoute } from "@/types";
import { geocodeAddress, optimizeRoute, getDrivingRoute } from "@/lib/optimization";
import { ArrowLeft, RefreshCw, Wand2, ListOrdered, Navigation, Phone, MapPin, Search } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

// Dynamically import Map
const Map = dynamic(() => import("./Map"), { ssr: false });

interface DayViewProps {
    initialRoute: DayRoute;
}

export default function DayView({ initialRoute }: DayViewProps) {
    const [patients, setPatients] = useState<Patient[]>(initialRoute.patients);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [mode, setMode] = useState<"strict" | "optimized">("strict");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [routePath, setRoutePath] = useState<[number, number][]>([]);
    const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // --- Effects & Logic (Kept from original) ---

    // Scroll into view
    useEffect(() => {
        if (selectedId && itemRefs.current[selectedId]) {
            itemRefs.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [selectedId]);

    // Initial Geocoding
    useEffect(() => {
        const fetchCoordinates = async () => {
            setLoading(true);
            const updatedPatients = [...patients];
            let resolvedCount = 0;

            for (let i = 0; i < updatedPatients.length; i++) {
                const p = updatedPatients[i];
                // Check cache first
                const cacheKey = `geo-v2-${p.address}`;
                const cached = localStorage.getItem(cacheKey);

                if (cached) {
                    p.coordinates = JSON.parse(cached);
                } else if (!p.coordinates && p.address) {
                    await new Promise(r => setTimeout(r, 1100)); // Rate limit
                    const coords = await geocodeAddress(p.address);
                    if (coords) {
                        p.coordinates = coords;
                        localStorage.setItem(cacheKey, JSON.stringify(coords));
                    }
                }
                resolvedCount++;
                setProgress(Math.round((resolvedCount / updatedPatients.length) * 100));
                setPatients([...updatedPatients]);
            }
            setLoading(false);
        };

        if (patients.some(p => !p.coordinates)) {
            fetchCoordinates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Optimization Logic
    const displayedPatients = mode === "optimized" ? optimizeRoute(patients) : patients;
    const selectedPatient = displayedPatients.find(p => p.id === selectedId);

    // Route Path
    useEffect(() => {
        const fetchRoute = async () => {
            const validPoints = displayedPatients
                .filter(p => p.coordinates)
                .map(p => p.coordinates!);

            if (validPoints.length > 1) {
                const path = await getDrivingRoute(validPoints);
                setRoutePath(path);
            } else {
                setRoutePath([]);
            }
        };
        fetchRoute();
    }, [displayedPatients, mode]);

    // Modal State
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [tempAddress, setTempAddress] = useState("");

    const openEditModal = (patient: Patient) => {
        setEditingPatient(patient);
        setTempAddress(patient.address || "");
    };

    const closeEditModal = () => {
        setEditingPatient(null);
        setTempAddress("");
    };

    const saveAddress = async () => {
        if (!editingPatient || !tempAddress) return;

        // Update local state temporarily
        const updatedPatients = patients.map(p => {
            if (p.id === editingPatient.id) {
                return { ...p, address: tempAddress, coordinates: undefined };
            }
            return p;
        });
        setPatients(updatedPatients);
        closeEditModal();

        // Re-run geocoding for this specific patient
        setLoading(true);
        const coords = await geocodeAddress(tempAddress);

        if (coords) {
            const finalizedPatients = updatedPatients.map(p => {
                if (p.id === editingPatient.id) {
                    return { ...p, coordinates: coords };
                }
                return p;
            });
            setPatients(finalizedPatients);
            localStorage.setItem(`geo-v2-${tempAddress}`, JSON.stringify(coords));
        } else {
            alert("Impossible de trouver cette nouvelle adresse (même avec la correction).");
            setLoading(false);
        }
    };

    // Fix Address Handler (Triggered by button)
    const handleFixAddress = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        if (patient) openEditModal(patient);
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden relative">

            {/* Address Correction Modal */}
            <AnimatePresence>
                {editingPatient && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={closeEditModal} // Click outside to close
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Corriger l'adresse</h2>
                            <p className="text-sm text-slate-500 mb-4">
                                L'adresse actuelle de <strong>{editingPatient.firstName}</strong> n'a pas été trouvée.
                            </p>

                            <label className="block text-xs font-semibold text-slate-700 mb-2">Nouvelle adresse :</label>
                            <input
                                type="text"
                                value={tempAddress}
                                onChange={(e) => setTempAddress(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none mb-6"
                                placeholder="Ex: 8 rue de la Gare, Le Tampon"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && saveAddress()}
                            />

                            <div className="flex space-x-3 justify-end">
                                <button
                                    onClick={closeEditModal}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={saveAddress}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-emerald-200 transition-all hover:scale-105"
                                >
                                    Valider
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- SIDEBAR --- */}
            <aside className="w-full md:w-[450px] bg-white z-20 shadow-2xl flex flex-col border-r border-slate-100 relative">

                {/* Header */}
                <div className="p-6 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <Link href="/" className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-800">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold font-heading text-slate-900">{initialRoute.dayName}</h1>
                            <p className="text-slate-500 text-sm font-medium">{displayedPatients.length} patients à visiter</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex bg-slate-100/50 p-1.5 rounded-xl border border-slate-100">
                        <button
                            onClick={() => setMode("strict")}
                            className={clsx(
                                "flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all",
                                mode === "strict"
                                    ? "bg-white text-slate-900 shadow-sm border border-slate-100"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <ListOrdered className="w-4 h-4 mr-2" />
                            Ordre strict
                        </button>
                        <button
                            onClick={() => setMode("optimized")}
                            className={clsx(
                                "flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all",
                                mode === "optimized"
                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Wand2 className="w-4 h-4 mr-2" />
                            Optimisé
                        </button>
                    </div>

                    {loading && (
                        <div className="mt-4 p-3 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium flex items-center animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                            Géocodage en cours... {progress}%
                        </div>
                    )}
                </div>

                {/* Patient List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    <AnimatePresence>
                        {displayedPatients.map((patient, idx) => (
                            <motion.div
                                key={patient.id}
                                layoutId={patient.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                ref={(el) => { if (el) itemRefs.current[patient.id] = el; }}
                                onClick={() => setSelectedId(patient.id)}
                            >
                                <div className={clsx(
                                    "p-4 rounded-xl border transition-all cursor-pointer relative group",
                                    selectedId === patient.id
                                        ? "bg-white border-emerald-500 shadow-lg ring-1 ring-emerald-500 z-10"
                                        : "bg-white border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-md"
                                )}>
                                    <div className="flex items-start gap-3">
                                        <div className={clsx(
                                            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-inner",
                                            selectedId === patient.id ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className={clsx("font-bold truncate pr-2", selectedId === patient.id ? "text-emerald-700" : "text-slate-800")}>
                                                    {patient.firstName} {patient.lastName}
                                                </h3>
                                            </div>

                                            <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center">
                                                <MapPin className="w-3 h-3 mr-1 opacity-50" />
                                                {patient.address}
                                            </p>

                                            {!patient.coordinates && !loading && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFixAddress(patient.id);
                                                    }}
                                                    className="mt-2 text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-medium flex items-center hover:bg-red-100 transition-colors w-fit"
                                                >
                                                    <Search className="w-3 h-3 mr-1" />
                                                    Corriger l'adresse
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Patient Details (Health & Transmission) */}
                                    {patient.details && (
                                        <div className={clsx(
                                            "mt-3 text-xs p-2.5 rounded-lg border leading-relaxed",
                                            selectedId === patient.id
                                                ? "bg-emerald-50 text-emerald-900 border-emerald-100"
                                                : "bg-slate-50 text-slate-600 border-slate-100"
                                        )}>
                                            <span className="font-bold block text-[10px] uppercase tracking-wider opacity-70 mb-1">Soins & Transmission</span>
                                            {patient.details}
                                        </div>
                                    )}

                                    {/* Action Bar (Visible only when selected) */}
                                    {selectedId === patient.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-3 pt-3 border-t border-slate-50 flex gap-2"
                                        >
                                            {patient.phone && (
                                                <a href={`tel:${patient.phone}`} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors">
                                                    <Phone className="w-3 h-3 mr-2" /> Appeler
                                                </a>
                                            )}
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(patient.address || "")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors shadow-sm"
                                            >
                                                <Navigation className="w-3 h-3 mr-2" /> GPS
                                            </a>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </aside>

            {/* --- MAP AREA --- */}
            <main className="flex-1 relative h-[55vh] md:h-full bg-slate-100">
                <Map
                    patients={displayedPatients}
                    selectedPatientId={selectedId}
                    onPatientSelect={setSelectedId}
                    routePath={routePath}
                />

                {/* Legend Overlay */}
                <div className="absolute top-4 right-4 z-[400] glass-panel p-4 rounded-xl hidden md:block pointer-events-none">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center mb-1">
                        <Navigation className="w-3 h-3 mr-1.5 text-emerald-500" />
                        Légende
                    </h4>
                    <div className="text-[10px] text-slate-500 space-y-1">
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Patient sélectionné</div>
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-slate-400 mr-2"></div> Patient en attente</div>
                    </div>
                </div>

                {/* Floating Card for Details (Desktop Overlay) - Optional, but sidebar is robust now so maybe redundant? 
                    Actually, let's keep it minimal or verify if sidebar is enough. 
                    The sidebar is wider now (450px), so it holds the details well.
                    I will remove the massive floating card to avoid clutter, as the sidebar highlights the selected patient nicely.
                */}
            </main>
        </div>
    );
}
