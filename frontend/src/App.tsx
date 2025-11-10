import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import VideoUploader from './components/VideoUploader';
import SceneGallery from './components/SceneGallery';
import { uploadVideo, getJobStatus, type SceneCapture } from './services/api';
import './App.css';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<SceneCapture[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(12);
  const [submittedThreshold, setSubmittedThreshold] = useState<number>(12);

  useEffect(() => {
    if (status === 'processing' && jobId) {
      const intervalId = setInterval(() => {
        getJobStatus(jobId)
          .then((response) => {
            const jobData = response.data;

            if ('settings' in jobData && jobData.settings?.threshold !== undefined) {
              setSubmittedThreshold(jobData.settings.threshold);
            }

            if (jobData.status === 'completed') {
              setStatus('completed');
              setImages(jobData.images);
              clearInterval(intervalId);
            } else if (jobData.status === 'failed') {
              setStatus('failed');
              setError(jobData.error || 'İşleme sırasında bir hata oluştu.');
              clearInterval(intervalId);
            }
          })
          .catch(() => {
            setStatus('failed');
            setError('Durum sorgulanırken sunucu hatası.');
            clearInterval(intervalId);
          });
      }, 3000);

      return () => clearInterval(intervalId);
    }
  }, [status, jobId]);

  const handleUpload = (file: File) => {
    setStatus('uploading');
    setError(null);
    setUploadProgress(0);
    setFileName(file.name);
    setSubmittedThreshold(threshold);

    uploadVideo(
      file,
      (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      },
      { threshold }
    )
      .then((response) => {
        setJobId(response.data.job_id);
        setStatus('processing');
      })
      .catch((err: unknown) => {
        let errorMessage = 'Video yüklenemedi.';

        if (axios.isAxiosError(err)) {
          errorMessage += ' ' + (err.response?.data?.message || err.message);
        } else if (err instanceof Error) {
          errorMessage += ' ' + err.message;
        }

        setError(errorMessage);
        setStatus('failed');
      });
  };

  const resetProcess = () => {
    setStatus('idle');
    setJobId(null);
    setImages([]);
    setError(null);
    setFileName('');
    setSubmittedThreshold(threshold);
  };

  const statusContent = useMemo(() => {
    switch (status) {
      case 'idle':
        return (
          <>
            <h3>Hazırsınız</h3>
            <p>Video dosyanı yüklediğinde BestShots sahneleri otomatik olarak çıkaracak. Hassasiyet kaydırıcısı yakalanacak geçiş sayısını belirler.</p>
            <ul className="status-hints">
              <li>Karanlık veya çok düşük kontrastlı sahnelerde sonuçlar daha sınırlı olabilir.</li>
              <li>İşleme tamamlandığında tüm kareleri dilediğin gibi indirebilirsin.</li>
            </ul>
          </>
        );
      case 'uploading':
        return (
          <>
            <h3>Yükleme devam ediyor</h3>
            <p>
              <strong>{fileName || 'Dosya'}</strong> sunucuya aktarılıyor. Gelişen internet bağlantısı süreci hızlandırır.
            </p>
            <p>İlerleme: %{uploadProgress}</p>
            <p className="status-meta">Hassasiyet: {submittedThreshold.toFixed(1)}</p>
          </>
        );
      case 'processing':
        return (
          <>
            <div className="status-spinner" aria-hidden="true" />
            <h3>Video işleniyor</h3>
            <p>
              "{fileName}" için sahneler tespit ediliyor. Pencereyi kapatmadan diğer sekmelerde çalışmaya devam edebilirsin.
            </p>
            <p className="status-meta">Hassasiyet: {submittedThreshold.toFixed(1)}</p>
          </>
        );
      case 'failed':
        return (
          <>
            <h3>Bir şeyler ters gitti</h3>
            <p>{error || 'Beklenmeyen bir hata oluştu. Lütfen yeniden dene.'}</p>
            <button className="ghost-button" onClick={resetProcess} type="button">
              Süreci Sıfırla
            </button>
          </>
        );
      case 'completed':
        return (
          <>
            <h3>İşlem tamamlandı</h3>
            <p>
              <strong>{fileName}</strong> için {images.length} sahne yakalandı. Aşağıdaki galeriden inceleyebilir veya indirebilirsin.
            </p>
            <div className="status-pills">
              <span className="status-pill">{images.length} sahne</span>
              <span className="status-pill">Otomatik seçilen kareler</span>
              <span className="status-pill">Hassasiyet {submittedThreshold.toFixed(1)}</span>
            </div>
          </>
        );
      default:
        return null;
    }
  }, [status, fileName, uploadProgress, images.length, error, submittedThreshold]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <img className="app-logo" src="/logo.png" alt="BestShots logosu" />
          <div className="header-text">
            <h1>BestShots</h1>
            <p>Videolarının en güçlü karelerini dakikalar içinde yakala ve paylaş.</p>
          </div>
        </div>
      </header>

      <main className="main-layout">
        <section className="primary-column">
          <VideoUploader
            onUpload={handleUpload}
            onReset={resetProcess}
            status={status}
            progress={uploadProgress}
            activeFileName={fileName}
            threshold={threshold}
            onThresholdChange={setThreshold}
          />

          <div className="status-card">
            {statusContent}
          </div>
        </section>

        <aside className="secondary-column">
          <div className="info-card">
            <h3>Nasıl çalışır?</h3>
            <ol className="step-list">
              <li>Videonu yükle.</li>
              <li>BestShots otomatik olarak sahne sınırlarını yakalar.</li>
              <li>Galeriden istediğin kareleri indir veya paylaş.</li>
            </ol>
          </div>
          <div className="info-card">
            <h3>İpucu</h3>
            <p>Uzun videolarda yükleme bittikten sonra işlem devam ederken sekmeyi kapatmadan başka işler yapabilirsin.</p>
          </div>
        </aside>
      </main>

      {status === 'completed' && (
        <section className="gallery-section">
          <SceneGallery scenes={images} />
        </section>
      )}
    </div>
  );
}

export default App;