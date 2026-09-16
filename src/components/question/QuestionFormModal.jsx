import React, { useState, useEffect } from 'react';

export const QuestionFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    type: 'multiple_choice',
    level: 'easy',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    accepted_answers: [],
    explanation: '',
    points: 1,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type || 'multiple_choice',
        level: initialData.level || 'easy',
        question_text: initialData.question_text || '',
        options: initialData.options || ['', '', '', ''],
        correct_answer: initialData.correct_answer || '',
        accepted_answers: initialData.accepted_answers || [],
        explanation: initialData.explanation || '',
        points: initialData.points || 1,
      });
    } else {
      setFormData({
        type: 'multiple_choice',
        level: 'easy',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
        accepted_answers: [],
        explanation: '',
        points: 1,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#faf9ff] z-10">
          <h2 className="text-xl font-bold text-[#4a5c75]">
            {initialData ? 'Chỉnh sửa Câu hỏi' : 'Tạo Câu hỏi mới'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Loại Câu hỏi</label>
              <select
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="multiple_choice">Trắc nghiệm (1 đáp án)</option>
                <option value="fill_blank">Điền khuyết</option>
                <option value="short_answer">Tự luận ngắn</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Độ khó</label>
              <select
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
                value={formData.level}
                onChange={(e) => setFormData({...formData, level: e.target.value})}
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Nội dung Câu hỏi *</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
              value={formData.question_text}
              onChange={(e) => setFormData({...formData, question_text: e.target.value})}
              placeholder="Nhập nội dung câu hỏi..."
            />
          </div>

          {formData.type === 'multiple_choice' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#4a5c75]">Các lựa chọn đáp án</label>
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct_answer"
                    required
                    checked={formData.correct_answer === opt && opt !== ''}
                    onChange={() => setFormData({...formData, correct_answer: opt})}
                    className="w-5 h-5 text-[#357ae8]"
                  />
                  <input
                    type="text"
                    required
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
                    placeholder={`Lựa chọn ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          {formData.type === 'fill_blank' && (
            <div>
              <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Đáp án đúng chính (Correct Answer) *</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 mb-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
                value={typeof formData.correct_answer === 'string' ? formData.correct_answer : ''}
                onChange={(e) => setFormData({...formData, correct_answer: e.target.value})}
                placeholder="Ví dụ: apple"
              />
              <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Các đáp án chấp nhận khác (Cách nhau bởi dấu phẩy)</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
                value={formData.accepted_answers.join(', ')}
                onChange={(e) => setFormData({...formData, accepted_answers: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                placeholder="Ví dụ: apples, the apple"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Điểm số (Points)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
                value={formData.points}
                onChange={(e) => setFormData({...formData, points: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#4a5c75] mb-1">Giải thích (Explanation)</label>
            <textarea
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
              value={formData.explanation}
              onChange={(e) => setFormData({...formData, explanation: e.target.value})}
              placeholder="Giải thích đáp án cho học sinh xem (không bắt buộc)"
            />
          </div>

          <div className="sticky bottom-0 bg-white pt-4 pb-2 flex justify-end gap-3 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#357ae8] text-white font-bold hover:bg-[#2b65c2] shadow-md transition-colors"
            >
              {initialData ? 'Cập nhật' : 'Tạo câu hỏi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
