import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { studentRepository } from '../../repositories/studentRepository';

export const ExamResult = () => {
  const { submissionId } = useParams();
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const resultData = await studentRepository.getSubmissionResult(submissionId);
        setData(resultData);
      } catch (error) {
        showToast('Không tìm thấy kết quả hoặc có lỗi xảy ra.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  if (loading) return <p className="loading-message">Đang tải kết quả...</p>;
  if (!data) return <p className="error-message">Không tìm thấy dữ liệu.</p>;

  const formatTime = (seconds) => {
    if (!seconds) return '0m 00s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const { submission, details } = data;
  const isPassed = submission.percentage >= 50;
  const title = submission.exams?.title || 'Unknown Exam';
  const showDetails = submission.exams?.show_result;

  // Sắp xếp lại details theo thứ tự đã lưu trong localStorage (nếu có) để khớp với lúc làm bài
  let sortedDetails = [...details];
  try {
    const savedStateStr = localStorage.getItem(`exam_state_${submission.exam_id}`);
    if (savedStateStr) {
      const state = JSON.parse(savedStateStr);
      if (state.questions && state.questions.length > 0) {
        const orderMap = new Map(state.questions.map((q, idx) => [q.id, idx]));
        sortedDetails.sort((a, b) => {
          const idxA = orderMap.has(a.question_id) ? orderMap.get(a.question_id) : 999;
          const idxB = orderMap.has(b.question_id) ? orderMap.get(b.question_id) : 999;
          return idxA - idxB;
        });
      }
    }
  } catch (e) {
    console.error('Lỗi khi sắp xếp details:', e);
  }

  const totalQuestions = submission.correct_count + submission.wrong_count + submission.unanswered_count;

  return (
    <>
      <header>
        <h1>✏️ English Student Exam Portal</h1>
      </header>
      <main id="app-container">
        <div id="student-result-container" style={{ maxWidth: '800px', margin: '1rem auto', animation: 'fadeIn 0.5s ease', padding: '0 10px' }}>
          
          <div style={{ background: '#e0f2fe', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: '#6366f1', fontSize: '1.8rem', fontWeight: 800 }}>Exam Results</h2>
            <p style={{ color: '#64748b', margin: '0 0 0.2rem 0', fontWeight: 600, fontSize: '0.95rem' }}>Student: {submission.student_name} | Class: {submission.class_name || 'N/A'}</p>
            <p style={{ color: '#64748b', margin: '0 0 1.5rem 0', fontWeight: 600, fontSize: '0.95rem' }}>Exam: {title} ({submission.exams?.exam_code})</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              <div style={{ background: 'white', padding: '1rem 0.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>Score</p>
                <h3 style={{ margin: 0, color: '#6366f1', fontSize: '1.4rem', fontWeight: 900 }}>{submission.score}</h3>
              </div>
              <div style={{ background: 'white', padding: '1rem 0.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>Correct</p>
                <h3 style={{ margin: 0, color: '#6366f1', fontSize: '1.4rem', fontWeight: 900 }}>{submission.correct_count} <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>/ {totalQuestions > 0 ? totalQuestions : details.length}</span></h3>
              </div>
              <div style={{ background: 'white', padding: '1rem 0.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>Percent</p>
                <h3 style={{ margin: 0, color: '#6366f1', fontSize: '1.4rem', fontWeight: 900 }}>{submission.percentage}%</h3>
              </div>
              <div style={{ background: 'white', padding: '1rem 0.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>Time</p>
                <h3 style={{ margin: 0, color: '#6366f1', fontSize: '1.1rem', fontWeight: 900 }}>
                  {formatTime(submission.duration_seconds)}
                </h3>
              </div>
            </div>
          </div>

          {showDetails ? (
            <div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>Result Details</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sortedDetails.map((item, index) => {
                  const q = item.questions;
                  return (
                    <div key={item.id} style={{ background: 'white', borderRadius: 'var(--radius-sm)', border: `2px solid ${item.is_correct ? '#34d399' : '#f87171'}`, padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: item.is_correct ? '#10b981' : '#ef4444', color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>
                          {index + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'pre-wrap' }}>{q.question_text}</h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                              <strong style={{ color: 'var(--text-main)' }}>Your Answer: </strong>
                              <span style={{ color: item.is_correct ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                {item.student_answer ? (typeof item.student_answer === 'object' ? item.student_answer.join(', ') : item.student_answer) : '(Skipped)'}
                              </span>
                            </p>
                            {!item.is_correct && (
                              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                <strong style={{ color: 'var(--text-main)' }}>Correct Answer: </strong>
                                <span style={{ color: '#10b981', fontWeight: 600 }}>
                                  {typeof q.correct_answer === 'object' && Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}
                                </span>
                              </p>
                            )}
                          </div>
                          
                          {q.explanation && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                              <p style={{ margin: '0 0 0.25rem 0', color: '#6366f1', fontWeight: 700 }}>💡 Explanation:</p>
                              <p style={{ margin: 0, color: 'var(--text-muted)' }}>{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>The teacher has hidden the detailed results for this exam.</p>
            </div>
          )}
          
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link to={`/exam/${submission.exams?.exam_code}/start`} style={{ textDecoration: 'none' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => sessionStorage.removeItem('student_info')}
              >
                Back to Start
              </button>
            </Link>
          </div>

        </div>
      </main>
    </>
  );
};
