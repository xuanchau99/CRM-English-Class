import { supabase } from '../lib/supabase';

export const gameRepository = {
  getGames: async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  createGame: async (gameData) => {
    const game_code = 'G' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('games')
      .insert([{
        ...gameData,
        game_code
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateGame: async (id, gameData) => {
    const { data, error } = await supabase
      .from('games')
      .update(gameData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteGame: async (id) => {
    const { data, error } = await supabase
      .from('games')
      .update({ is_deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
