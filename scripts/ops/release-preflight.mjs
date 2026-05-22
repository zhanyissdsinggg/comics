import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_PLAYWRIGHT_PORTS = {
  browser: "4473",
  funnel: "4573",
  store: "4673",
  comments: "4773",
};

function runCommand(label, command, args, env) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    console.log(`[release-preflight] start ${label}`);

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env,
    });

    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      const durationMs = Date.now() - startedAt;
      if (code === 0) {
        console.log(`[release-preflight] pass ${label} (${durationMs}ms)`);
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} failed (exit=${code}, durationMs=${durationMs})`,
        ),
      );
    });
  });
}

function createNpmRunner() {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    return {
      command: "cmd.exe",
      rootArgs: (scriptName) => ["/d", "/s", "/c", `npm run ${scriptName}`],
      frontendArgs: (scriptName) => [
        "/d",
        "/s",
        "/c",
        `npm --prefix frontend run ${scriptName}`,
      ],
    };
  }

  return {
    command: "npm",
    rootArgs: (scriptName) => ["run", scriptName],
    frontendArgs: (scriptName) => ["--prefix", "frontend", "run", scriptName],
  };
}

async function main() {
  const npmRunner = createNpmRunner();
  const baseEnv = { ...process.env };

  await runCommand(
    "check:all",
    npmRunner.command,
    npmRunner.rootArgs("check:all"),
    baseEnv,
  );

  const frontendSuites = [
    {
      script: "test:e2e:browser",
      port:
        String(
          process.env.OPS_RELEASE_PLAYWRIGHT_PORT_BROWSER ||
            DEFAULT_PLAYWRIGHT_PORTS.browser,
        ).trim() || DEFAULT_PLAYWRIGHT_PORTS.browser,
    },
    {
      script: "test:e2e:funnel",
      port:
        String(
          process.env.OPS_RELEASE_PLAYWRIGHT_PORT_FUNNEL ||
            DEFAULT_PLAYWRIGHT_PORTS.funnel,
        ).trim() || DEFAULT_PLAYWRIGHT_PORTS.funnel,
    },
    {
      script: "test:e2e:store",
      port:
        String(
          process.env.OPS_RELEASE_PLAYWRIGHT_PORT_STORE ||
            DEFAULT_PLAYWRIGHT_PORTS.store,
        ).trim() || DEFAULT_PLAYWRIGHT_PORTS.store,
    },
    {
      script: "test:e2e:comments",
      port:
        String(
          process.env.OPS_RELEASE_PLAYWRIGHT_PORT_COMMENTS ||
            DEFAULT_PLAYWRIGHT_PORTS.comments,
        ).trim() || DEFAULT_PLAYWRIGHT_PORTS.comments,
    },
  ];

  for (const suite of frontendSuites) {
    const env = {
      ...baseEnv,
      PLAYWRIGHT_PORT: suite.port,
    };

    await runCommand(
      `frontend:${suite.script}`,
      npmRunner.command,
      npmRunner.frontendArgs(suite.script),
      env,
    );
  }
}

main().catch((error) => {
  console.error(
    `[release-preflight] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
