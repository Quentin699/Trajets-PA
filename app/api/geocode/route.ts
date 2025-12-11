import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'geo-cache.json');

// La Reunion Bounds (approximate)
const BOUNDS = {
    minLat: -21.4,
    maxLat: -20.8,
    minLon: 55.1,
    maxLon: 55.9
};

// Plaine des Cafres approximate center
const TARGET_CENTER = { lat: -21.22, lon: 55.56 };

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function ensureCacheExists() {
    if (!fs.existsSync(path.dirname(CACHE_FILE_PATH))) {
        fs.mkdirSync(path.dirname(CACHE_FILE_PATH), { recursive: true });
    }
    if (!fs.existsSync(CACHE_FILE_PATH)) {
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({}));
    }
}

function readCache() {
    ensureCacheExists();
    try {
        const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

function writeCache(cache: any) {
    try {
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.error("Failed to write to cache", e);
    }
}

function isValidReunionLocation(lat: number, lon: number) {
    return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat &&
        lon >= BOUNDS.minLon && lon <= BOUNDS.maxLon;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const cache = readCache();
    if (cache[address]) {
        return NextResponse.json(cache[address]);
    }

    // Clean address strategies
    // Remove "Bis", "Ter", parenthesis, phones, specific user notes like "portail noir"
    const cleanAddress = address
        .split('(')[0]
        .replace(/(\r\n|\n|\r)/gm, " ")
        .replace(/[0-9]{10}/g, "") // remove phones
        .replace(/\b(bis|ter|quater)\b/gi, "")
        .replace(/(\d{5})/g, "") // remove zip codes if present (sometimes wrong)
        .trim();

    // Regex to separate Number from Street if possible "12 rue de la paix"
    const matchStreet = cleanAddress.match(/^(\d+)[\s,]+(.+)$/);
    const streetOnly = matchStreet ? matchStreet[2] : cleanAddress;

    // Strategies ordered by precision
    // We explicitly append "Le Tampon" or "Plaine des Cafres" to force the search engine 
    // to look in the right city first.
    const strategies = [];

    // 1. Full address in Plaine des Cafres
    strategies.push(`${cleanAddress}, Plaine des Cafres, La Réunion`);
    // 2. Full address in Le Tampon
    strategies.push(`${cleanAddress}, Le Tampon, La Réunion`);

    if (streetOnly !== cleanAddress) {
        // 3. Street only in Plaine des Cafres/Tampon (to avoid number mismatch issues)
        strategies.push(`${streetOnly}, Plaine des Cafres, La Réunion`);
        strategies.push(`${streetOnly}, Le Tampon, La Réunion`);
    }

    // 4. Last resort: Just the address and "La Réunion" (risk of St Denis/St Pierre results)
    strategies.push(`${cleanAddress}, La Réunion`);

    let bestResult = null;
    let minDistanceToTarget = Infinity;

    // We want points roughly within 15km of Plaine des Cafres center (covers Tampon upto Bourg-Murat)
    // -21.22, 55.56 is roughly Plaine des Cafres / Bourg Murat
    const MAX_ACCEPTABLE_DISTANCE_KM = 20;

    // Helper to process results
    const processResults = (data: any[]) => {
        if (!data || data.length === 0) return null;

        // Filter valid Reunion points
        const validPoints = data.map((d: any) => ({
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
            displayName: d.display_name
        })).filter((p: any) => isValidReunionLocation(p.lat, p.lng));

        // Find best candidate in this batch
        for (const p of validPoints) {
            const dist = getDistance(p.lat, p.lng, TARGET_CENTER.lat, TARGET_CENTER.lon);

            // If we found a closer point than what we have, take it
            if (dist < minDistanceToTarget) {
                minDistanceToTarget = dist;
                bestResult = { lat: p.lat, lng: p.lng };
            }
        }
    };

    for (const query of strategies) {
        // If we already have a very good match (< 5km from center or at least < MAX and we tried precise queries), 
        // we might stop early? No, let's try to be thorough but efficient.
        // Actually, if we found something in strategy 1 (PdC specific) that is valid, it's likely the best.
        if (bestResult && minDistanceToTarget < 5) break;

        try {
            await new Promise(r => setTimeout(r, 1200)); // Rate limit roughly 1s
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
            const res = await fetch(url, { headers: { 'User-Agent': 'PatientRouteOptimizer/1.0' } });

            if (res.ok) {
                const data = await res.json();
                processResults(data);
            }
        } catch (e) {
            console.error("Geocoding fetch error:", e);
        }
    }

    if (bestResult && minDistanceToTarget < MAX_ACCEPTABLE_DISTANCE_KM) {
        cache[address] = bestResult;
        writeCache(cache);
        return NextResponse.json(bestResult);
    } else if (bestResult) {
        // We found something but it's far. 
        // In "Strict" mode requested by user, we might want to discard it or return it with a warning flag?
        // For now, let's return it IF it's the only thing we found, but maybe console log it.
        console.warn(`Address "${address}" found but at distance ${minDistanceToTarget}km from target center.`);
        // User said: "not too far". Let's reject if > 30km (e.g. St Denis). 20km is safe for Tampon.
        if (minDistanceToTarget < 30) {
            cache[address] = bestResult;
            writeCache(cache);
            return NextResponse.json(bestResult);
        }
    }

    return NextResponse.json({ error: "Not found or out of bounds" }, { status: 404 });
}
