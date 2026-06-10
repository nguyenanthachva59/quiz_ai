from fastapi import APIRouter, HTTPException, Depends, Query
from core.firebase import get_db
from core.dependencies import require_admin
from models.schemas import UserResponse, UserUpdate, MessageResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Dashboard ────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def get_dashboard_stats(admin: dict = Depends(require_admin)):
    """[Admin] Thống kê tổng quan hệ thống."""
    db = get_db()

    users = list(db.collection("users").stream())
    total_users = len(users)
    active_users = sum(1 for u in users if u.to_dict().get("is_active", True))

    documents = list(db.collection("documents").stream())
    total_docs = len(documents)

    questions = list(db.collection("questions").stream())
    pending_q  = sum(1 for q in questions if q.to_dict().get("status") == "pending")
    approved_q = sum(1 for q in questions if q.to_dict().get("status") == "approved")
    rejected_q = sum(1 for q in questions if q.to_dict().get("status") == "rejected")

    results = list(db.collection("quiz_results").stream())
    total_quizzes     = len(results)
    completed_quizzes = sum(1 for r in results if r.to_dict().get("status") == "completed")

    scores = [r.to_dict().get("score") for r in results if r.to_dict().get("score") is not None]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0

    return {
        "users": {
            "total":    total_users,
            "active":   active_users,
            "inactive": total_users - active_users,
        },
        "documents": {
            "total": total_docs,
        },
        "questions": {
            "total":    len(questions),
            "pending":  pending_q,
            "approved": approved_q,
            "rejected": rejected_q,
        },
        "quizzes": {
            "total":     total_quizzes,
            "completed": completed_quizzes,
            "avg_score": avg_score,
        },
    }


# ── Users ────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    role: str | None = Query(None, description="student|teacher|admin"),
    is_active: bool | None = Query(None),
    admin: dict = Depends(require_admin),
):
    """[Admin] Lấy danh sách người dùng."""
    db = get_db()
    query = db.collection("users")

    if role:
        query = query.where("role", "==", role)
    if is_active is not None:
        query = query.where("is_active", "==", is_active)

    result = []
    for doc in query.stream():
        data = doc.to_dict()
        data["uid"] = doc.id
        result.append(UserResponse(**data))
    return result


@router.patch("/users/{uid}", response_model=UserResponse)
async def update_user(uid: str, payload: UserUpdate, admin: dict = Depends(require_admin)):
    """[Admin] Cập nhật thông tin / role / trạng thái người dùng."""
    db = get_db()
    doc_ref = db.collection("users").document(uid)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")

    update_data = payload.model_dump(exclude_none=True)
    doc_ref.update(update_data)

    data = {**doc.to_dict(), **update_data, "uid": uid}
    return UserResponse(**data)


@router.delete("/users/{uid}", response_model=MessageResponse)
async def delete_user(uid: str, admin: dict = Depends(require_admin)):
    """[Admin] Vô hiệu hóa tài khoản người dùng (soft delete)."""
    db = get_db()
    doc_ref = db.collection("users").document(uid)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")

    doc_ref.update({"is_active": False})
    return MessageResponse(message=f"Đã vô hiệu hóa tài khoản {uid}.")


# ── Quiz Results ─────────────────────────────────────────────

@router.get("/quiz-results", response_model=list[dict])
async def list_all_quiz_results(
    user_id: str | None = Query(None),
    admin: dict = Depends(require_admin),
):
    """[Admin] Xem tất cả kết quả quiz trong hệ thống."""
    db = get_db()
    query = db.collection("quiz_results").where("status", "==", "completed")
    if user_id:
        query = query.where("user_id", "==", user_id)

    # Cache thông tin user để tránh query Firestore lặp lại
    user_cache: dict = {}

    result = []
    for doc in query.order_by("completed_at", direction="DESCENDING").stream():
        data = doc.to_dict()
        data["id"] = doc.id
        data.pop("questions", None)
        data.pop("answers_with_result", None)

        # Join thêm display_name và email từ collection users
        uid = data.get("user_id")
        if uid:
            if uid not in user_cache:
                user_doc = db.collection("users").document(uid).get()
                user_cache[uid] = user_doc.to_dict() if user_doc.exists else {}
            user_info = user_cache[uid]
            # Ưu tiên display_name, fallback về email, cuối cùng là uid
            data["user_name"]  = user_info.get("display_name") or user_info.get("email") or uid
            data["user_email"] = user_info.get("email", "")
        else:
            data["user_name"]  = "Ẩn danh"
            data["user_email"] = ""

        result.append(data)
    return result


@router.delete("/quiz-results/{result_id}", response_model=MessageResponse)
async def delete_quiz_result(result_id: str, admin: dict = Depends(require_admin)):
    """[Admin] Xóa một kết quả quiz."""
    db = get_db()
    doc_ref = db.collection("quiz_results").document(result_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Kết quả quiz không tồn tại.")

    doc_ref.delete()
    return MessageResponse(message=f"Đã xóa quiz result {result_id}.")