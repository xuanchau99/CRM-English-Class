import { supabase } from '../lib/supabase';

export const studentRepository = {
  // Lấy thông tin cơ bản của Đề thi (Public)
  getExamInfo: async (examCode) => {
    const { data, error } = await supabase
      .from('exams')
      .select('id, exam_code, title, duration_minutes, shuffle_questions, shuffle_options, show_result')
      .eq('exam_code', examCode)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  },

  // Kiểm tra học sinh đã nộp bài chưa
  checkStudentSubmission: async (examCode, studentName, className) => {
    const { data, error } = await supabase.rpc('check_student_submission', {
      p_exam_code: examCode,
      p_student_name: studentName,
      p_class_name: className || ''
    });

    if (error) throw error;
    return data;
  },

  // Lấy danh sách câu hỏi an toàn (Đã giấu đáp án qua RPC, có fallback nếu RPC chưa tồn tại)
  getStudentQuestions: async (examCode) => {
    // Thử dùng RPC trước
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_student_questions', { p_exam_code: examCode });

    if (!rpcError && rpcData) return rpcData;

    // Fallback: query trực tiếp nếu RPC chưa tồn tại
    const { data: examData, error: examErr } = await supabase
      .from('exams')
      .select('id')
      .eq('exam_code', examCode)
      .single();
    if (examErr) throw examErr;

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, type, question_text, options, correct_answer, accepted_answers, points, order_index')
      .eq('exam_id', examData.id)
      .eq('is_deleted', false)
      .order('order_index', { ascending: true });

    if (qErr) throw qErr;

    // Giấu đáp án đúng khi trả về cho học sinh nhưng phải truyền đủ dữ liệu cần thiết (words cho arrange_sentence)
    return (questions || []).map(q => {
      let extraData = {};
      if (q.type === 'arrange_sentence') {
        extraData.words = (q.correct_answer || '').split(' ').filter(w => w.trim());
      }
      return {
        ...q,
        ...extraData,
        correct_answer: undefined,
        accepted_answers: undefined
      };
    });
  },

  // Nộp bài và tự động chấm điểm qua RPC (hoặc fallback thủ công)
  submitExam: async (examCode, studentName, className, durationSeconds, answersArray) => {
    // Thử dùng RPC trước
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('submit_exam_result', {
        p_exam_code: examCode,
        p_student_name: studentName,
        p_class_name: className,
        p_duration_seconds: durationSeconds,
        p_answers: answersArray
      });

    if (!rpcError && rpcData) return rpcData;

    // Fallback: chấm điểm thủ công nếu RPC chưa tồn tại
    const { data: examData, error: examErr } = await supabase
      .from('exams').select('id').eq('exam_code', examCode).single();
    if (examErr) throw examErr;

    const { data: allQ } = await supabase
      .from('questions').select('id, correct_answer, accepted_answers, points, type')
      .eq('exam_id', examData.id).eq('is_deleted', false);

    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    (allQ || []).forEach(q => {
      const qPoints = q.points || 1;
      totalPoints += qPoints;
      const submitted = answersArray.find(a => a.question_id === q.id);
      const userAns = (submitted?.answer || '').trim().toLowerCase();
      const correctAns = (q.correct_answer || '').trim().toLowerCase();
      const accepted = Array.isArray(q.accepted_answers)
        ? q.accepted_answers.map(a => a.trim().toLowerCase())
        : [];

      if (q.type === 'matching') {
        let parsedUser = [];
        try { parsedUser = JSON.parse(submitted?.answer || '[]'); } catch(e){}
        const userMatching = Array.isArray(parsedUser) ? parsedUser.join('\n').trim().toLowerCase() : '';
        if (userMatching === correctAns) {
          correctCount++;
          earnedPoints += qPoints;
        }
      } else if (q.type === 'multiple_choice') {
        const userSet = userAns.split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
        const correctSet = correctAns.split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
        if (userSet === correctSet) {
          correctCount++;
          earnedPoints += qPoints;
        }
      } else {
        if (userAns === correctAns || (accepted.length > 0 && accepted.includes(userAns))) {
          correctCount++;
          earnedPoints += qPoints;
        }
      }
    });

    const totalQ = (allQ || []).length;
    const percentage = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) / 10 : 0;

    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .insert([{
        exam_id: examData.id,
        student_name: studentName,
        class_name: className,
        duration_seconds: durationSeconds,
        score: parseFloat(score.toFixed(1)),
        percentage,
        correct_count: correctCount,
        total_questions: totalQ,
        submission_code: 'SUB' + Date.now().toString().slice(-6)
      }])
      .select('id').single();

    if (subErr) throw subErr;
    return sub.id;
  },

  // Xem kết quả bài làm dựa trên submissionId
  getSubmissionResult: async (submissionId) => {
    // 1. Lấy thông tin chung của submission
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select(`
        *,
        exams ( title, exam_code, show_result )
      `)
      .eq('id', submissionId)
      .eq('is_deleted', false)
      .single();

    if (subError) throw subError;

    // 2. Nếu đề cho phép show_result = true, lấy thêm detail
    let details = [];
    if (submission.exams.show_result) {
      const { data: detailData, error: detError } = await supabase
        .from('submission_details')
        .select(`
          *,
          questions ( type, question_text, options, correct_answer, explanation, points )
        `)
        .eq('submission_id', submissionId);
        
      if (detError) throw detError;
      details = detailData;
    }

    return { submission, details };
  },

  // Lấy email nhận thông báo từ system_settings
  getReceiveMail: async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'receive_mail')
      .single();
    if (!data) return null;
    // value được lưu dạng JSON string: "admin@gmail.com"
    try {
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    } catch {
      return data.value;
    }
  },
};
