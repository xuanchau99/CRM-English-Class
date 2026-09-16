import React from 'react';
import { AppRouter } from './routes/AppRouter';
import { NotificationProvider } from './components/common/NotificationSystem';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider } from './features/auth/AuthContext';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppRouter />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
