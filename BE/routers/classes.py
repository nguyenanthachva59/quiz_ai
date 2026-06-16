import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from core.firebase import get_db
from core.dependencies import get_current_user, require_teacher
from models.schemas import (
    ClassCreate, ClassUpdate, ClassResponse, ClassMemberResponse,
    ClassQuizAssign, ClassQuizUpdate, ClassQuizResponse,
    ClassProgressResponse, MessageResponse,
)

router = APIRouter(prefix="/classes", tags=["Classes"])


def _unique_class_code(db) -> str:
    for _ in range(10):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not list(db.collection("classes").where("code", "==", code).limit(1).stream()):
            return code
    raise RuntimeError("Không thể tạo mã lớp.")


# ══════════════════════════════════════════════════════════════
# TEACHER — lớp học
# ══════════════════════════════════════════════════════════════

@router.post("/", response_model=ClassResponse, status_code=201)
async def create_class(payload: ClassCreate, current_user: dict = Depends(require_teacher)):
    db = get_db()
    now = datetime.now(timezone.utc)
    data = {
        "name": payload.name.strip(),
        "description": payload.description or "",
        "code": _unique_class_code(db),
        "teacher_id": current_user["uid"],
        "teacher_name": current_user.get("display_name", ""),
        "created_at": now, "updated_at": now,
    }
    ref = db.collection("classes").document()
    ref.set(data)
    return ClassResponse(id=ref.id, **data)


@router.get("/my", response_model=list[ClassResponse])
async def get_my_classes(current_user: dict = Depends(require_teacher)):
    db = get_db()
    docs = db.collection("classes").where("teacher_id", "==", current_user["uid"]).stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        data["member_count"] = len(list(db.collection("class_members").where("class_id", "==", doc.id).stream()))
        data["quiz_count"] = len(list(db.collection("class_quizzes").where("class_id", "==", doc.id).stream()))
        result.append(ClassResponse(id=doc.id, **data))
    return result


