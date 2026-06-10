import uuid
import aiofiles
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from core.firebase import get_db
from core.dependencies import get_current_user
from core.config import get_settings
from models.schemas import DocumentResponse, MessageResponse

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}


def _process_document_bg(doc_id: str, file_path: str):
    """Background task: đánh dấu document là 'done' sau khi lưu xong."""
    db = get_db()
    db.collection("documents").document(doc_id).update({
        "status": "done",
        "processed_at": datetime.now(timezone.utc),
    })


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload tài liệu học tập (PDF, DOCX, TXT). Tối đa 10MB."""
    settings = get_settings()

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Chỉ chấp nhận file PDF, DOCX hoặc TXT.",
        )

    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File vượt quá giới hạn {settings.max_file_size_mb}MB.",
        )

    # Lưu file
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(exist_ok=True)

    doc_id = str(uuid.uuid4())
    suffix = Path(file.filename or "file.txt").suffix
    save_path = upload_dir / f"{doc_id}{suffix}"

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(content)

    # Lưu metadata vào Firestore
    db = get_db()
    doc_data = {
        "user_id": current_user["uid"],
        "file_name": file.filename,
        "file_path": str(save_path),
        "file_size": len(content),
        "status": "processing",
        "created_at": datetime.now(timezone.utc),
    }
    db.collection("documents").document(doc_id).set(doc_data)

    # Xử lý nền
    background_tasks.add_task(_process_document_bg, doc_id, str(save_path))

    return DocumentResponse(id=doc_id, **doc_data)


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(current_user: dict = Depends(get_current_user)):
    """Lấy danh sách tài liệu của người dùng hiện tại."""
    db = get_db()
    docs = (
        db.collection("documents")
        .where("user_id", "==", current_user["uid"])
        .order_by("created_at", direction="DESCENDING")
        .stream()
    )
    result = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        result.append(DocumentResponse(**data))
    return result


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Lấy thông tin một tài liệu."""
    db = get_db()
    doc = db.collection("documents").document(doc_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")

    data = doc.to_dict()
    if data["user_id"] != current_user["uid"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem tài liệu này.")

    data["id"] = doc_id
    return DocumentResponse(**data)


@router.delete("/{doc_id}", response_model=MessageResponse)
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Xóa tài liệu (chủ sở hữu hoặc admin)."""
    db = get_db()
    doc = db.collection("documents").document(doc_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")

    data = doc.to_dict()
    if data["user_id"] != current_user["uid"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa tài liệu này.")

    # Xóa file vật lý
    file_path = Path(data.get("file_path", ""))
    if file_path.exists():
        file_path.unlink()

    db.collection("documents").document(doc_id).delete()
    return MessageResponse(message="Đã xóa tài liệu thành công.")
