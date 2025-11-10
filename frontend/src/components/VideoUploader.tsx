import React, { useEffect, useState } from 'react';

type UploadLifecycle = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface VideoUploaderProps {
  onUpload: (file: File) => void;
  onReset: () => void;
  status: UploadLifecycle;
  progress: number;
  activeFileName: string;
  threshold: number;
  onThresholdChange: (value: number) => void;
}

function VideoUploader({ onUpload, onReset, status, progress, activeFileName, threshold, onThresholdChange }: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'idle') {
      setSelectedFile(null);
    }
  }, [status]);

  const isBusy = status === 'uploading' || status === 'processing';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !isBusy) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (status === 'completed') {
      onReset();
      return;
    }

    if (status === 'failed' && selectedFile) {
      onUpload(selectedFile);
      return;
    }

    if (!isBusy && selectedFile) {
      onUpload(selectedFile);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  type DisplayFile = { name: string; size?: number };
  const currentFile: DisplayFile | null = selectedFile
    ? { name: selectedFile.name, size: selectedFile.size }
    : activeFileName
    ? { name: activeFileName }
    : null;

  const buttonLabel = (() => {
    if (status === 'uploading') return 'Yükleniyor...';
    if (status === 'processing') return 'İşleniyor...';
    if (status === 'completed') return 'Yeni Video Yükle';
    if (status === 'failed') return selectedFile ? 'Tekrar Dene' : 'Tekrar Yükle';
    return 'Sahneleri Çıkar';
  })();

  const buttonDisabled =
    isBusy ||
    (status === 'idle' && !selectedFile) ||
    (status === 'failed' && !selectedFile);

  return (
    <div className="uploader-card">
      <div className="uploader-heading">
        <h2>Videonu Yükle</h2>
        <p>MP4, MOV veya AVI gibi popüler formatları destekliyoruz. En iyi sonuç için yüksek çözünürlüklü videolar kullan.</p>
      </div>

      <div
        className={`dropzone ${isBusy ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="videoFile"
          accept="video/*"
          onChange={handleFileChange}
          disabled={isBusy}
        />
        <label htmlFor="videoFile">
          {currentFile ? (
            <div className="file-info">
              <div className="file-metadata">
                <span className="file-pill">Seçilen video</span>
                <h3 className="file-name" title={currentFile.name}>{currentFile.name}</h3>
                {'size' in currentFile && currentFile.size ? (
                  <span className="file-size">{formatFileSize(currentFile.size)}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="dropzone-placeholder">
              <div className="dropzone-icon" aria-hidden="true">⬆️</div>
              <p className="dropzone-title">Sürükleyip bırak veya dosya seç</p>
              <p className="dropzone-subtitle">Maksimum 1 GB • Yüksek çözünürlük önerilir</p>
            </div>
          )}
        </label>
      </div>

      <div className="config-panel" aria-live="polite">
        <div className="config-header">
          <label htmlFor="thresholdRange">Sahne hassasiyeti</label>
          <span className="config-value">{threshold.toFixed(1)}</span>
        </div>
        <input
          id="thresholdRange"
          type="range"
          min="1"
          max="40"
          step="0.5"
          value={threshold}
          onChange={(event) => onThresholdChange(parseFloat(event.target.value))}
          disabled={isBusy}
        />
        <p className="config-helper">Düşük değer daha fazla sahne yakalar. Yüksek değer sadece belirgin geçişleri seçer.</p>
      </div>

      <div className="uploader-actions">
        <button type="button" onClick={handleSubmit} disabled={buttonDisabled}>
          {buttonLabel}
        </button>
        {status === 'failed' && !selectedFile && (
          <button className="ghost-button" onClick={onReset} type="button">
            Yeni Dosya Seç
          </button>
        )}
      </div>

      {status === 'uploading' && (
        <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-indicator" style={{ width: `${progress}%` }} />
          <span className="progress-label">{progress}%</span>
        </div>
      )}

      {status === 'processing' && (
        <div className="processing-hint">
          <div className="processing-spinner" aria-hidden="true" />
          <p>Video işleniyor. Süre, videonun uzunluğuna ve çözünürlüğüne göre değişebilir.</p>
        </div>
      )}

      <ul className="uploader-tips">
        <li>Videonun sesini önemsiyorsan, işleme başlamadan önce altyazıları entegre etmeni öneririz.</li>
        <li>Uzun videolarda daha isabetli sonuçlar için kontrastlı sahneler iş akışını hızlandırır.</li>
      </ul>
    </div>
  );
}

export default VideoUploader;