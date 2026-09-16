import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { studentRepository } from '../../repositories/studentRepository';

export const ExamEntry = () => {
  const { examCode } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  
  const [examInfo, setExamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', className: '' });

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const data = await studentRepository.getExamInfo(examCode);
        setExamInfo(data);
      } catch (error) {
        showToast('Không tìm thấy đề thi hoặc đề thi đã bị đóng.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examCode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập Họ và Tên', 'error');
      return;
    }
    
    // Lưu thông tin tạm vào sessionStorage để trang ExamPlayer lấy dùng
    sessionStorage.setItem('student_info', JSON.stringify({
      name: formData.name,
      className: formData.className || 'Không rõ',
      examId: examInfo.id
    }));
    
    navigate(`/exam/${examCode}/play`);
  };

  if (loading) return <LoadingSpinner message="Đang kiểm tra đề thi..." />;

  if (!examInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-['Nunito']">
        <div className="bg-white p-8 rounded-[24px] shadow-lg text-center max-w-md w-full">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Đề thi không khả dụng</h2>
          <p className="text-gray-500 mb-6">Liên kết không tồn tại hoặc giáo viên đã đóng bài kiểm tra này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#8fa8ff] to-[#357ae8] p-4 font-['Nunito']">
      <div className="bg-white p-8 rounded-[24px] shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-[#4a5c75] tracking-tight mb-2">
            📝 {examInfo.title}
          </h1>
          <p className="text-[#94a3b8] font-medium">Thời gian làm bài: <span className="text-[#357ae8] font-bold">{examInfo.duration_minutes} phút</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#4a5c75] mb-2">Họ và tên của bạn *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff] focus:border-transparent transition-all"
              placeholder="VD: Nguyễn Văn A"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#4a5c75] mb-2">Lớp (Tùy chọn)</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff] focus:border-transparent transition-all"
              placeholder="VD: 10A1"
              value={formData.className}
              onChange={(e) => setFormData({...formData, className: e.target.value})}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#357ae8] text-white font-bold text-lg hover:bg-[#2b65c2] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
            >
              🚀 Bắt đầu làm bài
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
