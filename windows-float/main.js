const { app, BrowserWindow, Menu, dialog, ipcMain, screen, session } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const DEV_ROOT_DIR = path.resolve(__dirname, "..");
const APP_FILES_DIR = path.join(__dirname, "app-files");
const APP_NAME = "Teacher FLOAT";
const APP_ID = "com.teacher-dashboard.windows-float";

const WINDOW_INSET = 12;
const LAUNCHER_SIZE = 96;
const LAUNCHER_MARGIN = 24;
const PREVIEW_SIZE = 34;
const ANIMATION_MS = 320;
const RENDERER_RELOAD_LIMIT = 2;
const NATIVE_LAYOUT_CHANGE_DELAYS = [20, 120, 350, 650];

let mainWindow = null;
let launcherWindow = null;
let isAnimating = false;
let lastLauncherBounds = null;
let preferredDisplayId = null;
let launcherDrag = null;
let rendererReloadCount = 0;
let unresponsiveReloadTimer = null;
let activeAnimationTimer = null;
let nativeLayoutTimers = new Set();
let isQuitting = false;
app.setName(APP_NAME);
if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}
const hasSingleInstanceLock = app.requestSingleInstanceLock();

const mediaPermissions = new Set(["media", "camera", "microphone", "display-capture"]);

function dashboardPathCandidates() {
  const exeDir = app.isPackaged ? path.dirname(process.execPath) : null;
  const roots = app.isPackaged
    ? [process.resourcesPath, exeDir, DEV_ROOT_DIR, APP_FILES_DIR]
    : [DEV_ROOT_DIR, APP_FILES_DIR, __dirname, process.cwd()];

  const candidates = [];
  roots.filter(Boolean).forEach((rootDir) => {
    candidates.push(
      path.join(rootDir, "teacher-dashboard-enhanced.html"),
      path.join(rootDir, "index.html"),
      path.join(rootDir, "app-files", "teacher-dashboard-enhanced.html"),
      path.join(rootDir, "app-files", "index.html")
    );
  });

  return [...new Set(candidates)];
}

function dashboardPath() {
  const candidates = dashboardPathCandidates();
  return candidates.find((filePath) => fs.existsSync(filePath)) || candidates[0];
}

function appIconPath() {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "icon.ico"),
        path.join(process.resourcesPath, "assets", "teacher-float-logo.png"),
        path.join(path.dirname(process.execPath), "icon.ico")
      ]
    : [
        path.join(__dirname, "build", "icon.ico"),
        path.join(APP_FILES_DIR, "assets", "teacher-float-logo.png")
      ];
  return candidates.find((filePath) => filePath && fs.existsSync(filePath)) || undefined;
}

function showStartupError(title, message) {
  logAppEvent("error", title, message);
  dialog.showErrorBox(title, message);
  app.quit();
}

