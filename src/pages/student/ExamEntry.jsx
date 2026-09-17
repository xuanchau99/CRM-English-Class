import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.className.trim()) {
      showToast('Please fill in your Full Name and Class to continue', 'error');
      return;
    }
    
    try {
      const alreadySubmitted = await studentRepository.checkStudentSubmission(
        examCode, 
        formData.name.trim(), 
        formData.className.trim()
      );
      
      if (alreadySubmitted) {
        showToast('Học sinh này đã làm bài kiểm tra này, hãy đăng nhập bằng học sinh khác', 'error');
        return;
      }

      sessionStorage.setItem('student_info', JSON.stringify({
        name: formData.name.trim(),
        className: formData.className.trim(),
        examId: examInfo.id
      }));
      
      // Khởi tạo thời gian bắt đầu
      localStorage.setItem(`exam_start_${examInfo.id}`, Date.now().toString());
      
      navigate(`/exam/${examCode}/play`);
    } catch (err) {
      showToast('Validation error: ' + err.message, 'error');
    }
  };

  if (loading) return <p className="loading-message">Loading exam portal...</p>;

  if (!examInfo) {
    return (
      <>
        <header>
          <h1>✏️ English Student Exam Portal</h1>
        </header>
        <main id="app-container">
          <p className="error-message">Exam unavailable. The link does not exist or the teacher has closed this exam.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header>
        <h1>✏️ English Student Exam Portal</h1>
      </header>
      <main id="app-container">
        <div id="student-content" style={{ maxWidth: '450px', margin: '2rem auto', padding: '2.5rem 2rem', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🎓</span>
            <h2 style={{ margin: 0, color: '#4f46e5', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>Start Exam</h2>
            <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.95rem', fontWeight: 600 }}>Please fill in the required information to join.</p>
          </div>
          
          <form id="student-start-form" onSubmit={handleSubmit} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="student_name" style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#334155' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                id="student_name" 
                name="student_name" 
                required 
                placeholder="e.g. John Doe" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'var(--font)', transition: 'border-color 0.2s', outline: 'none' }} 
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            
            <div>
              <label htmlFor="class_name" style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#334155' }}>Class <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                id="class_name" 
                name="class_name" 
                required 
                placeholder="e.g. Math 101" 
                value={formData.className}
                onChange={(e) => setFormData({...formData, className: e.target.value})}
                style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'var(--font)', transition: 'border-color 0.2s', outline: 'none' }} 
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            
            <div id="url-exam-info" style={{ display: 'block', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '12px', padding: '1rem', marginTop: '0.5rem' }}>
              <p style={{ margin: 0, color: '#0284c7', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}>📝 Assigned Exam</p>
              <p id="url-exam-title" style={{ margin: '0.25rem 0 0 0', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem' }}>{examInfo.title}</p>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '0.9rem 1.5rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '12px', marginTop: '1rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', color: 'white' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🚀 Enter Exam Room
            </button>
          </form>
          
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
            <strong style={{ color: '#475569' }}>📌 Note:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
              <li>Your progress is saved automatically in case of disconnects.</li>
              <li>When the time is up, the exam will be automatically submitted.</li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
};
