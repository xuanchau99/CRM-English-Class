import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const ImportQuestionsModal = ({ isOpen, onClose, onImport }) => {
  const [parsedData, setParsedData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          setErrorMsg('File Excel không có dữ liệu hoặc format không đúng.');
          setParsedData([]);
          return;
        }

        setErrorMsg('');
        setParsedData(rows);
      } catch (err) {
        setErrorMsg('Lỗi đọc file Excel: ' + err.message);
        setParsedData([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseCsvFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setErrorMsg('Lỗi khi đọc file CSV. Hãy kiểm tra định dạng.');
          setParsedData([]);
        } else {
          setErrorMsg('');
          setParsedData(results.data);
        }
      },
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setParsedData([]);
    setErrorMsg('');

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      parseExcelFile(file);
    } else if (ext === 'csv') {
      parseCsvFile(file);
    } else {
      setErrorMsg('Chỉ hỗ trợ file .xlsx, .xls hoặc .csv.');
    }
  };

  const normalizeRow = (row) => {
    // Chuẩn hoá options từ option_a/b/c/d hoặc mảng options
    let options = null;
    const type = (row.type || 'multiple_choice').toLowerCase().trim();
    
    if (row.option_a || row.option_b) {
      options = [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean);
    } else if (row.options) {
      try {
        options = JSON.parse(row.options);
      } catch {
        options = row.options.split('|').map(s => s.trim()).filter(Boolean);
      }
    }

    // Chuẩn hoá accepted_answers
    let accepted_answers = [];
    if (row.accepted_answers) {
      try {
        accepted_answers = JSON.parse(row.accepted_answers);
      } catch {
        accepted_answers = String(row.accepted_answers).split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    return {
      question_code: row.question_id || row.question_code || ('Q' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000)),
      type,
      level: (row.level || 'easy').toLowerCase(),
      question_text: String(row.question_text || '').trim(),
      options: options,
      correct_answer: String(row.correct_answer || '').trim(),
      accepted_answers,
      explanation: String(row.explanation || '').trim(),
      points: parseFloat(row.points) || 1,
    };
  };

  const handleConfirm = () => {
    if (parsedData.length === 0) return;
    const list = parsedData.map(normalizeRow).filter(q => q.question_text);
    if (list.length === 0) {
      setErrorMsg('Không tìm thấy câu hỏi hợp lệ. Hãy kiểm tra cột question_text.');
      return;
    }
    onImport(list);
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h2>📂 Import Câu hỏi từ Excel/CSV</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* File upload area */}
          <div
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: fileName ? 'var(--primary-light)' : 'var(--bg-secondary, #f4f6ff)',
              borderColor: fileName ? 'var(--primary)' : undefined,
              marginBottom: '1rem',
              transition: 'all 0.2s'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {fileName ? '✅' : '📁'}
            </div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>
              {fileName || 'Click để chọn file (.xlsx, .xls, .csv)'}
            </p>
            {fileName && (
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {parsedData.length > 0 ? `✔ ${parsedData.length} dòng dữ liệu` : 'Đang xử lý...'}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {errorMsg && (
            <p style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 1rem' }}>
              ❌ {errorMsg}
            </p>
          )}

          {parsedData.length > 0 && (
            <div style={{ background: 'var(--secondary-light)', border: '1.5px solid var(--secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                ✅ Đọc thành công <strong>{parsedData.length}</strong> câu hỏi.
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Preview (3 câu đầu): {parsedData.slice(0, 3).map((r, i) => `Câu ${i+1}: ${String(r.question_text || '').slice(0, 40)}...`).join('; ')}
              </p>
            </div>
          )}

          <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
            <strong>📋 Các cột bắt buộc:</strong> <code>question_text</code>, <code>type</code>, <code>correct_answer</code><br />
            <strong>Tùy chọn:</strong> <code>option_a/b/c/d</code>, <code>level</code>, <code>points</code>, <code>explanation</code>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={onClose}>Huỷ</button>
            <button
              className="btn-primary"
              onClick={handleConfirm}
              disabled={parsedData.length === 0}
              style={{ opacity: parsedData.length === 0 ? 0.5 : 1, cursor: parsedData.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              🚀 Nhập {parsedData.length > 0 ? parsedData.length : ''} Câu hỏi vào Đề thi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
