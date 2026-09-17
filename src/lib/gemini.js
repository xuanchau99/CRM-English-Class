export async function callGeminiToGenerate(topic, level, quantity, selectedTypes, apiKey, modelName = 'gemini-1.5-flash', existingQuestions = []) {
    const allRules = {
      'single_choice': `1. 'single_choice' (Trắc nghiệm 1 đáp án đúng): 
   - options mảng chứa 4 phương án lựa chọn (không được để trống).
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của phương án đúng.
   - accepted_answers: Phải ghi mảng JSON string chứa nội dung phương án đúng đó, ví dụ '["goes"]'.`,
      'multiple_choice': `2. 'multiple_choice' (Trắc nghiệm nhiều đáp án đúng): 
   - options mảng chứa 4 phương án.
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của các phương án đúng cách nhau bởi dấu phẩy.
   - accepted_answers: Phải là một mảng JSON string chứa chính xác nội dung các phương án đúng.`,
      'true_false': `3. 'true_false' (Đúng/Sai): 
   - options: mảng rỗng hoặc chứa ["True", "False"].
   - correct_answer: Phải ghi "TRUE" hoặc "FALSE" (viết hoa toàn bộ).
   - accepted_answers: Ghi mảng JSON string tương ứng, ví dụ '["TRUE", "True", "true"]'.`,
      'fill_blank': `4. 'fill_blank' (Điền từ vào ô trống):
   - question_text: Phải chứa ít nhất một khoảng trống biểu diễn bằng "____" (4 dấu gạch dưới).
   - correct_answer: Ghi từ đúng để điền vào ô trống, ví dụ "apple".
   - accepted_answers: Phải ghi mảng JSON string chứa từ đúng và các biến thể viết hoa/số nhiều được chấp nhận.
   - options: mảng rỗng [].`,
      'arrange_sentence': `5. 'arrange_sentence' (Sắp xếp từ thành câu):
   - question_text: Phải ghi CÂU HOÀN CHỈNH ĐÚNG.
   - correct_answer: Phải ghi lại chính xác CÂU HOÀN CHỈNH ĐÚNG giống hệt question_text.
   - accepted_answers: Phải ghi mảng JSON string chứa câu hoàn chỉnh đó.
   - options: mảng rỗng [].`,
      'vocabulary': `6. 'vocabulary' (Trắc nghiệm từ vựng):
   - options mảng chứa 4 phương án nghĩa hoặc từ đồng nghĩa.
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của phương án đúng.
   - accepted_answers: Phải ghi mảng JSON string chứa nội dung phương án đúng đó.`,
      'matching': `7. 'matching' (Nối cặp từ - định nghĩa):
   - question_text: Liệt kê các câu hỏi/từ ở cột trái, mỗi câu/từ trên 1 dòng mới (dùng ký tự \\n).
   - correct_answer: Liệt kê các câu trả lời/nghĩa ở cột phải tương ứng với cột trái, mỗi câu/từ trên 1 dòng mới. Số lượng dòng ở đây phải BẰNG số lượng dòng của question_text.
   - options: mảng rỗng [].
   - accepted_answers: Phải ghi '[]'.`,
      'short_answer': `8. 'short_answer' (Tự luận ngắn):
   - question_text: Câu hỏi tự luận.
   - correct_answer: Câu trả lời mẫu/đáp án mẫu chuẩn.
   - accepted_answers: Phải ghi mảng JSON string chứa các câu trả lời ngắn được hệ thống tự động chấm đúng.
   - options: mảng rỗng [].`
    };

    const activeRules = selectedTypes.map(type => allRules[type]).filter(Boolean).join('\n\n');
    const typesExplanation = `
Các dạng câu hỏi YÊU CẦU BẮT BUỘC PHẢI SINH (Chỉ được phép sinh các type có trong danh sách này: ${selectedTypes.join(', ')}):
${activeRules}
`;

    let existingContext = '';
    if (existingQuestions.length > 0) {
        existingContext = `
Dưới đây là các câu hỏi đã có, vui lòng KHÔNG tạo trùng lặp hoặc lặp lại nội dung của các câu hỏi này:
${JSON.stringify(existingQuestions.map(q => q.question_text))}
`;
    }

    const promptText = `
Bạn là chuyên gia giáo dục tiếng Anh chuyên nghiệp. Hãy soạn ra ${quantity} câu hỏi tiếng Anh chất lượng cao.
Chủ đề / Đoạn văn gốc: "${topic}"
Độ khó: ${level}

${typesExplanation}
${existingContext}

Hãy trả về kết quả dưới dạng một đối tượng JSON có thuộc tính duy nhất là "questions", chứa mảng các câu hỏi thỏa mãn cấu trúc trên.
Ví dụ cấu trúc trả về:
{
  "questions": [
    {
      "type": "single_choice",
      "level": "${level}",
      "question_text": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "accepted_answers": "...",
      "explanation": "..."
    }
  ]
}
Chỉ trả về JSON hợp lệ, không trả về thêm bất kỳ văn bản giải thích nào ngoài khối JSON.
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptText }]
                }]
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        const textResponse = data.candidates[0].content.parts[0].text;
        
        // Try to parse the JSON string from the response
        let jsonStr = textResponse;
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0];
        } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0];
        }
        
        const result = JSON.parse(jsonStr.trim());
        return result.questions || [];
    } catch (err) {
        console.error("Gemini API Error:", err);
        throw new Error("Lỗi khi gọi Gemini API: " + err.message);
    }
}
