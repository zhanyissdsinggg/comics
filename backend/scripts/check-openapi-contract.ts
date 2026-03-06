import { existsSync, rmSync } from "fs";
import { resolve } from "path";
import {
  generateOpenApiContract,
  readStableJsonFile,
} from "./openapi-contract";

async function main() {
  const expectedPath = resolve(process.cwd(), "contracts/openapi.snapshot.json");
  const actualPath = resolve(process.cwd(), "contracts/.openapi.current.json");

  if (!existsSync(expectedPath)) {
    console.error(`[openapi] snapshot missing: ${expectedPath}`);
    console.error("[openapi] run `npm run contract:update` to create snapshot first.");
    process.exit(1);
  }

  await generateOpenApiContract(actualPath);

  const expected = readStableJsonFile(expectedPath);
  const actual = readStableJsonFile(actualPath);

  if (expected !== actual) {
    console.error("[openapi] contract drift detected.");
    console.error("[openapi] API routes/schema changed but snapshot was not updated.");
    console.error("[openapi] run `npm run contract:update` and commit updated snapshot.");
    process.exit(1);
  }

  rmSync(actualPath, { force: true });
  console.log("[openapi] contract check passed.");
}

main().catch((error) => {
  console.error("[openapi] contract check failed unexpectedly");
  console.error(error);
  process.exit(1);
});
