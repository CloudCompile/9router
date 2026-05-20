import fs from "node:fs";
import path from "path";
import os from "os";

const APP_NAME = "9router";

function defaultDir() {
  // On Vercel/serverless, use /tmp which is writable
  if (process.env.VERCEL || process.env.RAILWAY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", APP_NAME);
  }

  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), APP_NAME);
  }
  return path.join(os.homedir(), `.${APP_NAME}`);
}

export function getDataDir() {
  const configured = process.env.DATA_DIR;
  if (!configured) {
    const dir = defaultDir();
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch (e) {
      if (e?.code === "EACCES" || e?.code === "EPERM") {
        console.warn(`[DATA_DIR] '${dir}' not writable, trying /tmp`);
        const tmpDir = path.join("/tmp", APP_NAME);
        try {
          fs.mkdirSync(tmpDir, { recursive: true });
          return tmpDir;
        } catch (tmpErr) {
          console.error(`[DATA_DIR] /tmp also failed, using in-memory only:`, tmpErr.message);
          return null; // Signal in-memory mode
        }
      }
      throw e;
    }
  }

  try {
    fs.mkdirSync(configured, { recursive: true });
    return configured;
  } catch (e) {
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      console.warn(`[DATA_DIR] '${configured}' not writable → fallback /tmp`);
      try {
        fs.mkdirSync("/tmp", { recursive: true });
        return "/tmp";
      } catch {
        return null; // In-memory mode
      }
    }
    throw e;
  }
}

export const DATA_DIR = getDataDir();
