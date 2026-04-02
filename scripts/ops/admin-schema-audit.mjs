import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const requireFromBackend = createRequire(path.join(process.cwd(), "backend/package.json"));
const { Client } = requireFromBackend("pg");

const REQUIRED_SUPPORT_TICKET_COLUMNS = [
  "replyEmail",
  "orderId",
  "topic",
];
const REQUIRED_ORDER_COLUMNS = [
  "priceSnapshot",
  "idempotencyKey",
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
    const adminMembersResult = await client.query(`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public' and table_name = 'admin_members'
      ) as exists;
    `);
    const supportColumnsResult = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'support_tickets'
      order by ordinal_position;
    `);
    const orderColumnsResult = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'orders'
      order by ordinal_position;
    `);

    const supportTicketColumns = supportColumnsResult.rows.map((row) => row.column_name);
    const orderColumns = orderColumnsResult.rows.map((row) => row.column_name);
    const missingSupportColumns = REQUIRED_SUPPORT_TICKET_COLUMNS.filter(
      (column) => !supportTicketColumns.includes(column),
    );
    const missingOrderColumns = REQUIRED_ORDER_COLUMNS.filter(
      (column) => !orderColumns.includes(column),
    );

    return {
      adminMembersExists: Boolean(adminMembersResult.rows[0]?.exists),
      supportTicketColumns,
      missingSupportColumns,
      orderColumns,
      missingOrderColumns,
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
    "[ops-admin-schema] missing_support_ticket_columns=",
    summary.missingSupportColumns.join(",") || "(none)",
  );
  console.log(
    "[ops-admin-schema] orders_columns=",
    summary.orderColumns.join(",") || "(none)",
  );
  console.log(
    "[ops-admin-schema] missing_order_columns=",
    summary.missingOrderColumns.join(",") || "(none)",
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
    if (
      !summary.adminMembersExists
      || summary.missingSupportColumns.length > 0
      || summary.missingOrderColumns.length > 0
    ) {
      process.exitCode = 1;
    }
  }
}

run().catch((error) => {
  console.error("[ops-admin-schema] audit failed", error);
  process.exit(1);
});
