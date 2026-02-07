/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const { createClient } = require("@supabase/supabase-js");

function loadDotEnvFile(filePath) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function countByCenter(sb, table, centerId) {
  const { count, error } = await sb
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("center_id", centerId);
  if (error) return { table, error: error.message };
  return { table, count };
}

async function totalCount(sb, table) {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  if (error) return { table, error: error.message };
  return { table, count };
}

async function main() {
  const envPath = process.argv[2] || ".vercel/.env.production.local";
  loadDotEnvFile(envPath);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env file");
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: centers, error: cErr } = await sb
    .from("centers")
    .select("id,name,code,created_at")
    .order("created_at", { ascending: true });
  if (cErr) throw cErr;

  console.log("Centers:");
  for (const c of centers) console.log(`- ${c.code}\t${c.name}\t${c.id}`);

  const defaultCenter = centers.find((c) => c.code === "default");
  const motoCenter = centers.find((c) => c.code === "MOTO") || centers.find((c) => c.code === "moto");
  const singalByName = centers.find((c) => c.name === "신갈롤링트라이브");

  console.log("\nSelected:");
  console.log("default:", defaultCenter ? `${defaultCenter.code} ${defaultCenter.id}` : "NOT_FOUND");
  console.log("moto:", motoCenter ? `${motoCenter.code} ${motoCenter.id}` : "NOT_FOUND");
  console.log("byName(신갈롤링트라이브):", singalByName ? `${singalByName.code} ${singalByName.id}` : "NOT_FOUND");

  const tables = [
    "admin_users",
    "admin_requests",
    "receipts",
    "inquiries",
    "as_receipts",
    "todos",
    "forum_posts",
    "forum_comments",
    "forum_notifications",
  ];

  for (const center of [defaultCenter, motoCenter, singalByName]) {
    if (!center) continue;
    console.log(`\nCounts for center ${center.code} (${center.name})`);
    for (const t of tables) {
      const r = await countByCenter(sb, t, center.id);
      console.log(`- ${t}:`, r.error ? `ERROR ${r.error}` : r.count);
    }
  }

  console.log("\nTotals:");
  for (const t of ["receipts", "inquiries", "as_receipts", "todos"]) {
    const r = await totalCount(sb, t);
    console.log(`- ${t}:`, r.error ? `ERROR ${r.error}` : r.count);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

