import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { studentRepository } from '../../repositories/studentRepository';

// Hàm helper trộn mảng (Fisher-Yates)
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
  
  // Lưu câu trả lời: { "uuid_question": "answer_text" }
  const [answers, setAnswers] = useState({});
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Kéo thông tin học sinh từ sessionStorage
    const studentInfo = JSON.parse(sessionStorage.getItem('student_info'));
    if (!studentInfo) {
      showToast('Vui lòng điền thông tin trước khi làm bài', 'warning');
      navigate(`/exam/${examCode}/start`);
      return;
    }

    const initExam = async () => {
      try {
        setLoading(true);
        const info = await studentRepository.getExamInfo(examCode);
        let qList = await studentRepository.getStudentQuestions(examCode);

        // Áp dụng xáo trộn theo setting
        if (info.shuffle_questions) {
          qList = shuffleArray(qList);
        }
        if (info.shuffle_options) {
          qList = qList.map(q => {
            if (q.type === 'multiple_choice' && q.options) {
              return { ...q, options: shuffleArray(q.options) };
            }
            return q;
          });
        }

        setExamInfo(info);
        setQuestions(qList);
        setTimeLeft(info.duration_minutes * 60);

      } catch (error) {
        showToast('Lỗi khi nạp dữ liệu bài thi.', 'error');
        navigate(`/exam/${examCode}/start`);
      } finally {
        setLoading(false);
      }
    };
    
    initExam();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examCode]);

  // Logic đếm ngược
  useEffect(() => {
    if (loading || submitting || isTimeUp || !examInfo) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimeUp(true);
          handleAutoSubmit(); // Hết giờ tự nộp
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitting, isTimeUp, examInfo]);

  // Format thời gian mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleManualSubmit = async () => {
    if (window.confirm('Bạn có chắc chắn muốn nộp bài? Bạn sẽ không thể sửa lại.')) {
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
    
    // Convert answers map to array format for RPC: [{ question_id: "", answer: "" }]
    const answersArray = Object.keys(answers).map(qId => ({
      question_id: qId,
      answer: answers[qId]
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
      
      showToast('Nộp bài thành công!', 'success');
      // Xoá session info (tuỳ chọn)
      sessionStorage.removeItem('student_info');
      navigate(`/result/${submissionId}`, { replace: true });
    } catch (error) {
      showToast('Lỗi khi nộp bài: ' + error.message, 'error');
      setSubmitting(false); // Cho phép thử nộp lại
    }
  };

  if (loading) return <LoadingSpinner message="Đang tải đề thi..." />;

  const isLowTime = timeLeft <= 60; // Dưới 1 phút cảnh báo đỏ

  return (
    <div className="min-h-screen bg-[#faf9ff] font-['Nunito'] text-[#4a5c75] pb-24">
      {/* Header Sticky */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 md:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 line-clamp-1">{examInfo.title}</h1>
          <p className="text-sm text-gray-500">
            {Object.keys(answers).length} / {questions.length} câu đã làm
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`font-mono text-xl md:text-2xl font-bold px-4 py-1.5 rounded-lg border ${
            isLowTime ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-blue-50 text-blue-600 border-blue-200'
          }`}>
            ⏱ {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={submitting}
            className="bg-[#357ae8] text-white px-5 md:px-8 py-2 md:py-2.5 rounded-lg font-bold hover:bg-[#2b65c2] shadow-md disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100" id={`question-${index}`}>
            <div className="flex items-start gap-4 mb-4">
              <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                {index + 1}
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 whitespace-pre-wrap">{q.question_text}</h3>
                <span className="text-xs text-gray-400 font-bold mt-1 block">{q.points} Điểm</span>
              </div>
            </div>

            {/* Render Multiple Choice */}
            {q.type === 'multiple_choice' && (
              <div className="pl-12 space-y-3">
                {q.options && q.options.map((opt, i) => (
                  <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    answers[q.id] === opt ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name={`question_${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleAnswerChange(q.id, opt)}
                      className="w-5 h-5 text-[#357ae8]"
                    />
                    <span className="text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Render Fill Blank or Short Answer */}
            {(q.type === 'fill_blank' || q.type === 'short_answer') && (
              <div className="pl-12">
                <input
                  type="text"
                  placeholder="Nhập câu trả lời của bạn vào đây..."
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8fa8ff] focus:border-transparent transition-all text-gray-800"
                />
              </div>
            )}
            
            {/* Các loại câu hỏi khác có thể mở rộng ở đây */}
          </div>
        ))}
      </main>
    </div>
  );
};
