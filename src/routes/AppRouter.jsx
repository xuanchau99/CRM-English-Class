import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { EmptyState } from '../components/common/EmptyState';
import { Login } from '../pages/admin/Login';
import { ProtectedRoute } from './ProtectedRoute';
import { ExamManager } from '../pages/admin/ExamManager';
import { QuestionManager } from '../pages/admin/QuestionManager';
import { ResultManager } from '../pages/admin/ResultManager';
import { GameManager } from '../pages/admin/GameManager';
import { Settings } from '../pages/admin/Settings';
import { Guide } from '../pages/admin/Guide';
import { ExamEntry } from '../pages/student/ExamEntry';
import { ExamPlayer } from '../pages/student/ExamPlayer';
import { ExamResult } from '../pages/student/ExamResult';

const Placeholder = ({ title }) => (
  <EmptyState title={title} description="Trang này đang trong quá trình phát triển." />
);

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Admin Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/exams" replace />} />
            <Route path="exams" element={<ExamManager />} />
            <Route path="questions" element={<QuestionManager />} />
            <Route path="results" element={<ResultManager />} />
            <Route path="games" element={<GameManager />} />
            <Route path="settings" element={<Settings />} />
            <Route path="guide" element={<Guide />} />
          </Route>
        </Route>

        {/* Student Routes */}
        <Route path="/exam/:examCode/start" element={<ExamEntry />} />
        <Route path="/exam/:examCode/play" element={<ExamPlayer />} />
        <Route path="/result/:submissionId" element={<ExamResult />} />
        
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Placeholder title="404 - Not Found" />} />
      </Routes>
    </BrowserRouter>
  );
};
