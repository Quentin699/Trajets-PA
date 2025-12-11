const fs = require('fs');

// Hardcoded logic replicated from optimization.ts for verification purpose
const HARDCODED_COORDINATES = {
    "35 impasse bardeur": { lat: -21.2313504, lng: 55.5360075 },
    "19 rue du coin tranquille": { lat: -21.2296056, lng: 55.5535214 },
    "104 rue raphael douyere": { lat: -21.2129177, lng: 55.5528211 },
    "25 chemin bassin plat": { lat: -21.2120151, lng: 55.5529293 }, // SYLVETTE T
    "57 chemin ah-kite": { lat: -21.2148283, lng: 55.5559969 },
    "60 rue des amethystes": { lat: -21.2196893, lng: 55.5546701 },
    "61 rue des amethystes": { lat: -21.2196893, lng: 55.5546701 },
    "75 rue des améthystes": { lat: -21.2196893, lng: 55.5546701 },
    "52 chemin deurveilher les bas": { lat: -21.217746, lng: 55.543459 },
    "84 c chemin des acacias": { lat: -21.2263934, lng: 55.5313327 },
    "26 chemin concession les bas": { lat: -21.2350443, lng: 55.566252 },
    "11 impasse riviere": { lat: -21.2725, lng: 55.5186 },
    "7 impasse rivière": { lat: -21.222, lng: 55.496 },
};

function check(address) {
    if (!address) return "EMPTY";

    // GPS check
    const gpsMatch = address.match(/([-+]?\d+[.,]\d+)\s*[;,\/]\s*([-+]?\d+[.,]\d+)/);
    if (gpsMatch) return "GPS_IN_TEXT";

    // Hardcode check
    const lowerAddr = address.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const [key, coords] of Object.entries(HARDCODED_COORDINATES)) {
        if (lowerAddr.includes(key)) {
            return `HARDCODED (${key}) -> [${coords.lat}, ${coords.lng}]`;
        }
    }
    return "MISSING (Needs Nominatim)";
}

// Load addresses from script output (simulated for simplicity)
const addresses = [
    "35 impasse BARDEUR",
    "19 RUE DU COIN TRANQUILLE",
    "11 IMP RIVIERE",
    "125 CHE DEURVEILHER LES HAUTS",
    "104 RUE RAPHAEL DOUYERE coordonee GPS: -21,2129177 ; 55,5528211",
    "25 chemin bassin plat (chemin en face de l'aire de jeu à coté du cabinet)", // SYLVETTE
    "57 chemin ah-kite",
    "60 rue des amethystes",
    "61 rue des amethystes, apartement 61.1",
    "75 rue des améthystes",
    "52 Chemin Deurveilher les Bas",
    "84 C Chemin des Acacias",
    "26 chemin concession les bas",
    "8 IMP DES CAPILLAIRES" // This one was missing from my hardcodes!
];

console.log("--- VERIFICATION REPORT ---");
addresses.forEach(addr => {
    console.log(`Checking "${addr}": ${check(addr)}`);
});
