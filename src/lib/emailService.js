import emailjs from '@emailjs/browser';

/**
 * Gửi email thông báo cho admin khi học sinh nộp bài
 * Credentials được truyền vào từ bên ngoài (đọc từ DB system_settings)
 *
 * @param {Object} credentials  - { serviceId, templateId, publicKey }
 * @param {Object} params       - Thông tin bài nộp
 */
export const sendSubmissionNotification = async (credentials, params) => {
  const { serviceId, templateId, publicKey } = credentials || {};
  const { toEmail, studentName, className, examTitle, examCode, totalQuestions, submittedAt } = params || {};

  // Kiểm tra credentials hợp lệ
  if (!serviceId || !templateId || !publicKey) {
    console.warn('[EmailService] EmailJS chưa cấu hình đủ credentials (service/template/public key). Bỏ qua gửi email.');
    return;
  }
  if (!toEmail || !toEmail.includes('@')) {
    console.warn('[EmailService] Email nhận không hợp lệ:', toEmail, '— Bỏ qua gửi email.');
    return;
  }

  const templateParams = {
    to_email:        toEmail,
    student_name:    studentName   || '(unknown)',
    class_name:      className     || '(unknown)',
    exam_title:      examTitle     || '(unknown)',
    exam_code:       examCode      || '',
    total_questions: totalQuestions || 0,
    submitted_at:    submittedAt   || new Date().toLocaleString('vi-VN'),
  };

  try {
    const result = await emailjs.send(serviceId, templateId, templateParams, publicKey);
    console.log('[EmailService] ✅ Email sent successfully, status:', result.status);
    return result;
  } catch (error) {
    // Gửi mail lỗi không nên crash app của học sinh
    console.error('[EmailService] ❌ Failed to send email:', error?.text || error?.message || error);
  }
};
