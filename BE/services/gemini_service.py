import json
import re
import asyncio
from pathlib import Path
from google import genai
from google.genai import types
from pypdf import PdfReader
from docx import Document
from core.config import get_settings

_client = None

FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-8b",
]


def get_gemini_client() -> genai.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _is_retryable(e: Exception) -> bool:
    msg = str(e)
    return "503" in msg or "UNAVAILABLE" in msg or "overloaded" in msg.lower()

def _is_quota(e: Exception) -> bool:
    msg = str(e)
    return "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower() or "404" in msg.lower()  # Một số lỗi hết quota cũng trả về 404


async def _call_with_retry(client, contents, config, max_retries: int = 2):
    """Gọi Gemini với retry + fallback model khi gặp 503."""
    settings = get_settings()

    # Danh sách model: model trong config trước, rồi fallback
    models = [settings.gemini_model] + [
        m for m in FALLBACK_MODELS if m != settings.gemini_model
    ]

    last_error = None

    for model in models:
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
                return response
            except Exception as e:
                last_error = e
                if _is_retryable(e):
                    if attempt < max_retries - 1:
                        wait = 2 ** attempt  # 1s, 2s
                        await asyncio.sleep(wait)
                        continue
                    # Hết retry cho model này → thử model tiếp theo
                    break
                elif _is_quota(e):
                    # Hết quota model này → thử model tiếp theo ngay
                    break
                else:
                    # Lỗi khác (auth, bad request...) → ném luôn
                    raise

    raise RuntimeError(
        f"Tất cả model AI đang quá tải hoặc hết quota. Vui lòng thử lại sau. "
        f"(Lỗi cuối: {last_error})"
    )


def _read_file_text(file_path: str) -> str:
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File không tồn tại: {file_path}")

    suffix = path.suffix.lower()

    if suffix == ".pdf":
        reader = PdfReader(str(path))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append(f"\n--- Trang {i + 1} ---\n{text}")
        return "\n".join(pages_text)

    if suffix == ".docx":
        doc = Document(str(path))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)

    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")

    raise ValueError("Định dạng file không được hỗ trợ. Chỉ hỗ trợ PDF, DOCX, TXT.")


def _normalize_options(options: list) -> list:
    normalized = []
    for opt in options:
        if not isinstance(opt, dict):
            continue
        key = opt.get("key", "")
        text = (
            opt.get("text")
            or opt.get("value")
            or opt.get("content")
            or opt.get("answer")
            or opt.get("label")
            or next(
                (v for k, v in opt.items() if k != "key" and isinstance(v, str)), ""
            )
        )
        normalized.append({"key": key, "text": str(text)})
    return normalized


def _normalize_questions(questions: list) -> list:
    result = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        options = _normalize_options(q.get("options", []))
        if len(options) < 2:
            continue
        result.append(
            {
                "content": q.get("content", ""),
                "options": options,
                "correct_answer": q.get("correct_answer", "A"),
                "explanation": q.get("explanation", ""),
                "difficulty": q.get("difficulty", "medium"),
                "topic": q.get("topic", ""),
            }
        )
    return result


