# Teacher FLOAT for Windows

This is the Windows 10 desktop FLOAT wrapper for the Teacher Dashboard / Activity Product Live Wall.

It opens the dashboard in an always-on-top desktop window so it can stay visible while PowerPoint or another application is running. The Windows desktop window is frameless like the macOS FLOAT app, and the custom `MIN` / `OFF` controls are wired to the FLOAT desktop behavior.

The Windows build uses Electron on top of Node.js. Keep Node.js LTS installed when launching from the `.bat` file, or build the portable `Teacher FLOAT.exe` when you want to run it on Windows computers without Node.js. Use the dashboard title area to drag the window, resize from the window edges or corners, and use the golden `MIN` / `OFF` controls for FLOAT window actions.

## Files

- `teacher-dashboard-enhanced.html` - the dashboard page
- `manifest.webmanifest` - install metadata for browser/home-screen shortcuts
- `assets/` - dashboard background images
- `assets/teacher-float-icon-*.png` - Teacher FLOAT install icons generated from the main logo
- `feature-widget-assets/` - calculator, timer, die, and WHO'S LUCKY student/point spaceship images
- `game-assets/` - Snakes and Teachers board, player, student, immunity, crown, and scoring animation images
- `pdfjs/` - local PDF renderer used by uploaded PDF files
- `windows-float/` - the Windows Electron wrapper source
- `windows-float/build/icon.ico` - app logo used for the portable Windows executable
- `Launch FLOAT Windows.bat` - installs dependencies and opens FLOAT on Windows

## How to Use on Windows 10

1. Install Node.js LTS from `https://nodejs.org/`.
2. Download or clone this whole folder. Keep the `.bat` files, `teacher-dashboard-enhanced.html`, `assets/`, `feature-widget-assets/`, `game-assets/`, `pdfjs/`, and `windows-float/` together.
3. Double-click `Launch FLOAT Windows.bat`.
4. The first run installs Electron, so it may take a few minutes.
5. After that, the FLOAT desktop app opens.

If Windows says `node` or `npm` cannot be found right after installation, restart Windows or open a new Command Prompt and run the launcher again. If npm fails, leave the command window open and read the error printed above the pause prompt.

## Firebase Classroom Profiles

The Firebase Classroom panel includes a project profile selector. The default profile uses the Teacher FLOAT Firebase project, and teachers can paste another Firebase web config into the profile box, name it, save it, switch to it, or remove it later. Switching profiles resets the live Firebase runtime, clears the current Firebase products, and reconnects with the selected project so one Windows install can be pointed at a different classroom Firebase project without editing code.

Saved Firebase profiles live in browser local storage inside the dashboard renderer. The default Teacher FLOAT profile is protected and cannot be removed.

## FLOAT DESIGN

The main launcher menu includes FLOAT DESIGN controls for Aura, Sparks, Glow, animation speed, aura intensity, and aura color. These settings are saved locally and apply to the dashboard FLOAT logo, the FLOAT home/mini launcher inside the dashboard, and the separate minimized Windows launcher window. The Windows bridge only forwards sanitized design settings from the trusted dashboard renderer to the trusted launcher window; it does not expose Node.js to the dashboard page.

When `MIN` is clicked, the separate minimized launcher uses a larger transparent native canvas so the full glowing aura remains visible around the crisp centered Teacher FLOAT badge instead of being clipped by the Windows window bounds.

## WATCH ME / I TALK ENGLISH Media Controls

- Activity Products on screen are adjustable from 1 to 100 for regular APs, I TALK ENGLISH voice-recording APs, and WATCH ME video APs. The dashboard recalculates the rectangular rows and columns automatically as the selected count changes.
- `LOOP` is a global media button. When it is on, the currently rendered WATCH ME videos and I TALK ENGLISH recordings repeat continuously.
- `ECHO` is controlled per AP video or voice recording. It adds a lightweight cave-style delayed echo to that AP only.
- `VOLUME` appears in the upper-left corner of each AP media player. It is separate from the ECHO control and follows the same AP if it appears in more than one dashboard view.

For stability, videos use lazy loading and stay contained in their AP frame while dragged, moved, resized, or touched. Avoid opening many other heavy video apps on low-memory computers while using LOOP across many APs, especially when showing a high count such as 50 to 100 APs.

AP video fullscreen, resize, and close actions are guarded so AP picture panels keep their original size and the left/right dashboard arrows remain available. The dashboard repairs only the AP frame layout after fullscreen exits, without re-rendering or stopping videos that are already playing.

## WHO'S LUCKY?

WHO'S LUCKY is included in the main dashboard and uses `feature-widget-assets/lucky-student-ships/` and `feature-widget-assets/lucky-point-ships/` for transparent numbered spaceship graphics. The rolling music and pick sound are generated by the dashboard with browser-native Web Audio, so the Windows app does not need any extra Node.js packages or external media files.

In Points mode, the highest possible point value is adjustable from 1 to 1000. The setting applies to both Add and Deduct rolls and is saved with the other WHO'S LUCKY controls. Changing the highest point value never resets or changes the accumulated point total. Values above 100 are displayed as individual point spaceship digits, with a clear `+` or `-` text total above the ships.

Student Picker results use a responsive spaceship grid. One, two, and three picked students stay on one row and scale large; larger groups shrink into a fitted grid so even 20 picked students remain visible without overlapping. Single-result ships are capped slightly below the maximum possible size to keep the 480x320 PNG artwork clear and vibrant instead of over-stretched.

The rolling spaceship images are intentionally larger in both Points mode and Student Picker mode, while still using a fixed pool of 32 moving ships. The feature stays compatible with the FLOAT wrapper because it runs inside the same dashboard renderer, uses `requestAnimationFrame` for rolling animation, and stops audio/animation work when the roll is stopped or the panel is closed.

