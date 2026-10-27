# qodiqa-anchors

A QODIQA gateway signs a checkpoint of its audit chain periodically. This repository is where those checkpoints can be **anchored outside the gateway**: each anchor is a commit in this repository, so rewriting the gateway's history later would have to rewrite a history that other people have cloned.

## Layout

| Path | What |
|---|---|
| `anchors/YYYY-MM-DD.jsonl` | one line per anchor: `{ "digest": "<sha256 of the statement>", "statement": { checkpoint id, chain length, head hash, predecessor, ... } }`, appended, never edited |
| `keys/checkpoint-keys.json`, `keys/transparency-keys.json` | the public keys that signed the anchored checkpoints and transparency roots (`{ "v": 1, "keys": [ { keyId, algorithm, publicKey, status, ... } ] }`) |
| `docs/audit-anchoring.md` | how witnesses and anchors work, and what they do and do not prove |
| `src/` | the anchor-trust reader, for checking this repository's own rules offline |

## Rules this repository must keep

- **Append-only.** Branch protection forbids force-push and deletion on `main`. A file under `anchors/` only ever grows.
- **Statements are monotonic.** A later statement for the same chain never has a lower position than an earlier one.
- **Signed commits** are recommended; the anchor-trust reader reports whether they are present.
- Nothing private belongs here: only hashes, positions and public keys.

## Check it

```bash
npm test
```

validates the structure of every file under `anchors/` and `keys/` and that positions never go backwards. To check a gateway's evidence against this repository, use the verifiers in `qodiqa-verify` (its proof verifier accepts this repository as the anchor source).

## What an anchor proves

That a checkpoint with this hash existed no later than the commit's time, and that it has not been silently replaced since. It does not prove that the gateway's entries before the checkpoint were honest. See `docs/audit-anchoring.md`.

## Licence and security

Licensed under the Apache License 2.0; see [LICENSE](LICENSE), [NOTICE](NOTICE) and [SECURITY.md](SECURITY.md). This repository does not accept pull requests that touch `anchors/` or `keys/`; only the gateway's publisher writes there.
