-- Migration: 0004_add_order_index
-- Thêm cột order_index cho bảng questions

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
