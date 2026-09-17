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
    
    // Lấy số lượng câu hỏi thực tế từ bảng questions
    const examsWithCount = await Promise.all(data.map(async (exam) => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', exam.id)
        .eq('is_deleted', false);
        
      return {
        ...exam,
        question_count: count || 0
      };
    }));

    return examsWithCount;
  },

  // Tạo đề thi mới
  createExam: async (examData) => {
    // Lấy user_id hiện tại
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('exams')
      .insert([{
        ...examData,
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
  },

  // Lấy đề thi theo ID
  getExamById: async (id) => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
};
