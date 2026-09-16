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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`p-4 rounded-lg shadow-lg text-white font-medium min-w-[250px] transform transition-all duration-300 translate-y-0 opacity-100 ${
              n.type === 'success' ? 'bg-green-500' : 
              n.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}
          >
            {n.type === 'success' && '✅ '}
            {n.type === 'error' && '❌ '}
            {n.type === 'info' && 'ℹ️ '}
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
