import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { ExamFormModal } from '../../components/exam/ExamFormModal';
import { PrintExamModal } from '../../components/question/PrintExamModal';
import { examRepository } from '../../repositories/examRepository';

export const ExamManager = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [printingExam, setPrintingExam] = useState(null);
  
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
      await examRepository.toggleActive(exam.id, !exam.is_active);
      showToast(`Đã ${!exam.is_active ? 'Bật' : 'Tắt'} đề thi!`, 'success');
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

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return `${d.toLocaleTimeString('vi-VN')} ${d.toLocaleDateString('vi-VN')}`;
  };

  return (
    <div id="tab-exams-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>All Exams</h3>
        <button onClick={() => { setEditingExam(null); setIsModalOpen(true); }} className="btn-primary">
          + Create New Exam
        </button>
      </div>
      
      <div id="exams-table-container" className="data-table-container">
        {loading ? (
          <p className="loading-message">Loading exams list...</p>
        ) : exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Chưa có đề thi nào. Bấm "+ Create New Exam" để tạo.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>NO.</th>
                <th>EXAM ID</th>
                <th>TITLE</th>
                <th>DURATION</th>
                <th>QUESTIONS</th>
                <th>ACTIVE</th>
                <th>CREATED AT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam, index) => (
                <tr key={exam.id}>
                  <td>{index + 1}</td>
                  <td>{exam.exam_code}</td>
                  <td>{exam.title}</td>
                  <td>{exam.duration_minutes} mins</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{exam.question_count}</td>
                  <td>
                    {exam.is_active ? (
                      <span className="status-badge" style={{ backgroundColor: 'var(--mint-light)', color: '#059669', border: '1px solid var(--mint)', cursor: 'pointer' }} onClick={() => handleToggleActive(exam)}>ACTIVE</span>
                    ) : (
                      <span className="status-badge" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fca5a5', cursor: 'pointer' }} onClick={() => handleToggleActive(exam)}>INACTIVE</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDate(exam.created_at)}</td>
                  <td className="actions-cell">
                    <button className="edit-btn" title="Edit Exam" onClick={() => { setEditingExam(exam); setIsModalOpen(true); }}>
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button className="edit-btn" title="Copy Link" style={{ backgroundColor: 'var(--secondary)', color: 'white' }} onClick={() => handleCopyLink(exam.exam_code)}>
                      <i className="fa-solid fa-link"></i> Link
                    </button>
                    <button className="edit-btn" title="Manage Questions" style={{ backgroundColor: 'var(--primary)', color: 'white' }} onClick={() => navigate('/admin/questions', { state: { examId: exam.id } })}>
                      <i className="fa-solid fa-list-ul"></i> Questions
                    </button>
                    <button className="edit-btn" title="Print Exam" style={{ backgroundColor: '#002860', color: 'white' }} onClick={() => setPrintingExam(exam)}>
                      <i className="fa-solid fa-print"></i>
                    </button>
                    <button className="delete-btn" title="Delete Exam" onClick={() => handleDelete(exam.id)}>
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ExamFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingExam(null); }}
        onSave={handleSaveExam}
        initialData={editingExam}
      />
      
      <PrintExamModal 
        isOpen={!!printingExam}
        onClose={() => setPrintingExam(null)}
        examId={printingExam?.id}
        examCodeProp={printingExam?.exam_code}
      />
    </div>
  );
};
