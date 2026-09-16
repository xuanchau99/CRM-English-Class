import React, { useState, useEffect } from 'react';

export const ExamFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    title: '',
    duration_minutes: 45,
    shuffle_questions: false,
    shuffle_options: false,
    show_result: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        duration_minutes: initialData.duration_minutes || 45,
        shuffle_questions: initialData.shuffle_questions || false,
        shuffle_options: initialData.shuffle_options || false,
        show_result: initialData.show_result ?? true,
      });
    } else {
      setFormData({
        title: '',
        duration_minutes: 45,
        shuffle_questions: false,
        shuffle_options: false,
        show_result: true,
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
            {initialData ? 'Chỉnh sửa Đề thi' : 'Tạo Đề thi mới'}
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
            <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Tiêu đề Đề thi *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8fa8ff]"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="VD: Kiểm tra 15 phút Unit 1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Thời gian (Phút) *</label>
            <input
              type="number"
              required
              min="1"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8fa8ff]"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})}
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-[#357ae8] focus:ring-[#357ae8]"
                checked={formData.shuffle_questions}
                onChange={(e) => setFormData({...formData, shuffle_questions: e.target.checked})}
              />
              <span className="text-[#4a5c75] font-medium">Đảo ngẫu nhiên Câu hỏi</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-[#357ae8] focus:ring-[#357ae8]"
                checked={formData.shuffle_options}
                onChange={(e) => setFormData({...formData, shuffle_options: e.target.checked})}
              />
              <span className="text-[#4a5c75] font-medium">Đảo ngẫu nhiên Đáp án</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-[#357ae8] focus:ring-[#357ae8]"
                checked={formData.show_result}
                onChange={(e) => setFormData({...formData, show_result: e.target.checked})}
              />
              <span className="text-[#4a5c75] font-medium">Cho phép học sinh xem điểm sau khi nộp</span>
            </label>
          </div>

          <div className="pt-6 flex justify-end gap-3">
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
              {initialData ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
