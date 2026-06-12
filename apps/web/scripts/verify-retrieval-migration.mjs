import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(process.cwd(), "..", "..");
loadEnv(path.join(root, ".env"));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const shouldBackfill = process.argv.includes("--backfill");
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [];
checks.push(await checkSourcesContentHash());
checks.push(await checkHybridRpc());
checks.push(await checkRelationshipRpc());
checks.push(await checkFactCandidateConstraint());

let backfill = null;
if (shouldBackfill) {
  backfill = await backfillSourceHashes();
}

const ok = checks.every((check) => check.ok);
console.log(
  JSON.stringify(
    {
      ok,
      checks,
      backfill,
    },
    null,
    2,
  ),
);

if (!ok) process.exit(1);

async function checkSourcesContentHash() {
  const { error } = await supabase.from("sources").select("id,content_hash").limit(1);
  return {
    name: "sources.content_hash column",
    ok: !error,
    error: error?.message,
  };
}

async function checkHybridRpc() {
  const { error } = await supabase.rpc("hybrid_match_source_chunks", {
    query_text: "migration smoke test",
    query_embedding: zeroVector(),
    match_count: 1,
    filter: {},
  });
  return {
    name: "hybrid_match_source_chunks RPC",
    ok: !error,
    error: error?.message,
  };
}

async function checkRelationshipRpc() {
  const { error } = await supabase.rpc("match_relationship_embeddings", {
    query_embedding: zeroVector(),
    match_count: 1,
    filter: {},
  });
  return {
    name: "match_relationship_embeddings RPC",
    ok: !error,
    error: error?.message,
  };
}

async function checkFactCandidateConstraint() {
  const externalId = `migration-smoke:fact:${Date.now()}`;
  const payload = {
    external_id: externalId,
    candidate_type: "fact",
    name: "Migration smoke fact",
    priority: 1,
    review_status: "rejected",
    source_ids: [],
    payload: { smoke_test: true },
  };
  const inserted = await supabase.from("discovery_candidates").insert(payload).select("id").single();
  if (inserted.error) {
    return {
      name: "discovery_candidates accepts fact candidate_type",
      ok: false,
      error: inserted.error.message,
    };
  }
  await supabase.from("discovery_candidates").delete().eq("id", inserted.data.id);
  return {
    name: "discovery_candidates accepts fact candidate_type",
    ok: true,
  };
}

async function backfillSourceHashes() {
  let offset = 0;
  const limit = 100;
  let scanned = 0;
  let updated = 0;
  const errors = [];

  while (true) {
    const { data, error } = await supabase
      .from("sources")
      .select("id,raw_text,content_hash")
      .range(offset, offset + limit - 1);
    if (error) {
      errors.push(error.message);
      break;
    }
    if (!data?.length) break;

    for (const row of data) {
      scanned += 1;
      if (row.content_hash || !row.raw_text) continue;
      const { error: updateError } = await supabase
        .from("sources")
        .update({ content_hash: hash(row.raw_text) })
        .eq("id", row.id);
      if (updateError) {
        errors.push(`${row.id}: ${updateError.message}`);
      } else {
        updated += 1;
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return { scanned, updated, errors };
}

function zeroVector() {
  return Array.from({ length: 384 }, () => 0);
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
