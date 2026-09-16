import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
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

  if (loading) return <LoadingSpinner message="Đang tải kết quả..." />;
  if (!data) return null;

  const { submission, details } = data;
  const isPassed = submission.percentage >= 50;

  return (
    <div className="min-h-screen bg-[#faf9ff] font-['Nunito'] text-[#4a5c75] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Banner Kết quả Tổng quan */}
        <div className="bg-white rounded-[24px] shadow-sm p-8 text-center border-t-8 border-[#357ae8]">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Kết quả bài thi: {submission.exams?.title || 'Unknown Exam'}
          </h1>
          <p className="text-gray-500 mb-6">
            Học sinh: <span className="font-bold text-gray-800">{submission.student_name}</span> 
            {submission.class_name && ` - Lớp: ${submission.class_name}`}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="bg-blue-50 p-4 rounded-2xl">
              <div className="text-sm font-bold text-blue-600 mb-1">Điểm số</div>
              <div className="text-2xl font-black text-blue-700">{submission.score} / {submission.total_points}</div>
            </div>
            <div className={`p-4 rounded-2xl ${isPassed ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`text-sm font-bold mb-1 ${isPassed ? 'text-green-600' : 'text-red-600'}`}>Tỷ lệ đúng</div>
              <div className={`text-2xl font-black ${isPassed ? 'text-green-700' : 'text-red-700'}`}>{submission.percentage}%</div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <div className="text-sm font-bold text-emerald-600 mb-1">Số câu đúng</div>
              <div className="text-2xl font-black text-emerald-700">{submission.correct_count}</div>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl">
              <div className="text-sm font-bold text-rose-600 mb-1">Số câu sai</div>
              <div className="text-2xl font-black text-rose-700">{submission.wrong_count + submission.unanswered_count}</div>
            </div>
          </div>
        </div>

        {/* Chi tiết từng câu hỏi (nếu cho phép) */}
        {submission.exams?.show_result ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 ml-2">Chi tiết bài làm</h2>
            
            {details.map((item, index) => {
              const q = item.questions;
              return (
                <div key={item.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${item.is_correct ? 'border-green-200' : 'border-red-200'}`}>
                  <div className="flex items-start gap-4 mb-4">
                    <span className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm text-white ${item.is_correct ? 'bg-green-500' : 'bg-red-500'}`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 whitespace-pre-wrap">{q.question_text}</h3>
                      <div className="mt-2 text-sm">
                        <p className="text-gray-600 mb-1">
                          <span className="font-bold">Đáp án của bạn: </span>
                          <span className={item.is_correct ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            {item.student_answer || '(Bỏ trống)'}
                          </span>
                        </p>
                        {!item.is_correct && (
                          <p className="text-gray-600">
                            <span className="font-bold">Đáp án đúng: </span>
                            <span className="text-blue-600 font-bold">
                              {q.type === 'multiple_choice' ? q.correct_answer : JSON.stringify(q.correct_answer)}
                            </span>
                          </p>
                        )}
                      </div>
                      
                      {q.explanation && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                          <span className="font-bold text-purple-600">💡 Giải thích: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-200">
            <p className="text-gray-500 font-medium">Giáo viên đã ẩn chi tiết đáp án của đề thi này.</p>
          </div>
        )}

      </div>
    </div>
  );
};
