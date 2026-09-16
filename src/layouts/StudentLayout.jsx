import React from 'react';
import { Outlet } from 'react-router-dom';

export const StudentLayout = () => {
  return (
    <div className="min-h-screen bg-[#faf9ff] font-['Nunito'] text-[#4a5c75]">
      <header className="bg-gradient-to-br from-[#8fa8ff] to-[#357ae8] text-white p-8 text-center rounded-b-[24px] shadow-sm relative overflow-hidden">
        <h1 className="text-4xl font-extrabold m-0 tracking-tight">✏️ English Student Exam Portal</h1>
      </header>
      
      <main className="p-4 md:p-8 m-4 md:m-8 max-w-4xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
