/**
 * electron-main.cjs - Electron Main Process Wrapper
 * This script runs the Express.js server inside a background fork,
 * and launches a native Chromium-based browser window pointing to localhost:3000.
 */

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { fork } = require("child_process");

let serverProcess = null;
let mainWindow = null;

function startExpressServer() {
  // We force production environment so that Express serves static build files inside dist/
  process.env.NODE_ENV = "production";
  process.env.PORT = "3000";

  // Point to our compiled bundle
  const serverPath = path.join(__dirname, "dist", "server.cjs");
  
  // Fork node process to run the background web server
  serverProcess = fork(serverPath, [], {
    env: { ...process.env },
    silent: false
  });

  serverProcess.on("message", (msg) => {
    console.log("[Express Server Msg]:", msg);
  });

  serverProcess.on("error", (err) => {
    console.error("[Express Server Error]:", err);
  });

  serverProcess.on("exit", (code) => {
    console.log(`[Express Server] exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    title: "ESP32 IoT Dashboard Client - Offline desktop version",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Small delay for express server to bind the port and compile resources
  setTimeout(() => {
    mainWindow.loadURL("http://localhost:3000").catch((err) => {
      console.warn("Express server is taking longer than expected. Retrying loadURL...", err);
      setTimeout(() => {
        mainWindow.loadURL("http://localhost:3000");
      }, 2000);
    });
  }, 1800);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", () => {
  startExpressServer();
  createWindow();
});

app.on("window-all-closed", () => {
  // On macOS it is common for applications to stay open until explicit Cmd+Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up background server on quit
app.on("will-quit", () => {
  if (serverProcess) {
    console.log("Shutting down background Express server...");
    serverProcess.kill();
  }
});
