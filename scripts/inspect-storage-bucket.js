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

async function main() {
  const envPath = process.argv[2] || '.vercel/.env.production.local';
  loadDotEnvFile(envPath);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env file');
  }

  const bucketName = process.env.SUPABASE_FORUM_BUCKET || process.env.SUPABASE_VIN_ENGINE_BUCKET || 'vin-engine';
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw error;

  const safeBuckets = (buckets || []).map((b) => ({
    id: b.id,
    name: b.name,
    public: b.public,
    file_size_limit: b.file_size_limit,
    allowed_mime_types: b.allowed_mime_types
  }));

  const selected = (buckets || []).find((b) => b.id === bucketName || b.name === bucketName) || null;
  const safeSelected = selected
    ? {
        id: selected.id,
        name: selected.name,
        public: selected.public,
        file_size_limit: selected.file_size_limit,
        allowed_mime_types: selected.allowed_mime_types
      }
    : null;

  console.log(JSON.stringify({ bucketName, selected: safeSelected, buckets: safeBuckets }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

