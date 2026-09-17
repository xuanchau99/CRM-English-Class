const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('EnglishExamData.xlsx');
console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log('Headers:', json[0]);
  console.log('Row 2:', json[1]);
}
