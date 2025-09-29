import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PictureMode, WindowStyle } from './types';
import ContextMenu from './components/ContextMenu';
import { SettingsIcon } from './components/Icons';

const ZOOM_STEP = 0.1;
const OPACITY_STEP = 0.1;
const WINDOW_SIZE_STEP = 50;
const TOAST_DURATION = 3000;

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(16/9);

  const [pictureMode, setPictureMode] = useState<PictureMode>(PictureMode.COVER);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [windowStyle, setWindowStyle] = useState<WindowStyle>(WindowStyle.NORMAL);
  const [opacity, setOpacity] = useState(1);
  const [windowSize, setWindowSize] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, TOAST_DURATION);
  }, []);
  
  useEffect(() => {
    const isFixedWindow = ![WindowStyle.NORMAL, WindowStyle.FULLSCREEN].includes(windowStyle);
    if (!isFixedWindow) {
      setWindowPosition({ x: 0, y: 0 });
    } else {
        const maxW = window.innerWidth - 40;
        const maxH = window.innerHeight - 40;
        
        let effectiveWidth: number;
        let effectiveHeight: number;

        if (windowStyle === WindowStyle.ELLIPSE) {
            const size = Math.min(windowSize, maxW, maxH);
            effectiveWidth = size;
            effectiveHeight = size;
        } else {
            effectiveWidth = Math.min(windowSize, maxW);
            effectiveHeight = effectiveWidth / aspectRatio;

            if (effectiveHeight > maxH) {
                effectiveHeight = maxH;
                effectiveWidth = effectiveHeight * aspectRatio;
            }
        }

        setWindowPosition({
           x: (window.innerWidth - effectiveWidth) / 2,
           y: (window.innerHeight - effectiveHeight) / 2,
        });
    }
  }, [windowStyle, windowSize, aspectRatio]);
  
  // This effect listens for browser resize and forces a re-render to recalculate window size/position
  useEffect(() => {
    const handleResize = () => setWindowSize(s => s);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const handleIncreaseWindowSize = () => setWindowSize(s => s + WINDOW_SIZE_STEP);
  const handleDecreaseWindowSize = () => setWindowSize(s => Math.max(150, s - WINDOW_SIZE_STEP));

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!shortcutsEnabled) return;
    
    if (e.ctrlKey) {
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); handleCopyFrame(); }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'z': setPictureMode(PictureMode.CONTAIN); break;
      case 'x': setPictureMode(PictureMode.FILL); break;
      case 'c': setPictureMode(PictureMode.NONE); break;
      case 'a': setPictureMode(PictureMode.COVER); break;
      case 'n':
      case 'escape':
        handleSetWindowStyle(WindowStyle.NORMAL); 
        break;
      case 'e': handleSetWindowStyle(WindowStyle.ELLIPSE); break;
      case 'r': handleSetWindowStyle(WindowStyle.RECTANGLE); break;
      case 'w': handleSetWindowStyle(WindowStyle.ROUNDED); break;
      case 'f':
        handleSetWindowStyle(WindowStyle.FULLSCREEN);
        break;
      case 'h': setFlipHorizontal(f => !f); break;
      case 'v': setFlipVertical(f => !f); break;
      case 'arrowup': setOpacity(o => Math.min(1, o + OPACITY_STEP)); break;
      case 'arrowdown': setOpacity(o => Math.max(0.2, o - OPACITY_STEP)); break;
      case 'arrowright': setOpacity(1); break;
      case 'arrowleft': setOpacity(0.2); break;
      case '+': handleIncreaseWindowSize(); break;
      case '-': handleDecreaseWindowSize(); break;
      case 'i': handleCopyFrame(); break;
      case 'd': handleDelayedCopyFrame(); break;
      case 'pageup': setZoom(z => Math.min(5, z + ZOOM_STEP)); break;
      case 'pagedown': setZoom(z => Math.max(0.1, z - ZOOM_STEP)); break;
    }
  }, [handleCopyFrame, handleDelayedCopyFrame, shortcutsEnabled]);

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
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowStyle === WindowStyle.NORMAL || windowStyle === WindowStyle.FULLSCREEN) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
        x: e.clientX - windowPosition.x,
        y: e.clientY - windowPosition.y,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (isDragging) {
          setWindowPosition({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y,
          });
      }
  }, [isDragging, dragStart.x, dragStart.y]);

  const handleMouseUp = useCallback(() => {
      setIsDragging(false);
  }, []);

  useEffect(() => {
      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
          window.addEventListener('mouseleave', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('mouseleave', handleMouseUp);
      };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const closeSettingsMenu = () => setIsSettingsOpen(false);

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (video.videoWidth > 0) {
      setAspectRatio(video.videoWidth / video.videoHeight);
    }
  };
  
  const videoStyle: React.CSSProperties = {
    transform: `scale(${zoom}) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
    objectFit: pictureMode,
  };
  
  const isFixedWindow = ![WindowStyle.NORMAL, WindowStyle.FULLSCREEN].includes(windowStyle);
  
  const maxW = window.innerWidth - 40;
  const maxH = window.innerHeight - 40;
  let effectiveWidth: number;
  let effectiveHeight: number;

  if (windowStyle === WindowStyle.ELLIPSE) {
      const size = Math.min(windowSize, maxW, maxH);
      effectiveWidth = size;
      effectiveHeight = size;
  } else {
      effectiveWidth = Math.min(windowSize, maxW);
      effectiveHeight = effectiveWidth / aspectRatio;

      if (effectiveHeight > maxH) {
          effectiveHeight = maxH;
          effectiveWidth = effectiveHeight * aspectRatio;
      }
  }


  const windowContainerStyle: React.CSSProperties = {
    opacity,
    ...(isFixedWindow && {
      position: 'absolute',
      width: `${effectiveWidth}px`,
      height: `${effectiveHeight}px`,
      transform: `translate(${windowPosition.x}px, ${windowPosition.y}px)`,
      cursor: isDragging ? 'grabbing' : 'grab',
    })
  };
  
  const clippingMaskStyle: React.CSSProperties = {
    borderRadius: windowStyle === WindowStyle.ELLIPSE ? '50%' : (windowStyle === WindowStyle.ROUNDED ? '2rem' : '0'),
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative group">
      <div 
        ref={windowRef}
        className={`transition-all duration-200 ${isFixedWindow ? '' : 'w-full h-full'}`}
        style={windowContainerStyle}
        onMouseDown={handleMouseDown}
        >
          <div className="w-full h-full overflow-hidden transition-all duration-300 bg-gray-900 flex items-center justify-center" style={clippingMaskStyle}>
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
                onLoadedMetadata={handleVideoMetadata}
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
          onIncreaseOpacity={() => setOpacity(o => Math.min(1, o + OPACITY_STEP))}
          onDecreaseOpacity={() => setOpacity(o => Math.max(0.2, o - OPACITY_STEP))}
          onSetOpacity={setOpacity}
          shortcutsEnabled={shortcutsEnabled}
          onToggleShortcuts={() => setShortcutsEnabled(s => !s)}
          onIncreaseWindowSize={handleIncreaseWindowSize}
          onDecreaseWindowSize={handleDecreaseWindowSize}
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