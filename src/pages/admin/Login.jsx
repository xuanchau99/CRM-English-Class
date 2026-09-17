import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useNotification } from '../../components/common/NotificationSystem';

export const Login = () => {
  const { user, login } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Tránh việc đã login rồi vẫn vào trang này
  if (user) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Vui lòng nhập đầy đủ Email và Mật khẩu.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      showToast('Đăng nhập thành công!', 'success');
      navigate('/admin');
    } catch (error) {
      showToast(error.message || 'Sai tài khoản hoặc mật khẩu.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #8fa8ff 100%)',
      padding: '1rem',
      fontFamily: 'var(--font)'
    }}>
      <div className="login-card" style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '2.5rem',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid rgba(255, 255, 255, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '75px', height: '75px', 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 10px 15px -3px rgba(143, 168, 255, 0.4)'
          }}>
            <i className="fa-solid fa-shield-halved" style={{ color: 'white', fontSize: '32px' }}></i>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-darkest)', margin: '0 0 0.5rem 0' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>
            Login to English Exam Builder
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-darker)', marginBottom: '0.5rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-envelope" style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.1rem' }}></i>
              <input
                id="email"
                type="email"
                style={{
                  width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem',
                  borderRadius: '12px', border: '2px solid transparent',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05)',
                  fontSize: '1rem', transition: 'all 0.3s ease',
                  boxSizing: 'border-box', color: 'var(--text-main)',
                  fontWeight: 600
                }}
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'rgba(255, 255, 255, 0.8)'; }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-darker)', marginBottom: '0.5rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-lock" style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.1rem' }}></i>
              <input
                id="password"
                type="password"
                style={{
                  width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem',
                  borderRadius: '12px', border: '2px solid transparent',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05)',
                  fontSize: '1rem', transition: 'all 0.3s ease',
                  boxSizing: 'border-box', color: 'var(--text-main)',
                  fontWeight: 600
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'rgba(255, 255, 255, 0.8)'; }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              width: '100%', padding: '0.9rem', fontSize: '1.1rem',
              borderRadius: '12px', marginTop: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: isLoading ? 0.7 : 1,
              border: 'none', cursor: 'pointer', transition: 'all 0.3s ease'
            }}
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Authenticating...
              </>
            ) : (
              <>
                Login <i className="fa-solid fa-arrow-right"></i>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
