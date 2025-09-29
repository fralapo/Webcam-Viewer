export enum PictureMode {
  COVER = 'cover',    // Alt.Stretch
  CONTAIN = 'contain',  // Zoom
  FILL = 'fill',      // Stretch
  NONE = 'none',      // Center
}

export enum WindowStyle {
  NORMAL = 'normal',
  ELLIPSE = 'ellipse',
  RECTANGLE = 'rectangle',
  ROUNDED = 'rounded',
  FULLSCREEN = 'fullscreen',
}

export interface ContextMenuProps {
  onClose: () => void;
  devices: MediaDeviceInfo[];
  currentDeviceId?: string;
  onSwitchCamera: (deviceId: string) => void;
  pictureMode: PictureMode;
  onSetPictureMode: (mode: PictureMode) => void;
  windowStyle: WindowStyle;
  onSetWindowStyle: (style: WindowStyle) => void;
  flipHorizontal: boolean;
  onToggleFlipHorizontal: () => void;
  flipVertical: boolean;
  onToggleFlipVertical: () => void;
  onIncreaseOpacity: () => void;
  onDecreaseOpacity: () => void;
  onSetOpacity: (opacity: number) => void;
  onCopyFrame: () => void;
  onDelayedCopyFrame: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  shortcutsEnabled: boolean;
  onToggleShortcuts: () => void;
  onIncreaseWindowSize: () => void;
  onDecreaseWindowSize: () => void;
}