import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {notifications.map(n => {
          let bgColor = 'var(--primary)';
          let icon = 'ℹ️';
          if (n.type === 'success') {
            bgColor = '#10b981';
            icon = '✅';
          } else if (n.type === 'error') {
            bgColor = '#ef4444';
            icon = '❌';
          } else if (n.type === 'warning') {
            bgColor = '#f59e0b';
            icon = '⚠️';
          }

          return (
            <div 
              key={n.id} 
              style={{
                backgroundColor: bgColor,
                color: 'white',
                padding: '14px 24px',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                fontWeight: 600,
                minWidth: '280px',
                animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'var(--font)',
                fontSize: '0.95rem'
              }}
            >
              <span>{icon}</span>
              <span>{n.message}</span>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};
