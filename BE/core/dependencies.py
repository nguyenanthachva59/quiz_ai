from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from core.firebase import get_db

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials

    print("TOKEN PREFIX:", token[:30], "...")

    try:
        decoded = auth.verify_id_token(token, clock_skew_seconds=10)
        print("TOKEN DECODED UID:", decoded.get("uid"))
        print("TOKEN AUD:", decoded.get("aud"))
        print("TOKEN ISS:", decoded.get("iss"))
    except Exception as e:
        print("Firebase verify_id_token ERROR:", repr(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token không hợp lệ hoặc đã hết hạn. Lỗi thật: {str(e)}",
        )

    uid = decoded["uid"]
    db = get_db()
    user_doc = db.collection("users").document(uid).get()

    if not user_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại trong hệ thống.",
        )

    user_data = user_doc.to_dict()
    user_data["uid"] = uid
    return user_data


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện thao tác này.",
        )
    return current_user