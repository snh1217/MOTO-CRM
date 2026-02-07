/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const { createClient } = require('@supabase/supabase-js');

function loadDotEnvFile(filePath) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function ensureBucket(sb, name, options) {
  const { data: buckets, error: listError } = await sb.storage.listBuckets();
  if (listError) throw listError;

  const exists = (buckets || []).some((b) => b.id === name || b.name === name);
  if (exists) return { name, status: 'exists' };

  const { error } = await sb.storage.createBucket(name, options);
  if (error) return { name, status: 'error', error: error.message };
  return { name, status: 'created' };
}

async function main() {
  const envPath = process.argv[2] || '.vercel/.env.production.local';
  loadDotEnvFile(envPath);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env file');
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const results = [];
  results.push(
    await ensureBucket(sb, 'forum-media', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    })
  );

  // Used by receipts/as routes in this repo (defaults and/or env overrides).
  results.push(
    await ensureBucket(sb, 'vin-engine', {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    })
  );

  console.log(JSON.stringify({ results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

