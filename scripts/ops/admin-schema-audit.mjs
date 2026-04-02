import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const requireFromBackend = createRequire(path.join(process.cwd(), "backend/package.json"));
const { Client } = requireFromBackend("pg");

const REQUIRED_SUPPORT_TICKET_OPTIONAL_COLUMNS = [
  "replyEmail",
  "orderId",
  "topic",
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) {
      env[key] = value;
    }
  }

  return env;
}

function resolveDatabaseUrl() {
  const direct = String(process.env.DATABASE_URL || "").trim();
  if (direct) {
    return direct;
  }

  const backendEnvPath = path.join(process.cwd(), "backend/.env");
  const envFile = parseEnvFile(backendEnvPath);
  return String(envFile.DATABASE_URL || "").trim();
}

async function readSchemaState(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const [adminMembersResult, supportColumnsResult] = await Promise.all([
      client.query(`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public' and table_name = 'admin_members'
        ) as exists;
      `),
      client.query(`
        select column_name
        from information_schema.columns
        where table_schema = 'public' and table_name = 'support_tickets'
        order by ordinal_position;
      `),
    ]);

    const supportTicketColumns = supportColumnsResult.rows.map((row) => row.column_name);
    const missingSupportOptionalColumns = REQUIRED_SUPPORT_TICKET_OPTIONAL_COLUMNS.filter(
      (column) => !supportTicketColumns.includes(column),
    );

    return {
      adminMembersExists: Boolean(adminMembersResult.rows[0]?.exists),
      supportTicketColumns,
      missingSupportOptionalColumns,
    };
  } finally {
    await client.end();
  }
}

function printSummary(summary) {
  console.log("[ops-admin-schema] admin_members_exists=", summary.adminMembersExists);
  console.log(
    "[ops-admin-schema] support_tickets_columns=",
    summary.supportTicketColumns.join(",") || "(none)",
  );
  console.log(
    "[ops-admin-schema] missing_support_ticket_optional_columns=",
    summary.missingSupportOptionalColumns.join(",") || "(none)",
  );
  console.log(JSON.stringify(summary, null, 2));
}

async function run() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Set it directly or provide backend/.env.");
  }

  const summary = await readSchemaState(databaseUrl);
  printSummary(summary);

  if (process.env.OPS_SCHEMA_REQUIRED === "1") {
    if (!summary.adminMembersExists || summary.missingSupportOptionalColumns.length > 0) {
      process.exitCode = 1;
    }
  }
}

run().catch((error) => {
  console.error("[ops-admin-schema] audit failed", error);
  process.exit(1);
});
