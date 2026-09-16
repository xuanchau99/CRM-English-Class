import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { resultRepository } from '../../repositories/resultRepository';
import { SubmissionDetailModal } from '../../components/result/SubmissionDetailModal';

export const ResultManager = () => {
  const { showToast } = useNotification();
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const data = await resultRepository.getSubmissions();
      setSubmissions(data);
    } catch (error) {
      showToast('Lỗi tải danh sách bài nộp: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xoá bài nộp này?')) {
      try {
        await resultRepository.deleteSubmission(id);
        showToast('Xoá thành công!', 'success');
        fetchSubmissions();
      } catch (error) {
        showToast('Lỗi khi xoá: ' + error.message, 'error');
      }
    }
  };

  // Logic Lọc (Filter)
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchSearch = sub.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.submission_code?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchExam = filterExam ? sub.exam_id === filterExam : true;
      const matchClass = filterClass ? sub.class_name === filterClass : true;
      return matchSearch && matchExam && matchClass;
    });
  }, [submissions, searchQuery, filterExam, filterClass]);

  // Extract unique exams and classes for filter dropdowns
  const uniqueExams = useMemo(() => {
    const exams = new Map();
    submissions.forEach(s => {
      if (s.exams && s.exam_id) {
        exams.set(s.exam_id, s.exams.title);
      }
    });
    return Array.from(exams.entries());
  }, [submissions]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set();
    submissions.forEach(s => {
      if (s.class_name) classes.add(s.class_name);
    });
    return Array.from(classes).sort();
  }, [submissions]);

  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) {
      showToast('Không có dữ liệu để export', 'warning');
      return;
    }

    const exportData = filteredSubmissions.map(sub => ({
      'Mã bài nộp': sub.submission_code,
      'Đề thi': sub.exams?.title || '',
      'Họ và Tên': sub.student_name,
      'Lớp': sub.class_name || '',
      'Điểm': sub.score,
      'Tỷ lệ đúng (%)': sub.percentage,
      'Số câu đúng': sub.correct_count,
      'Thời gian làm (s)': sub.duration_seconds,
      'Ngày nộp': new Date(sub.submitted_at).toLocaleString('vi-VN')
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `KetQua_KiemTra_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openDetail = (id) => {
    setSelectedSubmissionId(id);
    setDetailModalOpen(true);
  };

  if (loading) return <LoadingSpinner message="Đang tải kết quả bài nộp..." />;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-[#4a5c75]">Quản lý Kết quả</h2>
        <button
          onClick={handleExportCSV}
          className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-teal-700 transition-colors"
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Tìm theo Tên hoặc Mã bài nộp..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <select
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
            value={filterExam}
            onChange={(e) => setFilterExam(e.target.value)}
          >
            <option value="">-- Tất cả Đề thi --</option>
            {uniqueExams.map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-48">
          <select
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff]"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">-- Tất cả Lớp --</option>
            {uniqueClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredSubmissions.length === 0 ? (
        <EmptyState 
          title="Không tìm thấy bài nộp" 
          description="Chưa có học sinh nào nộp bài hoặc dữ liệu không khớp với bộ lọc."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm text-[#4a5c75]">
            <thead className="bg-[#f1f5f9] text-[#64748b] font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Mã bài nộp</th>
                <th className="px-6 py-4">Học sinh</th>
                <th className="px-6 py-4">Lớp</th>
                <th className="px-6 py-4 max-w-xs">Bài thi</th>
                <th className="px-6 py-4 text-center">Điểm</th>
                <th className="px-6 py-4 text-center">% Đúng</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubmissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{sub.submission_code}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{sub.student_name}</td>
                  <td className="px-6 py-4">{sub.class_name || '-'}</td>
                  <td className="px-6 py-4 truncate max-w-xs" title={sub.exams?.title}>{sub.exams?.title}</td>
                  <td className="px-6 py-4 text-center font-bold text-blue-600">{sub.score}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${sub.percentage >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {sub.percentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {new Date(sub.submitted_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openDetail(sub.id)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-xs transition-colors"
                      >
                        👁️ Chi tiết
                      </button>
                      <button 
                        onClick={() => handleDelete(sub.id)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Xoá"
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

      {/* Modal Chi Tiết */}
      <SubmissionDetailModal 
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        submissionId={selectedSubmissionId}
      />
    </div>
  );
};
