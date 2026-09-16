import React, { useState, useEffect } from 'react';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { GameFormModal } from '../../components/game/GameFormModal';
import { gameRepository } from '../../repositories/gameRepository';

// Placeholder image in case no image is provided or image loading fails
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60";

export const GameManager = () => {
  const { showToast } = useNotification();
  
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const data = await gameRepository.getGames();
      setGames(data);
    } catch (error) {
      showToast('Lỗi khi tải danh sách game: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveGame = async (gameData) => {
    try {
      if (editingGame) {
        await gameRepository.updateGame(editingGame.id, gameData);
        showToast('Cập nhật Game thành công!', 'success');
      } else {
        await gameRepository.createGame(gameData);
        showToast('Thêm Game thành công!', 'success');
      }
      setIsModalOpen(false);
      setEditingGame(null);
      fetchGames();
    } catch (error) {
      showToast('Lỗi khi lưu: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá game này không?')) {
      try {
        await gameRepository.deleteGame(id);
        showToast('Đã xoá game!', 'success');
        fetchGames();
      } catch (error) {
        showToast('Lỗi khi xoá: ' + error.message, 'error');
      }
    }
  };

  const openGameLink = (url) => {
    window.open(url, '_blank');
  };

  if (loading) return <LoadingSpinner message="Đang tải danh sách Games..." />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4a5c75]">Quản lý Trò chơi (Games)</h2>
        <button
          onClick={() => {
            setEditingGame(null);
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 bg-[#357ae8] text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-[#2b65c2] hover:shadow-lg transition-all"
        >
          + Add New Game
        </button>
      </div>

      {games.length === 0 ? (
        <EmptyState 
          title="Chưa có Trò chơi nào" 
          description="Bấm vào nút Add New Game để lưu trữ trò chơi đầu tiên của bạn."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {games.map((game) => (
            <div key={game.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col">
              {/* Image Section */}
              <div 
                className="h-40 bg-gray-200 relative cursor-pointer"
                onClick={() => openGameLink(game.url)}
              >
                <img 
                  src={game.image_url || PLACEHOLDER_IMAGE} 
                  alt={game.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 font-bold text-lg drop-shadow-md">
                    ▶ Play Now
                  </span>
                </div>
              </div>
              
              {/* Details Section */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg mb-1 line-clamp-2" title={game.name}>
                    {game.name}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">ID: {game.game_code}</p>
                </div>
                
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => { setEditingGame(game); setIsModalOpen(true); }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-bold text-sm"
                  >
                    ✏️ Sửa
                  </button>
                  <button 
                    onClick={() => handleDelete(game.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold text-sm"
                  >
                    🗑️ Xoá
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <GameFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingGame(null); }}
        onSave={handleSaveGame}
        initialData={editingGame}
      />
    </div>
  );
};