function logAppEvent(level, message, detail) {
  const detailText = detail ? ` ${String(detail).replace(/\s+/g, " ").trim()}` : "";
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${detailText}`;
  const logFn = typeof console[level] === "function" ? console[level] : console.log;
  logFn(line);
  try {
    if (!app.isReady()) return;
    fs.appendFile(path.join(app.getPath("userData"), "teacher-float.log"), `${line}\n`, () => {});
  } catch (_error) {
    // Logging must never interfere with classroom use.
  }
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

function isTrustedDashboardUrl(url) {
  try {
    return new URL(url).protocol === "file:";
  } catch (_error) {
    return false;
  }
}

function clearUnresponsiveReloadTimer() {
  if (!unresponsiveReloadTimer) return;
  clearTimeout(unresponsiveReloadTimer);
  unresponsiveReloadTimer = null;
}

function clearActiveAnimationTimer() {
  if (!activeAnimationTimer) return;
  clearInterval(activeAnimationTimer);
  activeAnimationTimer = null;
}

function clearNativeLayoutTimers() {
  nativeLayoutTimers.forEach((timer) => clearTimeout(timer));
  nativeLayoutTimers.clear();
}

function isFiniteScreenPoint(point) {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
}

function configureMediaPermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (!mediaPermissions.has(permission)) {
      callback(false);
      return;
    }
    callback(isTrustedDashboardUrl(webContents.getURL()));
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (!mediaPermissions.has(permission)) return false;
    const sourceUrl = details?.embeddingOrigin || webContents?.getURL() || requestingOrigin;
    return isTrustedDashboardUrl(sourceUrl) || requestingOrigin === "file://";
  });
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
  clearActiveAnimationTimer();
  const start = Date.now();
  const timer = setInterval(() => {
    const elapsed = Date.now() - start;
    const amount = Math.min(1, elapsed / ANIMATION_MS);
    const eased = easeInOut(amount);
    onFrame(interpolateBounds(fromBounds, toBounds, eased), eased);
    if (amount >= 1) {
      clearInterval(timer);
      if (activeAnimationTimer === timer) activeAnimationTimer = null;
      onDone();
    }
  }, 16);
  activeAnimationTimer = timer;
}

function applyAlwaysOnTop(window) {
  if (!window || window.isDestroyed()) return;
  window.setAlwaysOnTop(true, "screen-saver");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function notifyDashboardNativeLayoutChange() {
  clearNativeLayoutTimers();
  NATIVE_LAYOUT_CHANGE_DELAYS.forEach((delay) => {
    const timer = setTimeout(() => {
      nativeLayoutTimers.delete(timer);
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.webContents.isDestroyed()) return;
      mainWindow.webContents.send("float:native-layout-change");
    }, delay);
    nativeLayoutTimers.add(timer);
  });
}

function hideLauncherWindow() {
  if (!launcherWindow || launcherWindow.isDestroyed()) return;
  launcherWindow.hide();
  launcherWindow.setOpacity(1);
}

function eventSenderUrl(event) {
  return event?.senderFrame?.url || event?.sender?.getURL?.() || "";
}

function isMainWindowSender(event) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return event?.sender === mainWindow.webContents;
}

function isLauncherWindowSender(event) {
  if (!launcherWindow || launcherWindow.isDestroyed()) return false;
  return event?.sender === launcherWindow.webContents;
}

function reloadDashboard(window, dashboardFile) {
  if (!window || window.isDestroyed()) return;
  window.loadFile(dashboardFile).catch((error) => {
    showStartupError(
      "Teacher FLOAT could not reload the dashboard",
      `The dashboard became unstable and could not be reloaded.\n\n${error.message}`
    );
  });
}

function installMainWindowSafeguards(window, dashboardFile) {
  if (!window || window.isDestroyed()) return;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  window.webContents.on("zoom-changed", (event) => {
    event.preventDefault();
    if (!window.isDestroyed()) window.webContents.setZoomFactor(1);
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedDashboardUrl(url)) event.preventDefault();
  });
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    showStartupError(
      "Teacher FLOAT could not keep the dashboard loaded",
      `The dashboard failed to load in the Windows renderer.\n\n${errorDescription || "Unknown loading error"}\n${validatedURL || dashboardFile}`
    );
  });
  window.webContents.on("did-finish-load", () => {
    rendererReloadCount = 0;
    clearUnresponsiveReloadTimer();
    notifyDashboardNativeLayoutChange();
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    clearUnresponsiveReloadTimer();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    rendererReloadCount += 1;
    if (rendererReloadCount > RENDERER_RELOAD_LIMIT) {
      showStartupError(
        "Teacher FLOAT dashboard stopped responding",
        `The dashboard renderer stopped repeatedly (${details.reason || "unknown reason"}). Close other heavy apps or restart Teacher FLOAT.`
      );
      return;
    }
    reloadDashboard(mainWindow, dashboardFile);
  });
  window.webContents.on("unresponsive", () => {
    clearUnresponsiveReloadTimer();
    unresponsiveReloadTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      reloadDashboard(mainWindow, dashboardFile);
    }, 15000);
  });
  window.webContents.on("responsive", clearUnresponsiveReloadTimer);
  window.on("closed", clearUnresponsiveReloadTimer);
}

function createMainWindow() {
  const display = activeDisplay();
  preferredDisplayId = display.id;
  mainWindow = new BrowserWindow({
    ...mainBoundsForDisplay(display),
    minWidth: 720,
    minHeight: 480,
    title: APP_NAME,
    show: false,
    frame: false,
    thickFrame: true,
    hasShadow: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    backgroundColor: "#070b1a",
    icon: appIconPath(),
    resizable: true,
    maximizable: true,
    minimizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      spellcheck: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  applyAlwaysOnTop(mainWindow);
  const dashboardFile = dashboardPath();
  installMainWindowSafeguards(mainWindow, dashboardFile);
  mainWindow.loadFile(dashboardFile).catch((error) => {
    const searched = dashboardPathCandidates().map((filePath) => `- ${filePath}`).join("\n");
    showStartupError(
      "Teacher FLOAT could not open the dashboard",
      `Could not load:\n${dashboardFile}\n\n${error.message}\n\nFiles checked:\n${searched}`
    );
  });
  mainWindow.once("ready-to-show", () => {
    showMainWindow();
  });
  mainWindow.on("move", () => {
    if (!isAnimating && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      rememberDisplayForBounds(mainWindow.getBounds());
      notifyDashboardNativeLayoutChange();
    }
  });
  mainWindow.on("resize", () => {
    if (!isAnimating && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      rememberDisplayForBounds(mainWindow.getBounds());
      notifyDashboardNativeLayoutChange();
    }
  });
  mainWindow.on("minimize", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    minimizeToLauncher();
  });
  mainWindow.on("restore", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    applyAlwaysOnTop(mainWindow);
    notifyDashboardNativeLayoutChange();
  });
  mainWindow.on("close", () => {
    isQuitting = true;
    clearActiveAnimationTimer();
    clearUnresponsiveReloadTimer();
    clearNativeLayoutTimers();
    launcherDrag = null;
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.close();
    }
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
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "launcher-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      spellcheck: false
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
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.setSkipTaskbar(true);
  mainWindow.setBounds(mainBoundsForDisplay(display), false);
  mainWindow.setOpacity(1);
  applyAlwaysOnTop(mainWindow);
  mainWindow.show();
  mainWindow.focus();
  notifyDashboardNativeLayoutChange();
}

function minimizeMainWindowToLauncher() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, reason: "main-window-unavailable" };
  }
  if (isQuitting) {
    return { ok: false, reason: "application-closing" };
  }
  if (isAnimating) {
    return { ok: false, reason: "window-transition-active" };
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  minimizeToLauncher();
  return { ok: true, minimized: true, target: "launcher" };
}

function closeMainWindowSafely() {
  if (isQuitting) {
    return { ok: true, closing: true };
  }
  isQuitting = true;
  clearActiveAnimationTimer();
  clearUnresponsiveReloadTimer();
  clearNativeLayoutTimers();
  launcherDrag = null;
  try {
    hideLauncherWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    } else {
      app.quit();
    }
    return { ok: true, closing: true };
  } catch (error) {
    logAppEvent("error", "Could not close the main window cleanly.", error.message);
    app.quit();
    return { ok: false, reason: "close-failed" };
  }
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
      notifyDashboardNativeLayoutChange();
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
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.setSkipTaskbar(true);
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
      notifyDashboardNativeLayoutChange();
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

function handleMainWindowControl(event, action) {
  if (!isMainWindowSender(event)) {
    logAppEvent("warn", `Rejected unauthorized window-control IPC: ${action || "unknown"}`);
    return { ok: false, reason: "unauthorized-sender" };
  }
  if (action === "minimize") return minimizeMainWindowToLauncher();
  if (action === "off") return closeMainWindowSafely();
  return { ok: false, reason: "unknown-action" };
}

ipcMain.handle("float:minimize", (event) => handleMainWindowControl(event, "minimize"));
ipcMain.handle("float:off", (event) => handleMainWindowControl(event, "off"));
ipcMain.on("float:minimize", (event) => {
  handleMainWindowControl(event, "minimize");
});
ipcMain.on("float:off", (event) => {
  handleMainWindowControl(event, "off");
});
ipcMain.on("launcher:restore", (event) => {
  if (!isLauncherWindowSender(event)) return;
  restoreFromLauncher();
});
ipcMain.on("launcher:drag-start", (event, point) => {
  if (!isLauncherWindowSender(event)) return;
  if (!launcherWindow || !isFiniteScreenPoint(point)) return;
  launcherDrag = {
    start: point,
    origin: launcherWindow.getBounds()
  };
});
ipcMain.on("launcher:drag-move", (event, point) => {
  if (!isLauncherWindowSender(event)) return;
  if (!isFiniteScreenPoint(point)) return;
  moveLauncherTo(point.x, point.y);
});
ipcMain.on("launcher:drag-end", (event) => {
  if (!isLauncherWindowSender(event)) return;
  launcherDrag = null;
});

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("touch-events", "enabled");
app.commandLine.appendSwitch("disable-pinch");

if (!hasSingleInstanceLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  if (!mainWindow.isVisible()) {
    restoreFromLauncher();
    return;
  }
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  Menu.setApplicationMenu(null);
  configureMediaPermissions();
  createLauncherWindow();
  createMainWindow();

  app.on("activate", () => {
    if (!mainWindow) createMainWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  clearActiveAnimationTimer();
  clearUnresponsiveReloadTimer();
  clearNativeLayoutTimers();
});

app.on("window-all-closed", () => {
  // The app quits through the explicit main-window close path above.
});
