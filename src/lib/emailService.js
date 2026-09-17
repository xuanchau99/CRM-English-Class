import emailjs from '@emailjs/browser';

// =====================================================
// EMAILJS CONFIGURATION
// Bạn cần điền 3 giá trị này sau khi setup trên emailjs.com
// Hướng dẫn: xem README hoặc hỏi AI
// =====================================================
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'YOUR_PUBLIC_KEY';

/**
 * Gửi email thông báo cho admin khi học sinh nộp bài
 * @param {Object} params
 * @param {string} params.toEmail        - Email nhận (receive_mail từ system_settings)
 * @param {string} params.studentName    - Tên học sinh
 * @param {string} params.className      - Lớp học sinh
 * @param {string} params.examTitle      - Tên đề thi
 * @param {string} params.examCode       - Mã đề thi
 * @param {number} params.score          - Điểm số
 * @param {number} params.percentage     - Phần trăm
 * @param {number} params.correctCount   - Số câu đúng
 * @param {number} params.totalQuestions - Tổng số câu
 * @param {string} params.submittedAt    - Thời gian nộp bài
 */
export const sendSubmissionNotification = async ({
  toEmail,
  studentName,
  className,
  examTitle,
  examCode,
  score,
  percentage,
  correctCount,
  totalQuestions,
  submittedAt,
}) => {
  // Kiểm tra config hợp lệ
  if (
    !EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' ||
    !EMAILJS_TEMPLATE_ID || EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID' ||
    !EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY'
  ) {
    console.warn('[EmailService] EmailJS chưa được cấu hình. Bỏ qua gửi email.');
    return;
  }

  if (!toEmail) {
    console.warn('[EmailService] Không có email nhận (receive_mail). Bỏ qua gửi email.');
    return;
  }

  const templateParams = {
    to_email:        toEmail,
    student_name:    studentName,
    class_name:      className,
    exam_title:      examTitle,
    exam_code:       examCode,
    score:           score,
    percentage:      percentage,
    correct_count:   correctCount,
    total_questions: totalQuestions,
    submitted_at:    submittedAt || new Date().toLocaleString('vi-VN'),
  };

  try {
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    console.log('[EmailService] Email sent successfully:', result.status);
    return result;
  } catch (error) {
    // Gửi mail lỗi không nên crash app của học sinh
    console.error('[EmailService] Failed to send email:', error);
  }
};
