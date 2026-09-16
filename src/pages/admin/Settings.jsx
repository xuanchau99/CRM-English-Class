import React, { useState, useEffect } from 'react';
import { useNotification } from '../../components/common/NotificationSystem';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { settingRepository } from '../../repositories/settingRepository';

const SettingItem = ({ item, onSave, onDelete }) => {
  const isSecret = item.key.toLowerCase().includes('key') || item.key.toLowerCase().includes('token');
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
      // Try parsing as JSON to store properly if they entered JSON
      finalValue = JSON.parse(value);
    } catch {
      // If not valid JSON, treat as a pure string
      finalValue = value;
    }
    
    await onSave(item.key, finalValue);
    setIsEdited(false);
    setIsSaving(false);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-start md:items-center hover:border-blue-300 transition-colors">
      <div className="w-full md:w-1/3">
        <label className="block text-sm font-bold text-gray-800 break-words font-mono">
          {item.key}
        </label>
        <span className="text-xs text-gray-400">
          Cập nhật: {new Date(item.updated_at).toLocaleDateString('vi-VN')}
        </span>
      </div>
      
      <div className="flex-1 w-full flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={showValue ? 'text' : 'password'}
            value={value}
            onChange={(e) => { setValue(e.target.value); setIsEdited(true); }}
            className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#8fa8ff] focus:border-transparent transition-all font-mono text-sm ${isEdited ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
            placeholder="Nhập giá trị..."
          />
          {isSecret && (
            <button
              onClick={() => setShowValue(!showValue)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
              title={showValue ? "Ẩn" : "Hiện"}
            >
              {showValue ? '👁️' : '🙈'}
            </button>
          )}
        </div>
        
        <button
          onClick={handleSave}
          disabled={!isEdited || isSaving}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
            isEdited 
              ? 'bg-[#357ae8] text-white hover:bg-[#2b65c2] shadow-md' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? '...' : 'Lưu'}
        </button>
        
        <button
          onClick={() => onDelete(item.key)}
          className="px-3 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-bold transition-colors"
          title="Xoá cấu hình"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export const Settings = () => {
  const { showToast } = useNotification();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingRepository.getAllSettings();
      setSettings(data);
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

  if (loading) return <LoadingSpinner message="Đang tải cấu hình..." />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#4a5c75]">⚙️ Cài đặt Hệ thống</h2>
        <p className="text-sm text-gray-500 mt-1">Quản lý các biến môi trường, API Key (OpenAI, Gemini) và cấu hình động của ứng dụng.</p>
      </div>

      {/* Form Add New */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-sm mb-8">
        <h3 className="font-bold text-blue-800 mb-4">Thêm cấu hình mới</h3>
        <form onSubmit={handleAddNew} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-blue-700 mb-1">Tên cấu hình (Key) *</label>
            <input
              type="text"
              required
              placeholder="VD: openai_api_key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full px-4 py-2.5 rounded-lg border border-blue-200 focus:ring-2 focus:ring-[#8fa8ff] font-mono text-sm"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-blue-700 mb-1">Giá trị (Value) *</label>
            <input
              type="text"
              required
              placeholder="Nhập giá trị..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-blue-200 focus:ring-2 focus:ring-[#8fa8ff] font-mono text-sm"
            />
          </div>
          <button 
            type="submit"
            className="bg-[#357ae8] text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-[#2b65c2] transition-colors whitespace-nowrap w-full sm:w-auto"
          >
            + Thêm mới
          </button>
        </form>
      </div>

      {/* List Settings */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-700">Danh sách Cấu hình hiện tại</h3>
        {settings.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-500">Chưa có cài đặt nào được lưu.</p>
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
