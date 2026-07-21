#!/usr/bin/env python3
"""
Scraper for the frontpage Aktuelt (takeover) from https://sgim.dk
Outputs a single JSON object describing the Aktuelt takeover suitable for
seeding or inspection.

Usage:
    python3 scrape_sgim_aktuelt.py > sgim-aktuelt.json

The script attempts to be robust to small markup differences by searching for a
section element with aria-label="Aktuelt" or class containing "takeover".
"""

import json
import re
import sys
from urllib.parse import urljoin

import requests

BASE_URL = "https://sgim.dk/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "X-Forwarded-For": "1.1.1.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def fetch_frontpage():
    try:
        r = requests.get(BASE_URL, headers=HEADERS, timeout=30)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"Error fetching {BASE_URL}: {e}", file=sys.stderr)
        return None


def extract_aktuelt(html: str):
    # Try aria-label="Aktuelt" section first
    m = re.search(r'(<section[^>]*aria-label=["\']Aktuelt["\'][\s\S]*?</section>)', html, re.IGNORECASE)
    if not m:
        # Try section with class containing takeover
        m = re.search(r'(<section[^>]*class=["\'][^"\']*takeover[^"\']*["\'][\s\S]*?</section>)', html, re.IGNORECASE)
    if not m:
        # Try a more general div or section with a headline "Aktuelt"
        m = re.search(r'(<(?:section|div)[^>]*>[\s\S]*?<h1[^>]*>\s*Aktuelt\s*</h1>[\s\S]*?</(?:section|div)>)', html, re.IGNORECASE)
    if not m:
        return None

    block = m.group(1)

    # Title
    t = re.search(r'<h1[^>]*>(.*?)</h1>', block, re.IGNORECASE | re.DOTALL)
    title = (t.group(1).strip() if t else '').replace('\n', ' ').strip()

    # Body HTML: look for a div with class 'rich' or take the content after h1
    body = ''
    b = re.search(r'<div[^>]*class=["\'][^"\']*rich[^"\']*["\'][^>]*>([\s\S]*?)</div>', block, re.IGNORECASE)
    if b:
        body = b.group(1).strip()
    else:
        # Fallback: everything inside the block after the h1
        if t:
            body = block.split(t.group(0), 1)[-1]
            # remove closing section/div
            body = re.sub(r'</(?:section|div)>\s*$', '', body, flags=re.IGNORECASE | re.DOTALL).strip()

    # Image: first <img src=...>
    img = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', block, re.IGNORECASE)
    image = urljoin(BASE_URL, img.group(1)) if img else None

    # CTA link: anchor with class cta or first anchor inside block
    cta = re.search(r'<a[^>]*class=["\'][^"\']*cta[^"\']*["\'][^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', block, re.IGNORECASE | re.DOTALL)
    if cta:
        cta_url = urljoin(BASE_URL, cta.group(1).strip())
        cta_label = re.sub(r'<[^>]+>', '', cta.group(2)).strip()
    else:
        # fallback: any anchor
        a = re.search(r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', block, re.IGNORECASE | re.DOTALL)
        cta_url = urljoin(BASE_URL, a.group(1).strip()) if a else None
        cta_label = re.sub(r'<[^>]+>', '', a.group(2)).strip() if a else None

    return {
        "title": title,
        "content_html": body,
        "image_url": image,
        "cta_url": cta_url,
        "cta_label": cta_label,
    }


def main():
    html = fetch_frontpage()
    if not html:
        sys.exit(1)

    data = extract_aktuelt(html)
    if not data:
        print("{}")
        return

    print(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
