import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { studentRepository } from '../../repositories/studentRepository';
import { sendSubmissionNotification } from '../../lib/emailService';
import { ReactSortable } from 'react-sortablejs';
import './ExamPlayer.css';

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const ExamPlayer = () => {
  const { examCode } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [examInfo, setExamInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  
  // Arrange sentence states
  const [arrangedAnswers, setArrangedAnswers] = useState({});
  const [shuffledPools, setShuffledPools] = useState({});

  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const studentInfo = JSON.parse(sessionStorage.getItem('student_info'));
    if (!studentInfo) {
      showToast('Vui lòng điền thông tin trước khi làm bài', 'warning');
      navigate(`/exam/${examCode}/start`);
      return;
    }

    const initExam = async () => {
      try {
        setLoading(true);
        
        // Prevent retaking by checking DB
        const alreadySubmitted = await studentRepository.checkStudentSubmission(
          examCode, 
          studentInfo.name.trim(), 
          studentInfo.className.trim()
        );
        if (alreadySubmitted) {
          showToast('Bạn đã làm bài kiểm tra này. Không thể làm lại.', 'error');
          sessionStorage.removeItem('student_info');
          navigate(`/exam/${examCode}/start`, { replace: true });
          return;
        }

        const info = await studentRepository.getExamInfo(examCode);
        
        let qList = [];
        let pools = {};
        
        const savedStateStr = localStorage.getItem(`exam_state_${info.id}`);
        if (savedStateStr) {
          try {
            const state = JSON.parse(savedStateStr);
            if (state.questions) qList = state.questions;
            if (state.shuffledPools) pools = state.shuffledPools;
            if (state.answers) setAnswers(state.answers);
            if (state.arrangedAnswers) setArrangedAnswers(state.arrangedAnswers);
          } catch (e) {
            console.error("Lỗi parse saved state", e);
          }
        }
        
        if (qList.length === 0) {
          qList = await studentRepository.getStudentQuestions(examCode);

          if (info.shuffle_questions) {
            qList = shuffleArray(qList);
          }
          
          if (info.shuffle_options) {
            qList = qList.map(q => {
              if (q.type === 'multiple_choice' && q.options) {
                return { ...q, options: shuffleArray(q.options) };
              }
              if (q.type === 'arrange_sentence') {
                const targetSentence = (q.question_text && q.question_text.length > 2) ? q.question_text : (q.correct_answer || '');
                const words = targetSentence.split(/\s+/).filter(w => w.trim());
                pools[q.id] = shuffleArray(words);
              }
              return q;
            });
          } else {
            qList.forEach(q => {
              if (q.type === 'arrange_sentence') {
                const targetSentence = (q.question_text && q.question_text.length > 2) ? q.question_text : (q.correct_answer || '');
                const words = targetSentence.split(/\s+/).filter(w => w.trim());
                pools[q.id] = shuffleArray(words);
              }
            });
          }
        }

        setExamInfo(info);
        setQuestions(qList);
        setShuffledPools(pools);

        const startTimeStr = localStorage.getItem(`exam_start_${info.id}`);
        if (startTimeStr) {
          const startTime = parseInt(startTimeStr, 10);
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, info.duration_minutes * 60 - elapsed);
          setTimeLeft(remaining);
          if (remaining === 0) {
            setIsTimeUp(true);
          }
        } else {
          setTimeLeft(info.duration_minutes * 60);
          localStorage.setItem(`exam_start_${info.id}`, Date.now().toString());
        }

      } catch (error) {
        console.error("Lỗi khi nạp bài thi:", error);
        showToast('Lỗi khi nạp dữ liệu: ' + (error?.message || 'Không tìm thấy bài thi hoặc bài thi đang bị khóa.'), 'error');
        navigate(`/exam/${examCode}/start`);
      } finally {
        setLoading(false);
      }
    };
    
    initExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examCode]);

  useEffect(() => {
    if (examInfo && questions.length > 0) {
      localStorage.setItem(`exam_state_${examInfo.id}`, JSON.stringify({
        questions,
        shuffledPools,
        answers,
        arrangedAnswers
      }));
    }
  }, [examInfo, questions, answers, arrangedAnswers, shuffledPools]);

  useEffect(() => {
    if (loading || submitting || isTimeUp || !examInfo) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimeUp(true);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitting, isTimeUp, examInfo]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleOptionClick = (qId, type, value) => {
    if (type === 'multiple_choice') {
      const current = answers[qId] ? answers[qId].split(',').filter(Boolean) : [];
      let next;
      if (current.includes(value)) {
        next = current.filter(v => v !== value);
      } else {
        next = [...current, value];
      }
      setAnswers(prev => ({ ...prev, [qId]: next.join(',') }));
    } else {
      setAnswers(prev => ({ ...prev, [qId]: value }));
    }
  };

  const handleAddWord = (qId, wordIndex) => {
    const pool = shuffledPools[qId] || [];
    const word = pool[wordIndex];
    
    const newPool = [...pool];
    newPool.splice(wordIndex, 1);
    
    const currentArranged = arrangedAnswers[qId] || [];
    const newArranged = [...currentArranged, word];

    setShuffledPools(prev => ({ ...prev, [qId]: newPool }));
    setArrangedAnswers(prev => ({ ...prev, [qId]: newArranged }));
    handleAnswerChange(qId, newArranged.join(' '));
  };

  const handleRemoveWord = (qId, wordIndex) => {
    const arranged = arrangedAnswers[qId] || [];
    const word = arranged[wordIndex];
    
    const newArranged = [...arranged];
    newArranged.splice(wordIndex, 1);
    
    const currentPool = shuffledPools[qId] || [];
    const newPool = [...currentPool, word];

    setArrangedAnswers(prev => ({ ...prev, [qId]: newArranged }));
    setShuffledPools(prev => ({ ...prev, [qId]: newPool }));
    handleAnswerChange(qId, newArranged.join(' '));
  };

  const handleManualSubmit = async () => {
    if (window.confirm('Bạn có chắc chắn muốn nộp bài ngay bây giờ?')) {
      await performSubmit();
    }
  };

  const handleAutoSubmit = async () => {
    showToast('Đã hết thời gian làm bài. Đang tự động nộp bài...', 'warning');
    await performSubmit();
  };

  const performSubmit = async () => {
    setSubmitting(true);
    clearInterval(timerRef.current);

    const studentInfo = JSON.parse(sessionStorage.getItem('student_info'));
    const answersArray = questions.map(q => ({
      question_id: q.id,
      answer: answers[q.id] || ''
    }));

    const durationSeconds = (examInfo.duration_minutes * 60) - timeLeft;

    try {
      const submissionId = await studentRepository.submitExam(
        examCode,
        studentInfo.name,
        studentInfo.className,
        durationSeconds,
        answersArray
      );
      
      localStorage.removeItem(`exam_state_${examInfo.id}`);
      localStorage.removeItem(`exam_start_${examInfo.id}`);

      // Fire-and-forget: gửi email thông báo cho admin (không block UX học sinh)
      studentRepository.getEmailSettings().then(emailSettings => {
        if (emailSettings && emailSettings.receiveMail) {
          sendSubmissionNotification(
            {
              serviceId:  emailSettings.serviceId,
              templateId: emailSettings.templateId,
              publicKey:  emailSettings.publicKey,
            },
            {
              toEmail:        emailSettings.receiveMail,
              studentName:    studentInfo.name,
              className:      studentInfo.className,
              examTitle:      examInfo.title,
              examCode:       examCode,
              totalQuestions: questions.length,
              submittedAt:    new Date().toLocaleString('vi-VN'),
            }
          );
        }
      }).catch(() => { /* ignore email errors */ });

      showToast('Nộp bài thành công!', 'success');
      navigate(`/result/${submissionId}`, { replace: true });
    } catch (error) {
      showToast('Lỗi khi nộp bài: ' + error.message, 'error');
      setSubmitting(false);
    }
  };

  if (loading) return <p className="loading-message">Loading exam portal...</p>;
  if (questions.length === 0) return <p className="error-message">Bài kiểm tra chưa có câu hỏi nào.</p>;

  const studentInfo = JSON.parse(sessionStorage.getItem('student_info'));
  const question = questions[currentIdx];
  const typeLabel = question.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="exam-player-wrapper">
      <div id="exam-interface" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1rem 1rem 1rem', background: 'transparent', minHeight: '100vh' }}>
          <div className="exam-mobile-sticky-wrapper" style={{ background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '2rem', position: 'sticky', top: '16px', zIndex: 100, border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="exam-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', marginBottom: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1, paddingRight: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{examInfo.title}</h3>
                      <p id="progress-text" style={{ margin: '0.1rem 0 0.3rem 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Question {currentIdx + 1} of {questions.length}</p>
                      <div id="progress-bar-container" style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div id="progress-bar" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 0.3s ease' }}></div>
                      </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end', flexShrink: 0 }}>
                      <div id="timer" style={{ color: timeLeft <= 60 ? '#ef4444' : '#0f172a', fontWeight: 900, fontSize: '1.1rem', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🕒</span> {formatTime(timeLeft)}
                      </div>
                      <button id="submit-now-btn" onClick={handleManualSubmit} disabled={submitting} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px', whiteSpace: 'nowrap', margin: 0, background: 'linear-gradient(135deg, #ec4899, #e11d48)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 10px rgba(236, 72, 153, 0.3)' }}
                         onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                         onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        {submitting ? '...' : 'Submit Now'}
                      </button>
                  </div>
              </div>
              <div id="question-navigator-container" className="sticky-navigator" style={{ position: 'relative', margin: 0, padding: 0, background: 'transparent', borderBottom: 'none' }}>
                  <div id="question-navigator" className="question-navigator" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingTop: '0.75rem', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
                      {questions.map((q, idx) => {
                          const hasAnswer = !!answers[q.id] || (arrangedAnswers[q.id] && arrangedAnswers[q.id].length > 0);
                          const isCurrent = idx === currentIdx;
                          let cls = 'nav-circle';
                          if (isCurrent) cls += ' current';
                          else if (hasAnswer) cls += ' answered';
                          return (
                            <div key={q.id} className={cls} onClick={() => setCurrentIdx(idx)}>
                              {idx + 1}
                            </div>
                          );
                      })}
                  </div>
              </div>
          </div>
          
          <div id="question-container" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginTop: '0.5rem' }}>
              <div className="question-meta">
                  <span className="badge badge-primary">Q{currentIdx + 1}</span>
                  <span className="badge badge-secondary">{typeLabel}</span>
                  <span className="badge badge-warning">{question.level || 'MEDIUM'}</span>
                  <span className="badge badge-accent">{question.points} Pt(s)</span>
              </div>
              
              <p className="question-text">
                {question.type === "arrange_sentence" ? "Arrange the words to make a correct sentence:" : 
                (question.type === "matching" ? "Match column A with column B correctly:" : question.question_text)}
              </p>

              {/* Render Options based on type */}
              {(question.type === 'multiple_choice' || question.type === 'single_choice' || question.type === 'true_false' || question.type === 'vocabulary') && (
                <div className={`options-container ${question.type === 'multiple_choice' ? 'mc-checkbox' : ''}`}>
                  {(question.type === 'true_false' ? ['True', 'False'] : question.options).map(opt => {
                    const isSelected = question.type === 'multiple_choice' 
                      ? (answers[question.id] || '').split(',').includes(opt)
                      : answers[question.id] === opt;
                    
                    return (
                      <div key={opt} className={`option ${isSelected ? 'selected' : ''}`} onClick={() => handleOptionClick(question.id, question.type, opt)}>
                        {opt}
                      </div>
                    );
                  })}
                </div>
              )}

              {question.type === 'arrange_sentence' && (
                <div style={{ marginTop: '1rem' }}>
                    <p style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>Workspace (Click word to remove):</p>
                    <div className="word-workspace">
                        {arrangedAnswers[question.id]?.length > 0 ? (
                            arrangedAnswers[question.id].map((word, idx) => (
                                <span key={idx} className="word-badge" onClick={() => handleRemoveWord(question.id, idx)}>{word}</span>
                            ))
                        ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.95rem' }}>Workspace...</span>
                        )}
                    </div>
                    <p style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>Word Pool (Click word to place in sentence):</p>
                    <div className="word-pool">
                        {shuffledPools[question.id]?.length > 0 ? (
                            shuffledPools[question.id].map((word, idx) => (
                                <span key={idx} className="word-badge" onClick={() => handleAddWord(question.id, idx)}>{word}</span>
                            ))
                        ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.95rem' }}>Word pool empty...</span>
                        )}
                    </div>
                </div>
              )}

              {(question.type === 'fill_blank' || question.type === 'short_answer') && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    {question.type === 'fill_blank' ? 'Fill in the blank:' : 'Your Response:'}
                  </label>
                  {question.type === 'fill_blank' ? (
                    <input type="text" placeholder="Type your answer here..." value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} style={{ width: '100%', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontFamily: 'var(--font)', fontSize: '1rem' }} />
                  ) : (
                    <textarea rows="4" placeholder="Write your paragraph/sentence..." value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} style={{ width: '100%', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontFamily: 'var(--font)', fontSize: '1rem', resize: 'vertical' }}></textarea>
                  )}
                </div>
              )}

              {question.type === 'matching' && (() => {
                const leftItems = question.question_text.split(/\n|\\n/).map(l => l.trim()).filter(Boolean);
                let currentAnswerArray = [];
                try {
                  if (answers[question.id]) currentAnswerArray = JSON.parse(answers[question.id]);
                } catch(e) {}
                const rightItems = currentAnswerArray.length ? currentAnswerArray : (question.options || []);

                return (
                  <div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>💡 Drag & Drop items in column B (Answer) to match the corresponding column A.</p>
                      
                      <div className="matching-dnd-container" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', alignItems: 'stretch' }}>
                          <div className="matching-left-wrapper" style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--text-main)', textAlign: 'center' }}>A (Question)</h4>
                              <div className="matching-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {leftItems.map((left, idx) => (
                                    <div key={idx} className="matching-left-item" style={{ padding: '0.75rem', border: '2px solid #c8bfe7', borderRadius: 'var(--radius-sm)', background: '#f3f0f9', display: 'flex', alignItems: 'center', minHeight: '50px', fontWeight: 600, color: 'var(--text-main)' }}>
                                      {left}
                                    </div>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="matching-right-wrapper" style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--text-main)', textAlign: 'center' }}>B (Answer)</h4>
                              <ReactSortable 
                                list={rightItems.map((r, i) => ({ id: `r-${i}-${r}`, text: r }))} 
                                setList={(newList) => {
                                  const textArray = newList.map(x => x.text);
                                  handleAnswerChange(question.id, JSON.stringify(textArray));
                                }}
                                animation={150}
                                className="matching-right-col"
                                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '50px' }}
                              >
                                  {rightItems.map((right, idx) => (
                                    <div key={`r-${idx}-${right}`} className="matching-right-item" style={{ padding: '0.75rem', border: '2px solid #f8c8d8', borderRadius: 'var(--radius-sm)', background: '#fdf2f5', cursor: 'grab', display: 'flex', alignItems: 'center', minHeight: '50px', fontWeight: 500, color: 'var(--text-main)' }}>
                                      <i className="fa fa-arrows-alt-v" style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }}></i> 
                                      {right}
                                    </div>
                                  ))}
                              </ReactSortable>
                          </div>
                      </div>
                  </div>
                );
              })()}
          </div>

          <div className="exam-navigation" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem', padding: '0 0.5rem' }}>
              <button id="prev-btn" className="btn-secondary" onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0} style={{ flex: 1, padding: '0.85rem', fontSize: '1rem', borderRadius: '16px', border: 'none', background: currentIdx === 0 ? '#f1f5f9' : '#e2e8f0', color: currentIdx === 0 ? '#94a3b8' : '#475569', fontWeight: 700, cursor: currentIdx === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
              <button id="next-btn" className="btn-primary" onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))} style={{ flex: 1, display: currentIdx === questions.length - 1 ? 'none' : 'block', padding: '0.85rem', fontSize: '1rem', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)' }}>Next</button>
              <button id="submit-btn" className="btn-primary" onClick={handleManualSubmit} style={{ flex: 1, display: currentIdx === questions.length - 1 ? 'block' : 'none', padding: '0.85rem', fontSize: '1rem', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #ec4899, #e11d48)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)' }}>Submit Exam</button>
          </div>
      </div>
    </div>
  );
};
