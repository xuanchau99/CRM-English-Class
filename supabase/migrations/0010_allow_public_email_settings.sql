-- Migration: 0010_allow_public_email_settings
-- Cho phép người dùng vô danh (học sinh) đọc cấu hình EmailJS để gửi mail thông báo

CREATE POLICY "Allow public read of email settings" 
ON public.system_settings 
FOR SELECT 
USING (key IN ('receive_mail', 'emailjs_service_id', 'emailjs_template_id', 'emailjs_public_key'));
