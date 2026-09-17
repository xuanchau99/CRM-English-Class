import React, { useState, useEffect } from 'react';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { examRepository } from '../../repositories/examRepository';
import { resultRepository } from '../../repositories/resultRepository';
import { SubmissionDetailModal } from '../../components/result/SubmissionDetailModal';
import Papa from 'papaparse';

export const ResultManager = () => {
  const { showToast } = useNotification();
  
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // viewState: 'summary' or 'detail'
  const [viewState, setViewState] = useState('summary');
  const [selectedExamId, setSelectedExamId] = useState(null);
  
  // Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [examsData, submissionsData] = await Promise.all([
        examRepository.getExams(),
        resultRepository.getSubmissions()
      ]);
      setExams(examsData);
      setSubmissions(submissionsData);
    } catch (error) {
      showToast('Lỗi tải dữ liệu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id, studentName) => {
    if (window.confirm(`Are you sure you want to delete the results of "${studentName}"?`)) {
      try {
        await resultRepository.deleteSubmission(id);
        showToast('Xoá thành công!', 'success');
        fetchInitialData();
      } catch (error) {
        showToast('Lỗi khi xoá: ' + error.message, 'error');
      }
    }
  };

  const handleExportCSV = (examSubs, examTitle) => {
    if (examSubs.length === 0) {
      showToast('Không có dữ liệu để export', 'warning');
      return;
    }

    const exportData = examSubs.map((sub, idx) => ({
      'No.': idx + 1,
      'Student Name': sub.student_name,
      'Class': sub.class_name || '',
      'Score': sub.score,
      'Percentage (%)': sub.percentage,
      'Correct Count': sub.correct_count,
      'Duration (s)': sub.duration_seconds,
      'Submitted At': new Date(sub.submitted_at).toLocaleString('en-US')
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8" }); 
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Submissions_${examTitle}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openDetail = (id) => {
    setSelectedSubmissionId(id);
    setDetailModalOpen(true);
  };

  // --- Render Summary View (List of Exams with Submissions Count) ---
  const renderSummaryView = () => {
    if (exams.length === 0) {
      return <p className="info-message">No exams found.</p>;
    }

    return (
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Exam ID</th>
              <th>Exam Title</th>
              <th>Active State</th>
              <th>Submissions Count</th>
              <th>Last Submission</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam, idx) => {
              const examSubs = submissions.filter(s => s.exam_id === exam.id);
              const count = examSubs.length;
              const isActive = exam.is_active;
              
              let lastSubTime = 'N/A';
              if (count > 0) {
                 const latest = examSubs.reduce((a, b) => new Date(b.submitted_at) > new Date(a.submitted_at) ? b : a);
                 lastSubTime = new Date(latest.submitted_at).toLocaleString();
              }

              return (
                <tr key={exam.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{exam.exam_code}</strong></td>
                  <td>{exam.title}</td>
                  <td>
                    <span 
                      className="badge" 
                      style={{
                        backgroundColor: isActive ? 'var(--secondary-light)' : 'var(--accent-light)',
                        color: isActive ? '#15803d' : '#b91c1c',
                        border: `1px solid ${isActive ? 'rgba(107,203,119,0.3)' : 'rgba(255,107,107,0.3)'}`,
                        fontWeight: 800,
                        display: 'inline-block',
                        textAlign: 'center'
                      }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                    {count} student(s)
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {lastSubTime}
                  </td>
                  <td>
                    <button 
                      style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setViewState('detail');
                      }}
                    >
                      <i className="fa-solid fa-chart-bar"></i> View Results
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // --- Render Detail View (List of Submissions for an Exam) ---
  const renderDetailView = () => {
    const examSubs = submissions.filter(s => s.exam_id === selectedExamId).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    const currentExam = exams.find(e => e.id === selectedExamId);

    if (examSubs.length === 0) {
      return <p className="info-message">No student submissions found for this exam yet.</p>;
    }

    return (
      <div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Score (Scale 10)</th>
                <th>Percentage</th>
                <th>Duration</th>
                <th>Submitted At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {examSubs.map((sub, idx) => {
                const score = sub.score !== undefined ? sub.score : 'N/A';
                const percentage = sub.percentage !== undefined ? sub.percentage : 'N/A';
                const minutes = Math.floor(sub.duration_seconds / 60);
                const seconds = sub.duration_seconds % 60;
                const durationStr = `${minutes}m ${seconds}s`;
                const submittedDate = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A';

                return (
                  <tr key={sub.id}>
                    <td>{idx + 1}</td>
                    <td><strong>{sub.student_name}</strong></td>
                    <td>{sub.class_name}</td>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{score} / 10</td>
                    <td>{percentage}%</td>
                    <td>{durationStr}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{submittedDate}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid rgba(77, 150, 255, 0.3)', borderRadius: '4px', padding: '0.35rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => openDetail(sub.id)}
                      >
                        <i className="fa-solid fa-eye"></i> View Answers
                      </button>
                      <button 
                        style={{ background: 'var(--accent-light)', color: 'var(--danger)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: '4px', padding: '0.35rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={() => handleDelete(sub.id, sub.student_name)} 
                        title="Delete result & allow retake"
                      >
                        <i className="fa-solid fa-rotate-left"></i> Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    if (viewState === 'summary') return 'Student Submissions Summary';
    const exam = exams.find(e => e.id === selectedExamId);
    return `Submissions for Exam: ${exam?.exam_code || selectedExamId}`;
  };

  return (
    <div id="tab-submissions-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 id="submissions-title" style={{ margin: 0 }}>{getTitle()}</h3>
        {viewState === 'detail' && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              className="btn-secondary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, border: '1px solid var(--border-color)', background: 'white' }}
              onClick={() => {
                setViewState('summary');
                setSelectedExamId(null);
              }}
            >
              <i className="fa-solid fa-arrow-left"></i> Back to Exam List
            </button>
            <button 
              className="btn-primary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, border: 'none' }}
              onClick={() => {
                const examSubs = submissions.filter(s => s.exam_id === selectedExamId).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
                const currentExam = exams.find(e => e.id === selectedExamId);
                handleExportCSV(examSubs, currentExam?.title);
              }}
            >
              <i className="fa-solid fa-file-csv"></i> Export CSV
            </button>
          </div>
        )}
      </div>

      <div id="submissions-table-container" className="data-table-container">
        {loading ? (
          <p className="loading-message">Loading data...</p>
        ) : (
          viewState === 'summary' ? renderSummaryView() : renderDetailView()
        )}
      </div>

      <SubmissionDetailModal 
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        submissionId={selectedSubmissionId}
      />
    </div>
  );
};
