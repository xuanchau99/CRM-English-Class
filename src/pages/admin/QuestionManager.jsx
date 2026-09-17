import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useNotification } from '../../components/common/NotificationSystem';
import { QuestionFormModal } from '../../components/question/QuestionFormModal';
import { questionRepository } from '../../repositories/questionRepository';
import { examRepository } from '../../repositories/examRepository';
import { settingRepository } from '../../repositories/settingRepository';
import { callGeminiToGenerate } from '../../lib/gemini';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const QuestionManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useNotification();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(searchParams.get('examId') || '');
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Import State
  const [importData, setImportData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = React.useRef(null);

  // Filters State
  const [filterType, setFilterType] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [searchText, setSearchText] = useState('');

  // AI Generator State
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLevel, setAiLevel] = useState('easy');
  const [aiQuantity, setAiQuantity] = useState(5);
  const [aiTypes, setAiTypes] = useState(['single_choice', 'true_false', 'arrange_sentence', 'multiple_choice', 'fill_blank', 'matching']);

  // Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await settingRepository.getAllSettings();
        const geminiSetting = settings.find(s => s.key === 'gemini_api_key');
        if (geminiSetting) setGeminiApiKey(geminiSetting.value);
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    fetchSettings();
  }, []);

  // Sync with examId from location state if user navigated from ExamManager via "Questions" button
  useEffect(() => {
    if (location.state?.examId) {
      setSelectedExamId(location.state.examId);
      handleLoadQuestions(location.state.examId);
    }
  }, [location.state]);

  const fetchExamsList = async () => {
    try {
      const data = await examRepository.getExams();
      setExams(data);
      // Auto select first exam if none selected and not loading specific one
      if (data.length > 0 && !selectedExamId && !location.state?.examId) {
        setSelectedExamId(data[0].id);
      }
    } catch (error) {
      showToast('Lỗi tải danh sách đề thi: ' + error.message, 'error');
    }
  };

  useEffect(() => {
    fetchExamsList();
    if (selectedExamId) {
      handleLoadQuestions(selectedExamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          setImportError('File Excel không có dữ liệu hoặc format không đúng.');
          setImportData([]);
          return;
        }

        setImportError('');
        setImportData(rows);
      } catch (err) {
        setImportError('Lỗi đọc file Excel: ' + err.message);
        setImportData([]);
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
          setImportError('Lỗi khi đọc file CSV. Hãy kiểm tra định dạng.');
          setImportData([]);
        } else {
          setImportError('');
          setImportData(results.data);
        }
      },
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setImportFileName('');
      setImportData([]);
      return;
    }
    setSelectedFile(file);
    setImportFileName(file.name);
    setImportData([]);
    setImportError('');
  };

  const handlePreviewFile = () => {
    if (!selectedFile) return;
    setImportData([]);
    setImportError('');

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      parseExcelFile(selectedFile);
    } else if (ext === 'csv') {
      parseCsvFile(selectedFile);
    } else {
      setImportError('Chỉ hỗ trợ file .xlsx, .xls hoặc .csv.');
    }
  };

  const normalizeRow = (row) => {
    let options = null;
    const type = (row.type || 'multiple_choice').toLowerCase().trim();

    if (row.option_a || row.option_b) {
      options = [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean);
    } else if (row.options) {
      if (Array.isArray(row.options)) {
        options = row.options;
      } else {
        try {
          options = JSON.parse(row.options);
        } catch {
          options = row.options.split('|').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    let accepted_answers = [];
    if (row.accepted_answers) {
      if (Array.isArray(row.accepted_answers)) {
        accepted_answers = row.accepted_answers;
      } else {
        try {
          accepted_answers = JSON.parse(row.accepted_answers);
        } catch {
          accepted_answers = String(row.accepted_answers).split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    let correct_answer = String(row.correct_answer || '').trim();
    if (type === 'arrange_sentence') {
      correct_answer = String(row.question_text || '').trim();
    }

    return {
      question_code: row.question_id || row.question_code || 'Q' + Date.now().toString().slice(-6),
      type,
      level: (row.level || 'medium').toLowerCase(),
      question_text: String(row.question_text || '').trim(),
      options: options,
      correct_answer,
      accepted_answers,
      explanation: String(row.explanation || '').trim(),
      points: parseFloat(row.points) || 1,
      is_active: true
    };
  };

  const handleConfirmImport = async () => {
    if (!isLoaded || !selectedExamId || importData.length === 0) return;

    // Bỏ qua các câu hỏi invalid (không có question_text hoặc correct_answer)
    const list = importData.map(normalizeRow).filter(q => q.question_text && q.correct_answer);

    if (list.length === 0) {
      showToast('Không tìm thấy câu hỏi hợp lệ (Valid) để import.', 'error');
      return;
    }

    try {
      showToast('Đang xử lý import...', 'info');

      const imported = await questionRepository.importQuestions(selectedExamId, list);

      if (imported && imported.length > 0) {
        showToast(`Import thành công ${imported.length} câu hỏi!`, 'success');
      } else {
        showToast('Tất cả câu hỏi trong file đã tồn tại. Bỏ qua import trùng lặp.', 'warning');
      }

      setImportData([]);
      setSelectedFile(null);
      setImportFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await handleLoadQuestions(selectedExamId); // Reload
    } catch (error) {
      showToast('Lỗi khi import: ' + (error?.message || JSON.stringify(error)), 'error');
    }
  };

  const handleLoadQuestions = async (targetExamId = selectedExamId) => {
    if (!targetExamId) {
      showToast('Vui lòng chọn đề thi trước!', 'warning');
      return;
    }

    try {
      setLoading(true);
      const examData = exams.find(e => e.id === targetExamId) || (await examRepository.getExams()).find(e => e.id === targetExamId);
      setExam(examData);

      const data = await questionRepository.getQuestionsByExam(targetExamId);
      setQuestions(data);
      setIsLoaded(true);

      // Cập nhật URL parameter
      setSearchParams({ examId: targetExamId });
    } catch (error) {
      showToast('Lỗi khi tải câu hỏi: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (questionData) => {
    try {
      if (editingQuestion) {
        await questionRepository.updateQuestion(editingQuestion.id, questionData);
        showToast('Cập nhật câu hỏi thành công!', 'success');
      } else {
        const nextOrderIndex = questions.length;
        await questionRepository.createQuestion(selectedExamId, questionData, nextOrderIndex);
        showToast('Tạo câu hỏi thành công!', 'success');
      }
      setIsFormOpen(false);
      setEditingQuestion(null);
      handleLoadQuestions(selectedExamId);
    } catch (error) {
      showToast('Lỗi khi lưu câu hỏi: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xoá câu hỏi này?')) {
      try {
        await questionRepository.deleteQuestion(id);
        showToast('Đã xoá câu hỏi!', 'success');
        handleLoadQuestions(selectedExamId);
      } catch (error) {
        showToast('Lỗi khi xoá: ' + error.message, 'error');
      }
    }
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      showToast('Vui lòng nhập chủ đề hoặc đoạn văn mẫu.', 'warning');
      return;
    }
    if (aiTypes.length === 0) {
      showToast('Vui lòng chọn ít nhất một dạng bài tập.', 'warning');
      return;
    }
    if (!geminiApiKey) {
      showToast('Chưa cấu hình Gemini API Key. Vui lòng vào Cài đặt (Settings) để thêm.', 'error');
      return;
    }

    setIsGeneratingAI(true);
    showToast('AI đang soạn câu hỏi, vui lòng đợi...', 'info');

    try {
      const generated = await callGeminiToGenerate(
        aiTopic,
        aiLevel,
        aiQuantity,
        aiTypes,
        geminiApiKey,
        'gemini-3.1-flash-lite',
        questions
      );

      if (generated && generated.length > 0) {
        const normalized = generated.map(q => normalizeRow({
          ...q,
          question_id: 'AI_' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000)
        }));
        setImportData(prev => [...normalized, ...prev]);
        showToast(`AI đã soạn thành công ${generated.length} câu hỏi!`, 'success');
        // Cuộn xuống bảng preview nếu có
        setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 500);
      } else {
        showToast('AI không trả về câu hỏi hợp lệ. Hãy thử lại.', 'warning');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchType = filterType ? q.type === filterType : true;
    const matchLevel = filterLevel ? q.level === filterLevel : true;
    const matchSearch = searchText
      ? (q.question_text || '').toLowerCase().includes(searchText.toLowerCase()) || (q.question_code || '').toLowerCase().includes(searchText.toLowerCase())
      : true;
    return matchType && matchLevel && matchSearch;
  });

  const handleExportExcel = () => {
    if (filteredQuestions.length === 0) {
      showToast('Không có dữ liệu để xuất Excel!', 'warning');
      return;
    }
    const dataToExport = filteredQuestions.map((q, idx) => ({
      'no': idx + 1,
      'question_code': q.question_code,
      'type': q.type,
      'level': q.level,
      'question_text': q.question_text,
      'option_a': q.options ? q.options[0] || '' : '',
      'option_b': q.options ? q.options[1] || '' : '',
      'option_c': q.options ? q.options[2] || '' : '',
      'option_d': q.options ? q.options[3] || '' : '',
      'correct_answer': q.correct_answer,
      'accepted_answers': q.accepted_answers && q.accepted_answers.length > 0 ? JSON.stringify(q.accepted_answers) : '',
      'explanation': q.explanation || '',
      'points': q.points
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    XLSX.writeFile(workbook, `Exam_${exam?.exam_code || selectedExamId}_Questions.xlsx`);
  };

  const handleImport = async (parsedList) => {
    try {
      await questionRepository.importQuestions(selectedExamId, parsedList);
      showToast(`Import thành công ${parsedList.length} câu hỏi!`, 'success');
      setIsImportOpen(false);
      handleLoadQuestions(selectedExamId);
    } catch (error) {
      showToast('Lỗi Import: ' + error.message, 'error');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown';
    const d = new Date(isoString);
    return `${d.toLocaleTimeString('vi-VN')} ${d.toLocaleDateString('vi-VN')}`;
  };

  const copyStudentLink = () => {
    if (!exam) return;
    const link = `${window.location.origin}/exam/${exam.exam_code}/start`;
    navigator.clipboard.writeText(link);
    showToast('Đã sao chép link làm bài!', 'success');
  };

  return (
    <div id="tab-questions-content">

      {/* Khôi phục thanh chọn đề thi giống vanilla UI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <label htmlFor="qbm-exam-select" style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>Chọn Đề Thi:</label>
          <select
            id="qbm-exam-select"
            style={{ maxWidth: '300px' }}
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.title} ({e.exam_code})</option>
            ))}
          </select>
          <button id="qbm-load-btn" className="btn-primary" style={{ padding: '0.6rem 1.25rem' }} onClick={() => handleLoadQuestions(selectedExamId)}>
            Load Câu Hỏi
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            id="open-question-modal-btn"
            className="btn-primary"
            style={{ padding: '0.6rem 1.25rem', borderRadius: '2rem' }}
            disabled={!isLoaded}
            onClick={() => { setEditingQuestion(null); setIsFormOpen(true); }}
          >
            + Add Question
          </button>
          <button
            id="qbm-copy-link-btn"
            className="btn-secondary"
            style={{ padding: '0.6rem 1.25rem', borderRadius: '2rem' }}
            disabled={!isLoaded}
            onClick={copyStudentLink}
          >
            🔗 Copy Student Link
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Import Questions from Excel/CSV</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'block', fontSize: '0.9rem' }}>Upload File (.xlsx, .csv):</label>
            <div style={{ display: 'flex', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'white' }}>
              <div style={{ padding: '0.4rem 0.5rem', background: '#f8f9fa', borderRight: '1px solid var(--border-color)', color: '#495057', fontSize: '0.85rem' }}>
                Chọn tệp
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={!isLoaded}
                style={{ flex: 1, padding: '0.4rem', border: 'none', background: 'transparent', outline: 'none', color: importFileName ? '#000' : 'var(--text-muted)' }}
              />
            </div>
          </div>
          <button className="btn-primary" onClick={handlePreviewFile} disabled={!selectedFile} style={{ opacity: selectedFile ? 1 : 0.6 }}>Preview File</button>
          <button className="btn-secondary" onClick={() => { const a = document.createElement('a'); a.href = '/sample_questions_template.xlsx'; a.download = 'sample_questions_template.xlsx'; a.click(); }}>📥 Download Sample</button>
        </div>

        {importError && (
          <p style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>❌ {importError}</p>
        )}

        {importData.length > 0 && (
          <div className="bento-card" style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)' }}>Import Preview</h4>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', maxHeight: '300px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>Excel Row</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>QID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>Type</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>Question Text</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>Correct Answer</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((row, index) => {
                    const norm = normalizeRow(row);
                    const isValid = norm.question_text && norm.correct_answer;
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>Row {index + 2}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{norm.question_code}</td>
                        <td style={{ padding: '0.75rem' }}>{norm.type}</td>
                        <td style={{ padding: '0.75rem' }}>{norm.question_text || <span style={{ color: '#dc2626' }}>Missing</span>}</td>
                        <td style={{ padding: '0.75rem' }}>{norm.correct_answer || <span style={{ color: '#dc2626' }}>Missing</span>}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: isValid ? '#166534' : '#dc2626' }}>
                          {isValid ? '✅ Valid' : '❌ Invalid'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              className="btn-primary"
              onClick={handleConfirmImport}
              style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', width: '250px' }}
            >
              Confirm Import ({importData.map(normalizeRow).filter(q => q.question_text && q.correct_answer).length} Questions)
            </button>
          </div>
        )}

        <div className="bento-card" style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✨ AI Question Generator</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>Tự động tạo câu hỏi Tiếng Anh với trí tuệ nhân tạo (Gemini AI).</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Gemini API Key:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={e => setGeminiApiKey(e.target.value)}
                    placeholder="Nhập Gemini API Key..."
                    style={{ border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', fontFamily: 'var(--font)', fontSize: '0.85rem' }}
                  />
                  <select style={{ border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', background: 'white', fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <option value="gemini">Gemini</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginTop: '1.25rem', marginBottom: '1rem', alignItems: 'start' }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Chủ đề học tập hoặc Đoạn văn mẫu:</label>
              <textarea
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="Ví dụ: Relative clauses, Conditional sentences, hoặc dán một đoạn văn tiếng Anh để tạo câu hỏi đọc hiểu..."
                style={{ width: '100%', height: '140px', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', boxSizing: 'border-box', fontFamily: 'var(--font)', resize: 'vertical', lineHeight: 1.4 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Độ khó:</label>
                  <select value={aiLevel} onChange={e => setAiLevel(e.target.value)} style={{ width: '100%', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', boxSizing: 'border-box', background: 'white', fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Số lượng câu:</label>
                  <input type="number" value={aiQuantity} onChange={e => setAiQuantity(parseInt(e.target.value) || 1)} min="1" max="15" style={{ width: '100%', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', boxSizing: 'border-box', fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 600 }} />
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Các dạng bài tập (Chọn nhiều):</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.85rem', overflowY: 'auto', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', background: 'white', boxSizing: 'border-box' }}>
                  {['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'arrange_sentence', 'matching'].map(type => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="checkbox"
                        checked={aiTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) setAiTypes([...aiTypes, type]);
                          else setAiTypes(aiTypes.filter(t => t !== type));
                        }}
                      />
                      <label style={{ cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>
                        {type.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button
              className="btn-primary"
              disabled={!isLoaded || isGeneratingAI}
              onClick={handleGenerateAI}
              style={{ background: isLoaded ? 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)' : '#ccc', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-sm)', fontSize: '1.05rem', border: 'none', color: 'white', fontWeight: 'bold' }}
            >
              🤖 {isGeneratingAI ? 'Đang tạo...' : 'Generate Questions by AI'}
            </button>
          </div>
        </div>
      </div>

      <div id="question-bank-container">
        {!isLoaded ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Vui lòng chọn đề thi ở trên và bấm Load Câu Hỏi.
          </div>
        ) : (
          <>
            <hr style={{ border: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Question Bank Search & Filters</h3>
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsFormOpen(true);
                }}
                style={{ backgroundColor: 'var(--secondary)', boxShadow: '0 4px 12px rgba(107, 203, 119, 0.2)' }}
              >
                + Add Question Manually
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Select Exam ID:</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => handleLoadQuestions(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="">-- Choose Exam --</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name} ({ex.exam_code})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Type:</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="">All Types</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="single_choice">Single Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="fill_blank">Fill Blank</option>
                  <option value="arrange_sentence">Arrange Sentence</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="matching">Matching</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Level:</label>
                <select
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="">All Levels</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Search Text:</label>
                <input
                  type="text"
                  placeholder="Search question text or ID..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <button className="btn-primary" style={{ padding: '0.6rem 1.25rem', height: '40px' }} onClick={() => { }}>Search</button>
                <button className="btn-secondary" style={{ padding: '0.6rem 1.25rem', height: '40px' }} onClick={handleExportExcel}>Export Excel</button>
              </div>
            </div>

            <div style={{ backgroundColor: '#f0f7ff', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid rgba(77, 150, 255, 0.3)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>📋</span> Câu hỏi cho đề thi
                </h4>
                <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                  Exam ID: <strong style={{ color: 'var(--text-main)' }}>{exam?.exam_code}</strong>
                </p>
              </div>
              <div>
                <button onClick={copyStudentLink} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, padding: '0.5rem 1rem', fontSize: '0.9rem', border: '2px solid var(--border-color)', borderRadius: '20px' }}>
                  🔗 Copy Student Link
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ACTIONS</th>
                    <th>NO.</th>
                    <th>QUESTION ID</th>
                    <th>TYPE</th>
                    <th>LEVEL</th>
                    <th>QUESTION TEXT</th>
                    <th>CORRECT ANSWER</th>
                    <th>POINTS</th>
                    <th>CREATED AT</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center' }}>Loading questions...</td></tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center' }}>Chưa có câu hỏi nào. Bấm Add Question để tạo mới.</td></tr>
                  ) : (
                    filteredQuestions.map((q, idx) => (
                      <tr key={q.id}>
                        <td className="actions-cell">
                          <button className="edit-btn" title="Edit Question" onClick={() => { setEditingQuestion(q); setIsFormOpen(true); }}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className="delete-btn" title="Delete Question" onClick={() => handleDelete(q.id)}>
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                        <td>{idx + 1}</td>
                        <td style={{ fontSize: '0.85rem' }}>{q.question_code}</td>
                        <td><span className="badge badge-primary" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>{q.type}</span></td>
                        <td><span className="badge badge-secondary" style={{ backgroundColor: 'var(--secondary-light)', color: 'var(--secondary)' }}>{q.level || 'medium'}</span></td>
                        <td className="question-text-cell" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.question_text}</td>
                        <td>{q.correct_answer}</td>
                        <td><strong style={{ color: 'var(--primary)' }}>{q.points}</strong></td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDate(q.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {isLoaded && (
        <QuestionFormModal
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingQuestion(null); }}
          onSave={handleSaveQuestion}
          initialData={editingQuestion}
        />
      )}
    </div>
  );
};
