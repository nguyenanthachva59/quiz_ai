import random
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from core.firebase import get_db

from core.dependencies import get_current_user
from models.schemas import (
    QuizConfig, QuizSubmit, QuizResultResponse, MessageResponse,
)
from services.gemini_service import get_ai_explanation, generate_questions_from_file

router = APIRouter(prefix="/quiz", tags=["Quiz"])


@router.post("/generate", response_model=QuizResultResponse, status_code=201)
async def generate_quiz(
    payload: QuizConfig,
    current_user: dict = Depends(get_current_user),
):
    """
    Tạo quiz trực tiếp từ tài liệu bằng Gemini AI.
    Không cần duyệt câu hỏi.
    Học sinh chỉ nhận câu hỏi + đáp án lựa chọn, không nhận correct_answer/explanation.
    """
    db = get_db()

    # 1. Kiểm tra tài liệu
    doc_ref = db.collection("documents").document(payload.document_id).get()
    if not doc_ref.exists:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")

    doc_data = doc_ref.to_dict()

    # 2. Chỉ chủ tài liệu hoặc admin mới được dùng tài liệu
    if doc_data["user_id"] != current_user["uid"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền dùng tài liệu này.")

    if doc_data.get("status") != "done":
        raise HTTPException(status_code=400, detail="Tài liệu chưa xử lý xong. Vui lòng thử lại sau.")

    # 3. Gọi Gemini sinh câu hỏi trực tiếp từ file
    try:
        generated_questions = await generate_questions_from_file(
            file_path=doc_data["file_path"],
            num_questions=payload.num_questions,
            difficulty=payload.difficulty,
            topic=payload.topic,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi AI: {str(e)}")

    if not generated_questions:
        raise HTTPException(status_code=404, detail="AI chưa sinh được câu hỏi từ tài liệu này.")

    # 4. Tạo câu hỏi đầy đủ và câu hỏi an toàn
    full_questions = []
    safe_questions = []

    for index, q in enumerate(generated_questions):
        q_id = f"q_{index + 1}_{random.randint(100000, 999999)}"

        full_q = {
            **q,
            "id": q_id,
            "document_id": payload.document_id,
        }

        safe_q = {
            "id": q_id,
            "content": q.get("content", ""),
            "options": q.get("options", []),
            "difficulty": q.get("difficulty", payload.difficulty),
            "topic": q.get("topic", payload.topic or ""),
            "document_id": payload.document_id,
        }

        full_questions.append(full_q)
        safe_questions.append(safe_q)

    # 5. Lưu quiz_result: server giữ bản có đáp án
    result_data = {
        "user_id": current_user["uid"],
        "document_id": payload.document_id,
        "questions": full_questions,
        "safe_questions": safe_questions,
        "answers": None,
        "score": None,
        "correct_count": None,
        "total_questions": len(full_questions),
        "time_limit_minutes": payload.time_limit_minutes,
        "time_taken_seconds": None,
        "status": "in_progress",
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
    }

    result_ref = db.collection("quiz_results").document()
    result_ref.set(result_data)

    # 6. Trả về frontend bản không có đáp án
    return QuizResultResponse(
        id=result_ref.id,
        user_id=current_user["uid"],
        questions=safe_questions,
        answers=None,
        score=None,
        correct_count=None,
        total_questions=len(safe_questions),
        time_limit_minutes=payload.time_limit_minutes,
        time_taken_seconds=None,
        status="in_progress",
        created_at=result_data["created_at"],
        completed_at=None,
    )


@router.post("/submit", response_model=QuizResultResponse)
async def submit_quiz(
    payload: QuizSubmit,
    current_user: dict = Depends(get_current_user),
):
    """Nộp bài quiz, tính điểm và lưu kết quả."""
    db = get_db()
    result_ref = db.collection("quiz_results").document(payload.quiz_result_id)
    result_doc = result_ref.get()

    if not result_doc.exists:
        raise HTTPException(status_code=404, detail="Bài quiz không tồn tại.")

    result_data = result_doc.to_dict()

    if result_data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Đây không phải bài quiz của bạn.")

    if result_data["status"] == "completed":
        raise HTTPException(status_code=400, detail="Bài quiz đã được nộp.")

    # Tính điểm
    questions_map = {q["id"]: q for q in result_data["questions"]}
    correct_count = 0
    answers_with_result = []

    for ans in payload.answers:
        q = questions_map.get(ans.question_id)
        if q:
            is_correct = q["correct_answer"] == ans.selected_answer
            if is_correct:
                correct_count += 1
            answers_with_result.append({
                "question_id": ans.question_id,
                "selecget_ted_answer": ans.selected_answer,
                "correct_answer": q["correct_answer"],
                "is_correct": is_correct,
            })

    total = result_data["total_questions"]
    score = round((correct_count / total) * 10, 2) if total > 0 else 0

    update_data = {
        "answers": [a.model_dump() for a in payload.answers],
        "answers_with_result": answers_with_result,
        "score": score,
        "correct_count": correct_count,
        "time_taken_seconds": payload.time_taken_seconds,
        "status": "completed",
        "completed_at": datetime.now(timezone.utc),
    }
    result_ref.update(update_data)

    # Trả về kết quả đầy đủ (có đáp án) sau khi nộp bài
    return QuizResultResponse(
        id=payload.quiz_result_id,
    user_id=current_user["uid"],
    questions=result_data["questions"],
    answers=payload.answers,
    answers_with_result=answers_with_result,
    score=score,
    correct_count=correct_count,
    total_questions=total,
    time_limit_minutes=result_data["time_limit_minutes"],
    time_taken_seconds=payload.time_taken_seconds,
    status="completed",
    created_at=result_data["created_at"],
    completed_at=update_data["completed_at"]
    )


@router.get("/result/{result_id}", response_model=QuizResultResponse)
async def quiz_result(result_id: str, current_user: dict = Depends(get_current_user)):
    """Xem kết quả bài quiz."""
    db = get_db()
    doc = db.collection("quiz_results").document(result_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Kết quả không tồn tại.")

    data = doc.to_dict()
    if data["user_id"] != current_user["uid"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền xem kết quả này.")

    return QuizResultResponse(id=result_id, **data)


@router.get("/history/me", response_model=list[QuizResultResponse])
async def get_my_history(current_user: dict = Depends(get_current_user)):
    """Xem lịch sử làm bài của bản thân."""
    db = get_db()
    docs = (
        db.collection("quiz_results")
        .where("user_id", "==", current_user["uid"])
        .where("status", "==", "completed")
        .order_by("completed_at", direction="DESCENDING")
        .stream()
    )
    result = []
    for doc in docs:
        data = doc.to_dict()
        result.append(QuizResultResponse(
            id=doc.id,
            **{k: v for k, v in data.items() if k not in ("answers_with_result",)}
        ))
    return result


@router.get("/result/{result_id}/explanation/{question_id}")
async def get_explanation(
    result_id: str,
    question_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Lấy giải thích AI chi tiết cho một câu hỏi trong bài quiz đã nộp."""
    db = get_db()
    result_doc = db.collection("quiz_results").document(result_id).get()

    if not result_doc.exists:
        raise HTTPException(status_code=404, detail="Kết quả không tồn tại.")

    data = result_doc.to_dict()
    if data["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")

    if data["status"] != "completed":
        raise HTTPException(status_code=400, detail="Bài chưa được nộp.")

    # Tìm câu hỏi và câu trả lời
    question = next((q for q in data["questions"] if q["id"] == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Câu hỏi không có trong bài quiz này.")

    answers_with_result = data.get("answers_with_result", [])
    answer_entry = next((a for a in answers_with_result if a["question_id"] == question_id), None)
    selected = answer_entry.get("selected_answer", "") if answer_entry else ""

    try:
        explanation = await get_ai_explanation(question, selected)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi AI: {str(e)}")

    return {
        "question_id": question_id,
        "selected_answer": selected,
        "correct_answer": question.get("correct_answer"),
        "is_correct": answer_entry.get("is_correct") if answer_entry else None,
        "ai_explanation": explanation,
    }
