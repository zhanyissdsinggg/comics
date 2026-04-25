import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const distDir = String(process.env.NEXT_DIST_DIR || ".next").trim() || ".next";
const nextDir = path.join(frontendRoot, distDir);

function bestEffortRemove(targetDir) {
  fs.rmSync(targetDir, {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 200,
  });
}

function safeCleanNextArtifacts(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`[clean-next] nothing to remove at ${dir}`);
    return;
  }

  try {
    bestEffortRemove(dir);
    console.log(`[clean-next] removed ${dir}`);
    return;
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.log(`[clean-next] nothing to remove at ${dir}`);
      return;
    }

    // If Windows refuses to delete the folder due to open handles, try an atomic rename
    // so the upcoming Next build starts from a clean slate.
    const staleDir = `${dir}-stale-${Date.now()}`;
    try {
      fs.renameSync(dir, staleDir);
      console.log(`[clean-next] renamed ${dir} -> ${staleDir}`);
      try {
        bestEffortRemove(staleDir);
        console.log(`[clean-next] removed ${staleDir}`);
      } catch (removeError) {
        console.warn(`[clean-next] could not remove ${staleDir} (ignored)`);
        console.warn(removeError);
      }
      return;
    } catch (renameError) {
      console.warn(`[clean-next] failed to remove ${dir} (continuing anyway)`);
      console.warn(error);
      console.warn(`[clean-next] also failed to rename ${dir} (ignored)`);
      console.warn(renameError);
      return;
    }
  }
}

safeCleanNextArtifacts(nextDir);
