import React, { useState, useEffect } from 'react';

export const GameFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    image_url: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        image_url: initialData.image_url || '',
      });
    } else {
      setFormData({
        name: '',
        url: '',
        image_url: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#faf9ff]">
          <h2 className="text-xl font-bold text-[#4a5c75]">
            {initialData ? 'Chỉnh sửa Trò chơi' : 'Thêm Trò chơi mới'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Tên Trò chơi *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8fa8ff]"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="VD: Kahoot Ôn tập Unit 1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Đường dẫn Trò chơi (URL) *</label>
            <input
              type="url"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8fa8ff]"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              placeholder="https://kahoot.it/..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Đường dẫn Ảnh bìa (Image URL)</label>
            <input
              type="url"
              className="w-full px-4 py-2 mb-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8fa8ff]"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              placeholder="https://example.com/image.jpg"
            />
            {formData.image_url && (
              <div className="mt-2 text-center">
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  className="h-24 object-cover mx-auto rounded-lg border border-gray-200 shadow-sm"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition-colors"
            >
              Huỷ bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#357ae8] text-white font-bold hover:bg-[#2b65c2] shadow-md transition-colors"
            >
              {initialData ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
