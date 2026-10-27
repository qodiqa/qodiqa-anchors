'use strict';

// Structure checks for the anchors repository: every anchors/*.jsonl line is {digest, statement}, the digest is 64 hex, and for each chain the positions
// never go backwards across lines and files; every keys/*.json is {v: 1, keys: [...]} with unique key ids and no private material.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const problems = [];
const HEX64 = /^[0-9a-f]{64}$/;

const anchorsDir = path.join(ROOT, 'anchors');
const files = fs.existsSync(anchorsDir) ? fs.readdirSync(anchorsDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort() : [];
const lastPosition = new Map();
let anchors = 0;
for (const f of files) {
  const lines = fs.readFileSync(path.join(anchorsDir, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    let row;
    try { row = JSON.parse(line); } catch { problems.push(`anchors/${f}:${i + 1}: not JSON`); return; }
    if (!row || typeof row !== 'object' || !HEX64.test(String(row.digest || ''))) problems.push(`anchors/${f}:${i + 1}: digest is not 64 hex characters`);
    const st = row && row.statement;
    if (!st || typeof st !== 'object') { problems.push(`anchors/${f}:${i + 1}: no statement`); return; }
    const chain = String(st.chainId || st.chain || 'default');
    const pos = Number(st.chainLength);
    if (!Number.isFinite(pos)) { problems.push(`anchors/${f}:${i + 1}: statement has no numeric chainLength`); return; }
    if (lastPosition.has(chain) && pos < lastPosition.get(chain)) problems.push(`anchors/${f}:${i + 1}: position ${pos} is lower than the earlier ${lastPosition.get(chain)} for chain ${chain}`);
    lastPosition.set(chain, Math.max(pos, lastPosition.get(chain) || 0));
    anchors++;
  });
}

const keysDir = path.join(ROOT, 'keys');
if (fs.existsSync(keysDir)) {
  for (const f of fs.readdirSync(keysDir).filter((x) => x.endsWith('.json'))) {
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(keysDir, f), 'utf8')); } catch { problems.push(`keys/${f}: not JSON`); continue; }
    if (!doc || doc.v !== 1 || !Array.isArray(doc.keys)) { problems.push(`keys/${f}: expected { v: 1, keys: [...] }`); continue; }
    const seen = new Set();
    for (const k of doc.keys) {
      if (!k.keyId || seen.has(k.keyId)) problems.push(`keys/${f}: missing or duplicate keyId ${k.keyId}`);
      seen.add(k.keyId);
      if (Object.keys(k).some((n) => /priv|secret/i.test(n))) problems.push(`keys/${f}: ${k.keyId} has a field that looks like private material`);
    }
  }
}

if (problems.length) { console.error('structure check FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`structure check passed: ${anchors} anchor(s) in ${files.length} file(s)`);
