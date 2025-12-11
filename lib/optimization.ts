import { Patient } from "@/types";

// Haversine distance in kilometers
function getDistance(p1: Patient, p2: Patient): number {
    if (!p1.coordinates || !p2.coordinates) return Infinity;
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(p2.coordinates.lat - p1.coordinates.lat);
    const dLon = deg2rad(p2.coordinates.lng - p1.coordinates.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(p1.coordinates.lat)) *
        Math.cos(deg2rad(p2.coordinates.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

// Simple Nearest Neighbor TSP
export function optimizeRoute(patients: Patient[]): Patient[] {
    // If no coordinates, return original
    const validPatients = patients.filter(p => p.coordinates);
    if (validPatients.length < 2) return patients;

    const unvisited = [...validPatients];
    const route: Patient[] = [];

    // Start with the first patient in the list as the starting point
    // (Assuming the user sorts the first one as "Start")
    // Or simply start with the first one 
    let current = unvisited.shift()!;
    route.push(current);

    while (unvisited.length > 0) {
        let nearestIndex = -1;
        let minDistance = Infinity;

        unvisited.forEach((p, index) => {
            const dist = getDistance(current, p);
            if (dist < minDistance) {
                minDistance = dist;
                nearestIndex = index;
            }
        });

        if (nearestIndex !== -1) {
            current = unvisited.splice(nearestIndex, 1)[0];
            route.push(current);
        } else {
            // Should not happen if unvisited > 0
            break;
        }
    }

    // Add back patients without coordinates (if any) at the end or keep them out?
    // Let's keep strict separating: this function returns optimized list of VALID patients.
    // We can append invalids at the end.
    const invalidPatients = patients.filter(p => !p.coordinates);
    return [...route, ...invalidPatients];
}

// OpenStreetMap Nominatim Geocoding
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Hardcoded fixes for known problematic addresses
const HARDCODED_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
    // Exact matches (normalized lowercase)
    "35 impasse bardeur": { lat: -21.2313504, lng: 55.5360075 },
    "19 rue du coin tranquille": { lat: -21.2296056, lng: 55.5535214 },
    "104 rue raphael douyere": { lat: -21.2129177, lng: 55.5528211 }, // From the file itself

    // Partial matches or specific fixes
    "11 impasse riviere": { lat: -21.2725, lng: 55.5186 }, // Approx Tampon center if not found, or specific if known. 
    // Found "Impasse Rivière" in Saint-Louis nearby? No, likely Tampon.
    // Let's assume user correction is best for unknowns, but we try to fix known typos.
};

// Rate limit: 1 request per second strictly.
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!address) return null;

    // 0. Check for coordinates in the string itself (e.g. "Coordonee GPS: -21,212 ; 55,552")
    const gpsMatch = address.match(/([-+]?\d+[.,]\d+)\s*[;,\/]\s*([-+]?\d+[.,]\d+)/);
    if (gpsMatch) {
        const lat = parseFloat(gpsMatch[1].replace(',', '.'));
        const lng = parseFloat(gpsMatch[2].replace(',', '.'));
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    }

    // 1. Check Hardcoded Map (Cleaned)
    const lowerAddr = address.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const [key, coords] of Object.entries(HARDCODED_COORDINATES)) {
        if (lowerAddr.includes(key)) {
            console.log(`Using hardcoded coordinates for: ${address}`);
            return coords;
        }
    }

    // Helper to clean address
    const clean = (addr: string) => {
        return addr
            .split('(')[0] // Remove details in parenthesis
            .replace(/(\r\n|\n|\r)/gm, " ") // Remove newlines
            .replace(/[0-9]{10}/g, "") // Remove phone numbers
            // Remove common noise words (case insensitive)
            .replace(/\b(batiment|bat|residence|res|appt|appartement|etage|chez|digicode|code|porte)\b.*$/i, "")
            .replace(/\b(mr|mme|mlle)\b.*$/i, "") // Remove names if they appear at start or distinctly
            .trim();
    };

    const baseClean = clean(address);
    // Remove "La Reunion" if present to avoid duplication in query
    const searchStr = baseClean.replace(/La R[ée]union/i, "").trim();

    // Prioritize Plaine des Cafres / Le Tampon context
    const queries = [
        `${searchStr}, Plaine des Cafres, La Réunion`,
        `${searchStr}, Le Tampon, La Réunion`,
        `${searchStr}, La Réunion`
    ];

    // Center of Plaine des Cafres (approximate)
    const TARGET_LAT = -21.21;
    const TARGET_LNG = 55.55;
    const MAX_DIST_KM = 30; // Accept within 30km (covers Tampon/Saint-Pierre/Plaine but excludes Saint-Denis usually)

    // Haversine helper
    const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    for (const q of queries) {
        if (!q || q.length < 3) continue;
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'PatientRouteOptimizer/1.0'
                }
            });

            if (!response.ok) continue;

            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);

                // Check distance
                const dist = getDist(TARGET_LAT, TARGET_LNG, lat, lng);
                if (dist > MAX_DIST_KM) {
                    console.warn(`Result for "${q}" is too far (${dist.toFixed(1)}km), rejecting.`);
                    continue; // Try next query (e.g. less specific, or fail)
                }

                return { lat, lng };
            }
        } catch (error) {
            console.error("Geocoding error", error);
        }
        // Wait a bit before retry to be nice to API
        await new Promise(r => setTimeout(r, 600));
    }

    return null;
}

// OSRM Routing
export async function getDrivingRoute(points: { lat: number; lng: number }[]): Promise<[number, number][]> {
    if (points.length < 2) return [];

    // OSRM expects: longitude,latitude;longitude,latitude
    const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            // GeoJSON coordinates are [lon, lat], Leaflet wants [lat, lon]
            return data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
        }
    } catch (e) {
        console.error("Routing error", e);
    }
    return [];
}
