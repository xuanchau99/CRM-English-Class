import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useNotification } from '../components/common/NotificationSystem';
import { settingRepository } from '../repositories/settingRepository';
import { supabase } from '../lib/supabase';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useNotification();
  const [adminAvatar, setAdminAvatar] = React.useState('');

  React.useEffect(() => {
    const fetchAvatar = async () => {
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
          
        if (data && data.avatar_url) {
          let url = data.avatar_url;
          if (url.includes('drive.google.com/thumbnail?id=')) {
            const id = new URLSearchParams(url.split('?')[1]).get('id');
            if (id) url = `https://drive.google.com/uc?export=view&id=${id}`;
          }
          setAdminAvatar(url);
        }
      } catch (e) {
        console.error("Failed to fetch admin avatar from profiles", e);
      }
    };
    fetchAvatar();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Đăng xuất thành công!', 'success');
      navigate('/login');
    } catch (error) {
      showToast('Đăng xuất thất bại: ' + error.message, 'error');
    }
  };

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname.includes('/admin/exams') ? 'active' : '';
    }
    return location.pathname.includes(path) ? 'active' : '';
  };

  return (
    <>
      <header>
        <h1>🛠️ English Exam Builder - Teacher Panel</h1>
      </header>

      <main id="app-container">
        <div className="card" style={{ padding: '2rem' }}>
          
          {/* Teacher Info Bar - dùng class teacher-info-bar để áp dụng CSS gốc */}
          <div className="teacher-info-bar">
            <div className="teacher-avatar">
              <img 
                src={adminAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'Teacher')}&background=random`} 
                alt="Teacher" 
                onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'Teacher')}&background=random`; }}
              />
            </div>
            <span>Hello, <strong>{user?.email || 'Teacher'}</strong></span>
            <button className="logout-btn" onClick={handleLogout} id="logout-btn">
              🚪 Logout
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Admin Mode</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => navigate('/admin/guide')} className="btn-secondary" id="open-guide-btn" style={{ fontWeight: 800, border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                📖 Guide
              </button>
              <button onClick={() => navigate('/admin/settings')} className="btn-secondary" id="open-settings-btn" style={{ fontWeight: 800, border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚙️ Settings
              </button>
            </div>
          </div>
          
          <div id="admin-content">
            <div className="admin-tabs">
              <button 
                onClick={() => navigate('/admin')} 
                className={`admin-tab-btn ${isActive('/admin')}`}
              >
                📄 Exam Manager
              </button>
              <button 
                onClick={() => navigate('/admin/questions')} 
                className={`admin-tab-btn ${isActive('/admin/questions')}`}
              >
                ❓ Question Manager
              </button>
              <button 
                onClick={() => navigate('/admin/results')} 
                className={`admin-tab-btn ${isActive('/admin/results')}`}
              >
                📊 Results Manager
              </button>
              <button 
                onClick={() => navigate('/admin/games')} 
                className={`admin-tab-btn ${isActive('/admin/games')}`}
              >
                🎮 Game Manager
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      <footer>
        <p>Copyright © 2026 - English Exam Builder - Teacher Panel</p>
        <p>Developed by Xuan Chau</p>
      </footer>
    </>
  );
};