def _build_prompt(
    content: str, num_questions: int, difficulty: str, topic: str | None
) -> str:
    difficulty_vi = {
        "easy": "dễ",
        "medium": "trung bình",
        "hard": "khó",
        "mixed": "hỗn hợp",
    }
    diff_label = difficulty_vi.get(difficulty, "trung bình")
    topic_clause = (
        f'về chủ đề "{topic}"' if topic else "theo các chương/mục chính trong tài liệu"
    )

    return f"""
Bạn là hệ thống tạo câu hỏi trắc nghiệm ôn tập cho học sinh THPT.

NHIỆM VỤ:
Tạo {num_questions} câu hỏi trắc nghiệm {topic_clause}, mức độ {diff_label}.

QUY TẮC BẮT BUỘC:
- Chỉ được tạo câu hỏi dựa trên NỘI DUNG HỌC TẬP trong tài liệu bên dưới.
- Toàn bộ nội dung câu hỏi, đáp án dạng văn bản và giải thích PHẢI viết bằng tiếng Việt có dấu chuẩn.
- Không được viết tiếng Việt không dấu trong câu hỏi, đáp án văn bản hoặc giải thích.
- Nếu tài liệu gốc bị mất dấu ở phần văn bản tiếng Việt, hãy tự khôi phục thành tiếng Việt có dấu tự nhiên.
- Với mọi đoạn code, lệnh, cú pháp lập trình, truy vấn SQL, HTML, CSS, JavaScript, Python, C/C++, Java, JSON, XML hoặc bất kỳ ngôn ngữ/ký hiệu kỹ thuật nào khác: PHẢI giữ nguyên chính xác cú pháp.
- Không được tự ý dịch, thêm dấu tiếng Việt, đổi tên biến, đổi dấu nháy, đổi thụt dòng, đổi toán tử, đổi ký tự hoặc Việt hóa bất kỳ đoạn code nào.
- Nếu đáp án là code một dòng, giữ nguyên một dòng.
- Nếu đáp án là code nhiều dòng, phải giữ xuống dòng bằng ký tự \\n trong chuỗi JSON.
- Không được gộp code nhiều dòng thành một dòng nếu bản chất đoạn code cần xuống dòng.
- Không được tạo câu hỏi về cấu trúc kỹ thuật của file PDF như MediaBox, Font, Type0, Filter, stream object, object number, FlateDecode, ASCII85Decode.
- Nếu tài liệu có chương/mục, hãy phân bổ câu hỏi theo các chương/mục chính.
- Câu hỏi phải phù hợp với học sinh lớp trung học phổ thông.
- Mỗi câu có đúng 4 lựa chọn A, B, C, D.
- Chỉ có MỘT đáp án đúng.
- Giải thích phải ngắn gọn và dựa trên tài liệu.
- Phải trả về JSON hoàn chỉnh, không được thiếu phần kết thúc của JSON.

NỘI DUNG TÀI LIỆU:
\"\"\"
{content[:12000]}
\"\"\"

Trả về DUY NHẤT JSON hợp lệ, không markdown, không backtick, không text ngoài JSON.

Format bắt buộc:
{{
  "questions": [
    {{
      "content": "Nội dung câu hỏi bằng tiếng Việt có dấu?",
      "options": [
        {{"key": "A", "text": "Nội dung đáp án A hoặc đoạn code giữ nguyên"}},
        {{"key": "B", "text": "Nội dung đáp án B hoặc đoạn code giữ nguyên"}},
        {{"key": "C", "text": "Nội dung đáp án C hoặc đoạn code giữ nguyên"}},
        {{"key": "D", "text": "Nội dung đáp án D hoặc đoạn code giữ nguyên"}}
      ],
      "correct_answer": "A",
      "explanation": "Giải thích ngắn gọn bằng tiếng Việt có dấu, dựa trên tài liệu",
      "difficulty": "{difficulty if difficulty != 'mixed' else 'medium'}",
      "topic": "Tên chương hoặc chủ đề trong tài liệu bằng tiếng Việt có dấu"
    }}
  ]
}}
"""


