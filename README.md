# Webcam Viewer

A simple, modern, and privacy-focused web application to view your webcam feed directly in your browser. Right-click on the video feed or use the settings icon to access settings, switch cameras, and use various display modes.

All video processing is done client-side in your browser. Your webcam feed is never sent to any server.

## Features

*   **Camera Selection**: Easily switch between all available cameras.
*   **Privacy First**: Your video feed never leaves your computer.
*   **Multiple Display Modes**:
    *   **Picture Mode**: Control how the video fits the window (`Zoom`, `Stretch`, `Center`, `Alt.Stretch`).
    *   **Window Style**: View your camera in a `Normal` window, `Full Screen`, or in draggable shapes like `Circle`, `Rectangle`, and `Rounded`.
*   **Transform Controls**:
    *   Flip the video horizontally or vertically.
    *   Zoom in and out of the video feed.
*   **Opacity Control**: Make the window semi-transparent to see what's behind it.
*   **Clipboard Integration**:
    *   Copy the current frame to the clipboard instantly.
    *   Copy with a 5-second delay.
    *   View an image directly from your clipboard.
*   **Always on Top**: Use the browser's Picture-in-Picture feature to keep the webcam view on top of other windows.
*   **Keyboard Shortcuts**: A comprehensive set of shortcuts for quick access to all features.

## Keyboard Shortcuts

| Key(s) | Action |
| :--- | :--- |
| `Z` | Set Picture Mode to 'Zoom' |
| `X` | Set Picture Mode to 'Stretch' |
| `C` | Set Picture Mode to 'Center' |
| `A` | Set Picture Mode to 'Alt.Stretch' |
| `N` / `Esc` | Set Window Style to 'Normal' |
| `E` | Set Window Style to 'Circle' |
| `R` | Set Window Style to 'Rectangle' |
| `W` | Set Window Style to 'Rounded' |
| `F` | Toggle 'Full Screen' |
| `H` | Toggle Horizontal Flip |
| `V` | Toggle Vertical Flip |
| `ArrowUp` | Increase Opacity |
| `ArrowDown` | Decrease Opacity |
| `ArrowRight` | Set Opacity to Max (100%) |
| `ArrowLeft` | Set Opacity to Min (20%) |
| `PgUp` | Zoom In |
| `PgDown` | Zoom Out |
| `I` / `Ctrl+C` | Copy Frame to Clipboard |
| `D` | Copy Frame with 5s Delay |
| `G` / `Ctrl+V` | View Image from Clipboard |
| `T` | Toggle Always on Top (PiP) |