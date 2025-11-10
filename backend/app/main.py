from fastapi import FastAPI
# YENİ EKLENENLER:
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
# ---
from .routers import video

app = FastAPI(
    title="BestShots API",
    description="Videolardan akıllı sahne özetleri çıkaran bir API.",
    version="1.0.0"
)

# --- YENİ EKLENEN BÖLÜM (CORS) ---
# Tarayıcının (React) bu API'ye erişmesine izin ver.
# "*" tüm kaynaklara izin verir, bu da "OPTIONS" sorununu çözer.
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Tüm metotlara (GET, POST, OPTIONS vb.) izin ver
    allow_headers=["*"], # Tüm başlıklara izin ver
)
# --- CORS BÖLÜMÜ SONU ---


# --- YENİ EKLENEN BÖLÜM (Static Files) ---
# "static" klasörünü dışarıya sun ki React resimleri görebilsin.
# (app klasörünün içindeki "static" klasörünü hedefler)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# Bu satır, http://localhost:8000/static/dosya.png isteklerine
# "static_dir" klasöründen yanıt verilmesini sağlar.
app.mount("/static", StaticFiles(directory=static_dir), name="static")
# --- STATIC FILES BÖLÜMÜ SONU ---


# /video URL'sini video.py dosyasındaki router'a bağla
app.include_router(video.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "BestShots API'ye hoş geldiniz!"}