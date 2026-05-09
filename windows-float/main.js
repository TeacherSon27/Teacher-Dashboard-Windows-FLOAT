const { app, BrowserWindow, ipcMain, screen } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DASHBOARD_CANDIDATES = [
  path.join(ROOT_DIR, "teacher-dashboard-enhanced.html"),
  path.join(ROOT_DIR, "index.html")
];

const WINDOW_INSET = 12;
const LAUNCHER_SIZE = 96;
const LAUNCHER_MARGIN = 24;
const PREVIEW_SIZE = 34;
const ANIMATION_MS = 320;

let mainWindow = null;
let launcherWindow = null;
let isAnimating = false;
let lastLauncherBounds = null;
let preferredDisplayId = null;
let launcherDrag = null;

function dashboardPath() {
  return DASHBOARD_CANDIDATES.find((filePath) => fs.existsSync(filePath)) || DASHBOARD_CANDIDATES[0];
}

function displayForCursor() {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

function displayForBounds(bounds) {
  return screen.getDisplayMatching(bounds || { x: 0, y: 0, width: 1, height: 1 });
}

function activeDisplay() {
  if (preferredDisplayId) {
    const match = screen.getAllDisplays().find((display) => display.id === preferredDisplayId);
    if (match) return match;
  }
  return displayForCursor();
}

function rememberDisplayForBounds(bounds) {
  const display = displayForBounds(bounds);
  preferredDisplayId = display.id;
  return display;
}

function mainBoundsForDisplay(display) {
  const workArea = display.workArea;
  return {
    x: workArea.x + WINDOW_INSET,
    y: workArea.y + WINDOW_INSET,
    width: Math.max(720, workArea.width - WINDOW_INSET * 2),
    height: Math.max(480, workArea.height - WINDOW_INSET * 2)
  };
}

function defaultLauncherBounds(display) {
  const workArea = display.workArea;
  return {
    x: workArea.x + workArea.width - LAUNCHER_SIZE - LAUNCHER_MARGIN,
    y: workArea.y + workArea.height - LAUNCHER_SIZE - LAUNCHER_MARGIN,
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE
  };
}

function clampLauncherBounds(bounds) {
  const display = displayForBounds(bounds);
  const workArea = display.workArea;
  const width = LAUNCHER_SIZE;
  const height = LAUNCHER_SIZE;
  return {
    x: Math.min(Math.max(bounds.x, workArea.x + 6), workArea.x + workArea.width - width - 6),
    y: Math.min(Math.max(bounds.y, workArea.y + 6), workArea.y + workArea.height - height - 6),
    width,
    height
  };
}

function launcherBoundsForDisplay(display) {
  if (lastLauncherBounds && displayForBounds(lastLauncherBounds).id === display.id) {
    return clampLauncherBounds(lastLauncherBounds);
  }
  return clampLauncherBounds(defaultLauncherBounds(display));
}

function centeredBounds(size, bounds) {
  return {
    x: Math.round(bounds.x + bounds.width / 2 - size / 2),
    y: Math.round(bounds.y + bounds.height / 2 - size / 2),
    width: size,
    height: size
  };
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function interpolateBounds(from, to, t) {
  return {
    x: Math.round(lerp(from.x, to.x, t)),
    y: Math.round(lerp(from.y, to.y, t)),
    width: Math.round(lerp(from.width, to.width, t)),
    height: Math.round(lerp(from.height, to.height, t))
  };
}

function animateWindowTransition({ fromBounds, toBounds, onFrame, onDone }) {
  const start = Date.now();
  const timer = setInterval(() => {
    const elapsed = Date.now() - start;
    const amount = Math.min(1, elapsed / ANIMATION_MS);
    const eased = easeInOut(amount);
    onFrame(interpolateBounds(fromBounds, toBounds, eased), eased);
    if (amount >= 1) {
      clearInterval(timer);
      onDone();
    }
  }, 16);
}

function applyAlwaysOnTop(window) {
  if (!window || window.isDestroyed()) return;
  window.setAlwaysOnTop(true, "screen-saver");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function createMainWindow() {
  const display = activeDisplay();
  preferredDisplayId = display.id;
  mainWindow = new BrowserWindow({
    ...mainBoundsForDisplay(display),
    minWidth: 720,
    minHeight: 480,
    title: "Activity Product Live Wall FLOAT",
    show: false,
    frame: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  applyAlwaysOnTop(mainWindow);
  mainWindow.loadFile(dashboardPath());
  mainWindow.once("ready-to-show", () => {
    showMainWindow();
  });
  mainWindow.on("move", () => {
    if (!isAnimating && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      rememberDisplayForBounds(mainWindow.getBounds());
    }
  });
  mainWindow.on("resize", () => {
    if (!isAnimating && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      rememberDisplayForBounds(mainWindow.getBounds());
    }
  });
  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    minimizeToLauncher();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });
}

function createLauncherWindow() {
  const display = activeDisplay();
  const bounds = defaultLauncherBounds(display);
  launcherWindow = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    hasShadow: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "launcher-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  applyAlwaysOnTop(launcherWindow);
  launcherWindow.loadFile(path.join(__dirname, "launcher.html"));
  launcherWindow.on("closed", () => {
    launcherWindow = null;
  });
  lastLauncherBounds = bounds;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const display = activeDisplay();
  preferredDisplayId = display.id;
  mainWindow.setBounds(mainBoundsForDisplay(display), false);
  mainWindow.setOpacity(1);
  applyAlwaysOnTop(mainWindow);
  mainWindow.show();
  mainWindow.focus();
}

function minimizeToLauncher() {
  if (isAnimating || !mainWindow || !launcherWindow) return;
  isAnimating = true;
  const display = rememberDisplayForBounds(mainWindow.getBounds());
  const targetBounds = launcherBoundsForDisplay(display);
  const previewBounds = centeredBounds(PREVIEW_SIZE, targetBounds);
  const mainStartBounds = mainWindow.getBounds();
  lastLauncherBounds = targetBounds;

  applyAlwaysOnTop(mainWindow);
  applyAlwaysOnTop(launcherWindow);
  launcherWindow.setBounds(previewBounds, false);
  launcherWindow.setOpacity(0);
  launcherWindow.showInactive();
  mainWindow.show();

  animateWindowTransition({
    fromBounds: mainStartBounds,
    toBounds: targetBounds,
    onFrame(bounds, amount) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setBounds(bounds, false);
        mainWindow.setOpacity(1 - amount);
      }
      if (launcherWindow && !launcherWindow.isDestroyed()) {
        const launcherBounds = interpolateBounds(previewBounds, targetBounds, amount);
        launcherWindow.setBounds(launcherBounds, false);
        launcherWindow.setOpacity(amount);
      }
    },
    onDone() {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.setOpacity(1);
        mainWindow.setBounds(mainStartBounds, false);
      }
      if (launcherWindow && !launcherWindow.isDestroyed()) {
        launcherWindow.setBounds(targetBounds, false);
        launcherWindow.setOpacity(1);
        launcherWindow.showInactive();
      }
      isAnimating = false;
    }
  });
}

