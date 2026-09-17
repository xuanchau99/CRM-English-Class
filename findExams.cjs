const XLSX = require('xlsx');

const workbook = XLSX.readFile('EnglishExamData.xlsx');
const examsSheet = workbook.Sheets['Exams'];
const examsData = XLSX.utils.sheet_to_json(examsSheet);

const targetTitles = ["E5 U1", "E4 U1", "E5 U2", "E3 U1"];
const targetExams = examsData.filter(exam => targetTitles.includes(exam.title));

console.log("Found Exams:");
console.log(targetExams);

const questionsSheet = workbook.Sheets['Questions'];
const questionsData = XLSX.utils.sheet_to_json(questionsSheet);

const targetExamIds = targetExams.map(e => e.exam_id);
const targetQuestions = questionsData.filter(q => targetExamIds.includes(q.exam_id));

console.log(`\nFound ${targetQuestions.length} questions for these exams.`);
