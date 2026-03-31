import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const nextDir = path.join(frontendRoot, ".next");

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log(`[clean-next] removed ${nextDir}`);
} catch (error) {
  console.error(`[clean-next] failed to remove ${nextDir}`);
  console.error(error);
  process.exit(1);
}
