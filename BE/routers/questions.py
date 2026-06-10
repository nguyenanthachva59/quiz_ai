from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from core.firebase import get_db
from core.dependencies import get_current_user, require_admin
from models.schemas import (
    QuestionCreate, QuestionUpdate, QuestionResponse,
    GenerateQuestionsRequest, MessageResponse,
)
from services.gemini_service import generate_questions_from_file

router = APIRouter(prefix="/questions", tags=["Questions"])


# ─────────────────────────────────────────
#  STUDENT / TEACHER ENDPOINTS
# ─────────────────────────────────────────

@router.post("/generate", response_model=list[QuestionResponse], status_code=201)
async def generate_questions(
    payload: GenerateQuestionsRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Dùng Gemini AI để sinh câu hỏi từ tài liệu.
    Câu hỏi sinh ra có status='approved' (auto duyệt).
    """
    db = get_db()

    # Lấy thông tin document
    doc_ref = db.collection("documents").document(payload.document_id).get()
    if not doc_ref.exists:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")

    doc_data = doc_ref.to_dict()
    if doc_data["user_id"] != current_user["uid"] and current_user.get("role") not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Không có quyền dùng tài liệu này.")

    if doc_data.get("status") != "done":
        raise HTTPException(status_code=400, detail="Tài liệu chưa xử lý xong. Vui lòng thử lại sau.")

    # Gọi Gemini
    try:
        questions = await generate_questions_from_file(
            file_path=doc_data["file_path"],
            num_questions=payload.num_questions,
            difficulty=payload.difficulty,
            topic=payload.topic,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi AI: {str(e)}")

    # Lưu vào Firestore - auto approved
    saved = []
    batch = db.batch()
    for q in questions:
        q_ref = db.collection("questions").document()
        q_data = {
            **q,
            "user_id": current_user["uid"],
            "document_id": payload.document_id,
            "status": "approved",  # Auto duyệt
            "admin_note": None,
            "created_at": datetime.now(timezone.utc),
        }
        batch.set(q_ref, q_data)
        saved.append(QuestionResponse(id=q_ref.id, **q_data))

    batch.commit()
    return saved


@router.get("/my", response_model=list[QuestionResponse])
async def list_my_questions(
    status: str | None = Query(None, description="pending|approved|rejected"),
    current_user: dict = Depends(get_current_user),
):
    """Lấy danh sách câu hỏi do người dùng tạo."""
    db = get_db()
    query = db.collection("questions").where("user_id", "==", current_user["uid"])
    if status:
        query = query.where("status", "==", status)

    result = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        result.append(QuestionResponse(**data))
    return result


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str, current_user: dict = Depends(get_current_user)):
    """Lấy chi tiết một câu hỏi."""
    db = get_db()
    doc = db.collection("questions").document(question_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")
    data = doc.to_dict()
    data["id"] = question_id
    return QuestionResponse(**data)


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: str,
    payload: QuestionUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Cập nhật câu hỏi (chủ sở hữu hoặc admin)."""
    db = get_db()
    doc_ref = db.collection("questions").document(question_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")

    data = doc.to_dict()
    is_owner = data["user_id"] == current_user["uid"]
    is_admin = current_user.get("role") == "admin"

    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa câu hỏi này.")

    update_data = payload.model_dump(exclude_none=True)
    if "status" in update_data and not is_admin:
        del update_data["status"]

    doc_ref.update(update_data)
    updated = {**data, **update_data, "id": question_id}
    return QuestionResponse(**updated)


@router.delete("/{question_id}", response_model=MessageResponse)
async def delete_question(
    question_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Xóa câu hỏi."""
    db = get_db()
    doc_ref = db.collection("questions").document(question_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")

    data = doc.to_dict()
    if data["user_id"] != current_user["uid"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền xóa câu hỏi này.")

    doc_ref.delete()
    return MessageResponse(message="Đã xóa câu hỏi thành công.")


# ─────────────────────────────────────────
#  ADMIN ENDPOINTS
# ─────────────────────────────────────────

@router.get("/admin/pending", response_model=list[QuestionResponse])
async def admin_list_pending(admin: dict = Depends(require_admin)):
    """[Admin] Lấy danh sách câu hỏi chờ duyệt."""
    db = get_db()
    docs = db.collection("questions").where("status", "==", "pending").stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        result.append(QuestionResponse(**data))
    return result


@router.patch("/admin/{question_id}/approve", response_model=QuestionResponse)
async def admin_approve(question_id: str, admin: dict = Depends(require_admin)):
    """[Admin] Duyệt câu hỏi."""
    return await _admin_set_status(question_id, "approved", None)


@router.patch("/admin/{question_id}/reject", response_model=QuestionResponse)
async def admin_reject(
    question_id: str,
    note: str = Query(..., description="Lý do từ chối"),
    admin: dict = Depends(require_admin),
):
    """[Admin] Từ chối câu hỏi kèm ghi chú."""
    return await _admin_set_status(question_id, "rejected", note)


async def _admin_set_status(question_id: str, status: str, note: str | None):
    db = get_db()
    doc_ref = db.collection("questions").document(question_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")
    update = {"status": status, "admin_note": note}
    doc_ref.update(update)
    data = {**doc.to_dict(), **update, "id": question_id}
    return QuestionResponse(**data)