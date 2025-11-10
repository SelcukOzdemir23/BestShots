from fastapi import APIRouter, File, UploadFile, BackgroundTasks, Form
from fastapi.responses import JSONResponse
import aiofiles
import uuid  # Benzersiz dosya adları için
from pathlib import Path
from typing import Any
from ..core.video_processor import process_video_scenes, SceneCapture

router = APIRouter()

# Geçici yüklemeler ve statik sonuçlar için klasörler
APP_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = APP_DIR / "uploads"
STATIC_DIR = APP_DIR / "static"  # Sonuç görselleri buraya

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# İŞ DURUMUNU TAKİP ETMEK İÇİN (Basit bir yöntem)
# Profesyonel sistemde burası Redis veya veritabanı olur
jobs_db: dict[str, dict[str, Any]] = {}


def run_scene_detection_task(job_id: str, video_path: str, threshold: float):
    """Arka planda çalışacak olan ağır iş fonksiyonu"""
    print(f"İş {job_id} başlıyor. Video: {video_path}")
    source_path = Path(video_path)
    try:
        image_paths: list[SceneCapture] = process_video_scenes(str(source_path), str(STATIC_DIR), threshold=threshold)
        
        # İşi veritabanında "tamamlandı" olarak işaretle
        jobs_db[job_id] = {
            "status": "completed",
            "images": image_paths,
            "settings": {"threshold": threshold},
        }
        print(f"İş {job_id} tamamlandı.")
        
        # Geçici video dosyasını sil
        source_path.unlink(missing_ok=True)
        
    except Exception as e:
        jobs_db[job_id] = {
            "status": "failed",
            "error": str(e),
            "settings": {"threshold": threshold},
        }
        print(f"İş {job_id} hata verdi: {e}")


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    threshold: float = Form(12.0),
):
    """
    Video yükler, diske kaydeder ve AĞIR İŞLEMİ ARKA PLANA atar.
    Kullanıcıya anında bir "iş takip ID'si" döndürür.
    """
    
    # Videoyu RAM'e değil, doğrudan diske kaydet (büyük dosyalar için kritik)
    safe_filename = str(uuid.uuid4()) + "_" + file.filename
    video_path = UPLOAD_DIR / safe_filename
    
    try:
        async with aiofiles.open(video_path, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # 1MB'lık parçalarla oku
                await out_file.write(content)
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Dosya yüklenemedi: {e}"})

    # Yeni bir iş ID'si oluştur
    job_id = str(uuid.uuid4())
    jobs_db[job_id] = {
        "status": "processing",
        "filename": file.filename,
        "settings": {"threshold": threshold},
    }

    # Ağır işi arka plana ata (kullanıcıyı bekletme!)
    background_tasks.add_task(run_scene_detection_task, job_id, str(video_path), threshold)

    # Kullanıcıya hemen yanıt dön
    return {"message": "Video yüklendi, işleme başladı.", "job_id": job_id}


@router.get("/status/{job_id}")
def get_job_status(job_id: str):
    """
    React arayüzü bu endpoint'i periyodik olarak çağırarak
    işin durumunu (processing, completed, failed) kontrol eder.
    """
    job = jobs_db.get(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"message": "İş bulunamadı."})
    
    return job