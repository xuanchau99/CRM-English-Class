import React, { useState } from 'react';
import { questionRepository } from '../../repositories/questionRepository';
import { examRepository } from '../../repositories/examRepository';
import { useNotification } from '../common/NotificationSystem';

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const PrintExamModal = ({ isOpen, onClose, examId, examCodeProp }) => {
  const [printCopies, setPrintCopies] = useState(1);
  const [printFontSize, setPrintFontSize] = useState(11);
  const { showToast } = useNotification();

  if (!isOpen) return null;

  const executePrintExam = async (withAnswers) => {
    try {
      showToast('Đang tạo bản in, vui lòng chờ...', 'info');

      // Fetch exam info and questions
      const [examData, allQuestions] = await Promise.all([
        examRepository.getExamById(examId),
        questionRepository.getQuestionsByExam(examId)
      ]);

      // Filter only active questions
      const activeQ = allQuestions.filter(q => q.is_active !== false);

      if (activeQ.length === 0) {
        showToast('Không có câu hỏi nào trong đề thi này để in.', 'error');
        return;
      }

      const examCode = examData?.exam_code || examId;
      const examTitle = examData?.title || 'Bài kiểm tra';

      let htmlStr = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Print Exam - ${examCode}</title>
          <meta charset="UTF-8">
          <style>
              body { font-family: 'Times New Roman', Times, serif; font-size: ${printFontSize}pt; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 0; }
              .print-container { max-width: 210mm; margin: 0 auto; padding: 15mm; }
              .header { text-align: center; margin-bottom: 15px; }
              .header h2, .header h3 { margin: 4px 0; font-weight: bold; }
              .student-info { margin-bottom: 20px; font-weight: bold; }
              .student-info table { width: 100%; border-collapse: collapse; }
              .student-info td { padding: 6px 0; }
              .page-break { page-break-before: always; }
              .question { margin-bottom: 12px; page-break-inside: avoid; }
              .question-text { font-weight: bold; margin-bottom: 5px; }
              .options { margin-left: 15px; display: flex; flex-wrap: wrap; gap: 5px; }
              .option-line { flex: 1 1 23%; min-width: 140px; }
              .correct-ans { font-weight: bold; text-decoration: underline; }
              .mark-correct { font-weight: bold; font-size: 1.05em; color: black; }
              .page-timestamp { position: fixed; top: 5px; left: 10px; font-size: 8pt; color: #999; }
              .page-code { position: fixed; top: 5px; right: 10px; font-size: 8pt; color: #999; }
              @media print {
                  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                  .print-container { padding: 0; margin: 0; width: 100%; max-width: 100%; }
                  .header { margin-top: 5mm; }
              }
          </style>
      </head>
      <body>
      <div class="print-container">
      `;

      const now = new Date().toLocaleString('vi-VN');

      for (let c = 1; c <= printCopies; c++) {
        if (c > 1) {
          htmlStr += `<div class="page-break"></div>`;
        }

        // Shuffle questions for each copy
        const shuffledQ = shuffleArray([...activeQ]);

        htmlStr += `
        <div class="page-timestamp">${now}</div>
        <div class="page-code">Print Exam - ${examCode}</div>
        <div class="header">
            <h2 style="text-transform: uppercase;">BÀI KIỂM TRA TIẾNG ANH</h2>
            <h3>Mã đề: ${examCode} - Đề số 0${c} ${withAnswers ? '<span style="font-style:italic;">(Bản có Đáp án)</span>' : ''}</h3>
        </div>
        <div class="student-info">
            <table>
                <tr>
                    <td style="width: 50%;">Họ và tên: ..............................................................</td>
                    <td style="width: 25%;">Lớp: .........................</td>
                    <td style="width: 25%;">Điểm: ........./10</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding-top:10px;">Lời phê của giáo viên: ....................................................................................................</td>
                </tr>
            </table>
        </div>
        <hr style="border: 0; border-bottom: 1.5px solid #000; margin-bottom: 15px;">
        <div class="questions-list">
        `;

        shuffledQ.forEach((q, index) => {
          const qText = q.question_text || '';
          const corAns = q.correct_answer || '';

          htmlStr += `<div class="question">`;

          // Question header
          if (q.type === 'arrange_sentence') {
            htmlStr += `<div class="question-text">Câu ${index + 1}: Arrange the words to make a correct sentence:</div>`;
          } else if (q.type === 'matching') {
            htmlStr += `<div class="question-text">Câu ${index + 1}: Match the items in column A with column B:</div>`;
          } else {
            htmlStr += `<div class="question-text">Câu ${index + 1}: ${qText}</div>`;
          }

          // Options rendering by type
          const renderOption = (letter, optText) => {
            if (!optText) return '';
            const isCorrect = withAnswers && String(optText).trim() === String(corAns).trim();
            const prefix = isCorrect
              ? `<span class="mark-correct">[✓] ${letter}.</span>`
              : `${letter}.`;
            return `<div class="option-line ${isCorrect ? 'correct-ans' : ''}">${prefix} ${optText}</div>`;
          };

          if (q.type === 'multiple_choice' || q.type === 'single_choice' || q.type === 'vocabulary') {
            const opts = q.options || [];
            htmlStr += `<div class="options">`;
            opts.forEach((opt, i) => {
              htmlStr += renderOption(String.fromCharCode(65 + i), opt);
            });
            htmlStr += `</div>`;

          } else if (q.type === 'true_false') {
            htmlStr += `<div class="options">`;
            htmlStr += renderOption('A', 'TRUE');
            htmlStr += renderOption('B', 'FALSE');
            htmlStr += `</div>`;

          } else if (q.type === 'fill_blank' || q.type === 'short_answer') {
            if (withAnswers) {
              htmlStr += `<div class="options" style="font-style:italic;">Đáp án: <span class="correct-ans">${corAns || (Array.isArray(q.accepted_answers) ? q.accepted_answers.join(', ') : '')}</span></div>`;
            } else {
              htmlStr += `<div class="options" style="display:block; margin-top:10px;">.............................................................................</div>`;
            }

          } else if (q.type === 'matching') {
            const leftCol = String(qText).split('\n').map(s => s.trim()).filter(Boolean);
            const rightColRaw = String(corAns).split('\n').map(s => s.trim()).filter(Boolean);
            const rightCol = shuffleArray([...rightColRaw]);

            htmlStr += `<div class="options" style="display:flex; justify-content:space-between; margin-top:10px;">`;
            htmlStr += `<div style="flex:1;">`;
            leftCol.forEach((txt, i) => {
               htmlStr += `<div style="margin-bottom:10px;">${i + 1}. ${txt}</div>`;
            });
            htmlStr += `</div><div style="flex:1;">`;
            rightCol.forEach((txt, i) => {
               htmlStr += `<div style="margin-bottom:10px;">${String.fromCharCode(65 + i)}. ${txt}</div>`;
            });
            htmlStr += `</div></div>`;

            if (withAnswers) {
              const paired = leftCol.map((txt, i) => `${i + 1} - ${rightColRaw[i]}`).join(' ; ');
              htmlStr += `<div class="options" style="font-style:italic; margin-top:10px;">Đáp án nối: <span class="correct-ans">${paired}</span></div>`;
            } else {
              htmlStr += `<div class="options" style="display:block; margin-top:10px; font-style:italic; color:#666;">(Học sinh dùng bút nối cột A với cột B)</div>`;
            }

          } else if (q.type === 'arrange_sentence') {
            const targetSentence = (qText && qText.length > 2) ? qText : (corAns || '');
            const words = String(targetSentence).trim().split(/\s+/).filter(w => w !== '');
            const shuffledWords = shuffleArray([...words]);
            htmlStr += `<div class="options" style="display:block; margin-top:5px;">Từ gợi ý: <strong>${shuffledWords.join(' / ')}</strong></div>`;
            if (withAnswers) {
              htmlStr += `<div class="options" style="font-style:italic; margin-top:2px;">Đáp án: <span class="correct-ans">${String(targetSentence)}</span></div>`;
            } else {
              htmlStr += `<div class="options" style="display:block; margin-top:10px;">.............................................................................</div>`;
            }

          } else {
            // Generic: short answer line
            if (withAnswers) {
              htmlStr += `<div class="options" style="font-style:italic;">Đáp án: <span class="correct-ans">${corAns}</span></div>`;
            } else {
              htmlStr += `<div class="options" style="display:block; margin-top:10px;">.............................................................................</div>`;
            }
          }

          htmlStr += `</div>`; // close .question
        });

        htmlStr += `</div>`; // close .questions-list
      }

      htmlStr += `
      </div>
      <script>
          window.onload = function() {
              setTimeout(() => { window.print(); }, 500);
          }
      </script>
      </body>
      </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlStr);
        printWindow.document.close();
      } else {
        showToast('Trình duyệt đã chặn Pop-up! Vui lòng cho phép trình duyệt mở Pop-up để in đề thi.', 'error');
      }
    } catch (error) {
      showToast('Lỗi khi tạo bản in: ' + error.message, 'error');
    }
    onClose();
  };

  return (
    <div className="modal" id="print-exam-modal" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>🖨️ Print Exam: {examCodeProp || examId}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Tùy chỉnh in ấn và xáo trộn câu hỏi cho mã đề <strong>{examCodeProp || examId}</strong>.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Số lượng mã đề in:</label>
              <input 
                type="number" 
                id="print-copies-qty" 
                value={printCopies} 
                min="1" 
                max="20" 
                onChange={(e) => setPrintCopies(Number(e.target.value))} 
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '1.05rem', fontFamily: 'var(--font)' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Cỡ chữ (pt):</label>
              <input 
                type="number" 
                id="print-font-size" 
                value={printFontSize} 
                min="8" 
                max="18" 
                step="0.5" 
                onChange={(e) => setPrintFontSize(Number(e.target.value))} 
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '1.05rem', fontFamily: 'var(--font)' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn-primary" onClick={() => executePrintExam(false)}>
              🖨️ In cho Học Sinh (Tách mã đề, Không đáp án)
            </button>
            <button 
              className="btn-secondary" 
              style={{ backgroundColor: '#b45309', color: 'white' }} 
              onClick={() => executePrintExam(true)}
            >
              🖨️ In cho Giáo Viên (Có Khoanh Đáp Án)
            </button>
            <button className="btn-secondary" onClick={onClose}>Hủy</button>
          </div>
        </div>
      </div>
    </div>
  );
};
