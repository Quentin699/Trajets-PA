const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filename = 'trans_20domicile_20Adele 2.xls';
const filePath = path.join(process.cwd(), '..', filename);

console.log("Looking for file at:", filePath);

try {
    if (!fs.existsSync(filePath)) {
        console.error("File not found!");
    } else {
        const workbook = XLSX.readFile(filePath);
        console.log("Sheet Names:", JSON.stringify(workbook.SheetNames));

        workbook.SheetNames.forEach(name => {
            const sheet = workbook.Sheets[name];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log(`Sheet: ${name} - Headers:`, JSON.stringify(data[0]));
            if (data.length > 1) console.log(`Sheet: ${name} - Row 1:`, JSON.stringify(data[1]));
        });
    }
} catch (e) {
    console.error("Error reading file:", e);
}
