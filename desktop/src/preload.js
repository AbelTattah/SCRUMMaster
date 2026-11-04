"use strict";

const { contextBridge } = require("electron");

// Minimal bridge: the web app stays platform-agnostic, this only lets it know
// it is running inside the desktop shell (future: native menus, deep links).
contextBridge.exposeInMainWorld("scrumMasterDesktop", {
  platform: process.platform,
  electron: true,
});
