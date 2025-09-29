import React, { useEffect, useRef } from 'react';
import type { ContextMenuProps } from '../types';
import { PictureMode, WindowStyle } from '../types';
import { CameraIcon, StretchIcon, CenterIcon, ContainIcon, CoverIcon, FlipHorizontalIcon, FlipVerticalIcon, CopyIcon, TimerIcon, ZoomInIcon, ZoomOutIcon, CheckIcon, FullscreenIcon, NormalWindowIcon, KeyboardIcon } from './Icons';
import ContextMenuDropdown from './ContextMenuDropdown';

const ContextMenuItem: React.FC<{ onClick: () => void; children: React.ReactNode; shortcut?: string; selected?: boolean; disabled?: boolean; }> = ({ onClick, children, shortcut, selected, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex justify-between items-center w-full px-4 py-2 text-sm text-left text-gray-200 rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-gray-700"
  >
    <div className="flex items-center gap-3">
        {children}
    </div>
    <div className="flex items-center gap-2">
        {shortcut && <span className="text-xs text-gray-400">{shortcut}</span>}
        {selected && <CheckIcon />}
    </div>
  </button>
);

const ContextMenuSeparator: React.FC = () => <hr className="border-gray-600 my-1" />;

const pictureModeOptions = {
    [PictureMode.CONTAIN]: { label: 'Zoom', icon: <ContainIcon />, shortcut: 'Z' },
    [PictureMode.FILL]: { label: 'Stretch', icon: <StretchIcon />, shortcut: 'X' },
    [PictureMode.NONE]: { label: 'Center', icon: <CenterIcon />, shortcut: 'C' },
    [PictureMode.COVER]: { label: 'Alt.Stretch', icon: <CoverIcon />, shortcut: 'A' },
};

const windowStyleOptions = {
    [WindowStyle.NORMAL]: { label: 'Normal', icon: <NormalWindowIcon />, shortcut: 'N/Esc' },
    [WindowStyle.FULLSCREEN]: { label: 'Full Screen', icon: <FullscreenIcon />, shortcut: 'F' },
}

const ContextMenu: React.FC<ContextMenuProps> = (props) => {
  const {
    onClose, devices, currentDeviceId, onSwitchCamera, pictureMode, onSetPictureMode,
    windowStyle, onSetWindowStyle, flipHorizontal, onToggleFlipHorizontal, flipVertical, onToggleFlipVertical,
    onCopyFrame, onDelayedCopyFrame, onZoomIn, onZoomOut, shortcutsEnabled, onToggleShortcuts
  } = props;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };
  
  const currentDevice = devices.find(d => d.deviceId === currentDeviceId);
  const currentDeviceLabel = currentDevice?.label || (currentDeviceId ? `Camera ${devices.findIndex(d => d.deviceId === currentDeviceId) + 1}` : 'Select Camera');

  return (
    <div
      ref={menuRef}
      className="absolute bottom-16 left-4 bg-gray-800/90 backdrop-blur-sm text-white rounded-lg shadow-2xl p-2 z-50 w-72 max-w-[calc(100vw-2rem)] border border-gray-700 max-h-[calc(100vh-10rem)] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <ContextMenuItem onClick={() => handleAction(onToggleShortcuts)} selected={shortcutsEnabled}><KeyboardIcon /> Enable Shortcuts</ContextMenuItem>
      <ContextMenuSeparator />

      <div className="text-xs text-gray-400 px-4 pt-1 pb-2 font-semibold">SETTINGS</div>

      {/* -- CAMERAS DROPDOWN -- */}
      <ContextMenuDropdown
        summaryContent={
          <>
            <CameraIcon />
            <span className="truncate">{currentDeviceLabel}</span>
          </>
        }
      >
        {devices.map((device, index) => (
          <ContextMenuItem
            key={device.deviceId}
            onClick={() => handleAction(() => onSwitchCamera(device.deviceId))}
            selected={currentDeviceId === device.deviceId}
          >
            <div className="w-5 h-5 flex-shrink-0"></div> {/* Placeholder for icon alignment */}
            <span className="truncate">{device.label || `Camera ${index + 1}`}</span>
          </ContextMenuItem>
        ))}
      </ContextMenuDropdown>

      {/* -- PICTURE MODE DROPDOWN -- */}
      <ContextMenuDropdown
        summaryContent={
          <>
            {pictureModeOptions[pictureMode].icon}
            <span>{pictureModeOptions[pictureMode].label}</span>
          </>
        }
      >
        {Object.entries(pictureModeOptions).map(([mode, { label, icon, shortcut }]) => (
          <ContextMenuItem key={mode} onClick={() => handleAction(() => onSetPictureMode(mode as PictureMode))} shortcut={shortcut} selected={pictureMode === mode}>
              {icon} {label}
          </ContextMenuItem>
        ))}
      </ContextMenuDropdown>
      
      {/* -- WINDOW STYLE DROPDOWN -- */}
      <ContextMenuDropdown
        summaryContent={
          <>
            {windowStyleOptions[windowStyle].icon}
            <span>{windowStyleOptions[windowStyle].label}</span>
          </>
        }
      >
        {Object.entries(windowStyleOptions).map(([style, { label, icon, shortcut }]) => (
          <ContextMenuItem key={style} onClick={() => handleAction(() => onSetWindowStyle(style as WindowStyle))} shortcut={shortcut} selected={windowStyle === style}>
              {icon} {label}
          </ContextMenuItem>
        ))}
      </ContextMenuDropdown>
      
      <ContextMenuSeparator />

      <div className="text-xs text-gray-400 px-4 pt-1 pb-2 font-semibold">TRANSFORM</div>
       <ContextMenuItem onClick={() => handleAction(onToggleFlipHorizontal)} shortcut="H" selected={flipHorizontal}><FlipHorizontalIcon /> Horizontal Flip</ContextMenuItem>
       <ContextMenuItem onClick={() => handleAction(onToggleFlipVertical)} shortcut="V" selected={flipVertical}><FlipVerticalIcon /> Vertical Flip</ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction(onZoomIn)} shortcut="PgUp"><ZoomInIcon /> Zoom In</ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction(onZoomOut)} shortcut="PgDn"><ZoomOutIcon /> Zoom Out</ContextMenuItem>
      <ContextMenuSeparator />

      <div className="text-xs text-gray-400 px-4 pt-1 pb-2 font-semibold">ACTIONS</div>
      <ContextMenuItem onClick={() => handleAction(onCopyFrame)} shortcut="I"><CopyIcon /> Copy Frame</ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction(onDelayedCopyFrame)} shortcut="D"><TimerIcon /> Copy with 5s Delay</ContextMenuItem>
    </div>
  );
};

export default ContextMenu;