The WHO'S LUCKY and SNAKES GAME circular control panels are layered above the three main golden launchers, so they remain visible and draggable even when they overlap the launcher strip.

## SNAKES GAME on Windows SMART Boards

SNAKES GAME is optimized for Windows touchscreen and SMART Board use. During token movement, the dashboard caches the zoomed board geometry, coalesces high-frequency pointer samples, ignores duplicate bubbling pointer-move work, and batches trail rendering through `requestAnimationFrame`. It also temporarily pauses heavy confetti drawing while a token is being dragged, so the circular player icons stay responsive when the board is zoomed in.

The Electron wrapper keeps GPU rasterization and touch events enabled, prevents renderer timer throttling while FLOAT is active, and disables browser pinch zoom so the in-game zoom slider remains the only zoom system affecting board coordinates.

## Pen, PDFs, Photos, and SMART Boards

- Uploaded PDFs, pictures, and videos support up to 100 files. The visible uploaded-file count is adjustable from 1 to 100, with a responsive rectangular layout, fullscreen by double-tap, restore by single-tap, one-at-a-time carousel mode by triple-tap, drag/resize, stable MP4 play controls, and floating zoom controls beneath the selected uploaded file.
- Uploaded PDF pen marks are anchored to PDF page coordinates. Ink moves with the PDF while it is dragged or scrolled, and the marks remain visible when returning to the same PDF section.
- Uploaded MP4, PDF, and image files keep their content contained after WATCH ME is opened and closed, so new uploads should not stretch, clip, or require deleting APs before uploading again.
- The Pen tool writes over the dashboard surface, uploaded PDFs/photos, Activity Product images, and grouped AP layouts.
- Windows SMART Board touchscreens are supported through Pointer Events, direct Touch Events, and a mouse-event fallback for older board drivers.
- When Pen is on, the dashboard disables browser touch gestures over the stage so ink strokes do not scroll, select, zoom, or drag AP cards by accident. Turn Pen off when you want to move or resize AP cards.
- The golden dashboard launchers also support pointer input, so they can be tapped from a Windows touchscreen.

## Limits and SAVE AP

- Student send limit defaults to 100 and can be adjusted from 1 to 100.
- Activity Products on screen default to 100 and can be adjusted from 1 to 100 for AP pictures, WATCH ME videos, and I TALK ENGLISH voice recordings.
- Uploaded files on screen default to 100 and can be adjusted from 1 to 100.
- SAVE AP starts the selected AP download immediately. It does not change screens, hide controls, require right-click actions, or require a Go Back button.
- Golden launchers remain visible and active above the dashboard while sections are opened, closed, saved, dragged, or resized.

## Windows Stability Notes

The Electron wrapper keeps Node.js out of the dashboard renderer, blocks untrusted top-level navigation, blocks embedded webviews, disables pinch zoom, and forces the dashboard zoom level back to 100%. It also enables Chromium touch input explicitly for Windows SMART Boards, runs as a single active app instance, validates renderer IPC before allowing FLOAT window actions, hides the dashboard from the Windows taskbar, and clears reload/layout timers when the app quits.

WHO'S LUCKY Points mode is bounded in the renderer to prevent invalid point ranges: the highest value clamps to 1 through 1000, uses direct random integer generation, preloads only the local student/point spaceship image sets, and keeps the fixed visible-animation pool at 32 moving ships. The accumulated total is stored separately from the range setting, so changing the range does not mutate scoring history or trigger extra roll work.

Firebase profiles are normalized and validated in the renderer before use. A custom profile must include the required Firebase web config fields, and the Electron wrapper keeps the dashboard renderer on trusted local files while Firebase itself is loaded through the same browser module imports used by the macOS dashboard.

The native Windows title bar is intentionally removed. Resize the window from its edges or corners, drag it from the top title area, and avoid dragging from buttons, media players, upload controls, or drawing surfaces because those areas remain normal dashboard controls.

For best reliability on classroom computers, keep Node.js 18 LTS or newer installed when launching from the batch file, avoid moving files out of this folder, keep the Windows display driver updated, and close memory-heavy video apps if many AP videos are looping at once.

## How to Make Teacher FLOAT.exe

Use this if you want a portable app for other Windows computers, without installing Node.js on each computer.

1. On one Windows computer, install Node.js LTS from `https://nodejs.org/`.
2. Download or clone this whole folder.
3. Double-click `Build Teacher FLOAT EXE.bat`.
4. Wait for the build to finish.
5. The final portable app will appear as `Teacher FLOAT.exe`.

You can copy `Teacher FLOAT.exe` to a flash drive and run it on other Windows computers. Those computers should not need Node.js.

## FLOAT Controls

- `MIN` - shrinks the frameless dashboard into the draggable golden FLOAT launcher on screen
- Drag the golden FLOAT launcher - move it anywhere on the screen, including an extended display
- Click the golden FLOAT launcher - restores the full dashboard on that display
- `OFF` - closes FLOAT through the native window close path with `BrowserWindow.close()`

`MIN` and `OFF` sit in the launcher strip beside the main golden dashboard launchers and do not block the Main, Pen, or WHO'S LUCKY launchers. Their IPC channel is exposed through the preload script only, with context isolation enabled and Node.js disabled in the dashboard renderer.

## Notes

The browser version can open `teacher-dashboard-enhanced.html`, but a normal browser tab cannot float above PowerPoint or other applications. Use `Launch FLOAT Windows.bat` for the real desktop FLOAT behavior on Windows.

If the dashboard renderer becomes unresponsive, the Windows wrapper attempts a limited automatic reload. If it repeatedly fails, restart Teacher FLOAT and close other memory-heavy applications before trying again.
