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
    const { data, error } = await supabase
      .from('questions')
      .insert([{
        ...questionData,
        exam_id: examId,
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
    // 1. Fetch existing questions to check for duplicates and soft-deletes
    const { data: existingQs } = await supabase
      .from('questions')
      .select('id, question_code')
      .eq('exam_id', examId);
    
    const existingMap = {};
    if (existingQs) {
      existingQs.forEach(q => {
        existingMap[q.question_code] = q.id;
      });
    }

    const inserts = [];
    const updates = [];

    parsedDataList.forEach((q, i) => {
      const payload = {
        ...q,
        exam_id: examId,
        order_index: i,
        is_deleted: false // Restore if it was soft-deleted
      };

      if (existingMap[q.question_code]) {
        payload.id = existingMap[q.question_code];
        updates.push(payload);
      } else {
        inserts.push(payload);
      }
    });

    // 2. Perform bulk update (using upsert with primary key id)
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('questions')
        .upsert(updates);
      if (updateError) throw updateError;
    }

    // 3. Perform bulk insert
    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('questions')
        .insert(inserts);
      if (insertError) throw insertError;
    }

    return parsedDataList; // Return the processed list
  }
};
