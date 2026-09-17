import React, { useState, useEffect } from 'react';
import { studentRepository } from '../../repositories/studentRepository';

export const SubmissionDetailModal = ({ isOpen, onClose, submissionId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !submissionId) return;

    const fetchResult = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const resultData = await studentRepository.getSubmissionResult(submissionId);
        setData(resultData);
      } catch (error) {
        setErrorMsg('Không thể tải chi tiết bài làm: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [isOpen, submissionId]);

  if (!isOpen) return null;

  const sub = data?.submission;
  const details = data?.details || [];

  return (
    <div className="modal" style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '3rem' }}>
      <div className="modal-content" style={{ maxWidth: '860px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '1rem 1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', margin: 0 }}>👁️ Submission Details</h2>
          <button className="modal-close" style={{ fontSize: '1.25rem', lineHeight: 1 }} onClick={onClose}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p className="loading-message">Loading data...</p>
          ) : errorMsg ? (
            <p className="error-message">{errorMsg}</p>
          ) : !data ? (
            <p className="info-message">No data available</p>
          ) : (
            <>
              {/* Stats summary */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '1rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', border: '1.5px solid rgba(91,156,246,0.2)' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{sub.student_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Class: {sub.class_name || 'N/A'}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>SCORE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)' }}>{sub.score} / 10</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>ACCURACY</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#166534' }}>{sub.percentage}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>DURATION</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {Math.floor(sub.duration_seconds / 60)}m {sub.duration_seconds % 60}s
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CORRECT</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {sub.correct_count} / {sub.total_questions || (details.length > 0 ? details.length : '?')}
                  </div>
                </div>
              </div>

              {/* Details list */}
              {details.length === 0 ? (
                <p className="info-message" style={{ fontStyle: 'italic' }}>Answer details are not available ("Show Result" was disabled for this exam).</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {details.map((item, index) => {
                    const q = item.questions;
                    const isCorrect = item.is_correct;
                    return (
                      <div key={item.id} style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${isCorrect ? 'rgba(107,203,119,0.4)' : 'rgba(255,107,107,0.4)'}`,
                        background: isCorrect ? 'var(--secondary-light)' : 'var(--accent-light)'
                      }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <span style={{
                            width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.8rem', color: 'white',
                            background: isCorrect ? '#22c55e' : '#ef4444'
                          }}>
                            {index + 1}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                              {q?.question_text}
                            </div>
                            <div style={{ fontSize: '0.85rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Student's answer: </span>
                              <span style={{ fontWeight: 800, color: isCorrect ? '#166534' : '#dc2626' }}>
                                {item.student_answer || '(Blank)'}
                              </span>
                            </div>
                            {!isCorrect && (
                              <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Correct answer: </span>
                                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                  {q?.correct_answer}
                                </span>
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: '1.25rem' }}>{isCorrect ? '✅' : '❌'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-color)' }}>
          <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
