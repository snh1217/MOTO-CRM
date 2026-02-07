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
  if (error) throw new Error(`${table} count error: ${error.message}`);
  return count ?? 0;
}

async function moveCenter(sb, table, fromCenterId, toCenterId) {
  // update doesn't return affected row count reliably; fetch before/after counts instead.
  const before = await countByCenter(sb, table, fromCenterId);
  if (before === 0) return { table, moved: 0 };

  const { error } = await sb.from(table).update({ center_id: toCenterId }).eq("center_id", fromCenterId);
  if (error) throw new Error(`${table} update error: ${error.message}`);

  const after = await countByCenter(sb, table, fromCenterId);
  const moved = before - after;
  return { table, moved, remainingFrom: after };
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

  const defaultCenter = centers.find((c) => c.code === "default");
  const motoCenter = centers.find((c) => c.code === "MOTO") || centers.find((c) => c.name === "신갈롤링트라이브");

  if (!defaultCenter) throw new Error("No centers.code=default found");
  if (!motoCenter) throw new Error("No centers.code=MOTO or name=신갈롤링트라이브 found");

  console.log("Moving data from:");
  console.log(`- default: ${defaultCenter.id} (${defaultCenter.name})`);
  console.log("To:");
  console.log(`- target:  ${motoCenter.id} (${motoCenter.name})`);

  const tablesToMove = ["receipts", "inquiries", "as_receipts", "todos", "forum_posts", "forum_comments", "forum_notifications"];

  console.log("\nBefore counts:");
  for (const t of tablesToMove) {
    const n = await countByCenter(sb, t, defaultCenter.id);
    console.log(`- ${t} in default: ${n}`);
  }

  console.log("\nUpdating...");
  for (const t of tablesToMove) {
    const res = await moveCenter(sb, t, defaultCenter.id, motoCenter.id);
    console.log(`- ${t}: moved=${res.moved}`);
  }

  console.log("\nAfter counts:");
  for (const t of tablesToMove) {
    const nFrom = await countByCenter(sb, t, defaultCenter.id);
    const nTo = await countByCenter(sb, t, motoCenter.id);
    console.log(`- ${t}: default=${nFrom} target=${nTo}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

