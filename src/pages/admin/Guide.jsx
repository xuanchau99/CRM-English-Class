import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const Guide = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  // Dùng chuỗi tĩnh thay vì fetch để đảm bảo luôn load được mà không phụ thuộc vào public folder
  const staticGuide = `
# Hướng Dẫn Sử Dụng Nền Tảng EnglishTools Teacher Portal

Chào mừng bạn đến với **EnglishTools** - nền tảng quản lý đề thi, ngân hàng câu hỏi, và bài trò chơi trực tuyến. Bộ tài liệu này hướng dẫn chi tiết cách thức vận hành hệ thống.

---

## 1. Hệ Thống Đăng Nhập
- Hệ thống hỗ trợ đa giáo viên bằng **Email** và **Mật khẩu**.
- Bạn sẽ chỉ thấy Đề thi (Exams) và thông tin của chính mình. Sự cô lập này giúp đảm bảo tính bảo mật khi nhiều giáo viên cùng dùng chung hệ thống.

---

## 2. Quản Lý Đề Thi (Exam Manager)
Tab **Quản lý Đề thi** là nơi bạn tạo và kết nối đề thi cho học sinh.

### Tạo / Cập nhật Đề thi
1. Click **"+ Create New Exam"**.
2. Nhập các thông tin: **Mã Đề (Exam ID)** (bắt buộc, không dấu hoặc khoảng trắng), **Tiêu đề**, **Thời lượng thi**, và gán **Trạng thái (Active/Inactive)**.
3. Khi lưu thành công, đề thi sẽ hiện lên bảng.

### Chia sẻ cho Học sinh (Copy Link)
Tại mỗi đề thi ở bảng có trạng thái **Active**:
- Hãy bấm nút **"🔗 Link"** (Màu xanh dương đậm).
- Link được copy (VD: \`/exam/ENG_123/start\`) vừa có thể dán vào Zalo/Facebook gửi cho học sinh.
- Mẹo: Khi học sinh bấm link này, hệ thống sẽ **Tự động chọn sẵn đề thi** cho học sinh đó, loại bỏ rủi ro học sinh chọn nhầm đề của lớp khác.

---

## 3. Ngân Hàng Câu Hỏi (Question Bank)
Bạn có thể tự nhập tay hoặc dùng file CSV nhập liệu hàng loạt.

### Danh Sách Các Loại Câu Hỏi Hỗ Trợ
1. **Multiple Choice (\`multiple_choice\`)**: Trắc nghiệm - Học sinh có thể chọn 1 đáp án.
2. **Fill in Blank (\`fill_blank\`)**: Điền vào chỗ trống. Hệ thống dùng \`accepted_answers\` có định dạng danh sách để học sinh gõ chữ vào. Chấm điểm rà soát tự động theo mảng JSON.
3. **Short Answer (\`short_answer\`)**: Câu hỏi tự luận ngắn. Giáo viên tự chấm (Hiện tại chấm mặc định là sai nếu không khớp).

### Chỉnh sửa và Nhập Liệu Câu Hỏi
- **Click vào "Manage Questions"** ở bảng Exams để mở giao diện quản lý câu hỏi của đề đó.
- Nút **"Add Question"**: Tạo thêm từng câu hỏi lẻ bằng tay. Giao diện trực quan thay đổi linh hoạt theo loại câu.
- Nút **"Import CSV"**: Chọn File \`.csv\` mẫu. Nhập liệu tự động kiểm tra lỗi trước khi cho phép lưu.

---

## 4. Quản Lý Kết Quả Thi (Results)
Hệ thống cho phép giám sát bài kiểm tra dễ dàng:

1. Vào tab **Results Manager**.
2. Hệ thống thống kê có bao nhiêu học sinh làm bài thi nào, điểm số trung bình ra sao.
3. Sử dụng tính năng **Lọc (Filter)** theo Lớp hoặc Đề thi để tra cứu nhanh.
4. Bấm vào nút **Export CSV** để tải nhanh bảng điểm về Excel.
5. Bấm vào nút con mắt **👁️ Chi tiết** để xem chính xác học sinh đã làm sai/đúng câu nào.

---

## 5. Quản Lý Kho Trò Chơi (Game Manager)
Thêm các hoạt động giải trí hoặc liên kết bài học Quizizz, Gimkit, Wordwall dễ dàng:
- **Tạo Game**: Tab Game Manager > Thêm Game Mới. 
- Chỉ điền **Tên Game**, dán **Đường Link (URL)**, và tải một **Hình Ảnh Đại Diện (Image Box)**.
- Khi truy cập bảng Game, nó sẽ hiển thị dạng thẻ Lưới rất đẹp và gọn gàng.

---

## 6. Cài Đặt Hệ Thống (Settings)
Nơi quản lý các khóa bí mật:
- Các API Key (như \`openai_api_key\`) sẽ được tự động làm mờ thành dấu \`••••\` để bảo mật.
- Bấm nút con mắt 👁️ để xem và chỉnh sửa khi cần thiết.

---

Chúc bạn có những giờ giảng dạy trải nghiệm hiệu quả và mượt mà cùng **EnglishTools**!
  `;

  useEffect(() => {
    // Giả lập load để UX mượt mà (có thể thay bằng fetch('/Huong_dan_su_dung.md') nếu file public)
    const loadData = async () => {
      setLoading(true);
      setTimeout(() => {
        setContent(staticGuide);
        setLoading(false);
      }, 300);
    };
    loadData();
  }, [staticGuide]);

  if (loading) return <LoadingSpinner message="Đang tải Hướng dẫn..." />;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="bg-white p-8 md:p-12 rounded-[24px] shadow-sm border border-gray-100">
        
        {/* Banner Cover */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
          <h1 className="text-3xl font-extrabold mb-2">Trung tâm Hỗ trợ & Hướng dẫn</h1>
          <p className="text-blue-100">Tài liệu chính thức dành cho Giáo viên / Admin.</p>
        </div>

        {/* Markdown Content rendered via react-markdown */}
        <div className="prose prose-blue prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-100 prose-h3:text-xl prose-h3:mt-6 prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-strong:text-gray-900 max-w-none font-['Nunito'] text-gray-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
        
      </div>
    </div>
  );
};
