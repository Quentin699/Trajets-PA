import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { DayRoute, Patient } from '@/types';

// Assuming the file is copied to /data/patients.xls in the project root during build/runtime
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'patients.xls');

export async function getPatientRoutes(): Promise<DayRoute[]> {
    try {
        if (!fs.existsSync(DATA_FILE_PATH)) {
            console.error(`File not found at ${DATA_FILE_PATH}`);
            return [];
        }

        const fileBuffer = fs.readFileSync(DATA_FILE_PATH);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const routes: DayRoute[] = [];

        // Filter for sheets that likely contain days (or just all sheets)
        // The user mentioned "Lundi - Tableau 1", etc.
        workbook.SheetNames.forEach((sheetName) => {
            // Basic filtering: clean up sheet name to get the Day
            // "Lundi - Tableau 1" -> "Lundi"
            const dayName = sheetName.split('-')[0].trim();

            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

            const patients: Patient[] = jsonData.map((row, index) => {
                // Map Excel columns to our Patient type
                // Columns from inspection: "Nom de famille anonimisé","Prénom","Adresse","Numero Tel","Transmission","Ce que je fait"
                return {
                    id: `${dayName}-${index}`,
                    firstName: row['Prénom'] || '',
                    lastName: row['Nom de famille anonimisé'] || '',
                    address: row['Adresse'] || '',
                    phone: row['Numero Tel'] || '',
                    details: `${row['Transmission'] || ''} ${row['Ce que je fait'] || ''}`.trim(),
                };
            }).filter(p => p.address); // Filter out empty rows/addresses

            routes.push({
                dayName,
                patients
            });
        });

        return routes;

    } catch (error) {
        console.error("Error parsing Excel file:", error);
        return [];
    }
}
