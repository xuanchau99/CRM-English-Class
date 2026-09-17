import React, { useState, useEffect } from 'react';

export const ExamFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    exam_code: 'ENG_' + Date.now().toString().slice(-6),
    title: '',
    duration_minutes: 45,
    shuffle_questions: false,
    shuffle_options: false,
    show_result: true,
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        exam_code: initialData.exam_code || 'ENG_' + Date.now().toString().slice(-6),
        title: initialData.title || '',
        duration_minutes: initialData.duration_minutes || 45,
        shuffle_questions: initialData.shuffle_questions || false,
        shuffle_options: initialData.shuffle_options || false,
        show_result: initialData.show_result ?? true,
        is_active: initialData.is_active ?? true,
      });
    } else {
      setFormData({
        exam_code: 'ENG_' + Date.now().toString().slice(-6),
        title: '',
        duration_minutes: 45,
        shuffle_questions: false,
        shuffle_options: false,
        show_result: true,
        is_active: true,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{initialData ? 'Edit Exam Details' : 'Create New Exam'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ width: '150px', fontWeight: 'bold' }}>Exam ID / Code:</label>
            <input
              type="text"
              required
              className="input"
              value={formData.exam_code}
              onChange={(e) => setFormData({...formData, exam_code: e.target.value})}
              style={{ flex: 1 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ width: '150px', fontWeight: 'bold' }}>Exam Title:</label>
            <input
              type="text"
              required
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              style={{ flex: 1 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ width: '150px', fontWeight: 'bold' }}>Duration (minutes):</label>
            <input
              type="number"
              required
              min="1"
              className="input"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})}
              style={{ flex: 1 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={formData.shuffle_questions}
                onChange={(e) => setFormData({...formData, shuffle_questions: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              Shuffle Questions
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={formData.shuffle_options}
                onChange={(e) => setFormData({...formData, shuffle_options: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              Shuffle MCQ Options
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={formData.show_result}
                onChange={(e) => setFormData({...formData, show_result: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              Show Result After Submission
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              Is Active (Accepting Responses)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {initialData ? 'Save Changes' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
