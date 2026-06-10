# QuizAI Tin học THPT - Backend API

FastAPI backend với Firebase Firestore + Google Gemini AI.

## 📁 Cấu trúc thư mục

```
backend/
├── main.py                  # Entry point
├── requirements.txt
├── .env.example             # Template biến môi trường
├── firestore.rules          # Firebase Security Rules
├── uploads/                 # File upload (auto-tạo)
├── core/
│   ├── config.py            # Pydantic Settings
│   ├── firebase.py          # Khởi tạo Firebase Admin SDK
│   └── dependencies.py      # Auth dependencies (get_current_user, require_admin)
├── models/
│   └── schemas.py           # Tất cả Pydantic models
├── routers/
│   ├── auth.py              # /auth/* (3 endpoints)
│   ├── documents.py         # /documents/* (4 endpoints)
│   ├── questions.py         # /questions/* (9 endpoints)
│   ├── quiz.py              # /quiz/* (5 endpoints)
│   └── admin.py             # /admin/* (6 endpoints)
└── services/
    └── gemini_service.py    # Google Gemini AI logic
```

## 🚀 Cài đặt

### 1. Clone & cài dependencies
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Cấu hình .env
```bash
cp .env.example .env
```
Điền vào `.env`:
- **Firebase**: Lấy từ Firebase Console → Project Settings → Service Accounts → Generate new private key
- **Gemini API Key**: Lấy từ https://aistudio.google.com/apikey

### 3. Chạy server
```bash
uvicorn main:app --reload --port 8000
```

Truy cập:
- API Docs (Swagger): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📡 API Endpoints (26 endpoints)

### Auth (`/auth`)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/auth/register` | Đăng ký tài khoản mới |
| GET | `/auth/me` | Lấy thông tin user hiện tại |
| POST | `/auth/sync-user` | Đồng bộ user từ Firebase Auth (sau login Google) |

### Documents (`/documents`)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/documents/upload` | Upload tài liệu (PDF/DOCX/TXT, max 10MB) |
| GET | `/documents/` | Danh sách tài liệu của user |
| GET | `/documents/{id}` | Chi tiết một tài liệu |
| DELETE | `/documents/{id}` | Xóa tài liệu |

### Questions (`/questions`)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/questions/generate` | 🤖 Sinh câu hỏi bằng Gemini AI |
| GET | `/questions/my` | Câu hỏi do user tạo |
| GET | `/questions/{id}` | Chi tiết câu hỏi |
| PUT | `/questions/{id}` | Cập nhật câu hỏi |
| DELETE | `/questions/{id}` | Xóa câu hỏi |
| GET | `/questions/admin/pending` | [Admin] DS câu hỏi chờ duyệt |
| PATCH | `/questions/admin/{id}/approve` | [Admin] Duyệt câu hỏi |
| PATCH | `/questions/admin/{id}/reject` | [Admin] Từ chối câu hỏi |

### Quiz (`/quiz`)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/quiz/generate` | Tạo bài quiz ngẫu nhiên |
| POST | `/quiz/submit` | Nộp bài và tính điểm |
| GET | `/quiz/result/{id}` | Xem kết quả bài quiz |
| GET | `/quiz/history/me` | Lịch sử làm bài |
| GET | `/quiz/result/{id}/explanation/{qid}` | 🤖 Giải thích AI cho câu hỏi |

### Admin (`/admin`)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/admin/dashboard/stats` | Thống kê tổng quan |
| GET | `/admin/users` | Danh sách người dùng |
| GET | `/admin/users/{uid}` | Chi tiết người dùng |
| PATCH | `/admin/users/{uid}` | Cập nhật user (role, trạng thái) |
| DELETE | `/admin/users/{uid}` | Vô hiệu hóa tài khoản |
| GET | `/admin/quiz-results` | Tất cả kết quả quiz |

## 🔑 Xác thực

Mọi endpoint đều yêu cầu Firebase ID Token (trừ `/auth/register`):

```javascript
// Frontend: lấy token sau khi login
const token = await firebase.auth().currentUser.getIdToken();

// Gửi kèm header
fetch('/api/...', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

## 🗃️ Firestore Collections

| Collection | Mô tả |
|-----------|-------|
| `users` | Thông tin người dùng (role, is_active, ...) |
| `documents` | Metadata tài liệu upload |
| `questions` | Ngân hàng câu hỏi (pending/approved/rejected) |
| `quiz_results` | Kết quả làm bài (in_progress/completed) |

## ⚠️ Lưu ý

- File upload lưu tại `uploads/` (local), không dùng Firebase Storage
- Dùng `gemini-2.0-flash-lite` khi dev để tránh rate limit 429
- Admin phải được set `role: "admin"` trong Firestore trực tiếp lần đầu
