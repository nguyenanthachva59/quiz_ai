from fastapi import APIRouter, HTTPException, Depends
from firebase_admin import auth
from datetime import datetime, timezone
from core.firebase import get_db
from core.dependencies import get_current_user
from models.schemas import UserCreate, UserResponse, MessageResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(payload: UserCreate):
    """
    Tạo tài khoản Firebase Auth + document Firestore.
    Frontend cần gọi endpoint này sau khi tự tạo user bằng Firebase Client SDK
    nếu muốn, hoặc dùng endpoint này để tạo qua Admin SDK.
    """
    db = get_db()
    try:
        fb_user = auth.create_user(
            email=payload.email,
            password=payload.password,
            display_name=payload.display_name,
        )
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email đã được đăng ký.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    user_data = {
        "email": payload.email,
        "display_name": payload.display_name,
        "role": payload.role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    db.collection("users").document(fb_user.uid).set(user_data)

    return UserResponse(uid=fb_user.uid, **user_data)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Lấy thông tin người dùng đang đăng nhập."""
    return UserResponse(**current_user)


@router.post("/sync-user", response_model=UserResponse, status_code=201)
async def sync_user(current_user: dict = Depends(get_current_user)):
    """
    Đồng bộ user từ Firebase Auth sang Firestore.
    Gọi sau khi đăng nhập bằng Google/Email từ client.
    """
    uid = current_user["uid"]
    db = get_db()

    # Kiểm tra đã có trong Firestore chưa
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        data = doc.to_dict()
        data["uid"] = uid
        return UserResponse(**data)

    # Tạo mới nếu chưa có
    fb_user = auth.get_user(uid)
    user_data = {
        "email": fb_user.email or "",
        "display_name": fb_user.display_name or fb_user.email or "",
        "role": "student",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    db.collection("users").document(uid).set(user_data)
    return UserResponse(uid=uid, **user_data)
