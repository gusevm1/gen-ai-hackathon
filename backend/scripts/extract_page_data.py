#!/usr/bin/env python3
"""Extract image URLs and prices from a Flatfox listing HTML page.

Usage:
    python3 backend/scripts/extract_page_data.py /tmp/listing_12345_page.html

Prints JSON: {"image_urls": [...], "prices": {...}}
"""
import re
import json
import html as html_mod
import sys

if len(sys.argv) < 2:
    print("Usage: python3 extract_page_data.py <html_file>", file=sys.stderr)
    sys.exit(1)

with open(sys.argv[1]) as f:
    page = f.read()

# Extract image URLs
urls = []
seen = set()

def add(u):
    u = u.strip()
    if u.startswith("//"): u = "https:" + u
    elif u.startswith("/"): u = "https://flatfox.ch" + u
    u = u.replace("http://", "https://", 1).replace("&amp;", "&")
    if u.startswith("https://") and u not in seen:
        seen.add(u)
        urls.append(u)

# og:image meta tags
for m in re.finditer(r'property=["\']og:image["\']\s+content=["\']([^"\' ]+)["\']', page, re.I):
    add(m.group(1))
# img srcset (highest res)
for m in re.finditer(r'<img\s[^>]*srcset=["\']([^"\' ]+)["\']', page, re.I):
    parts = [p.strip().split()[0] for p in m.group(1).split(",") if p.strip()]
    ff = [c for c in parts if "/thumb/" in c or "/media/" in c]
    if ff: add(ff[-1])
# img src
for m in re.finditer(r'<img\s[^>]*src=["\']([^"\' ]*(?:/thumb/|/media/)[^"\' ]*)["\']', page, re.I):
    add(m.group(1))

# Extract prices
prices = {}
ad = re.search(r'data-ad-slot-keywords="([^"]*)"', page)
if ad:
    try:
        d = json.loads(html_mod.unescape(ad.group(1)))
        if d.get("price_display"): prices["rent_gross"] = int(d["price_display"])
    except Exception:
        pass
chf = re.findall(r"CHF\s*([\d',. ]+)\s*(?:incl\.\s*utilities\s*)?per\s*month", page)
parsed = []
for c in chf:
    v = int(c.replace("'", "").replace(",", "").replace(".", "").strip())
    if v > 0 and v not in parsed: parsed.append(v)
if len(parsed) >= 3:
    prices.setdefault("rent_gross", parsed[0])
    prices["rent_net"] = parsed[1]
    prices["rent_charges"] = parsed[2]
elif parsed:
    prices.setdefault("rent_gross", parsed[0])

print(json.dumps({"image_urls": urls[:5], "prices": prices}, indent=2))
