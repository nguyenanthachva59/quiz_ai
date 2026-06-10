from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path
import logging
import traceback

from core.config import get_settings
from core.firebase import init_firebase
from routers import auth, documents, questions, quiz, admin

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_firebase()
    Path(settings.upload_dir).mkdir(exist_ok=True)
    print("✅ Firebase đã kết nối thành công")
    print(f"✅ Thư mục upload: {settings.upload_dir}")
    yield
    print("⏹️  Server đang dừng...")


settings = get_settings()

app = FastAPI(
    title="QuizAI Tin học THPT - API",
    version="1.0.0",
    lifespan=lifespan,
)

# ✅ Thêm middleware bắt lỗi — phải đặt TRƯỚC CORS
@app.middleware("http")
async def log_exceptions(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"❌ Unhandled exception: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(questions.router)
app.include_router(quiz.router)
app.include_router(admin.router)

uploads_path = Path(settings.upload_dir)
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


@app.get("/", tags=["Health"])
async def root():
    return {"message": "QuizAI Tin học THPT API đang chạy 🚀", "docs": "/docs"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}