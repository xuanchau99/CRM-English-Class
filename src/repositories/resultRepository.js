import { supabase } from '../lib/supabase';

export const resultRepository = {
  // Lấy toàn bộ bài nộp thuộc về các bài thi của giáo viên (RLS đã tự động lọc theo teacher_id)
  getSubmissions: async () => {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        exams ( title, exam_code )
      `)
      .eq('is_deleted', false)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Cập nhật điểm thủ công (Manual Review - dự phòng cho tương lai)
  updateSubmissionScore: async (submissionId, updates) => {
    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Xoá mềm bài nộp
  deleteSubmission: async (id) => {
    const { data, error } = await supabase
      .from('submissions')
      .update({ is_deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