@router.patch("/{class_id}", response_model=ClassResponse)
async def update_class(class_id: str, payload: ClassUpdate, current_user: dict = Depends(require_teacher)):
    db = get_db()
    ref = db.collection("classes").document(class_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    if doc.to_dict()["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc)
    ref.update(update)
    data = {**doc.to_dict(), **update, "id": class_id}
    data["member_count"] = len(list(db.collection("class_members").where("class_id", "==", class_id).stream()))
    data["quiz_count"] = len(list(db.collection("class_quizzes").where("class_id", "==", class_id).stream()))
    return ClassResponse(**data)


@router.delete("/{class_id}", response_model=MessageResponse)
async def delete_class(class_id: str, current_user: dict = Depends(require_teacher)):
    db = get_db()
    doc = db.collection("classes").document(class_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    if doc.to_dict()["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")
    for m in db.collection("class_members").where("class_id", "==", class_id).stream():
        m.reference.delete()
    for q in db.collection("class_quizzes").where("class_id", "==", class_id).stream():
        q.reference.delete()
    db.collection("classes").document(class_id).delete()
    return MessageResponse(message=f"Đã xóa lớp {class_id}.")


@router.get("/{class_id}/members", response_model=list[ClassMemberResponse])
async def get_class_members(class_id: str, current_user: dict = Depends(require_teacher)):
    db = get_db()
    doc = db.collection("classes").document(class_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    if doc.to_dict()["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")
    result = []
    for m in db.collection("class_members").where("class_id", "==", class_id).stream():
        data = m.to_dict()
        user_doc = db.collection("users").document(data["student_id"]).get()
        if user_doc.exists:
            u = user_doc.to_dict()
            data["display_name"] = u.get("display_name", "")
            data["email"] = u.get("email", "")
        result.append(ClassMemberResponse(id=m.id, **data))
    return result


@router.delete("/{class_id}/members/{student_id}", response_model=MessageResponse)
async def kick_member(class_id: str, student_id: str, current_user: dict = Depends(require_teacher)):
    db = get_db()
    doc = db.collection("classes").document(class_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    if doc.to_dict()["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")
    members = list(db.collection("class_members")
        .where("class_id", "==", class_id).where("student_id", "==", student_id).limit(1).stream())
    if not members:
        raise HTTPException(status_code=404, detail="Học sinh không có trong lớp.")
    members[0].reference.delete()
    return MessageResponse(message="Đã xóa học sinh khỏi lớp.")


# ══════════════════════════════════════════════════════════════
# TEACHER — giao quiz vào lớp (từ teacher_quizzes đã tạo sẵn)
# ══════════════════════════════════════════════════════════════

@router.post("/{class_id}/quizzes", response_model=ClassQuizResponse, status_code=201)
async def assign_quiz_to_class(
    class_id: str,
    payload: ClassQuizAssign,
    current_user: dict = Depends(require_teacher),
):
    """[Teacher] Giao quiz đã tạo sẵn vào lớp."""
    db = get_db()
    cls_doc = db.collection("classes").document(class_id).get()
    if not cls_doc.exists:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    if cls_doc.to_dict()["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")

    # Lấy thông tin teacher_quiz
    tq_doc = db.collection("teacher_quizzes").document(payload.teacher_quiz_id).get()
    if not tq_doc.exists:
        raise HTTPException(status_code=404, detail="Quiz không tồn tại.")
    tq = tq_doc.to_dict()
    if tq["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Quiz này không phải của bạn.")

    # Kiểm tra đã giao quiz này vào lớp chưa
    existing = list(
        db.collection("class_quizzes")
        .where("class_id", "==", class_id)
        .where("teacher_quiz_id", "==", payload.teacher_quiz_id)
        .limit(1).stream()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Quiz này đã được giao vào lớp rồi.")

    now = datetime.now(timezone.utc)
    data = {
        "class_id": class_id,
        "teacher_quiz_id": payload.teacher_quiz_id,
        "title": tq["title"],
        "num_questions": tq["num_questions"],
        "difficulty": tq["difficulty"],
        "time_limit_minutes": tq["time_limit_minutes"],
        "teacher_id": current_user["uid"],
        "assigned_at": now,
    }
    ref = db.collection("class_quizzes").document()
    ref.set(data)
    return ClassQuizResponse(id=ref.id, **data)


@router.get("/{class_id}/quizzes", response_model=list[ClassQuizResponse])
async def get_class_quizzes(class_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    cls_doc = db.collection("classes").document(class_id).get()
    if not cls_doc.exists:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    cls_data = cls_doc.to_dict()
    role = current_user.get("role")
    uid = current_user["uid"]

    if role == "teacher":
        if cls_data["teacher_id"] != uid:
            raise HTTPException(status_code=403, detail="Không có quyền.")
    else:
        members = list(db.collection("class_members")
            .where("class_id", "==", class_id).where("student_id", "==", uid).limit(1).stream())
        if not members:
            raise HTTPException(status_code=403, detail="Bạn không thuộc lớp này.")

    docs = db.collection("class_quizzes").where("class_id", "==", class_id).stream()
    result = []
    for d in docs:
        data = d.to_dict()
        # Tương thích ngược: doc cũ dùng document_id thay vì teacher_quiz_id
        if "teacher_quiz_id" not in data:
            data["teacher_quiz_id"] = data.get("document_id", "")
        result.append(ClassQuizResponse(id=d.id, **data))
    return result


@router.patch("/{class_id}/quizzes/{quiz_id}", response_model=ClassQuizResponse)
async def update_class_quiz(
    class_id: str, quiz_id: str,
    payload: ClassQuizUpdate,
    current_user: dict = Depends(require_teacher),
):
    """[Teacher] Đổi tên hiển thị quiz trong lớp."""
    db = get_db()
    ref = db.collection("class_quizzes").document(quiz_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Quiz không tồn tại.")
    data = doc.to_dict()
    if data["class_id"] != class_id or data["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    ref.update(update)
    return ClassQuizResponse(id=quiz_id, **{**data, **update})


@router.delete("/{class_id}/quizzes/{quiz_id}", response_model=MessageResponse)
async def remove_quiz_from_class(class_id: str, quiz_id: str, current_user: dict = Depends(require_teacher)):
    db = get_db()
    doc = db.collection("class_quizzes").document(quiz_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Quiz không tồn tại.")
    data = doc.to_dict()
    if data["class_id"] != class_id or data["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")
    db.collection("class_quizzes").document(quiz_id).delete()
    return MessageResponse(message="Đã xóa quiz khỏi lớp.")


@router.get("/{class_id}/progress", response_model=list[ClassProgressResponse])
async def get_class_progress(class_id: str, current_user: dict = Depends(require_teacher)):
    """[Teacher] Xem tiến độ học sinh."""
    db = get_db()
    cls_doc = db.collection("classes").document(class_id).get()
    if not cls_doc.exists:
        raise HTTPException(status_code=404, detail="Lớp không tồn tại.")
    if cls_doc.to_dict()["teacher_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Không có quyền.")

    class_quizzes = {d.id: d.to_dict() for d in
        db.collection("class_quizzes").where("class_id", "==", class_id).stream()}
    members = list(db.collection("class_members").where("class_id", "==", class_id).stream())

    result = []
    for m in members:
        student_id = m.to_dict()["student_id"]
        user_doc = db.collection("users").document(student_id).get()
        user = user_doc.to_dict() if user_doc.exists else {}

        completed, total_score, count = [], 0, 0
        for cq_id, cq in class_quizzes.items():
            results = list(
                db.collection("quiz_results")
                .where("user_id", "==", student_id)
                .where("class_quiz_id", "==", cq_id)
                .where("status", "==", "completed")
                .limit(1).stream()
            )
            if results:
                r = results[0].to_dict()
                score = r.get("score", 0) or 0
                total_score += score
                count += 1
                completed.append({
                    "class_quiz_id": cq_id,
                    "title": cq.get("title", ""),
                    "score": score,
                    "completed_at": r.get("completed_at"),
                })

        result.append(ClassProgressResponse(
            student_id=student_id,
            display_name=user.get("display_name", ""),
            email=user.get("email", ""),
            total_quizzes=len(class_quizzes),
            completed_quizzes=count,
            avg_score=round(total_score / count, 2) if count > 0 else None,
            quiz_details=completed,
        ))
    return result


# ══════════════════════════════════════════════════════════════
# STUDENT — tham gia lớp
# ══════════════════════════════════════════════════════════════

@router.post("/join", response_model=MessageResponse)
async def join_class(code: str = Query(...), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Chỉ học sinh mới có thể tham gia lớp.")
    db = get_db()

    # Kiểm tra học sinh đã tham gia lớp nào chưa — chỉ cho vào 1 lớp
    already_in = list(db.collection("class_members")
        .where("student_id", "==", current_user["uid"]).limit(1).stream())
    if already_in:
        raise HTTPException(status_code=400, detail="Bạn đã tham gia 1 lớp rồi. Hãy rời lớp hiện tại trước khi tham gia lớp mới.")

    classes = list(db.collection("classes").where("code", "==", code.upper()).limit(1).stream())
    if not classes:
        raise HTTPException(status_code=404, detail="Mã lớp không tồn tại. Kiểm tra lại mã.")
    class_id = classes[0].id

    db.collection("class_members").document().set({
        "class_id": class_id,
        "student_id": current_user["uid"],
        "joined_at": datetime.now(timezone.utc),
    })
    return MessageResponse(message=f"Đã tham gia lớp '{classes[0].to_dict()['name']}' thành công.")


@router.get("/joined", response_model=list[ClassResponse])
async def get_joined_classes(current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = []
    for m in db.collection("class_members").where("student_id", "==", current_user["uid"]).stream():
        class_id = m.to_dict()["class_id"]
        cls_doc = db.collection("classes").document(class_id).get()
        if cls_doc.exists:
            data = cls_doc.to_dict()
            data["member_count"] = len(list(db.collection("class_members").where("class_id", "==", class_id).stream()))
            data["quiz_count"] = len(list(db.collection("class_quizzes").where("class_id", "==", class_id).stream()))
            result.append(ClassResponse(id=class_id, **data))
    return result


@router.delete("/leave/{class_id}", response_model=MessageResponse)
async def leave_class(class_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    members = list(db.collection("class_members")
        .where("class_id", "==", class_id).where("student_id", "==", current_user["uid"]).limit(1).stream())
    if not members:
        raise HTTPException(status_code=404, detail="Bạn không thuộc lớp này.")
    members[0].reference.delete()
    return MessageResponse(message="Đã rời lớp thành công.")