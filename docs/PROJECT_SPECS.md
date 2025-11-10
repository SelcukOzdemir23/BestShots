# PROJE SPESİFİKASYONLARI: BestShots

**Tarih:** 10 Kasım 2025
**Versiyon:** 1.0

## 1. Proje Vizyonu ve Amacı

Projenin temel amacı, kullanıcıların uzun video dosyalarını (örn. 2 saatlik bir ders, 1GB+ ham video) sisteme yükleyerek, bu videonun içeriğini temsil eden "kilit sahne" görsellerinden oluşan bir özet galeri elde etmelerini sağlamaktır.

Bu, "videoyu hızlıca tarama" (video scrubbing) ihtiyacını ortadan kaldırır ve içeriğin anında anlaşılmasına olanak tanır.

## 2. Kullanıcı Senaryoları (User Stories)

**Kullanıcı (Agent):** İçerik Yöneticisi / Video Editörü / Öğrenci

1.  **Senaryo - Video Yükleme:**
    * **Kullanıcı olarak,** 2GB boyutunda bir `.mp4` video dosyasını sisteme yüklemek istiyorum.
    * **Kullanıcı olarak,** yükleme sırasında bir ilerleme çubuğu (progress bar) görmek istiyorum, böylece işlemin ne kadar tamamlandığını anlayabilirim.
    * **Kullanıcı olarak,** dosyam yüklenirken tarayıcının veya sayfanın kilitlenmemesini istiyorum.

2.  **Senaryo - İşleme Takibi:**
    * **Kullanıcı olarak,** dosyam yüklendikten sonra (ağır bir işlem olduğu için) videonun "işlendiğini" belirten bir geri bildirim (örn. "İşleniyor...") görmek istiyorum.
    * **Kullanıcı olarak,** işlem tamamlandığında veya bir hata oluştuğunda net bir bildirim almak istiyorum.

3.  **Senaryo - Sonuçları Görüntüleme:**
    * **Kullanıcı olarak,** işlem tamamlandığında, videomdan çıkarılan tüm kilit sahne görsellerini bir galeri şeklinde görmek istiyorum.
    * **Kullanıcı olarak,** bu görsellerden herhangi birine tıklayarak daha büyük bir versiyonunu yeni bir sekmede açabilmek istiyorum.

## 3. Teknik Gereksinimler

### 3.1. Fonksiyonel Olmayan Gereksinimler (Non-Functional)

* **Asenkronizasyon:** 2GB'lık bir videonun işlenmesi dakikalar sürebilir. HTTP isteği (request) bu kadar uzun süre açık kalamaz. Sistem, yüklemeyi aldıktan sonra *anında* bir "iş takip ID'si" (`job_id`) dönmeli ve asıl işlemi (video analizi) arka planda başlatmalıdır.
* **Ölçeklenebilirlik (Dosya Yönetimi):** Yüklenen video dosyası asla tamamen RAM'e (belleğe) okunmamalıdır. Doğrudan diske "streaming" (parça parça) yöntemiyle yazılmalıdır.
* **Hata Yönetimi:** Video dosyası bozuksa, `scenedetect` hata verirse veya disk dolarsa, iş (job) durumu "failed" (başarısız) olarak güncellenmeli ve kullanıcıya bir hata mesajı gösterilmelidir.
* **CORS (Cross-Origin):** Backend (`localhost:8000`) ve Frontend (`localhost:5173`) farklı portlarda çalışacağı için Backend, Frontend'den gelen isteklere izin vermelidir (CORS Middleware).

### 3.2. Backend Gereksinimleri (FastAPI)

* **Çerçeve (Framework):** FastAPI (performans ve asenkron destek için).
* **Çekirdek Kütüphane:** `scenedetect` (ContentDetector algoritması kullanılacak).
* **Dosya İşleme:** `python-multipart` ve `aiofiles` kütüphaneleri (büyük dosyaların asenkron yüklenmesi için).
* **İş Takibi:** (Şu anki V1 için) Basit bir Python dictionary (`jobs_db`) kullanılacaktır. (V2'de bu Redis veya Celery/RabbitMQ ile değiştirilebilir).
* **Geçici Depolama:** Yüklenen videolar için `/backend/app/uploads` klasörü, işlenmiş görseller için `/backend/app/static` klasörü kullanılacaktır.
* **Güvenlik:** Yüklenen dosyaların adları, çakışmayı ve güvenlik risklerini önlemek için `uuid` ile yeniden adlandırılmalıdır.

### 3.3. Frontend Gereksinimleri (React + TS)

* **Çerçeve (Framework):** React (Vite ile) + TypeScript.
* **API İstemcisi:** `axios` (yükleme ilerlemesini (`onUploadProgress`) desteklediği için tercih edilmiştir).
* **Durum Yönetimi (State Management):**
    * Uygulamanın `UploadStatus` adında bir ana durumu olmalıdır: `'idle'`, `'uploading'`, `'processing'`, `'completed'`, `'failed'`.
    * Arayüz, bu duruma göre dinamik olarak değişmelidir (örn. `processing` ise spinner göster, `completed` ise galeriyi göster).
* **Sorgulama (Polling):** `status` `'processing'` olduğunda, Frontend `setInterval` kullanarak her 3 saniyede bir Backend'in `/api/v1/status/{job_id}` endpoint'ine istek atarak işin durumunu sorgulamalıdır.

## 4. API Spesifikasyonu ("Sözleşme")

Bu, Frontend ve Backend ekiplerinin üzerinde anlaştığı "sözleşmedir".

---

### `POST /api/v1/upload`

Video yükleme endpoint'i.

* **Request (Gövde):** `multipart/form-data`
    * `file`: Yüklenecek video dosyası.
* **Response (Başarılı - 200 OK):**
    ```json
    {
      "message": "Video yüklendi, işleme başladı.",
      "job_id": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8"
    }
    ```
* **Response (Hata - 500):**
    ```json
    { "message": "Dosya yüklenemedi: Hata detayı" }
    ```

---

### `GET /api/v1/status/{job_id}`

Bir işin (job) durumunu sorgulama endpoint'i.

* **Request (Parametre):**
    * `job_id` (string): Yükleme sonrası dönen `uuid`.
* **Response (İşleniyor):**
    ```json
    {
      "status": "processing",
      "filename": "orijinal_dosya_adi.mp4"
    }
    ```
* **Response (Tamamlandı):**
        ```json
        {
            "status": "completed",
            "images": [
                {
                    "path": "static/a1b2c3d4_at_00-00-05_120.png",
                    "timestamp": "00:00:05.120",
                    "frame": 128
                },
                {
                    "path": "static/a1b2c3d4_at_00-00-12_640.png",
                    "timestamp": "00:00:12.640",
                    "frame": 321
                }
            ]
        }
        ```
* **Response (Başarısız):**
    ```json
    {
      "status": "failed",
      "error": "Video dosyası işlenemedi veya bozuk."
    }
    ```
* **Response (Bulunamadı - 404):**
    ```json
    { "message": "İş bulunamadı." }
    ```