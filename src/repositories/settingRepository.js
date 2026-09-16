import { supabase } from '../lib/supabase';

export const settingRepository = {
  // Lấy toàn bộ cài đặt
  getAllSettings: async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Thêm hoặc Cập nhật cài đặt (Upsert)
  saveSetting: async (key, value) => {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ 
        key: key, 
        value: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Xoá một cài đặt
  deleteSetting: async (key) => {
    const { data, error } = await supabase
      .from('system_settings')
      .delete()
      .eq('key', key)
      .select()
      .single();

    // Supabase .delete() throws an error only if network/policy fails, 
    // it doesn't throw if 0 rows are deleted.
    if (error) throw error;
    return data;
  }
};
