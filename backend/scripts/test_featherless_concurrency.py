#!/usr/bin/env python3
"""Test Featherless AI concurrency — verify we can run 12-16 parallel requests.

Each of the 3 API keys should handle 3-4 concurrent models.
This script fires N concurrent requests and measures throughput.

Usage:
    cd backend
    python -m scripts.test_featherless_concurrency --concurrency 12
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

import httpx

FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions"
FEATHERLESS_MODEL = os.environ.get(
    "FEATHERLESS_MODEL", "meta-llama/Meta-Llama-3.1-70B-Instruct"
)

# Load all keys
API_KEYS: list[str] = []
for i in range(1, 4):
    key = os.environ.get(f"FEATHERLESS_API_KEY_{i}", "")
    if key:
        API_KEYS.append(key)
if not API_KEYS:
    single = os.environ.get("FEATHERLESS_API_KEY", "")
    if single:
        API_KEYS.append(single)

print(f"Loaded {len(API_KEYS)} API keys")

# Simple round-robin counter
_key_idx = 0
_key_lock = asyncio.Lock()


async def next_key() -> str:
    global _key_idx
    async with _key_lock:
        key = API_KEYS[_key_idx % len(API_KEYS)]
        _key_idx += 1
    return key


SIMPLE_PROMPT = (
    "You are a Swiss real estate analyst. Describe the neighborhood "
    "character of Zürich Kreis 4 (Langstrasse area) in exactly 2 sentences. "
    "Respond with ONLY a JSON object: {\"character\": \"...\"}"
)


async def call_featherless(idx: int, client: httpx.AsyncClient) -> dict:
    """Make a single Featherless API call, return timing info."""
    key = await next_key()
    key_num = API_KEYS.index(key) + 1
    t0 = time.monotonic()

    try:
        resp = await client.post(
            FEATHERLESS_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": FEATHERLESS_MODEL,
                "messages": [{"role": "user", "content": SIMPLE_PROMPT}],
                "temperature": 0.1,
                "max_tokens": 256,
            },
        )
        elapsed = time.monotonic() - t0
        status = resp.status_code

        if status == 200:
            data = resp.json()
            tokens = data.get("usage", {}).get("completion_tokens", "?")
            print(f"  [{idx:2d}] key={key_num} OK {elapsed:.1f}s ({tokens} tokens)")
            return {"idx": idx, "status": "ok", "elapsed": elapsed, "key": key_num}
        else:
            body = resp.text[:200]
            print(f"  [{idx:2d}] key={key_num} HTTP {status} {elapsed:.1f}s: {body}")
            return {"idx": idx, "status": f"http_{status}", "elapsed": elapsed, "key": key_num}

    except Exception as e:
        elapsed = time.monotonic() - t0
        print(f"  [{idx:2d}] key={key_num} ERROR {elapsed:.1f}s: {e}")
        return {"idx": idx, "status": "error", "elapsed": elapsed, "key": key_num}


async def main() -> None:
    parser = argparse.ArgumentParser(description="Test Featherless AI concurrency")
    parser.add_argument("--concurrency", type=int, default=12, help="Parallel requests")
    args = parser.parse_args()

    n = args.concurrency
    print(f"\nFiring {n} concurrent requests across {len(API_KEYS)} keys...")
    print(f"Model: {FEATHERLESS_MODEL}")
    print()

    t0 = time.monotonic()
    async with httpx.AsyncClient(timeout=120.0) as client:
        results = await asyncio.gather(*[call_featherless(i, client) for i in range(n)])
    total = time.monotonic() - t0

    # Summary
    ok = sum(1 for r in results if r["status"] == "ok")
    failed = n - ok
    avg_latency = sum(r["elapsed"] for r in results if r["status"] == "ok") / max(ok, 1)

    # Per-key stats
    per_key: dict[int, list[float]] = {}
    for r in results:
        per_key.setdefault(r["key"], []).append(r["elapsed"])

    print()
    print("=" * 50)
    print(f"RESULTS: {ok}/{n} succeeded, {failed} failed")
    print(f"Total wall time: {total:.1f}s")
    print(f"Avg latency per request: {avg_latency:.1f}s")
    print(f"Effective throughput: {ok / total:.2f} listings/sec")
    print(f"Projected hourly: {ok / total * 3600:.0f} listings/hr")
    print()
    for key_num in sorted(per_key):
        times = per_key[key_num]
        print(f"  Key {key_num}: {len(times)} requests, avg {sum(times)/len(times):.1f}s")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
