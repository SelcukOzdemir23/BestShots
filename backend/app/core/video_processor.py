import os
import re
import unicodedata
from pathlib import Path
from typing import TypedDict
from urllib.parse import quote
import cv2
import scenedetect
from scenedetect import SceneManager
from scenedetect.detectors import ContentDetector


class SceneCapture(TypedDict):
    path: str
    timestamp: str
    frame: int


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    cleaned = re.sub(r'[^A-Za-z0-9_-]+', '_', normalized)
    cleaned = cleaned.strip('_')
    return cleaned or 'video'


def _format_timestamp(total_seconds: float) -> str:
    total_milliseconds = int(round(total_seconds * 1000))
    milliseconds = total_milliseconds % 1000
    total_seconds = total_milliseconds // 1000
    seconds = total_seconds % 60
    total_minutes = total_seconds // 60
    minutes = total_minutes % 60
    hours = total_minutes // 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"


def _fallback_captures(
    video_path: str,
    output_path: Path,
    base_file_name: str,
) -> list[SceneCapture]:
    captures: list[SceneCapture] = []
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        cap.release()
        return captures

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    if total_frames <= 0:
        cap.release()
        return captures

    sample_ratios = [0.1, 0.5, 0.9]
    frame_indices = sorted({int(total_frames * ratio) for ratio in sample_ratios})

    for frame_no in frame_indices:
        frame_no = max(0, min(frame_no, total_frames - 1))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        success, frame = cap.read()

        if not success or frame is None:
            continue

        timestamp_display = _format_timestamp(frame_no / fps)
        timestamp_slug = timestamp_display.replace(':', '-').replace('.', '_')
        image_name = f"{base_file_name}_fallback_{timestamp_slug}.png"
        image_path = output_path / image_name

        if not cv2.imwrite(str(image_path), frame):
            continue

        encoded_name = quote(image_name)
        captures.append(
            {
                "path": f"static/{encoded_name}",
                "timestamp": timestamp_display,
                "frame": frame_no,
            }
        )

    cap.release()
    return captures


def process_video_scenes(video_path: str, output_dir: str, threshold: float = 12.0) -> list[SceneCapture]:
    """
    Bir videoyu işler, sahneleri tespit eder ve her sahnenin
    orta karesini PNG olarak kaydeder. 'threshold' değeri sahne
    algılama hassasiyetini kontrol eder; düşük değer daha fazla
    sahnenin seçilmesine yol açar. Her görüntü için statik
    dosya yolu ve zaman damgası bilgisi içeren sözlükler döndürür.
    Hata durumunda bir exception fırlatır.
    """
    
    video = None
    try:
        output_path = Path(output_dir).resolve()
        video = scenedetect.open_video(video_path)

        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=threshold))
        raw_base = os.path.basename(video_path).rsplit('.', 1)[0]
        base_file_name = _slugify(raw_base)

        scene_manager.detect_scenes(frame_source=video)
        scene_list = scene_manager.get_scene_list()

        print(f"Toplam {len(scene_list)} sahne bulundu.")

        output_path.mkdir(parents=True, exist_ok=True)

        captures: list[SceneCapture] = []

        # Her sahnenin orta karesini kaydet
        for i, scene in enumerate(scene_list):
            start_frame = scene[0].get_frames()
            end_frame = scene[1].get_frames()
            middle_frame = start_frame + (end_frame - start_frame) // 2
            middle_seconds = scene[0].get_seconds() + (scene[1].get_seconds() - scene[0].get_seconds()) / 2

            seek_ok = video.seek(middle_frame)
            if seek_ok is False:
                print(f"Uyarı: Sahne {i+1} için {middle_frame}. kareye gidilemedi.")
                continue

            frame_data = video.read()

            if frame_data is not False and frame_data is not None:
                timestamp_display = _format_timestamp(middle_seconds)
                timestamp_slug = timestamp_display.replace(':', '-').replace('.', '_')
                image_name = f"{base_file_name}_at_{timestamp_slug}.png"
                image_path = output_path / image_name

                success = cv2.imwrite(str(image_path), frame_data)
                if not success:
                    print(f"Uyarı: {image_name} yazılamadı.")
                    continue

                encoded_name = quote(image_name)
                captures.append(
                    {
                        "path": f"static/{encoded_name}",
                        "timestamp": timestamp_display,
                        "frame": middle_frame,
                    }
                )
            else:
                print(f"Uyarı: Sahne {i+1} için {middle_frame}. kare okunamadı.")

        if captures:
            return captures

        print("Hiç sahne bulunamadı, yedek kareler seçiliyor.")
        fallback = _fallback_captures(video_path, output_path, base_file_name)
        return fallback

    except Exception as e:
        print(f"video_processor içinde KÖTÜ HATA oluştu: {e}")
        raise e
    finally:
        if video is not None:
            try:
                video.release()  # VideoStreamCv2 'with' desteklemez, kaynağı manuel kapat.
            except AttributeError:
                pass