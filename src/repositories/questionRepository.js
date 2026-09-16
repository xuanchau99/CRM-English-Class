import { supabase } from '../lib/supabase';

export const questionRepository = {
  getQuestionsByExam: async (examId) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .eq('is_deleted', false)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  createQuestion: async (examId, questionData, orderIndex = 0) => {
    const question_code = 'Q' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('questions')
      .insert([{
        ...questionData,
        exam_id: examId,
        question_code,
        order_index: orderIndex
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateQuestion: async (id, questionData) => {
    const { data, error } = await supabase
      .from('questions')
      .update(questionData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteQuestion: async (id) => {
    const { data, error } = await supabase
      .from('questions')
      .update({ is_deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateQuestionOrders: async (updates) => {
    // updates: Array of { id, order_index }
    // Supabase JS does not support bulk updates natively yet without RPC.
    // We can do it in a Promise.all for now, or write an RPC. Promise.all is fine for small lists (<100 questions).
    const promises = updates.map(q => 
      supabase.from('questions').update({ order_index: q.order_index }).eq('id', q.id)
    );
    await Promise.all(promises);
  },

  importQuestions: async (examId, parsedDataList) => {
    // parsedDataList: Array of prepared question objects
    // Need to assign question_code and exam_id
    const inserts = parsedDataList.map((q, i) => ({
      ...q,
      exam_id: examId,
      question_code: 'Q' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      order_index: i
    }));

    const { data, error } = await supabase
      .from('questions')
      .insert(inserts)
      .select();

    if (error) throw error;
    return data;
  }
};
