-- Migration: 0011_add_email_sent_to_submissions
-- Thêm trường is_email_sent vào bảng submissions
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_email_sent BOOLEAN DEFAULT false;

-- Hàm RPC cho phép cập nhật trạng thái email (chạy với quyền cao nhất để bypass RLS do học sinh là khách)
CREATE OR REPLACE FUNCTION public.mark_email_sent(p_submission_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.submissions 
    SET is_email_sent = true 
    WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
