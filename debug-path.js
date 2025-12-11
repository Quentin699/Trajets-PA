const { getPatientRoutes } = require('./lib/data');

// Mock process.cwd if needed or run with ts-node
// Since it's TS, I might need to run it via npx tsx

console.log("Testing data loading...");
// But wait, lib/data uses 'fs' and 'path', it should work in node.
// Importing TS file in node requires ts-node or compilation.
// Quickest way: compiled JS is in .next/server/chunks/ ... complicated.
// I will just use a small JS script that mimics the logic to debug path.
const path = require('path');
const fs = require('fs');

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'patients.xls');
console.log("CWD:", process.cwd());
console.log("Target Path:", DATA_FILE_PATH);
console.log("Exists?", fs.existsSync(DATA_FILE_PATH));
