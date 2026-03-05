#!/usr/bin/env python3
"""
Homegate Scraper — curl_cffi + datadome cookie replay

Bypasses DataDome by replaying a valid datadome cookie obtained from a real
browser session, using curl_cffi for Chrome TLS fingerprint impersonation.

Usage:
  # Set DATADOME_COOKIE env var (grab from browser DevTools > Application > Cookies)
  DATADOME_COOKIE='YmRRhTE...' python3 scrape.py

  # Or pass as argument
  python3 scrape.py --cookie 'YmRRhTE...'

  # Scrape multiple pages
  python3 scrape.py --cookie 'YmRRhTE...' --pages 3
"""

import argparse
import json
import os
from pathlib import Path
import sys
import time
import random
from curl_cffi import requests

# Load .env file if present (no dependency needed)
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


BASE_URL = "https://www.homegate.ch"
DEFAULT_SEARCH = "/rent/real-estate/city-zurich/matching-list"

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,de-CH;q=0.8,de;q=0.7",
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def extract_initial_state(html: str) -> dict | None:
    """Extract window.__INITIAL_STATE__ JSON from HTML."""
    marker = "window.__INITIAL_STATE__ = "
    idx = html.find(marker)
    if idx < 0:
        return None
    json_start = idx + len(marker)
    script_end = html.find("</script>", json_start)
    if script_end < 0:
        return None
    json_str = html[json_start:script_end].rstrip("; \n")
    return json.loads(json_str)


def get_localized(locale_map: dict | None, prefer: str = "de") -> str | None:
    """Get localized text value, preferring 'de'."""
    if not locale_map:
        return None
    if prefer in locale_map:
        loc = locale_map[prefer]
        if isinstance(loc, dict) and "text" in loc:
            return loc["text"].get("title")
        return loc
    first_key = next(iter(locale_map), None)
    if first_key:
        loc = locale_map[first_key]
        if isinstance(loc, dict) and "text" in loc:
            return loc["text"].get("title")
    return None


def transform_listing(raw: dict) -> dict:
    """Transform a raw listing from __INITIAL_STATE__ into a flat dict."""
    listing = raw.get("listing", raw)
    listing_id = raw.get("id") or listing.get("id")

    # Listing type
    lt = raw.get("listingType", {})
    listing_type = lt.get("type", "").lower() if isinstance(lt, dict) else str(lt).lower()

    # Title from localization
    loc = listing.get("localization", {})
    title = get_localized(loc)

    # URL
    url = None
    de_loc = loc.get("de", {})
    if isinstance(de_loc, dict):
        urls = de_loc.get("urls", [])
        if isinstance(urls, list):
            for u in urls:
                if isinstance(u, dict) and u.get("type") == "DETAIL":
                    url = BASE_URL + u.get("value", "")
                    break
    if not url and listing_id:
        url = f"{BASE_URL}/rent/{listing_id}"

    # Price
    prices = listing.get("prices", {})
    rent = prices.get("rent", {})
    price = rent.get("gross") or rent.get("net")
    if not price:
        buy = prices.get("buy", {})
        price = buy.get("price")
    currency = prices.get("currency", "CHF")

    # Address
    addr = listing.get("address", {})
    address = {}
    if addr.get("street"):
        address["street"] = addr["street"]
    if addr.get("postalCode"):
        address["zip"] = addr["postalCode"]
    if addr.get("locality"):
        address["city"] = addr["locality"]
    parts = [addr.get("street"), addr.get("postalCode"), addr.get("locality")]
    address["raw"] = ", ".join(p for p in parts if p)

    # Characteristics
    chars = listing.get("characteristics", {})

    return {
        "id": listing_id,
        "url": url,
        "title": title,
        "listingType": listing_type if listing_type not in ("premium", "") else "rent",
        "price": price,
        "currency": currency,
        "rooms": chars.get("numberOfRooms"),
        "livingSpace": chars.get("livingSpace"),
        "floor": chars.get("floor"),
        "address": address if address.get("raw") else None,
        "latitude": addr.get("geoCoordinates", {}).get("latitude"),
        "longitude": addr.get("geoCoordinates", {}).get("longitude"),
        "images": [
            att["url"]
            for att in de_loc.get("attachments", [])
            if isinstance(att, dict) and att.get("type") == "IMAGE" and att.get("url")
        ][:5]
        if isinstance(de_loc, dict)
        else [],
        "propertyType": (listing.get("categories") or [None])[0],
    }


