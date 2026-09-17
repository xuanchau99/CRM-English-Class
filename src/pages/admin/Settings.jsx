import React, { useState, useEffect } from 'react';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { settingRepository } from '../../repositories/settingRepository';

const SettingItem = ({ item, onSave, onDelete }) => {
  const isSecret = item.key.toLowerCase().includes('key') || item.key.toLowerCase().includes('token') || item.key.toLowerCase().includes('password');
  const [value, setValue] = useState(item.value || '');
  const [showValue, setShowValue] = useState(!isSecret);
  const [isSaving, setIsSaving] = useState(false);
  const [isEdited, setIsEdited] = useState(false);

  // Normalize initial JSON if it's a simple string for editing
  useEffect(() => {
    let initialVal = item.value;
    if (typeof initialVal === 'string' && initialVal.startsWith('"') && initialVal.endsWith('"')) {
      initialVal = initialVal.slice(1, -1);
    } else if (typeof initialVal === 'object') {
      initialVal = JSON.stringify(initialVal);
    }
    setValue(initialVal || '');
  }, [item.value]);

  const handleSave = async () => {
    setIsSaving(true);
    let finalValue = value;
    try {
      finalValue = JSON.parse(value);
    } catch {
      finalValue = value;
    }
    await onSave(item.key, finalValue);
    setIsEdited(false);
    setIsSaving(false);
  };

  // Derive icon & color from key name
  const getKeyMeta = (key) => {
    if (key.includes('mail'))   return { icon: 'fa-envelope',     color: '#10b981', bg: '#ecfdf5', badge: 'Email' };
    if (key.includes('gemini')) return { icon: 'fa-robot',        color: '#8b5cf6', bg: '#f5f3ff', badge: 'AI' };
    if (key.includes('emailjs')) return { icon: 'fa-paper-plane', color: '#3b82f6', bg: '#eff6ff', badge: 'EmailJS' };
    if (isSecret)               return { icon: 'fa-key',          color: '#f59e0b', bg: '#fffbeb', badge: 'Secret' };
    return                             { icon: 'fa-gear',          color: '#64748b', bg: '#f8fafc', badge: 'Config' };
  };

  const meta = getKeyMeta(item.key);

  return (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      border: isEdited ? '2px solid #f59e0b' : '1.5px solid #e2e8f0',
      boxShadow: isEdited ? '0 0 0 3px rgba(245,158,11,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
      padding: '1rem 1.25rem',
      transition: 'all 0.2s ease',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      {/* Icon + Key Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px', flex: '0 0 auto' }}>
        <div style={{
          width: '38px', height: '38px', flexShrink: 0,
          background: meta.bg, borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${meta.color}30`
        }}>
          <i className={`fa-solid ${meta.icon}`} style={{ color: meta.color, fontSize: '15px' }}></i>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
              {item.key}
            </span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px',
              borderRadius: '999px', background: meta.bg,
              color: meta.color, border: `1px solid ${meta.color}40`
            }}>
              {meta.badge}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Updated: {new Date(item.updated_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </div>

      {/* Input */}
      <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
        <input
          type={showValue ? 'text' : 'password'}
          value={value}
          onChange={(e) => { setValue(e.target.value); setIsEdited(true); }}
          style={{
            width: '100%',
            padding: isSecret ? '0.6rem 2.5rem 0.6rem 0.9rem' : '0.6rem 0.9rem',
            borderRadius: '10px',
            border: isEdited ? '2px solid #f59e0b' : '1.5px solid #e2e8f0',
            background: isEdited ? '#fffbeb' : '#f8fafc',
            fontFamily: 'monospace',
            fontSize: '0.88rem',
            color: '#334155',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          placeholder="Enter value..."
          onFocus={e => { e.target.style.borderColor = '#8fa8ff'; e.target.style.background = '#fff'; }}
          onBlur={e => {
            e.target.style.borderColor = isEdited ? '#f59e0b' : '#e2e8f0';
            e.target.style.background = isEdited ? '#fffbeb' : '#f8fafc';
          }}
        />
        {isSecret && (
          <button
            onClick={() => setShowValue(!showValue)}
            style={{
              position: 'absolute', right: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', background: 'none', border: 'none',
              cursor: 'pointer', color: '#94a3b8', fontSize: '14px', padding: 0
            }}
            title={showValue ? 'Hide' : 'Show'}
          >
            <i className={`fa-solid ${showValue ? 'fa-eye-slash' : 'fa-eye'}`}></i>
          </button>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={handleSave}
          disabled={!isEdited || isSaving}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '9px',
            border: 'none',
            cursor: isEdited ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            fontSize: '0.85rem',
            background: isEdited ? 'linear-gradient(135deg, var(--primary), var(--primary-hover))' : '#e2e8f0',
            color: isEdited ? 'white' : '#94a3b8',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '0.35rem'
          }}
        >
          <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
          {isSaving ? '' : 'Save'}
        </button>
        <button
          onClick={() => onDelete(item.key)}
          style={{
            padding: '0.55rem 0.7rem',
            borderRadius: '9px',
            border: '1.5px solid #fecaca',
            cursor: 'pointer',
            fontWeight: 700,
            background: '#fff5f5',
            color: '#ef4444',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
          title="Delete setting"
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.borderColor = '#fecaca'; }}
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  );
};


export const Settings = () => {
  const { showToast } = useNotification();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Email Notification state
  const [receiveMail, setReceiveMail] = useState('');
  const [emailjsServiceId, setEmailjsServiceId] = useState('');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState('');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingRepository.getAllSettings();
      setSettings(data);
      // Load email notification settings
      const findVal = (key) => {
        const s = data.find(d => d.key === key);
        if (!s) return '';
        const v = s.value;
        if (typeof v === 'string' && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
        return v || '';
      };
      setReceiveMail(findVal('receive_mail'));
      setEmailjsServiceId(findVal('emailjs_service_id'));
      setEmailjsTemplateId(findVal('emailjs_template_id'));
      setEmailjsPublicKey(findVal('emailjs_public_key'));
    } catch (error) {
      showToast('Lỗi tải cài đặt: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSetting = async (key, value) => {
    if (!key.trim()) {
      showToast('Key không được để trống', 'error');
      return;
    }
    
    // Normalize string representation for JSONB
    let saveVal = value;
    if (typeof value === 'string' && value !== '') {
      // In Postgres JSONB, a raw string must be quoted to be valid JSON if using upsert on a jsonb column
      // Supabase JS handle this implicitly, but we must ensure we pass the right type
    }
    
    try {
      await settingRepository.saveSetting(key.toLowerCase().trim(), saveVal);
      showToast(`Đã lưu cài đặt: ${key}`, 'success');
      fetchSettings();
    } catch (error) {
      showToast('Lỗi khi lưu: ' + error.message, 'error');
    }
  };

  const handleAddNew = async (e) => {
    e.preventDefault();
    await handleSaveSetting(newKey, newValue);
    setNewKey('');
    setNewValue('');
  };

  const handleDeleteSetting = async (key) => {
    if (window.confirm(`Bạn có chắc muốn xoá cài đặt '${key}'? Các chức năng dùng API này có thể ngừng hoạt động.`)) {
      try {
        await settingRepository.deleteSetting(key);
        showToast('Xoá thành công!', 'success');
        fetchSettings();
      } catch (error) {
        showToast('Lỗi khi xoá: ' + error.message, 'error');
      }
    }
  };

  const handleSaveEmailSettings = async () => {
    setIsSavingEmail(true);
    try {
      await Promise.all([
        settingRepository.saveSetting('receive_mail', receiveMail.trim()),
        settingRepository.saveSetting('emailjs_service_id', emailjsServiceId.trim()),
        settingRepository.saveSetting('emailjs_template_id', emailjsTemplateId.trim()),
        settingRepository.saveSetting('emailjs_public_key', emailjsPublicKey.trim()),
      ]);
      showToast('Lưu cấu hình email thành công!', 'success');
      fetchSettings();
    } catch (error) {
      showToast('Lỗi khi lưu email: ' + error.message, 'error');
    } finally {
      setIsSavingEmail(false);
    }
  };

  if (loading) return <LoadingSpinner message="Đang tải cấu hình..." />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-darkest)' }}>⚙️ Cài đặt Hệ thống</h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Quản lý API Key (Gemini, EmailJS) và các cấu hình động của ứng dụng.</p>
      </div>

      {/* Email Notification Settings */}
      <div style={{
        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        border: '1.5px solid #6ee7b7',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '42px', height: '42px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.35)'
          }}>
            <i className="fa-solid fa-bell" style={{ color: 'white', fontSize: '18px' }}></i>
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 800, color: '#065f46', fontSize: '1.1rem' }}>Email Notification</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#047857' }}>Gửi email cho admin khi học sinh nộp bài.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem' }}>Email nhận thông báo (receive_mail)</label>
            <input
              type="email"
              placeholder="admin@gmail.com"
              value={receiveMail}
              onChange={e => setReceiveMail(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 1rem', borderRadius: '10px',
                border: '1.5px solid #6ee7b7', fontSize: '0.95rem', fontWeight: 600,
                background: 'white', boxSizing: 'border-box', color: '#064e3b'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem' }}>EmailJS Service ID</label>
            <input
              type="text"
              placeholder="service_xxxxxxx"
              value={emailjsServiceId}
              onChange={e => setEmailjsServiceId(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 1rem', borderRadius: '10px',
                border: '1.5px solid #6ee7b7', fontSize: '0.9rem', fontFamily: 'monospace',
                background: 'white', boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem' }}>EmailJS Template ID</label>
            <input
              type="text"
              placeholder="template_xxxxxxx"
              value={emailjsTemplateId}
              onChange={e => setEmailjsTemplateId(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 1rem', borderRadius: '10px',
                border: '1.5px solid #6ee7b7', fontSize: '0.9rem', fontFamily: 'monospace',
                background: 'white', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem' }}>EmailJS Public Key</label>
            <input
              type="text"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxx"
              value={emailjsPublicKey}
              onChange={e => setEmailjsPublicKey(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 1rem', borderRadius: '10px',
                border: '1.5px solid #6ee7b7', fontSize: '0.9rem', fontFamily: 'monospace',
                background: 'white', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <a
            href="https://www.emailjs.com/docs/tutorial/overview/"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}
          >
            <i className="fa-solid fa-circle-question"></i> Hướng dẫn setup EmailJS
          </a>
          <button
            onClick={handleSaveEmailSettings}
            disabled={isSavingEmail}
            style={{
              padding: '0.65rem 1.5rem', borderRadius: '10px',
              background: isSavingEmail ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <i className="fa-solid fa-floppy-disk"></i>
            {isSavingEmail ? 'Saving...' : 'Save Email Settings'}
          </button>
        </div>
      </div>

      {/* Form Add New */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
        border: '1.5px solid #bfdbfe',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <i className="fa-solid fa-plus-circle" style={{ color: '#3b82f6', fontSize: '18px' }}></i>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#1e40af', fontSize: '1rem' }}>Thêm cấu hình mới</h3>
        </div>
        <form onSubmit={handleAddNew} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.35rem' }}>Tên cấu hình (Key) *</label>
            <input
              type="text"
              required
              placeholder="VD: gemini_api_key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              style={{
                width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px',
                border: '1.5px solid #bfdbfe', fontSize: '0.9rem', fontFamily: 'monospace',
                background: 'white', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.35rem' }}>Giá trị (Value) *</label>
            <input
              type="text"
              required
              placeholder="Nhập giá trị..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px',
                border: '1.5px solid #bfdbfe', fontSize: '0.9rem', fontFamily: 'monospace',
                background: 'white', boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.65rem 1.5rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              boxShadow: '0 4px 10px rgba(59,130,246,0.3)'
            }}
          >
            <i className="fa-solid fa-plus"></i> Thêm mới
          </button>
        </form>
      </div>

      {/* List Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <i className="fa-solid fa-list" style={{ color: 'var(--primary)', fontSize: '16px' }}></i>
          <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>Danh sách Cấu hình hiện tại</h3>
          <span style={{
            marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 700,
            padding: '2px 10px', borderRadius: '999px',
            background: 'var(--primary-light)', color: 'var(--primary)'
          }}>{settings.length} items</span>
        </div>
        {settings.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem',
            background: 'white', borderRadius: '14px',
            border: '1.5px dashed #e2e8f0'
          }}>
            <i className="fa-solid fa-gear" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.75rem', display: 'block' }}></i>
            <p style={{ color: '#94a3b8', margin: 0, fontWeight: 600 }}>Chưa có cài đặt nào được lưu.</p>
          </div>
        ) : (
          settings.map((item) => (
            <SettingItem
              key={item.key}
              item={item}
              onSave={handleSaveSetting}
              onDelete={handleDeleteSetting}
            />
          ))
        )}
      </div>
    </div>
  );
};
