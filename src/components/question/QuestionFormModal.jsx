import React, { useState, useEffect } from 'react';

const Tooltip = ({ text }) => (
  <span title={text} style={{ cursor: 'help', color: '#94a3b8', marginLeft: '0.4rem', fontSize: '0.9rem' }}>
    <i className="fa-solid fa-circle-question"></i>
  </span>
);

export const QuestionFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    question_code: 'Q' + Date.now().toString().slice(-6),
    type: 'multiple_choice',
    level: 'medium',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    points: 1
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        question_code: initialData.question_code || initialData.id || 'Q' + Date.now().toString().slice(-6),
        type: initialData.type || 'multiple_choice',
        level: initialData.level || 'medium',
        question_text: initialData.question_text || '',
        options: initialData.options || ['', '', '', ''],
        correct_answer: initialData.correct_answer || '',
        accepted_answers: initialData.accepted_answers || '',
        explanation: initialData.explanation || '',
        points: initialData.points || 1,
        tags: initialData.tags || '',
        is_active: initialData.is_active ?? true
      });
    } else {
      setFormData({
        question_code: 'Q' + Date.now().toString().slice(-6),
        type: 'multiple_choice',
        level: 'medium',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
        accepted_answers: '',
        explanation: '',
        points: 1,
        tags: '',
        is_active: true
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSetCorrectMCQ = (val) => {
    if (!val) return;
    if (formData.type === 'multiple_choice') {
      let currentAnswers = (formData.correct_answer || '').split(',').map(s => s.trim()).filter(Boolean);
      if (currentAnswers.includes(val)) {
        currentAnswers = currentAnswers.filter(a => a !== val);
      } else {
        currentAnswers.push(val);
      }
      setFormData({ ...formData, correct_answer: currentAnswers.join(',') });
    } else {
      setFormData({ ...formData, correct_answer: val });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    if (dataToSave.type === 'arrange_sentence') {
      dataToSave.correct_answer = dataToSave.question_text;
    }
    onSave(dataToSave);
  };

  const isEdit = !!initialData;

  const renderTypeHint = () => {
    switch (formData.type) {
      case 'arrange_sentence':
        return <div style={{ background: '#f8fafc', borderLeft: '4px solid #6366f1', padding: '1rem', borderRadius: '8px', color: '#334155', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.5' }}>💡 <strong>Mẹo:</strong> Nhập câu Tiếng Anh đúng hoàn chỉnh vào ô "Question Text". ĐÃ ẨN CÁC Ô ĐÁP ÁN BÊN DƯỚI. Ứng dụng sẽ xáo trộn câu này.</div>;
      case 'matching':
        return <div style={{ background: '#fff1f2', borderLeft: '4px solid #f43f5e', padding: '1rem', borderRadius: '8px', color: '#881337', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.5' }}>💡 <strong>Matching:</strong> Nhập list câu hỏi ở Question Text (mỗi câu 1 dòng). Nhập list câu trả lời tương ứng ở Correct Answer (mỗi câu 1 dòng). Số lượng dòng phải BẰNG nhau. ĐÃ ẨN CÁC Ô ĐÁP ÁN BÊN DƯỚI.</div>;
      case 'fill_blank':
        return <div style={{ background: '#f0fdf4', borderLeft: '4px solid #22c55e', padding: '1rem', borderRadius: '8px', color: '#166534', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.5' }}>💡 <strong>Điền khuyết:</strong> Sử dụng 3 dấu gạch dưới ___ hoặc [blank] để đánh dấu vị trí điền từ trong Question Text. Nhập đáp án vào ô Correct Answer.</div>;
      default:
        return null;
    }
  };

  const showOptions = ['multiple_choice', 'single_choice', 'vocabulary'].includes(formData.type);
  const showTrueFalse = formData.type === 'true_false';

  return (
    <div className="modal" id="edit-question-modal" style={{ display: 'flex', padding: '1rem' }}>
      <div className="modal-content" style={{ maxWidth: '680px', width: '100%', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 2rem)' }}>
        <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>
            <i className="fa-solid fa-pen"></i> {isEdit ? 'Edit Question' : 'Add New Question'}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} style={{ position: 'static', margin: 0, fontSize: '1.4rem' }}>&#x2715;</button>
        </div>

        <form id="edit-question-form" onSubmit={handleSubmit} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            
            {/* Section 1: Basic Info */}
            <div className="modal-section" style={{ margin: 0 }}>
              <p className="modal-section-title">📋 THÔNG TIN CƠ BẢN</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div className="field-label-row">
                    <label style={{ fontSize: '0.85rem' }}>Question ID <span className="required-star">*</span></label>
                    <Tooltip text="Mã câu hỏi - duy nhất trong đề thi." />
                  </div>
                  <input 
                    type="text" 
                    value={formData.question_code} 
                    onChange={(e) => setFormData({...formData, question_code: e.target.value})}
                    style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }} 
                    required 
                  />
                </div>
                <div>
                  <div className="field-label-row">
                    <label style={{ fontSize: '0.85rem' }}>Level <span className="required-star">*</span></label>
                    <Tooltip text="Độ khó của câu hỏi." />
                  </div>
                  <select 
                    value={formData.level} 
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                    style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
                  >
                    <option value="easy">🟢 Easy</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="hard">🔴 Hard</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <div className="field-label-row">
                  <label style={{ fontSize: '0.85rem' }}>Type <span className="required-star">*</span></label>
                  <Tooltip text="Loại câu hỏi sẽ quyết định cách học sinh tương tác và làm bài." />
                </div>
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
                >
                  <option value="multiple_choice">🔘 Multiple Choice</option>
                  <option value="vocabulary">📖 Vocabulary</option>
                  <option value="short_answer">✍️ Short Answer</option>
                  <option value="arrange_sentence">🧩 Arrange Sentence</option>
                  <option value="fill_blank">📝 Fill in the Blank</option>
                  <option value="true_false">✅ True / False</option>
                  <option value="matching">🔗 Matching</option>
                </select>
              </div>

              {renderTypeHint()}
            </div>

            {/* Section 2: Question Content */}
            <div className="modal-section" style={{ margin: 0 }}>
              <p className="modal-section-title">❓ NỘI DUNG CÂU HỎI</p>
              <div>
                <div className="field-label-row">
                  <label style={{ fontSize: '0.85rem' }}>Question Text <span className="required-star">*</span></label>
                  <Tooltip text="Nội dung chính của câu hỏi." />
                </div>
                <textarea 
                  value={formData.question_text} 
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                  rows="4" 
                  required 
                  style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)', resize: 'vertical' }}
                ></textarea>
              </div>

              {showOptions && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {['A', 'B', 'C', 'D'].map((opt, idx) => (
                    <div key={opt}>
                      <div className="field-label-row">
                        <label style={{ fontSize: '0.85rem' }}>{formData.type === 'vocabulary' ? `Nghĩa ${opt}` : `Option ${opt}`}</label>
                      </div>
                      <input 
                        type="text" 
                        value={formData.options[idx] || ''} 
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Answer */}
            {formData.type !== 'arrange_sentence' && (
            <div className="modal-section" style={{ margin: 0 }}>
              <p className="modal-section-title">✅ ĐÁP ÁN</p>
              
              {showOptions ? (
                <div>
                  <div className="field-label-row">
                    <label style={{ fontSize: '0.85rem' }}>Đáp án đúng <span className="required-star">*</span></label>
                    <Tooltip text={formData.type === 'multiple_choice' ? "Click chọn một hoặc nhiều đáp án đúng." : "Click chọn 1 đáp án đúng nhất."} />
                  </div>
                  <div className="answer-btn-group" style={{ display: 'flex', gap: '0.5rem' }}>
                    {['A', 'B', 'C', 'D'].map((opt, idx) => {
                      const val = formData.options[idx];
                      const isSelected = formData.type === 'multiple_choice' 
                        ? (formData.correct_answer || '').split(',').map(s => s.trim()).includes(val) && val !== ''
                        : formData.correct_answer === val && val !== '';
                      return (
                        <button 
                          key={opt}
                          type="button" 
                          className="ans-btn" 
                          style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: isSelected ? 'var(--primary-light)' : 'white', color: isSelected ? 'var(--primary)' : 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }}
                          onClick={() => handleSetCorrectMCQ(val)}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : showTrueFalse ? (
                <div>
                  <div className="field-label-row">
                    <label style={{ fontSize: '0.85rem' }}>Đáp án đúng <span className="required-star">*</span></label>
                    <Tooltip text="Chọn đúng hoặc sai." />
                  </div>
                  <div className="answer-btn-group" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, correct_answer: 'TRUE'})}
                      style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${formData.correct_answer === 'TRUE' ? '#22c55e' : 'var(--border-color)'}`, backgroundColor: formData.correct_answer === 'TRUE' ? '#f0fdf4' : 'white', color: formData.correct_answer === 'TRUE' ? '#166534' : 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ✅ TRUE
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, correct_answer: 'FALSE'})}
                      style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${formData.correct_answer === 'FALSE' ? '#ef4444' : 'var(--border-color)'}`, backgroundColor: formData.correct_answer === 'FALSE' ? '#fef2f2' : 'white', color: formData.correct_answer === 'FALSE' ? '#991b1b' : 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ❌ FALSE
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div className="field-label-row">
                      <label style={{ fontSize: '0.85rem' }}>Correct Answer {formData.type !== 'short_answer' && <span className="required-star">*</span>}</label>
                      <Tooltip text="Đáp án đúng chính xác." />
                    </div>
                    <textarea 
                      value={formData.correct_answer} 
                      onChange={(e) => setFormData({...formData, correct_answer: e.target.value})}
                      rows="3" 
                      required={formData.type !== 'short_answer'}
                      style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)', resize: 'vertical' }}
                    ></textarea>
                  </div>
                  <div>
                    <div className="field-label-row">
                      <label style={{ fontSize: '0.85rem' }}>Accepted Answers</label>
                      <Tooltip text='Các đáp án chấp nhận. Dùng JSON array: ["answer1","answer2"].' />
                    </div>
                    <textarea 
                      value={formData.accepted_answers || ''} 
                      onChange={(e) => setFormData({...formData, accepted_answers: e.target.value})}
                      rows="3"
                      placeholder='["answer"]' 
                      style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)', resize: 'vertical' }} 
                    ></textarea>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '0.75rem' }}>
                <div className="field-label-row">
                  <label style={{ fontSize: '0.85rem' }}>Explanation</label>
                  <Tooltip text="Giải thích đáp án - hiển thị cho học sinh sau khi nộp bài." />
                </div>
                <textarea 
                  value={formData.explanation || ''} 
                  onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                  rows="2" 
                  style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)', resize: 'vertical' }}
                ></textarea>
              </div>
            </div>
            )}

            {/* Section 4: Metadata */}
            <div className="modal-section" style={{ margin: 0 }}>
              <p className="modal-section-title">⚙️ METADATA</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div className="field-label-row">
                    <label style={{ fontSize: '0.85rem' }}>Points <span className="required-star">*</span></label>
                    <Tooltip text="Điểm số của câu hỏi này." />
                  </div>
                  <input 
                    type="number" 
                    value={formData.points} 
                    onChange={(e) => setFormData({...formData, points: Number(e.target.value)})}
                    min="0.5" step="0.5" 
                    style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }} 
                  />
                </div>
                <div>
                  <div className="field-label-row">
                    <label style={{ fontSize: '0.85rem' }}>Tags</label>
                    <Tooltip text="Nhãn phân loại câu hỏi (cách nhau bằng dấu phẩy)." />
                  </div>
                  <input 
                    type="text" 
                    value={formData.tags || ''} 
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="grammar,vocabulary" 
                    style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }} 
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.is_active !== false} 
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                  />
                  Active (hiện câu hỏi này trong bài thi)
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.5rem', backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', fontSize: '0.95rem', borderRadius: '8px' }}>
              <i className="fa-solid fa-save"></i> {isEdit ? 'Save Changes' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
