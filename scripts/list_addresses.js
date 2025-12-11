const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'patients.xls');

try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
        console.error(`File not found at ${DATA_FILE_PATH}`);
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(DATA_FILE_PATH);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const patients = [];

    workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        jsonData.forEach(row => {
            if (row['Adresse']) {
                patients.push({
                    name: `${row['Prénom'] || ''} ${row['Nom de famille anonimisé'] || ''}`.trim(),
                    address: row['Adresse'].trim()
                });
            }
        });
    });

    console.log(JSON.stringify(patients, null, 2));

} catch (error) {
    console.error("Error:", error);
}
