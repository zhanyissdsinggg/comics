import { resolve } from "path";
import { generateOpenApiContract } from "./openapi-contract";

async function main() {
  const outputArg = process.argv[2] || "contracts/openapi.snapshot.json";
  const outputPath = resolve(process.cwd(), outputArg);
  await generateOpenApiContract(outputPath);
  console.log(`[openapi] generated contract snapshot: ${outputPath}`);
}

main().catch((error) => {
  console.error("[openapi] failed to generate contract snapshot");
  console.error(error);
  process.exit(1);
});