def _build_file_prompt(num_questions: int, difficulty: str, topic: str | None) -> str:
    difficulty_vi = {
        "easy": "dễ",
        "medium": "trung bình",
        "hard": "khó",
        "mixed": "hỗn hợp",
    }
    diff_label = difficulty_vi.get(difficulty, "trung bình")
    topic_clause = (
        f'về chủ đề "{topic}"' if topic else "theo các chương/mục chính trong tài liệu"
    )

    return f"""
Bạn là hệ thống tạo câu hỏi trắc nghiệm ôn tập cho học sinh THPT.

Hãy đọc trực tiếp file tài liệu được đính kèm và tạo {num_questions} câu hỏi trắc nghiệm {topic_clause}, mức độ {diff_label}.

QUY TẮC BẮT BUỘC:
- Chỉ tạo câu hỏi dựa trên nội dung học tập trong file tài liệu.
- Toàn bộ nội dung câu hỏi, đáp án dạng văn bản và giải thích PHẢI viết bằng tiếng Việt có dấu chuẩn.
- Không được viết tiếng Việt không dấu trong câu hỏi, đáp án văn bản hoặc giải thích.
- Nếu tài liệu gốc bị mất dấu ở phần văn bản tiếng Việt, hãy tự khôi phục thành tiếng Việt có dấu tự nhiên.
- Với mọi đoạn code, lệnh, cú pháp lập trình: PHẢI giữ nguyên chính xác cú pháp.
- Không tạo câu hỏi về cấu trúc kỹ thuật của file PDF.
- Câu hỏi phải phù hợp với học sinh trung học phổ thông.
- Mỗi câu có đúng 4 lựa chọn A, B, C, D.
- Chỉ có MỘT đáp án đúng.
- Giải thích ngắn gọn, dễ hiểu, dựa trên tài liệu.
- Phải trả về JSON hoàn chỉnh, không được thiếu phần kết thúc của JSON.

Trả về DUY NHẤT JSON hợp lệ, không markdown, không backtick, không text ngoài JSON.

Format bắt buộc:
{{
  "questions": [
    {{
      "content": "Nội dung câu hỏi bằng tiếng Việt có dấu?",
      "options": [
        {{"key": "A", "text": "Nội dung đáp án A hoặc đoạn code giữ nguyên"}},
        {{"key": "B", "text": "Nội dung đáp án B hoặc đoạn code giữ nguyên"}},
        {{"key": "C", "text": "Nội dung đáp án C hoặc đoạn code giữ nguyên"}},
        {{"key": "D", "text": "Nội dung đáp án D hoặc đoạn code giữ nguyên"}}
      ],
      "correct_answer": "A",
      "explanation": "Giải thích ngắn gọn bằng tiếng Việt có dấu, dựa trên tài liệu",
      "difficulty": "{difficulty if difficulty != 'mixed' else 'medium'}",
      "topic": "Tên chương hoặc chủ đề trong tài liệu bằng tiếng Việt có dấu"
    }}
  ]
}}
"""


async def generate_questions_from_file(
    file_path: str,
    num_questions: int = 10,
    difficulty: str = "mixed",
    topic: str | None = None,
) -> list[dict]:
    client = get_gemini_client()

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File không tồn tại: {file_path}")

    suffix = path.suffix.lower()

    try:
        content = _read_file_text(file_path)
    except Exception:
        content = ""

    config = types.GenerateContentConfig(
        temperature=0.2,
        max_output_tokens=12000,
        response_mime_type="application/json",
    )

    if content.strip():
        prompt = _build_prompt(content, num_questions, difficulty, topic)
        response = await _call_with_retry(client, prompt, config)
    elif suffix == ".pdf":
        prompt = _build_file_prompt(num_questions, difficulty, topic)
        uploaded_file = client.files.upload(file=str(path))
        response = await _call_with_retry(client, [uploaded_file, prompt], config)
    else:
        raise ValueError("Tài liệu trống hoặc không đọc được nội dung.")

    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
        questions = data.get("questions", [])
        normalized = _normalize_questions(questions)

        if not normalized:
            raise ValueError("Gemini không sinh được câu hỏi hợp lệ từ tài liệu.")

        return normalized

    except json.JSONDecodeError:
        raise ValueError(
            "Gemini đã sinh câu hỏi nhưng JSON bị lỗi hoặc bị cắt ngang. "
            "Hãy thử giảm số câu hỏi xuống 5 hoặc bấm tạo lại."
        )


async def get_ai_explanation(question: dict, selected_answer: str) -> str:
    client = get_gemini_client()

    options_text = "\n".join(
        f"{o['key']}. {o.get('text', '')}" for o in question.get("options", [])
    )
    correct = question.get("correct_answer", "")
    is_correct = selected_answer == correct

    prompt = f"""Câu hỏi: {question.get('content', '')}

Các đáp án:
{options_text}

Đáp án đúng: {correct}
Học sinh chọn: {selected_answer} ({'Đúng' if is_correct else 'Sai'})
Giải thích cơ bản: {question.get('explanation', '')}

Hãy giải thích chi tiết hơn tại sao đáp án {correct} là đúng,
{'và tại sao đáp án ' + selected_answer + ' của học sinh sai.' if not is_correct else ''}
Giải thích bằng tiếng Việt, ngắn gọn, dễ hiểu (tối đa 150 từ).
Không dùng markdown, không dùng ký tự **, *, #, -, hay bất kỳ định dạng đặc biệt nào."""

    config = types.GenerateContentConfig(
        temperature=0.5,
        max_output_tokens=1024,
    )

    response = await _call_with_retry(client, prompt, config)
    return response.text.strip()