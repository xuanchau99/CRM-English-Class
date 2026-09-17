import React, { useState, useEffect } from 'react';

export const GameFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    image_url: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        image_url: initialData.image_url || '',
      });
    } else {
      setFormData({
        name: '',
        url: '',
        image_url: '',
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
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>{initialData ? '✏️ Chỉnh sửa Trò chơi' : '+ Thêm Trò chơi mới'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div className="modal-section" style={{ marginTop: '1rem' }}>
            <p className="modal-section-title">🎮 Game Info</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Tên Trò chơi <span className="required-star">*</span></label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="VD: Kahoot Vocabulary"
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Đường dẫn Trò chơi (URL) <span className="required-star">*</span></label>
                <input
                  type="url"
                  required
                  style={{ width: '100%', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  placeholder="https://kahoot.it/..."
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Đường dẫn Ảnh bìa (Image URL)</label>
                <input
                  type="url"
                  style={{ width: '100%', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder="https://...image.png"
                />
                {formData.image_url && (
                  <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      style={{ height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Huỷ bỏ</button>
            <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
              {initialData ? 'Cập nhật' : 'Lưu lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
