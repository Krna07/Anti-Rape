import { useRef, useEffect, useState } from 'react';

export default function CameraCapture({ onCapture, instructions }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  const startStream = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError('Camera access is required. Please allow camera access in your browser settings.');
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(
      blob => {
        if (!blob) return;
        setCapturedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stopStream();
      },
      'image/jpeg',
      0.85
    );
  };

  const handleUsePhoto = () => {
    if (capturedBlob) {
      onCapture(capturedBlob);
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedBlob(null);
    setPreviewUrl(null);
    startStream();
  };

  const styles = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      background: 'var(--dark2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
    },
    instructions: {
      color: 'var(--text)',
      fontSize: 14,
      textAlign: 'center',
    },
    video: {
      width: '100%',
      maxWidth: 480,
      borderRadius: 8,
      border: '1px solid var(--border)',
      background: '#000',
    },
    preview: {
      width: '100%',
      maxWidth: 480,
      borderRadius: 8,
      border: '1px solid var(--border)',
    },
    btnRow: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    btnCapture: {
      padding: '10px 22px',
      background: 'var(--green)',
      color: '#fff',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: 14,
      border: 'none',
      cursor: 'pointer',
    },
    btnUse: {
      padding: '10px 22px',
      background: 'var(--green)',
      color: '#fff',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: 14,
      border: 'none',
      cursor: 'pointer',
    },
    btnRetake: {
      padding: '10px 22px',
      background: 'transparent',
      color: 'var(--text)',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: 14,
      border: '1px solid var(--border)',
      cursor: 'pointer',
    },
    btnTryAgain: {
      padding: '10px 22px',
      background: 'var(--green)',
      color: '#fff',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: 14,
      border: 'none',
      cursor: 'pointer',
    },
    errorText: {
      color: 'var(--muted)',
      fontSize: 14,
      textAlign: 'center',
      maxWidth: 360,
    },
  };

  return (
    <div style={styles.wrapper}>
      {instructions && <p style={styles.instructions}>{instructions}</p>}

      {error ? (
        <>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.btnTryAgain} onClick={startStream}>
            Try Again
          </button>
        </>
      ) : previewUrl ? (
        <>
          <img src={previewUrl} alt="Captured preview" style={styles.preview} />
          <div style={styles.btnRow}>
            <button style={styles.btnUse} onClick={handleUsePhoto}>
              Use Photo
            </button>
            <button style={styles.btnRetake} onClick={handleRetake}>
              Retake
            </button>
          </div>
        </>
      ) : (
        <>
          <video
            ref={videoRef}
            style={styles.video}
            autoPlay
            playsInline
            muted
          />
          <button style={styles.btnCapture} onClick={handleCapture}>
            Capture Photo
          </button>
        </>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
