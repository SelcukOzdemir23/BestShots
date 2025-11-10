import React, { useState } from 'react';
import type { SceneCapture } from '../services/api';

const API_BASE_URL = 'http://localhost:8000';

interface SceneGalleryProps {
  scenes: SceneCapture[];
}

function SceneGallery({ scenes }: SceneGalleryProps) {
  const [copiedTimestamp, setCopiedTimestamp] = useState<string | null>(null);

  if (!scenes || scenes.length === 0) {
    return (
      <div className="gallery-container">
        <h2>Tespit Edilen Sahneler</h2>
        <div className="no-scenes-message">
          <p>Tespit edilen sahne bulunamadı.</p>
        </div>
      </div>
    );
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/320x180?text=G%C3%B6r%C3%BCnt%C3%BC+Y%C3%BCklenemedi';
  };

  const handleCopy = async (timestamp: string) => {
    try {
      await navigator.clipboard.writeText(timestamp);
      setCopiedTimestamp(timestamp);
      setTimeout(() => setCopiedTimestamp(null), 2000);
    } catch (error) {
      console.warn('Zaman damgası kopyalanamadı.', error);
    }
  };

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <div>
          <h2>Tespit Edilen Sahneler</h2>
          <p className="gallery-subtitle">Algoritma, videodaki ani geçişleri yakalayarak öne çıkan kareleri seçti.</p>
        </div>
        <span className="gallery-count">{scenes.length} sahne</span>
      </div>

      <div className="scene-grid">
        {scenes.map((scene, index) => {
          const imageUrl = `${API_BASE_URL}/${scene.path}`;
          const fileName = decodeURIComponent(scene.path.split('/').pop() ?? 'sahne.png');
          const isCopied = copiedTimestamp === scene.timestamp;

          return (
            <article key={scene.path} className="scene-card">
              <div className="scene-thumbnail">
                <img
                  src={imageUrl}
                  alt={`Sahne ${index + 1} (${scene.timestamp})`}
                  loading="lazy"
                  onError={handleImageError}
                />
              </div>
              <div className="scene-body">
                <div className="scene-meta">
                  <span className="scene-badge">Sahne {index + 1}</span>
                  <span className="scene-timestamp">{scene.timestamp}</span>
                </div>
                <p className="scene-caption">Tam kareyi görmek için aç veya hızlıca indir.</p>
                <div className="scene-actions">
                  <a
                    className="ghost-button"
                    href={imageUrl}
                    download={fileName}
                  >
                    İndir
                  </a>
                  <a
                    className="text-link"
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tam boyutlu aç
                  </a>
                  <button
                    type="button"
                    className={`icon-button ${isCopied ? 'copied' : ''}`}
                    onClick={() => handleCopy(scene.timestamp)}
                  >
                    {isCopied ? 'Kopyalandı' : 'Zamanı kopyala'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default SceneGallery;