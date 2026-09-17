const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

// Đọc file .env thủ công
const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});
const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  console.log('--- Bắt đầu lấy dữ liệu Excel ---');
  const workbook = XLSX.readFile('EnglishExamData.xlsx');
  
  // 1. Lấy 4 đề thi
  const targetTitles = ["E5 U1", "E4 U1", "E5 U2", "E3 U1"];
  const examsData = XLSX.utils.sheet_to_json(workbook.Sheets['Exams']);
  const targetExams = examsData.filter(exam => targetTitles.includes(exam.title));
  const targetExamIds = targetExams.map(e => e.exam_id);
  
  // 2. Lấy 63 câu hỏi
  const questionsData = XLSX.utils.sheet_to_json(workbook.Sheets['Questions']);
  const targetQuestions = questionsData.filter(q => targetExamIds.includes(q.exam_id));

  console.log(`Đã tìm thấy ${targetExams.length} đề thi và ${targetQuestions.length} câu hỏi.`);

  // 3. Lấy UUID của Giáo viên hiện tại từ Supabase
  console.log('--- Đang lấy thông tin Giáo viên từ Supabase ---');
  const { data: profiles, error: profileErr } = await supabase.from('profiles').select('id').limit(1);
  if (profileErr || !profiles || profiles.length === 0) {
    console.error('Lỗi: Không tìm thấy giáo viên nào trong bảng profiles. Vui lòng tạo 1 tài khoản trước.', profileErr);
    return;
  }
  const teacherId = profiles[0].id;
  console.log('Teacher ID hợp lệ:', teacherId);

  // 4. Transform & Insert Exams
  console.log('--- Bắt đầu Insert Đề thi ---');
  for (const exam of targetExams) {
    // Kiểm tra xem đề đã tồn tại chưa (dựa theo exam_code)
    const { data: existExam } = await supabase.from('exams').select('id').eq('exam_code', exam.exam_id).single();
    
    let dbExamId;
    if (existExam) {
      console.log(`Đề thi ${exam.title} (${exam.exam_id}) đã tồn tại, tiến hành cập nhật...`);
      dbExamId = existExam.id;
      await supabase.from('exams').update({
        title: exam.title,
        duration_minutes: exam.duration_minutes || 15,
        shuffle_questions: exam.shuffle_questions !== false,
        shuffle_options: exam.shuffle_options !== false,
        show_result: exam.show_result !== false,
        is_active: exam.active !== false
      }).eq('id', dbExamId);
    } else {
      console.log(`Tạo mới đề thi ${exam.title} (${exam.exam_id})...`);
      const { data: newExam, error: exErr } = await supabase.from('exams').insert({
        exam_code: exam.exam_id,
        title: exam.title,
        duration_minutes: exam.duration_minutes || 15,
        shuffle_questions: exam.shuffle_questions !== false,
        shuffle_options: exam.shuffle_options !== false,
        show_result: exam.show_result !== false,
        is_active: exam.active !== false,
        teacher_id: teacherId
      }).select('id').single();
      
      if (exErr) {
        console.error('Lỗi khi insert đề thi:', exErr);
        continue;
      }
      dbExamId = newExam.id;
    }

    // 5. Transform & Insert Questions cho đề thi này
    const questionsForThisExam = targetQuestions.filter(q => q.exam_id === exam.exam_id);
    console.log(`-> Đang insert ${questionsForThisExam.length} câu hỏi cho đề ${exam.title}...`);
    
    for (const q of questionsForThisExam) {
      // Build options array (cho trắc nghiệm)
      let optionsArr = [];
      if (q.option_a) optionsArr.push(String(q.option_a));
      if (q.option_b) optionsArr.push(String(q.option_b));
      if (q.option_c) optionsArr.push(String(q.option_c));
      if (q.option_d) optionsArr.push(String(q.option_d));

      let finalType = q.type || 'multiple_choice';
      let correctAnsArr = q.correct_answer ? String(q.correct_answer).split(',').map(s => s.trim()) : [];
      let acceptedAnsArr = q.accepted_answers ? String(q.accepted_answers).split(',').map(s => s.trim()) : [];
      
      // Fix mảng lỗi string từ java "[Ljava.lang.Object;@..."
      if (q.accepted_answers && String(q.accepted_answers).startsWith('[')) {
        acceptedAnsArr = [String(q.correct_answer)]; // Tạm dùng correct answer
      }

      await supabase.from('questions').insert({
        exam_id: dbExamId, // ID thực sự trong Postgres UUID
        question_code: q.question_id,
        type: finalType,
        level: q.level || 'medium',
        question_text: q.question_text || '',
        options: optionsArr.length > 0 ? optionsArr : null,
        correct_answer: correctAnsArr.length > 0 ? correctAnsArr : null,
        accepted_answers: acceptedAnsArr.length > 0 ? acceptedAnsArr : null,
        explanation: q.explanation || '',
        points: q.points || 1,
        tags: q.tags || '',
        is_active: q.active !== false
      });
    }
  }
  
  console.log('--- HOÀN TẤT IMPORT DỮ LIỆU ---');
}

importData();
