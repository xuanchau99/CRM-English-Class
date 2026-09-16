import React, { useState, useEffect } from 'react';
import { studentRepository } from '../../repositories/studentRepository';
import { LoadingSpinner } from '../common/LoadingSpinner';

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#faf9ff] shrink-0">
          <h2 className="text-xl font-bold text-[#4a5c75]">
            Chi tiết bài làm
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-3xl leading-none transition-colors">×</button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          {loading ? (
            <LoadingSpinner message="Đang tải dữ liệu..." />
          ) : errorMsg ? (
            <p className="text-red-500 font-bold text-center">{errorMsg}</p>
          ) : !data ? (
            <p className="text-gray-500 text-center">Không có dữ liệu</p>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Thống kê nhanh */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-6 justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{data.submission.student_name}</h3>
                  <p className="text-sm text-gray-500">Lớp: {data.submission.class_name || 'N/A'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-blue-600 mb-1">Điểm số</p>
                  <p className="text-2xl font-black text-blue-700">{data.submission.score}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-green-600 mb-1">Tỷ lệ đúng</p>
                  <p className="text-2xl font-black text-green-700">{data.submission.percentage}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-500 mb-1">Thời gian làm</p>
                  <p className="text-xl font-bold text-gray-700">{Math.floor(data.submission.duration_seconds / 60)}m {data.submission.duration_seconds % 60}s</p>
                </div>
              </div>

              {/* Danh sách câu hỏi và đáp án */}
              <div className="space-y-4">
                {data.details.length === 0 ? (
                  <p className="text-center text-gray-500 italic">Chi tiết đáp án không khả dụng.</p>
                ) : (
                  data.details.map((item, index) => {
                    const q = item.questions;
                    return (
                      <div key={item.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${item.is_correct ? 'border-green-200' : 'border-red-200'}`}>
                        <div className="flex items-start gap-4">
                          <span className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm text-white ${item.is_correct ? 'bg-green-500' : 'bg-red-500'}`}>
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800 whitespace-pre-wrap">{q.question_text}</h3>
                            <div className="mt-3 text-sm space-y-2">
                              <p className="text-gray-600">
                                <span className="font-bold">Học sinh chọn: </span>
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
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
