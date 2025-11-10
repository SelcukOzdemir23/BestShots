# 🎥 BestShots - Akıllı Video Sahne Çıkarıcı

**BestShots**, uzun video dosyalarını analiz eden ve videonun tamamını izlemeye gerek kalmadan içeriği özetleyen en önemli "kilit sahneleri" otomatik olarak çıkaran bir web uygulamasıdır.

Arka planda Python, `scenedetect` ve FastAPI, ön yüzde ise React (TypeScript) ve Vite kullanan modern ve ölçeklenebilir bir mimariye sahiptir.

![BestShots Demo](https://via.placeholder.com/800x400.gif?text=Buraya+Uygulama+GIF'i+Eklenecek)

---

## ✨ Temel Özellikler

* **Büyük Dosya Desteği:** 2GB+ videoları bile RAM'i tıkamadan, verimli bir şekilde işler.
* **Asenkron İşleme:** Videolar arka planda işlenirken kullanıcı arayüzü kilitlenmez.
* **Durum Takibi:** Gerçek zamanlıya yakın iş (job) durumu takibi (Yükleniyor, İşleniyor, Tamamlandı).
* **İçerik Odaklı Tespit:** `scenedetect` kullanarak videodaki gerçek görsel değişikliklere (kesme, sahne değişimi) dayalı kareler seçer.
* **Modern Arayüz:** React, TypeScript ve Vite ile oluşturulmuş hızlı ve duyarlı bir kullanıcı arayüzü.

---

## 🛠 Teknoloji Yığını

* **Backend:**
    * Python 3.11+
    * FastAPI (Asenkron API framework'ü)
    * Uvicorn (ASGI Sunucusu)
    * Scenedetect (Çekirdek video analiz kütüphanesi)
    * OpenCV-Python (Video işleme)
* **Frontend:**
    * React 18+
    * TypeScript
    * Vite (Modern build aracı)
    * Axios (API istemcisi)
* **Mimari:**
    * Frontend ve Backend'in ayrıştırılması (Decoupled)
    * Durum sorgulama (Polling) tabanlı asenkron iletişim

---

## 🚀 Kurulum ve Çalıştırma

Bu projeyi yerel makinenizde çalıştırmak için iki ayrı terminale ihtiyacınız olacaktır.

### Gereksinimler

* Python (3.11 veya üstü)
* Node.js (v18 veya üstü) ve npm

### 1. Backend Kurulumu (`/backend` klasörü)

1.  Backend klasörüne gidin ve sanal ortamı oluşturun:
    ```bash
    cd backend
    python -m venv .venv
    ```

2.  Sanal ortamı aktifleştirin:
    * Windows: `.venv\Scripts\Activate`
    * MacOS/Linux: `source .venv/bin/activate`

3.  Gereksinimleri yükleyin:
    ```bash
    pip install -r requirements.txt
    ```

4.  FastAPI sunucusunu başlatın:
    ```bash
    uvicorn app.main:app --reload
    ```
    *Sunucu `http://localhost:8000` adresinde çalışacaktır.*

### 2. Frontend Kurulumu (`/frontend` klasörü)

1.  Yeni bir terminal açın ve `frontend` klasörüne gidin:
    ```bash
    cd frontend
    ```

2.  Bağımlılıkları yükleyin:
    ```bash
    npm install
    ```

3.  Vite geliştirme sunucusunu başlatın:
    ```bash
    npm run dev
    ```
    *Uygulama `http://localhost:5173` (veya benzeri) bir adreste açılacaktır.*

4.  Tarayıcınızda açılan `http://localhost:5173` adresine giderek uygulamayı kullanabilirsiniz.

---

## 📄 API Referansı

* `POST /api/v1/upload`: Video dosyasını yükler ve işleme görevini başlatır.
* `GET /api/v1/status/{job_id}`: Verilen `job_id`'nin durumunu sorgular.
* `GET /static/{image_name}`: İşlenmiş sahne görüntülerini sunar.