def scrape_page(session: requests.Session, url: str, cookie: str) -> tuple[list[dict], int]:
    """Scrape a single search results page. Returns (listings, total_pages)."""
    headers = {**HEADERS, "Cookie": f"datadome={cookie}"}

    r = session.get(url, headers=headers)

    if r.status_code == 403:
        print(f"  BLOCKED (403) — cookie may have expired. Get a fresh one from browser.")
        return [], 0

    if r.status_code != 200:
        print(f"  Unexpected status: {r.status_code}")
        return [], 0

    # Check for block page in HTML
    if "Access is temporarily restricted" in r.text or "captcha-delivery" in r.text:
        print(f"  BLOCKED — DataDome challenge in HTML body")
        return [], 0

    state = extract_initial_state(r.text)
    if not state:
        print("  No __INITIAL_STATE__ found in HTML")
        return [], 0

    # Navigate JSON
    result_list = state.get("resultList", {})
    search = result_list.get("search", {}).get("fullSearch", {}).get("result", {})
    raw_listings = search.get("listings", [])
    page_count = search.get("pageCount", 1)

    if not raw_listings:
        print(f"  No listings at expected path. Top keys: {list(state.keys())}")
        rl_keys = list(result_list.keys()) if result_list else []
        print(f"  resultList keys: {rl_keys}")
        return [], page_count

    listings = [transform_listing(l) for l in raw_listings]
    return listings, page_count


def main():
    parser = argparse.ArgumentParser(description="Homegate scraper with DataDome cookie replay")
    parser.add_argument("--cookie", "-c", help="datadome cookie value")
    parser.add_argument("--pages", "-p", type=int, default=1, help="Number of pages to scrape")
    parser.add_argument("--search-path", "-s", default=DEFAULT_SEARCH, help="Search URL path")
    parser.add_argument("--output", "-o", help="Output JSON file path")
    args = parser.parse_args()

    cookie = args.cookie or os.environ.get("DATADOME_COOKIE")
    if not cookie:
        print("Error: Provide datadome cookie via --cookie or DATADOME_COOKIE env var")
        print("\nTo get the cookie:")
        print("  1. Open https://www.homegate.ch in Chrome")
        print("  2. DevTools (F12) → Application → Cookies → homegate.ch")
        print("  3. Copy the 'datadome' cookie value")
        sys.exit(1)

    session = requests.Session(impersonate="chrome131")
    all_listings = []

    for page_num in range(1, args.pages + 1):
        url = BASE_URL + args.search_path
        if page_num > 1:
            sep = "&" if "?" in url else "?"
            url += f"{sep}ep={page_num}"

        print(f"[page {page_num}] Fetching: {url}")
        listings, page_count = scrape_page(session, url, cookie)
        print(f"[page {page_num}] Got {len(listings)} listings (total pages: {page_count})")

        if not listings:
            break

        all_listings.extend(listings)

        if page_num >= page_count:
            print(f"Reached last page ({page_count})")
            break

        # Human-like delay between pages
        delay = random.uniform(2, 5)
        print(f"  Waiting {delay:.1f}s before next page...")
        time.sleep(delay)

    print(f"\n=== Total: {len(all_listings)} listings scraped ===\n")

    if all_listings:
        # Print first listing
        print("First listing:")
        print(json.dumps(all_listings[0], indent=2, ensure_ascii=False))

        # Print summary
        print(f"\nAll {len(all_listings)} listings:")
        for l in all_listings:
            addr = l.get("address", {}) or {}
            print(
                f"  {l['id']}: {l.get('title', 'no title')[:60]} | "
                f"{l.get('price', '?')} {l.get('currency', 'CHF')} | "
                f"{l.get('rooms', '?')} rooms | "
                f"{addr.get('raw', 'no address')}"
            )

    # Write output
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(all_listings, f, indent=2, ensure_ascii=False)
        print(f"\nSaved to {args.output}")
    elif all_listings:
        outfile = "listings.json"
        with open(outfile, "w", encoding="utf-8") as f:
            json.dump(all_listings, f, indent=2, ensure_ascii=False)
        print(f"\nSaved to {outfile}")


if __name__ == "__main__":
    main()