function restoreFromLauncher() {
  if (isAnimating || !mainWindow || !launcherWindow) return;
  isAnimating = true;
  const launcherBounds = clampLauncherBounds(launcherWindow.getBounds());
  const display = rememberDisplayForBounds(launcherBounds);
  const finalBounds = mainBoundsForDisplay(display);
  lastLauncherBounds = launcherBounds;

  applyAlwaysOnTop(mainWindow);
  applyAlwaysOnTop(launcherWindow);
  mainWindow.setBounds(launcherBounds, false);
  mainWindow.setOpacity(0);
  mainWindow.show();
  launcherWindow.showInactive();

  animateWindowTransition({
    fromBounds: launcherBounds,
    toBounds: finalBounds,
    onFrame(bounds, amount) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setBounds(bounds, false);
        mainWindow.setOpacity(amount);
      }
      if (launcherWindow && !launcherWindow.isDestroyed()) {
        launcherWindow.setOpacity(1 - amount);
      }
    },
    onDone() {
      if (launcherWindow && !launcherWindow.isDestroyed()) {
        launcherWindow.hide();
        launcherWindow.setOpacity(1);
        launcherWindow.setBounds(launcherBounds, false);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setBounds(finalBounds, false);
        mainWindow.setOpacity(1);
        mainWindow.focus();
      }
      isAnimating = false;
    }
  });
}

function moveLauncherTo(screenX, screenY) {
  if (!launcherWindow || !launcherDrag) return;
  const nextBounds = {
    x: Math.round(launcherDrag.origin.x + (screenX - launcherDrag.start.x)),
    y: Math.round(launcherDrag.origin.y + (screenY - launcherDrag.start.y)),
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE
  };
  const display = displayForBounds(nextBounds);
  preferredDisplayId = display.id;
  const clamped = clampLauncherBounds(nextBounds);
  lastLauncherBounds = clamped;
  launcherWindow.setBounds(clamped, false);
}

ipcMain.on("float:minimize", () => minimizeToLauncher());
ipcMain.on("float:off", () => app.quit());
ipcMain.on("launcher:restore", () => restoreFromLauncher());
ipcMain.on("launcher:drag-start", (_event, point) => {
  if (!launcherWindow) return;
  launcherDrag = {
    start: point,
    origin: launcherWindow.getBounds()
  };
});
ipcMain.on("launcher:drag-move", (_event, point) => {
  moveLauncherTo(point.x, point.y);
});
ipcMain.on("launcher:drag-end", () => {
  launcherDrag = null;
});

app.whenReady().then(() => {
  createLauncherWindow();
  createMainWindow();

  app.on("activate", () => {
    if (!mainWindow) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  // The launcher/dashboard are hidden during FLOAT transitions, not closed.
});
