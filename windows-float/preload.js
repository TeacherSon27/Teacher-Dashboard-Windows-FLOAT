const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("teacherFloatDesktop", {
  minimize: () => ipcRenderer.send("float:minimize"),
  off: () => ipcRenderer.send("float:off")
});

function installDesktopControls() {
  if (document.getElementById("desktopFloatControls")) return;

  const style = document.createElement("style");
  style.textContent = `
    #desktopFloatControls {
      position: fixed;
      top: calc(10px + env(safe-area-inset-top, 0px));
      left: 50%;
      z-index: 2147483647;
      display: flex;
      gap: 8px;
      padding: 6px;
      border-radius: 999px;
      background: linear-gradient(145deg, rgba(255,225,96,.28), rgba(255,255,255,.14) 46%, rgba(155,99,0,.1));
      border: 1px solid rgba(255,238,172,.62);
      box-shadow: 0 22px 34px rgba(41,48,76,.24), inset 0 1px 0 rgba(255,255,255,.62);
      backdrop-filter: blur(26px) saturate(176%) brightness(1.08);
      transform: translateX(-50%);
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
    }
  `;
  document.head.appendChild(style);

  const controls = document.createElement("div");
  controls.id = "desktopFloatControls";
  controls.setAttribute("aria-label", "Desktop FLOAT controls");

  const minimize = document.createElement("button");
  minimize.type = "button";
  minimize.textContent = "MIN";
  minimize.setAttribute("aria-label", "Minimize FLOAT to launcher");
  minimize.addEventListener("click", () => window.teacherFloatDesktop.minimize());

  const off = document.createElement("button");
  off.type = "button";
  off.textContent = "OFF";
  off.setAttribute("aria-label", "Turn FLOAT off");
  off.addEventListener("click", () => window.teacherFloatDesktop.off());

  controls.append(minimize, off);
  document.body.appendChild(controls);

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
