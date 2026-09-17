-- Migration: 0008_add_receive_mail_setting
-- Thêm cài đặt email nhận thông báo vào bảng system_settings

INSERT INTO public.system_settings (key, value, updated_at)
VALUES (
  'receive_mail',
  '"admin@gmail.com"',
  NOW()
)
ON CONFLICT (key) DO NOTHING;
