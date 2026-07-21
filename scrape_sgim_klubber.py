#!/usr/bin/env python3
"""
Scraper for sgim.dk/klubber.aspx
Fetches clubs from the old site and outputs JSON suitable for Strapi import.

Usage:
    python3 scrape_sgim_klubber.py > clubs.json
"""

import re
import json
import sys
import html
import requests

BASE_URL = "https://sgim.dk/klubber.aspx"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "X-Forwarded-For": "1.1.1.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def fetch_page():
    try:
        response = requests.get(BASE_URL, headers=HEADERS, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {BASE_URL}: {e}", file=sys.stderr)
        return None


def decode_entities(text):
    if not text:
        return text
    return html.unescape(text)


def extract_phone(text):
    match = re.search(r'(\+?\d[\d\s-]{6,}\d)', text)
    if match:
        return re.sub(r'\s+', '', match.group(1).strip())
    return None


def extract_email(text):
    match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', text)
    if match:
        return match.group(1).strip()
    return None


def extract_person(text):
    # Match "kontakt Name" or "Kontakt: Name" or "Kontakt Name"
    match = re.search(r'(?:kontakt|Kontakt)[.:\)\s]+([A-ZÅÆØ][A-ZÅÆØa-zåæø\s]+?)(?:\s+på\s+tlf|\s+tlf|,|\.|$)', text, re.IGNORECASE)
    if match:
        name = match.group(1).strip()
        name = re.sub(r'\s+på\s+tlf', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s+tlf', '', name, flags=re.IGNORECASE)
        return re.sub(r'[,:;.]$', '', name)
    return None


def extract_time(text):
    # Look for "kl. 16:00-17:30" or "kl 16:15 - 17:30"
    match = re.search(r'kl\.?\s*([\d.:]+\s*[-–]\s*[\d.:]+)', text, re.IGNORECASE)
    if match:
        time = match.group(1).strip()
        time = time.replace(' – ', '-').replace(' - ', '-').replace(' ', '')
        return time
    # Look for "ved 17-tiden"
    match = re.search(r'ved\s+(\d+)-tiden', text, re.IGNORECASE)
    if match:
        return f"{match.group(1)}:00"
    # Look for simple "kl. 16:00"
    match = re.search(r'kl\.?\s*([\d:]+)', text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def extract_day(text):
    days = {
        'mandag': 'monday', 'mandage': 'monday',
        'tirsdag': 'tuesday',
        'onsdag': 'wednesday', 'onsdage': 'wednesday',
        'torsdag': 'thursday',
        'fredag': 'friday',
        'lørdag': 'saturday',
        'søndag': 'sunday',
    }
    for day_da, day_en in days.items():
        if re.search(r'\b' + day_da + r'\b', text, re.IGNORECASE):
            return day_en
    return None


def extract_location(text):
    # Look for "Hvor: ..."
    match = re.search(r'Hvor:\s*([^\n]+)', text, re.IGNORECASE)
    if match:
        loc = match.group(1).strip()
        return re.sub(r'[,.]$', '', loc)
    
    # Look for common patterns
    patterns = [
        (r'Østerbro\s+6[^\d,]*', 'Østerbro 6, Stjær'),
        (r'Skovby Sognehus[^\d]*', 'Skovby Sognehus, Ringvejen 17, 1. sal'),
        (r'Bethesda[^\d]*', 'Bethesda, Østerbro 6, Stjær'),
        (r'missionshuset[^\d]*', 'missionshuset i Stjær'),
    ]
    for pattern, _ in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            loc = match.group(0).strip()
            return re.sub(r'[,.]$', '', loc)
    return None


def extract_url(text):
    match = re.search(r'(https?://[^\s<>"()]+)', text)
    if match:
        return match.group(1)
    return None


def determine_audience(name):
    name_lower = name.lower()
    if 'børn' in name_lower or 'minimyren' in name_lower or 'skovmyren' in name_lower:
        return 'children'
    elif 'junior' in name_lower:
        return 'youth'
    elif 'teen' in name_lower or 'imu' in name_lower:
        return 'youth'
    elif 'cafe' in name_lower:
        return 'adults'
    return None


def generate_slug(name):
    slug = name.lower().replace('æ', 'ae').replace('ø', 'oe').replace('å', 'aa')
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
    return slug


def parse_clubs(html):
    clubs = []
    h2_pattern = r'<h2>([^<]+)</h2>'
    h2_matches = list(re.finditer(h2_pattern, html))
    
    if not h2_matches:
        print("Warning: No clubs found", file=sys.stderr)
        return clubs
    
    for i, h2_match in enumerate(h2_matches):
        club_name = decode_entities(h2_match.group(1).strip())
        content_start = h2_match.end()
        next_h2_start = h2_matches[i + 1].start() if i + 1 < len(h2_matches) else len(html)
        club_content = html[content_start:next_h2_start]
        
        # Clean up
        club_content = re.sub(r'<div[^>]*>', '', club_content)
        club_content = re.sub(r'</div>', '', club_content)
        club_content = re.sub(r'<img[^>]*>', '', club_content)
        
        paragraphs = re.findall(r'<p[^>]*>([^<]+)</p>', club_content)
        paragraphs = [decode_entities(p).strip() for p in paragraphs if p.strip()]
        
        if not paragraphs:
            continue
        
        description = '\n\n'.join(paragraphs)
        
        club = {
            "name": club_name,
            "slug": generate_slug(club_name),
            "description": description,
            "shortDescription": paragraphs[0] if paragraphs else "",
            "targetAudience": determine_audience(club_name),
            "isActive": True,
        }
        
        # Extract optional fields
        if (day := extract_day(description)):
            club["meetingDay"] = day
        if (time := extract_time(description)):
            club["meetingTime"] = time
        if (loc := extract_location(description)):
            club["location"] = loc
        if (person := extract_person(description)):
            club["contactPerson"] = person
        if (email := extract_email(description)):
            club["contactEmail"] = email
        if (phone := extract_phone(description)):
            club["contactPhone"] = phone
        if (url := extract_url(description)):
            club["websiteUrl"] = url
        
        clubs.append(club)
    
    return clubs


def main():
    print("Scraping sgim.dk/klubber.aspx...", file=sys.stderr)
    html = fetch_page()
    if html:
        clubs = parse_clubs(html)
        print(f"Found {len(clubs)} clubs", file=sys.stderr)
        print(json.dumps(clubs, indent=2, ensure_ascii=False))
        print(f"Total: {len(clubs)} clubs", file=sys.stderr)
    else:
        print("Failed to fetch", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
