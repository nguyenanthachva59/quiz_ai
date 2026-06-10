from http.client import HTTPException
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore, auth
from firebase_admin import auth, firestore
_firebase_app = None
_db = None

def verify_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_db() -> firestore.Client:
    """Kết nối Firestore"""
    if _db is None:
        raise RuntimeError("Firebase chưa được khởi tạo. Gọi init_firebase() trước.")
    return _db


def init_firebase():
    global _firebase_app, _db

    if _firebase_app:
        return

    base_dir = Path(__file__).resolve().parents[1]
    service_key_path = base_dir / "serviceAccountKey.json"

    if not service_key_path.exists():
        raise RuntimeError(f"Không tìm thấy serviceAccountKey.json tại: {service_key_path}")

    print(f"Đang dùng Firebase key tại: {service_key_path}")

    cred = credentials.Certificate(str(service_key_path))
    _firebase_app = firebase_admin.initialize_app(cred)
    _db = firestore.client()

    print("Firebase Admin đã khởi tạo thành công.")


def get_db() -> firestore.Client:
    if _db is None:
        raise RuntimeError("Firebase chưa được khởi tạo. Gọi init_firebase() trước.")
    return _db


def get_auth():
    return auth