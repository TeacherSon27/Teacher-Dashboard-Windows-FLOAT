# Teacher FLOAT for Windows

This is the Windows 10 desktop FLOAT wrapper for the Teacher Dashboard / Activity Product Live Wall.

It opens the dashboard in an always-on-top desktop window so it can stay visible while PowerPoint or another application is running. The window can minimize into a draggable golden FLOAT launcher, then reopen when clicked.

## Files

- `teacher-dashboard-enhanced.html` - the dashboard page
- `assets/` - dashboard background images
- `feature-widget-assets/` - calculator, timer, and die images
- `game-assets/` - Snakes and Teachers board, player, student, and immunity images
- `windows-float/` - the Windows Electron wrapper source
- `Launch FLOAT Windows.bat` - installs dependencies and opens FLOAT on Windows

## How to Use on Windows 10

1. Install Node.js LTS from `https://nodejs.org/`.
2. Download or clone this folder.
3. Double-click `Launch FLOAT Windows.bat`.
4. The first run installs Electron, so it may take a few minutes.
5. After that, the FLOAT desktop app opens.

## How to Make Teacher FLOAT.exe

Use this if you want a portable app for other Windows computers, without installing Node.js on each computer.

1. On one Windows computer, install Node.js LTS from `https://nodejs.org/`.
2. Download or clone this folder.
3. Double-click `Build Teacher FLOAT EXE.bat`.
4. Wait for the build to finish.
5. The final portable app will appear as `Teacher FLOAT.exe`.

You can copy `Teacher FLOAT.exe` to a flash drive and run it on other Windows computers. Those computers should not need Node.js.

## FLOAT Controls

- `MIN` - shrinks the dashboard into the golden FLOAT launcher
- Drag the golden launcher - move it anywhere on the screen, including an extended display
- Click the golden launcher - opens the dashboard again on that display
- `OFF` - closes FLOAT

## Notes

The browser version can open `teacher-dashboard-enhanced.html`, but a normal browser tab cannot float above PowerPoint or other applications. Use `Launch FLOAT Windows.bat` for the real desktop FLOAT behavior on Windows.
