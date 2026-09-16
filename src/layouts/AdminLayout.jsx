import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useNotification } from '../components/common/NotificationSystem';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Đăng xuất thành công!', 'success');
      navigate('/login');
    } catch (error) {
      showToast('Đăng xuất thất bại: ' + error.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9ff] font-['Nunito'] text-[#4a5c75]">
      <header className="bg-gradient-to-br from-[#8fa8ff] to-[#357ae8] text-white p-4 md:p-8 rounded-b-[24px] shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
        <h1 className="text-2xl md:text-4xl font-extrabold m-0 tracking-tight">🛠️ English Exam Builder</h1>
        
        <div className="mt-4 md:mt-0 flex items-center gap-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
          <Link 
            to="/admin/guide"
            className="text-sm font-bold hover:text-red-200 transition-colors"
          >
            Hướng dẫn
          </Link>
          <div className="w-px h-4 bg-white/30"></div>
          <span className="text-sm font-medium">
            Xin chào, {user?.email || 'Teacher'}
          </span>
          <div className="w-px h-4 bg-white/30"></div>
          <button 
            onClick={handleLogout}
            className="text-sm font-bold hover:text-red-200 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </header>
      
      <main className="p-8 m-8 mx-24 bg-white rounded-[24px] shadow-lg">
        <Outlet />
      </main>

      <footer className="text-center p-8 text-[#94a3b8] text-sm">
        <p>Copyright © 2026 - English Exam Builder - Teacher Panel</p>
      </footer>
    </div>
  );
};
