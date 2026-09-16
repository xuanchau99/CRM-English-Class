import React, { useState } from 'react';
import Papa from 'papaparse';

export const ImportQuestionsModal = ({ isOpen, onClose, onImport }) => {
  const [csvData, setCsvData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrorMsg('Lỗi khi đọc file CSV. Hãy kiểm tra định dạng.');
          setCsvData([]);
        } else {
          setErrorMsg('');
          setCsvData(results.data);
        }
      },
    });
  };

  const handleConfirm = () => {
    if (csvData.length === 0) return;

    // Chuẩn hoá dữ liệu để import
    const parsedList = csvData.map(row => {
      let options = null;
      let accepted_answers = [];

      if (row.type === 'multiple_choice') {
        options = [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean);
      }
      
      if (row.accepted_answers) {
        try {
          accepted_answers = JSON.parse(row.accepted_answers);
        } catch {
          accepted_answers = row.accepted_answers.split(',').map(s => s.trim());
        }
      }

      return {
        type: row.type || 'multiple_choice',
        level: row.level || 'easy',
        question_text: row.question_text || '',
        options: options,
        correct_answer: row.correct_answer || '',
        accepted_answers: accepted_answers,
        explanation: row.explanation || '',
        points: parseFloat(row.points) || 1,
      };
    });

    onImport(parsedList);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#faf9ff]">
          <h2 className="text-xl font-bold text-[#4a5c75]">Import Câu hỏi (CSV)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-2xl font-bold leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          {errorMsg && <p className="text-red-500 text-sm font-medium">{errorMsg}</p>}
          
          {csvData.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-700 font-medium">Đã phát hiện {csvData.length} câu hỏi hợp lệ.</p>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-gray-600 font-bold hover:bg-gray-100">
              Huỷ
            </button>
            <button
              onClick={handleConfirm}
              disabled={csvData.length === 0}
              className={`px-5 py-2.5 rounded-lg text-white font-bold transition-colors shadow-md ${
                csvData.length > 0 ? 'bg-[#357ae8] hover:bg-[#2b65c2]' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Tiến hành Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
