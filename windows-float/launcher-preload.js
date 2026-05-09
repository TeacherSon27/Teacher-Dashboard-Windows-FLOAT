const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("teacherFloatLauncher", {
  dragStart: (x, y) => ipcRenderer.send("launcher:drag-start", { x, y }),
  dragMove: (x, y) => ipcRenderer.send("launcher:drag-move", { x, y }),
  dragEnd: () => ipcRenderer.send("launcher:drag-end"),
  restore: () => ipcRenderer.send("launcher:restore")
});
