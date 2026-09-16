import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { QuestionFormModal } from '../../components/question/QuestionFormModal';
import { ImportQuestionsModal } from '../../components/question/ImportQuestionsModal';
import { questionRepository } from '../../repositories/questionRepository';

export const QuestionManager = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await questionRepository.getQuestionsByExam(examId);
      setQuestions(data);
    } catch (error) {
      showToast('Lỗi khi tải câu hỏi: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const handleSaveQuestion = async (questionData) => {
    try {
      if (editingQuestion) {
        await questionRepository.updateQuestion(editingQuestion.id, questionData);
        showToast('Cập nhật câu hỏi thành công!', 'success');
      } else {
        const nextOrderIndex = questions.length;
        await questionRepository.createQuestion(examId, questionData, nextOrderIndex);
        showToast('Tạo câu hỏi thành công!', 'success');
      }
      setIsFormOpen(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      showToast('Lỗi khi lưu câu hỏi: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xoá câu hỏi này?')) {
      try {
        await questionRepository.deleteQuestion(id);
        showToast('Đã xoá câu hỏi!', 'success');
        fetchQuestions();
      } catch (error) {
        showToast('Lỗi khi xoá: ' + error.message, 'error');
      }
    }
  };

  const moveQuestion = async (index, direction) => {
    const newQuestions = [...questions];
    if (direction === 'up' && index > 0) {
      const temp = newQuestions[index].order_index;
      newQuestions[index].order_index = newQuestions[index - 1].order_index;
      newQuestions[index - 1].order_index = temp;
    } else if (direction === 'down' && index < newQuestions.length - 1) {
      const temp = newQuestions[index].order_index;
      newQuestions[index].order_index = newQuestions[index + 1].order_index;
      newQuestions[index + 1].order_index = temp;
    } else {
      return;
    }

    try {
      // Optimistic update
      setQuestions([...newQuestions].sort((a, b) => a.order_index - b.order_index));
      
      const updates = [
        { id: newQuestions[index].id, order_index: newQuestions[index].order_index },
        { id: newQuestions[direction === 'up' ? index - 1 : index + 1].id, order_index: newQuestions[direction === 'up' ? index - 1 : index + 1].order_index }
      ];
      await questionRepository.updateQuestionOrders(updates);
    } catch (error) {
      showToast('Lỗi khi đổi thứ tự: ' + error.message, 'error');
      fetchQuestions(); // rollback
    }
  };

  const handleImport = async (parsedList) => {
    try {
      await questionRepository.importQuestions(examId, parsedList);
      showToast(`Import thành công ${parsedList.length} câu hỏi!`, 'success');
      setIsImportOpen(false);
      fetchQuestions();
    } catch (error) {
      showToast('Lỗi Import: ' + error.message, 'error');
    }
  };

  if (loading) return <LoadingSpinner message="Đang tải danh sách câu hỏi..." />;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
          <button 
            onClick={() => navigate('/admin/exams')}
            className="text-gray-500 hover:text-gray-700 font-bold mb-2 flex items-center gap-2"
          >
            ← Quay lại Exam Manager
          </button>
          <h2 className="text-2xl font-bold text-[#4a5c75]">Quản lý Câu hỏi</h2>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="bg-teal-600 text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-teal-700 transition-colors"
          >
            📥 Import CSV
          </button>
          <button
            onClick={() => { setEditingQuestion(null); setIsFormOpen(true); }}
            className="bg-[#357ae8] text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-[#2b65c2] transition-colors"
          >
            + Create Question
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <EmptyState 
          title="Đề thi chưa có câu hỏi" 
          description="Bấm Create Question để tạo thủ công hoặc Import từ file CSV."
        />
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-blue-300 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                    {q.type}
                  </span>
                  <span className="text-sm text-gray-500 font-bold">{q.points} Points</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 whitespace-pre-wrap">{q.question_text}</h3>
                
                {q.type === 'multiple_choice' && q.options && (
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    {q.options.map((opt, i) => (
                      <li key={i} className={`px-3 py-1.5 rounded border ${q.correct_answer === opt ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-100'}`}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </li>
                    ))}
                  </ul>
                )}
                
                {q.type === 'fill_blank' && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p><span className="font-bold text-green-600">Đáp án chính:</span> {q.correct_answer}</p>
                    {q.accepted_answers && q.accepted_answers.length > 0 && (
                      <p><span className="font-bold text-gray-500">Chấp nhận thêm:</span> {q.accepted_answers.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-row md:flex-col gap-2 shrink-0">
                <div className="flex bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <button onClick={() => moveQuestion(index, 'up')} disabled={index === 0} className="px-3 py-1 text-gray-500 hover:bg-gray-200 hover:text-blue-600 disabled:opacity-30">
                    ▲
                  </button>
                  <button onClick={() => moveQuestion(index, 'down')} disabled={index === questions.length - 1} className="px-3 py-1 text-gray-500 hover:bg-gray-200 hover:text-blue-600 disabled:opacity-30 border-l border-gray-200">
                    ▼
                  </button>
                </div>
                <button onClick={() => { setEditingQuestion(q); setIsFormOpen(true); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-sm">
                  ✏️ Sửa
                </button>
                <button onClick={() => handleDelete(q.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold text-sm">
                  🗑️ Xoá
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <QuestionFormModal 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingQuestion(null); }} 
        onSave={handleSaveQuestion} 
        initialData={editingQuestion} 
      />
      
      <ImportQuestionsModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImport={handleImport} 
      />
    </div>
  );
};
