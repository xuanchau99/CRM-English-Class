import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ExamFormModal } from '../../components/exam/ExamFormModal';
import { examRepository } from '../../repositories/examRepository';

export const ExamManager = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await examRepository.getExams();
      setExams(data);
    } catch (error) {
      showToast('Lỗi khi tải danh sách đề thi: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveExam = async (examData) => {
    try {
      if (editingExam) {
        await examRepository.updateExam(editingExam.id, examData);
        showToast('Cập nhật đề thi thành công!', 'success');
      } else {
        await examRepository.createExam(examData);
        showToast('Tạo đề thi thành công!', 'success');
      }
      setIsModalOpen(false);
      setEditingExam(null);
      fetchExams();
    } catch (error) {
      showToast('Lỗi khi lưu đề thi: ' + error.message, 'error');
    }
  };

  const handleToggleActive = async (exam) => {
    try {
      await examRepository.toggleActive(exam.id, exam.is_active);
      showToast(`Đã ${exam.is_active ? 'Tắt' : 'Bật'} đề thi!`, 'success');
      fetchExams();
    } catch (error) {
      showToast('Lỗi khi đổi trạng thái: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá đề thi này không?')) {
      try {
        await examRepository.deleteExam(id);
        showToast('Đã xoá đề thi!', 'success');
        fetchExams();
      } catch (error) {
        showToast('Lỗi khi xoá đề thi: ' + error.message, 'error');
      }
    }
  };

  const handleCopyLink = (exam_code) => {
    const link = `${window.location.origin}/exam/${exam_code}/start`;
    navigator.clipboard.writeText(link);
    showToast('Đã sao chép link làm bài!', 'success');
  };

  const handlePrint = () => {
    // Tạm thời mở menu in của browser, ở Phase 6 sẽ mở màn hình review câu hỏi để in đẹp hơn.
    window.print();
  };

  if (loading) return <LoadingSpinner message="Đang tải danh sách đề thi..." />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4a5c75]">Quản lý Đề thi</h2>
        <button
          onClick={() => {
            setEditingExam(null);
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 bg-[#357ae8] text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-[#2b65c2] hover:shadow-lg transition-all"
        >
          + Create New Exam
        </button>
      </div>

      {exams.length === 0 ? (
        <EmptyState 
          title="Chưa có đề thi nào" 
          description="Bấm vào nút Create New Exam để tạo đề thi đầu tiên của bạn."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm text-[#4a5c75]">
            <thead className="bg-[#f1f5f9] text-[#64748b] font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">No.</th>
                <th className="px-6 py-4">Exam ID</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Questions</th>
                <th className="px-6 py-4 text-center">Active</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.map((exam, index) => (
                <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{index + 1}</td>
                  <td className="px-6 py-4 font-mono text-[#357ae8]">{exam.exam_code}</td>
                  <td className="px-6 py-4 font-bold max-w-[200px] truncate" title={exam.title}>{exam.title}</td>
                  <td className="px-6 py-4">{exam.duration_minutes} min</td>
                  <td className="px-6 py-4">{exam.question_count}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(exam)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        exam.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        exam.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(exam.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => { setEditingExam(exam); setIsModalOpen(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleCopyLink(exam.exam_code)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Copy Link"
                      >
                        🔗
                      </button>
                      <button 
                        onClick={() => navigate(`/admin/exams/${exam.id}/questions`)}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Questions"
                      >
                        📋
                      </button>
                      <button 
                        onClick={handlePrint}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Print"
                      >
                        🖨️
                      </button>
                      <button 
                        onClick={() => handleDelete(exam.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExamFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingExam(null); }}
        onSave={handleSaveExam}
        initialData={editingExam}
      />
    </div>
  );
};
