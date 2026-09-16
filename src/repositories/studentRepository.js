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

  // Lấy danh sách câu hỏi an toàn (Đã giấu đáp án qua RPC)
  getStudentQuestions: async (examCode) => {
    const { data, error } = await supabase
      .rpc('get_student_questions', { p_exam_code: examCode });

    if (error) throw error;
    return data;
  },

  // Nộp bài và tự động chấm điểm qua RPC
  submitExam: async (examCode, studentName, className, durationSeconds, answers) => {
    // answers định dạng: [{ question_id: "uuid", answer: "text" }]
    const { data, error } = await supabase
      .rpc('submit_exam_result', {
        p_exam_code: examCode,
        p_student_name: studentName,
        p_class_name: className,
        p_duration_seconds: durationSeconds,
        p_answers: answers
      });

    if (error) throw error;
    return data; // Trả về submission_id
  },

  // Xem kết quả bài làm dựa trên submissionId
  getSubmissionResult: async (submissionId) => {
    // 1. Lấy thông tin chung của submission
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select(`
        *,
        exams ( title, show_result )
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
  }
};
