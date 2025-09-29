import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PictureMode, WindowStyle } from './types';
import ContextMenu from './components/ContextMenu';
import { SettingsIcon } from './components/Icons';

const ZOOM_STEP = 0.1;
const TOAST_DURATION = 3000;

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [pictureMode, setPictureMode] = useState<PictureMode>(PictureMode.COVER);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [windowStyle, setWindowStyle] = useState<WindowStyle>(WindowStyle.NORMAL);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, TOAST_DURATION);
  }, []);

  const updateDeviceList = useCallback(async () => {
    try {
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = availableDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !currentDeviceId) {
        setCurrentDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
      setError("Could not list camera devices.");
    }
  }, [currentDeviceId]);

  useEffect(() => {
    const getStream = async (deviceId?: string) => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setError(null);
        if (!deviceId) {
          updateDeviceList();
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Could not access camera. Please grant permission and ensure a camera is connected.");
      }
    };

    if (currentDeviceId) {
      getStream(currentDeviceId);
    } else {
      getStream();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeviceId]);


  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', updateDeviceList);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', updateDeviceList);
    };
  }, [updateDeviceList]);

  const captureFrameAsBlob = useCallback((): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) return Promise.resolve(null);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    ctx.save();
    if (flipHorizontal || flipVertical) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  }, [flipHorizontal, flipVertical]);

  const handleCopyFrame = useCallback(async () => {
    try {
      const blob = await captureFrameAsBlob();
      if (!blob) {
        showToast('Failed to capture frame');
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Frame copied to clipboard');
    } catch (err) {
      console.error('Failed to copy frame:', err);
      showToast('Failed to copy frame');
    }
  }, [captureFrameAsBlob, showToast]);
  
  const handleDelayedCopyFrame = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setCountdown(5);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1000);

    const cleanupCountdown = () => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        setCountdown(null);
    };

    const blobPromise = new Promise<Blob>((resolve, reject) => {
        setTimeout(async () => {
            try {
                const blob = await captureFrameAsBlob();
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Failed to capture frame blob."));
                }
            } catch (error) {
                reject(error);
            }
            cleanupCountdown();
        }, 5000);
    });

    navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobPromise })
    ]).then(() => {
        showToast('Frame copied to clipboard');
    }).catch((err) => {
        console.error('Failed to copy frame:', err);
        showToast('Failed to copy frame: ' + (err as Error).message);
        cleanupCountdown();
    });
  }, [captureFrameAsBlob, showToast]);

  const handleSetWindowStyle = (style: WindowStyle) => {
    if (style === WindowStyle.FULLSCREEN) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error("Fullscreen request failed:", err));
      }
    } else if (windowStyle === WindowStyle.FULLSCREEN) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error("Exit fullscreen failed:", err));
      }
    }
    
    setWindowStyle(style);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!shortcutsEnabled) return;

    switch (e.key.toLowerCase()) {
      case 'z': setPictureMode(PictureMode.CONTAIN); break;
      case 'x': setPictureMode(PictureMode.FILL); break;
      case 'c': setPictureMode(PictureMode.NONE); break;
      case 'a': setPictureMode(PictureMode.COVER); break;
      case 'n':
      case 'escape':
        handleSetWindowStyle(WindowStyle.NORMAL); 
        break;
      case 'f':
        handleSetWindowStyle(
          windowStyle === WindowStyle.FULLSCREEN 
            ? WindowStyle.NORMAL 
            : WindowStyle.FULLSCREEN
        );
        break;
      case 'h': setFlipHorizontal(f => !f); break;
      case 'v': setFlipVertical(f => !f); break;
      case 'i': handleCopyFrame(); break;
      case 'd': handleDelayedCopyFrame(); break;
      case 'pageup': setZoom(z => Math.min(5, z + ZOOM_STEP)); break;
      case 'pagedown': setZoom(z => Math.max(0.1, z - ZOOM_STEP)); break;
    }
  }, [handleCopyFrame, handleDelayedCopyFrame, shortcutsEnabled, windowStyle]);

  useEffect(() => {
    const handleFullscreenChange = () => {
        if (!document.fullscreenElement && windowStyle === WindowStyle.FULLSCREEN) {
            setWindowStyle(WindowStyle.NORMAL);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleKeyDown, windowStyle]);

  const closeSettingsMenu = () => setIsSettingsOpen(false);
  
  const videoStyle: React.CSSProperties = {
    transform: `scale(${zoom}) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
    objectFit: pictureMode,
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative group">
      <div className="w-full h-full">
          <div className="w-full h-full overflow-hidden bg-gray-900 flex items-center justify-center">
            {error ? (
              <div className="text-center p-4">
                <h1 className="text-2xl font-bold text-red-500 mb-2">Camera Error</h1>
                <p className="text-gray-300">{error}</p>
              </div>
            ) : stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full transition-transform duration-200"
                style={videoStyle}
              />
            ) : (
              <p className="text-xl animate-pulse">Initializing Camera...</p>
            )}
          </div>
      </div>
      
      <button 
          onClick={() => setIsSettingsOpen(o => !o)}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-4 left-4 z-20 p-2 bg-gray-800/50 hover:bg-gray-700/80 rounded-full transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Open Settings"
          >
          <SettingsIcon />
      </button>

      {isSettingsOpen && (
          <ContextMenu
          onClose={closeSettingsMenu}
          devices={devices}
          currentDeviceId={currentDeviceId}
          onSwitchCamera={(id) => {
              setCurrentDeviceId(id);
          }}
          pictureMode={pictureMode}
          onSetPictureMode={setPictureMode}
          windowStyle={windowStyle}
          onSetWindowStyle={handleSetWindowStyle}
          flipHorizontal={flipHorizontal}
          onToggleFlipHorizontal={() => setFlipHorizontal(f => !f)}
          flipVertical={flipVertical}
          onToggleFlipVertical={() => setFlipVertical(f => !f)}
          onCopyFrame={handleCopyFrame}
          onDelayedCopyFrame={handleDelayedCopyFrame}
          onZoomIn={() => setZoom(z => Math.min(5, z + ZOOM_STEP))}
          onZoomOut={() => setZoom(z => Math.max(0.1, z - ZOOM_STEP))}
          shortcutsEnabled={shortcutsEnabled}
          onToggleShortcuts={() => setShortcutsEnabled(s => !s)}
          />
      )}
      
      <canvas ref={canvasRef} className="hidden" />

      {countdown !== null && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-9xl font-bold text-white" style={{ textShadow: '0 0 15px black' }}>
            {countdown}
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;