const { contextBridge, ipcRenderer } = require("electron");

const pendingWindowControls = new Set();

async function invokeWindowControl(action) {
  if (pendingWindowControls.has(action)) {
    return { ok: false, reason: "control-click-already-pending" };
  }
  pendingWindowControls.add(action);
  try {
    return await ipcRenderer.invoke(`float:${action}`);
  } catch (error) {
    console.error(`Teacher FLOAT ${action} control failed:`, error);
    return { ok: false, reason: "ipc-failed" };
  } finally {
    window.setTimeout(() => pendingWindowControls.delete(action), 250);
  }
}

contextBridge.exposeInMainWorld("teacherFloatDesktop", {
  minimize: () => invokeWindowControl("minimize"),
  off: () => invokeWindowControl("off")
});

ipcRenderer.on("float:native-layout-change", () => {
  window.dispatchEvent(new Event("teacher-float-native-layout-change"));
});

function buttonAction(button) {
  const explicitAction = button.getAttribute("data-teacher-float-desktop-action");
  if (explicitAction === "minimize" || explicitAction === "off") return explicitAction;
  const label = (button.textContent || "").trim().toUpperCase();
  if (label === "MIN") return "minimize";
  if (label === "OFF") return "off";
  return "";
}

function installNativeControlClickRouting() {
  if (window.__teacherFloatWindowsControlRouting) return;
  window.__teacherFloatWindowsControlRouting = true;
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      const closest = typeof target?.closest === "function"
        ? target.closest.bind(target)
        : target?.parentElement?.closest?.bind(target.parentElement);
      if (!closest) return;
      const button = closest("[data-teacher-float-desktop-action], .float-window-controls .float-window-control");
      if (!button) return;
      const action = buttonAction(button);
      if (!action) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      invokeWindowControl(action);
    },
    true
  );
}

function installDesktopControls() {
  installNativeControlClickRouting();
  document.body.classList.add("teacher-float-windows-desktop");
  if (document.getElementById("desktopFloatControls")) return;

  const style = document.createElement("style");
  style.textContent = `
    body.teacher-float-windows-desktop .topbar,
    body.teacher-float-windows-desktop .title-stack {
      -webkit-app-region: drag;
      pointer-events: auto !important;
    }
    body.teacher-float-windows-desktop .top-actions,
    body.teacher-float-windows-desktop .top-actions *,
    body.teacher-float-windows-desktop button,
    body.teacher-float-windows-desktop input,
    body.teacher-float-windows-desktop select,
    body.teacher-float-windows-desktop textarea,
    body.teacher-float-windows-desktop a,
    body.teacher-float-windows-desktop video,
    body.teacher-float-windows-desktop audio,
    body.teacher-float-windows-desktop canvas,
    body.teacher-float-windows-desktop [contenteditable="true"] {
      -webkit-app-region: no-drag;
    }
    #desktopFloatControls {
      --desktop-float-controls-width: 150px;
      --desktop-float-launcher-strip-width: 298px;
      position: fixed;
      top: calc(12px + env(safe-area-inset-top, 0px));
      left: clamp(
        calc(8px + env(safe-area-inset-left, 0px)),
        calc(100vw - 12px - env(safe-area-inset-right, 0px) - var(--desktop-float-launcher-strip-width) - var(--desktop-float-controls-width)),
        calc(100vw - 12px - env(safe-area-inset-right, 0px) - var(--desktop-float-controls-width))
      );
      right: auto;
      z-index: 263;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      border-radius: 999px;
      background: linear-gradient(145deg, rgba(255,225,96,.28), rgba(255,255,255,.14) 46%, rgba(155,99,0,.1));
      border: 1px solid rgba(255,238,172,.62);
      box-shadow: 0 22px 34px rgba(41,48,76,.24), inset 0 1px 0 rgba(255,255,255,.62);
      backdrop-filter: blur(26px) saturate(176%) brightness(1.08);
      transform: none;
      -webkit-app-region: no-drag;
    }
    #desktopFloatControls.is-docked-top-actions {
      position: relative;
      top: auto;
      left: auto;
      right: auto;
      z-index: 262;
      flex: 0 0 auto;
      margin-left: 2px;
      transform: none;
    }
    #desktopFloatControls button {
      min-width: 62px;
      height: 44px;
      padding: 0 14px;
      border: 1px solid rgba(255,247,201,.95);
      border-radius: 999px;
      color: #5a3900;
      background: linear-gradient(180deg, #fff4b5 0%, #ffd54d 54%, #f4b400 100%);
      box-shadow: 0 12px 22px rgba(120,79,0,.22), inset 0 1px 0 rgba(255,255,255,.72), inset 0 -1px 0 rgba(164,103,0,.2);
      font: 900 12px "Avenir Next Rounded", "Trebuchet MS", sans-serif;
      letter-spacing: .08em;
      cursor: pointer;
      -webkit-app-region: no-drag;
    }
    @media (max-width: 760px) {
      #desktopFloatControls {
        --desktop-float-launcher-strip-width: 252px;
      }
    }
    @media (max-width: 520px) {
      #desktopFloatControls {
        --desktop-float-controls-width: 132px;
        --desktop-float-launcher-strip-width: 228px;
        gap: 6px;
        padding: 5px;
      }
      #desktopFloatControls button {
        min-width: 0;
        height: 42px;
        padding: 0 10px;
        font-size: 11px;
      }
    }
  `;
  document.head.appendChild(style);

  const controls = document.createElement("div");
  controls.id = "desktopFloatControls";
  controls.setAttribute("aria-label", "Desktop FLOAT controls");

  const minimize = document.createElement("button");
  minimize.type = "button";
  minimize.textContent = "MIN";
  minimize.setAttribute("data-teacher-float-desktop-action", "minimize");
  minimize.setAttribute("aria-label", "Minimize FLOAT to the floating launcher");

  const off = document.createElement("button");
  off.type = "button";
  off.textContent = "OFF";
  off.setAttribute("data-teacher-float-desktop-action", "off");
  off.setAttribute("aria-label", "Turn FLOAT off");

  controls.append(minimize, off);
  const dockControls = () => {
    const topActions = document.querySelector(".top-actions");
    if (!topActions) return false;
    const luckyLauncher = topActions.querySelector("#luckyLauncherControl");
    controls.classList.add("is-docked-top-actions");
    if (luckyLauncher && luckyLauncher.parentNode === topActions) {
      topActions.insertBefore(controls, luckyLauncher.nextSibling);
    } else {
      topActions.appendChild(controls);
    }
    return true;
  };
  if (!dockControls()) {
    document.body.appendChild(controls);
    window.requestAnimationFrame(() => {
      dockControls();
    });
  }

  const floatToggle = document.getElementById("floatToggleBtn");
  if (floatToggle) {
    floatToggle.textContent = "FLOAT ON";
    floatToggle.classList.add("active");
    floatToggle.setAttribute("aria-pressed", "true");
    floatToggle.disabled = true;
    floatToggle.title = "Windows desktop FLOAT is active.";
  }
}

window.addEventListener("DOMContentLoaded", installDesktopControls);
