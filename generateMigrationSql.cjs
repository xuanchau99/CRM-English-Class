const fs = require('fs');
const XLSX = require('xlsx');

// Hàm escape chuỗi cho SQL
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Đọc file .env thủ công (để lấy Teacher ID từ DB hoặc hardcode nếu biết)
// Nhưng vì SQL chạy trong SQL Editor nên không cần biết UUID của teacher_id.
// Ta có thể sub-query lấy admin đầu tiên!

function generateSql() {
  const workbook = XLSX.readFile('EnglishExamData.xlsx');
  
  // 1. Lấy 4 đề thi
  const targetTitles = ["E5 U1", "E4 U1", "E5 U2", "E3 U1"];
  const examsData = XLSX.utils.sheet_to_json(workbook.Sheets['Exams']);
  const targetExams = examsData.filter(exam => targetTitles.includes(exam.title));
  const targetExamIds = targetExams.map(e => e.exam_id);
  
  // 2. Lấy câu hỏi
  const questionsData = XLSX.utils.sheet_to_json(workbook.Sheets['Questions']);
  const targetQuestions = questionsData.filter(q => targetExamIds.includes(q.exam_id));

  let sql = `-- MIGRATION DỮ LIỆU TỪ EXCEL CŨ (Chạy trong SQL Editor)\n\n`;
  sql += `DO $$\nDECLARE\n  v_teacher_id UUID;\n  v_exam_id UUID;\nBEGIN\n`;
  sql += `  -- Lấy ID của giáo viên đầu tiên\n`;
  sql += `  SELECT id INTO v_teacher_id FROM public.profiles LIMIT 1;\n\n`;

  for (const exam of targetExams) {
    sql += `  -- Đề thi: ${exam.title}\n`;
    sql += `  INSERT INTO public.exams (exam_code, title, duration_minutes, shuffle_questions, shuffle_options, show_result, is_active, teacher_id)\n`;
    sql += `  VALUES (${escapeSql(exam.exam_id)}, ${escapeSql(exam.title)}, ${exam.duration_minutes || 15}, ${exam.shuffle_questions !== false}, ${exam.shuffle_options !== false}, ${exam.show_result !== false}, ${exam.active !== false}, v_teacher_id)\n`;
    sql += `  ON CONFLICT (exam_code) DO UPDATE SET title = EXCLUDED.title\n`;
    sql += `  RETURNING id INTO v_exam_id;\n\n`;

    const questionsForThisExam = targetQuestions.filter(q => q.exam_id === exam.exam_id);
    for (const q of questionsForThisExam) {
      let optionsArr = [];
      if (q.option_a) optionsArr.push(String(q.option_a));
      if (q.option_b) optionsArr.push(String(q.option_b));
      if (q.option_c) optionsArr.push(String(q.option_c));
      if (q.option_d) optionsArr.push(String(q.option_d));

      let finalType = q.type || 'multiple_choice';
      let correctAnsArr = q.correct_answer ? String(q.correct_answer).split(',').map(s => s.trim()) : [];
      let acceptedAnsArr = q.accepted_answers ? String(q.accepted_answers).split(',').map(s => s.trim()) : [];
      
      if (q.accepted_answers && String(q.accepted_answers).startsWith('[')) {
        acceptedAnsArr = [String(q.correct_answer)];
      }

      sql += `  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)\n`;
      sql += `  VALUES (\n`;
      sql += `    v_exam_id,\n`;
      sql += `    ${escapeSql(q.question_id)},\n`;
      sql += `    ${escapeSql(finalType)},\n`;
      sql += `    ${escapeSql(q.level || 'medium')},\n`;
      sql += `    ${escapeSql(q.question_text || '')},\n`;
      sql += `    ${optionsArr.length > 0 ? "'" + JSON.stringify(optionsArr).replace(/'/g, "''") + "'::jsonb" : "NULL"},\n`;
      sql += `    ${correctAnsArr.length > 0 ? "'" + JSON.stringify(correctAnsArr).replace(/'/g, "''") + "'::jsonb" : "NULL"},\n`;
      sql += `    ${acceptedAnsArr.length > 0 ? "'" + JSON.stringify(acceptedAnsArr).replace(/'/g, "''") + "'::jsonb" : "NULL"},\n`;
      sql += `    ${escapeSql(q.explanation || '')},\n`;
      sql += `    ${q.points || 1},\n`;
      sql += `    ${escapeSql(q.tags || '')},\n`;
      sql += `    ${q.active !== false}\n`;
      sql += `  );\n`;
    }
    sql += `\n`;
  }

  sql += `END;\n$$;\n`;

  fs.writeFileSync('migration_data.sql', sql);
  console.log('Đã tạo thành công file migration_data.sql');
}

generateSql();
