import { supabase } from '../lib/supabase';

export const examRepository = {
  // Lấy danh sách đề thi của giáo viên hiện tại
  getExams: async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Tạm đếm mock số lượng câu hỏi, sau này sẽ dùng Postgres View hoặc Relation query
    const examsWithCount = data.map(exam => ({
      ...exam,
      question_count: 0 // Mock cho UI
    }));

    return examsWithCount;
  },

  // Tạo đề thi mới
  createExam: async (examData) => {
    // exam_code tạm sinh ngẫu nhiên 6 ký tự
    const exam_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Lấy user_id hiện tại
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('exams')
      .insert([{
        ...examData,
        exam_code,
        teacher_id: user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Cập nhật đề thi
  updateExam: async (id, examData) => {
    const { data, error } = await supabase
      .from('exams')
      .update(examData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Xoá mềm đề thi
  deleteExam: async (id) => {
    const { data, error } = await supabase
      .from('exams')
      .update({ is_deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Đổi trạng thái Active
  toggleActive: async (id, currentStatus) => {
    const { data, error } = await supabase
      .from('exams')
      .update({ is_active: !currentStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
