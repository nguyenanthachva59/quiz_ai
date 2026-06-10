from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime


# ─────────────────────────────────────────
# USER
# ─────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=2, max_length=50)
    role: Literal["student", "teacher"] = "student"


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[Literal["student", "teacher", "admin"]] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    uid: str
    email: str
    display_name: str = ""        # ← default "" tránh lỗi khi field thiếu
    role: str = "student"         # ← default "student"
    is_active: bool = True        # ← default True
    created_at: Optional[datetime] = None

    class Config:
        # Cho phép Firestore trả về field thừa mà không báo lỗi
        extra = "ignore"


# ─────────────────────────────────────────
# DOCUMENT
# ─────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_path: str
    file_size: int
    status: str
    created_at: Optional[datetime] = None


# ─────────────────────────────────────────
# QUESTION
# ─────────────────────────────────────────

class QuestionOption(BaseModel):
    key: str
    text: str


class QuestionCreate(BaseModel):
    content: str
    options: List[QuestionOption]
    correct_answer: str
    explanation: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    topic: str = ""
    document_id: Optional[str] = None


class QuestionUpdate(BaseModel):
    content: Optional[str] = None
    options: Optional[List[QuestionOption]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    topic: Optional[str] = None
    status: Optional[Literal["pending", "approved", "rejected"]] = None
    admin_note: Optional[str] = None


class QuestionResponse(BaseModel):
    id: str
    content: str
    options: List[QuestionOption]
    correct_answer: str
    explanation: str
    difficulty: str
    topic: str
    status: str
    user_id: str
    document_id: Optional[str] = None
    admin_note: Optional[str] = None
    created_at: Optional[datetime] = None


# ─────────────────────────────────────────
# QUIZ
# ─────────────────────────────────────────

class QuizConfig(BaseModel):
    document_id: str
    num_questions: int = Field(default=10, ge=1, le=50)
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"
    topic: Optional[str] = None
    time_limit_minutes: int = Field(default=30, ge=5, le=180)


class QuizAnswer(BaseModel):
    question_id: str
    selected_answer: str


class QuizSubmit(BaseModel):
    quiz_result_id: str
    answers: List[QuizAnswer]
    time_taken_seconds: int


class QuizResultResponse(BaseModel):
    id: str
    user_id: str
    document_id: Optional[str] = None
    questions: List[dict]
    answers: Optional[List[QuizAnswer]] = None
    answers_with_result: Optional[List[dict]] = None
    score: Optional[float] = None
    correct_count: Optional[int] = None
    total_questions: int
    time_limit_minutes: int
    time_taken_seconds: Optional[int] = None
    status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ─────────────────────────────────────────
# AI GENERATION
# ─────────────────────────────────────────

class GenerateQuestionsRequest(BaseModel):
    document_id: str
    num_questions: int = Field(default=10, ge=1, le=30)
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"
    topic: Optional[str] = None


# ─────────────────────────────────────────
# GENERIC RESPONSES
# ─────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int