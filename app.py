import streamlit as st
import os
import tempfile
import cv2  # OpenCV kütüphanesi
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector

# --- Çekirdek İşlem Fonksiyonu ---

def extract_smart_frames(video_path, output_dir, threshold=27.0):
    """
    Bir videoyu işler, PySceneDetect ile akıllı sahne geçişlerini bulur
    ve OpenCV kullanarak bu sahnelerin BAŞLANGIÇ karelerini kaydeder.

    Dönen Değer: (kaydedilen_resim_yolu, zaman_damgası_str) listesi
    """
    
    # 1. Videoyu PySceneDetect'in VideoManager'ına yükle
    video_manager = VideoManager([video_path])
    
    # 2. SceneManager'ı kur
    scene_manager = SceneManager()
    
    # 3. "Akıllı" kısmı ekle: ContentDetector
    # Bu dedektör, karelerin içeriğindeki (renk/yapı) değişime bakar.
    # threshold: Değişim hassasiyeti. Düşükse daha fazla, yüksekse daha az sahne bulur.
    scene_manager.add_detector(ContentDetector(threshold=threshold))
    
    # 4. Performans Optimizasyonu (ÇOK ÖNEMLİ)
    # 2 saatlik videoyu işlemek için videoyu analizden önce küçültürüz.
    # Bu, işlemi 100 kattan fazla hızlandırır!
    video_manager.set_downscale_factor()
    
    # 5. Videoyu başlat ve sahneleri algıla
    video_manager.start()
    scene_manager.detect_scenes(frame_source=video_manager)
    scene_list = scene_manager.get_scene_list()
    
    saved_frames_info = []
    
    if not scene_list:
        print("Hiç sahne bulunamadı.")
        video_manager.release()
        return []

    print(f"Toplam {len(scene_list)} sahne bulundu.")
    
    # 6. OpenCV ile kareleri kaydetme
    cap = cv2.VideoCapture(video_path)
    
    for i, scene in enumerate(scene_list):
        # Her sahnenin başlangıç karesinin numarasını ve zamanını al
        start_frame_num = scene[0].get_frames()
        start_time_str = scene[0].get_timecode()
        
        # OpenCV'ye "videonun tam bu karesine git" komutunu ver
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame_num)
        
        # O kareyi oku
        ret, frame = cap.read()
        
        if ret:
            # Resim dosyasını adlandır (zaman damgası içerir)
            image_filename = f"scene_{i+1:03d}_at_{start_time_str.replace(':', '.').replace('.', '_')}.jpg"
            image_path = os.path.join(output_dir, image_filename)
            
            # Kareyi resim dosyası olarak diske kaydet
            cv2.imwrite(image_path, frame)
            
            # Bilgileri listeye ekle
            saved_frames_info.append((image_path, start_time_str))

    # Tüm kaynakları serbest bırak
    cap.release()
    video_manager.release()
    
    return saved_frames_info

# --- Streamlit Arayüzü ---

st.set_page_config(layout="wide") # Sayfayı genişlet
st.title("Akıllı Video Görsel Özetleyici 🎬")
st.write("Bir video yükleyin, o videonun genel akışını gösteren anahtar kareleri (sahneleri) sizin için çıkaralım.")
st.markdown("---")

# 1. Çıktı kareleri için klasör oluştur
OUTPUT_DIR = "video_ozetleri"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# 2. Video yükleme aracı
uploaded_file = st.file_uploader(
    "Videonuzu buraya sürükleyin veya seçin (mp4, avi, mkv)", 
    type=["mp4", "avi", "mkv", "mov"]
)

# 3. Hassasiyet ayarı
st.sidebar.header("Ayarlar")
# threshold'u sidebar'dan ayarlanabilir yaptık
scene_threshold = st.sidebar.slider(
    "Sahne Algılama Hassasiyeti",
    min_value=15.0,
    max_value=50.0,
    value=27.0, # Varsayılan değer
    help="Düşük değer = Daha fazla (hassas) sahne bulur. Yüksek değer = Daha az (sadece büyük) sahne bulur."
)

if uploaded_file is not None:
    # Yüklenen dosyayı geçici bir yere kaydetmeliyiz ki
    # OpenCV ve PySceneDetect onu bir dosya yolu olarak okuyabilsin.
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmpfile:
        tmpfile.write(uploaded_file.getvalue())
        video_filepath = tmpfile.name
    
    # Videoyu arayüzde göster
    st.video(video_filepath)
    
    # "İşle" butonu
    if st.button("Görsel Özeti Oluştur"):
        # İşlem sırasında dönen bir "spinner" göster
        with st.spinner(f"Video işleniyor... Bu işlem videonun uzunluğuna ({uploaded_file.size / 1024 / 1024:.1f} MB) bağlı olarak zaman alabilir..."):
            try:
                # Çekirdek fonksiyonumuzu çağır
                frames_info = extract_smart_frames(video_filepath, OUTPUT_DIR, threshold=scene_threshold)
                
                if not frames_info:
                    st.warning("Bu videoda belirgin bir sahne değişikliği bulunamadı. (Hassasiyeti düşürmeyi deneyin)")
                else:
                    st.success(f"Video başarıyla işlendi! Toplam {len(frames_info)} anahtar kare bulundu.")
                    st.markdown("---")
                    
                    # 4. Galeriyi oluşturma
                    st.header("Görsel Özet Galerisi")
                    
                    # Kareleri 5'li sütunlar halinde göster
                    num_columns = 5
                    cols = st.columns(num_columns)
                    
                    for i, (img_path, timestamp) in enumerate(frames_info):
                        col = cols[i % num_columns]
                        with col:
                            st.image(img_path, caption=f"Zaman: {timestamp}")

            except Exception as e:
                st.error(f"Video işlenirken bir hata oluştu: {e}")
            
            finally:
                # Geçici videoyu sil
                os.unlink(video_filepath)