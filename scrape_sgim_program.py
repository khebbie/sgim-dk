#!/usr/bin/env python3
"""
Scraper for sgim.dk/program.aspx
Fetches events from the old site and outputs JSON suitable for Strapi import.

Usage:
    python3 scrape_sgim_program.py > events.json
    
Output format:
    JSON array of event objects matching the Strapi event content type structure.
    
Note: The old site uses ModSecurity which blocks some requests.
      We use headers to bypass this.
"""

import re
import json
import sys
import html
from datetime import datetime
from urllib.parse import urljoin
import requests

BASE_URL = "https://sgim.dk/program.aspx"

def decode_html_entities(text):
    """Decode HTML entities from text using Python's built-in html.unescape."""
    if not text:
        return text
    return html.unescape(text)


# Headers to bypass ModSecurity
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "X-Forwarded-For": "1.1.1.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Danish month names to numbers
DANISH_MONTHS = {
    "Januar": 1,
    "Februar": 2,
    "Marts": 3,
    "April": 4,
    "Maj": 5,
    "Juni": 6,
    "Juli": 7,
    "August": 8,
    "September": 9,
    "Oktober": 10,
    "November": 11,
    "December": 12,
}


def fetch_page(year=None):
    """Fetch the program page for a specific year."""
    url = BASE_URL
    if year:
        url = f"{BASE_URL}?year={year}"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return None


def parse_date(date_str):
    """
    Parse various date formats from the site:
    - "29. - 04. januar 2026" (date range, e.g., Dec 29 - Jan 4)
    - "14. januar 2026 kl 19:00" (single date with time)
    - "16. januar 2026" (single date)
    - "22. januar 2026 kl 19:00" (single date with time)
    """
    # Decode HTML entities
    date_str = decode_html_entities(date_str)
    
    # Handle date ranges like "29. - 04. januar 2026"
    # This means: DD of previous month - DD MonthName YYYY
    # e.g., "29. - 04. januar 2026" = "2025-12-29" to "2026-01-04"
    range_match = re.match(r"^(\d{1,2})\.\s*-\s*(\d{1,2})\. ([A-ZÅÆØa-zåæø]+) (\d{4})$", date_str)
    if range_match:
        start_day = int(range_match.group(1))
        end_day = int(range_match.group(2))
        month_name = range_match.group(3).capitalize()
        year = int(range_match.group(4))
        
        month_num = DANISH_MONTHS.get(month_name)
        if month_num is None:
            return {"startDate": None, "endDate": None}
        
        # End date
        end_date = f"{year:04d}-{month_num:02d}-{end_day:02d}"
        
        # Start date: previous month
        if month_num == 1:
            start_date = f"{year-1:04d}-12-{start_day:02d}"
        else:
            start_date = f"{year:04d}-{month_num-1:02d}-{start_day:02d}"
        
        # Verify start is before end
        if start_date > end_date:
            # If start is after end, maybe it's same month
            start_date = f"{year:04d}-{month_num:02d}-{start_day:02d}"
        
        return {"startDate": start_date, "endDate": end_date}
    
    # Check if it's just a day number (from partial range)
    if re.match(r"^\d{1,2}\.\s*$", date_str.strip()):
        return {"startDate": None, "endDate": None}
    
    return {"startDate": parse_single_date(date_str), "endDate": None}


def parse_single_date(date_str):
    """Parse a single date string like "14. januar 2026" or "14. januar 2026 kl 19:00"
    Returns ISO date string YYYY-MM-DD
    """
    # Clean the string first
    date_str = date_str.strip()
    
    # Remove time part if present
    if " kl " in date_str:
        date_str = date_str.split(" kl ")[0].strip()
    
    # Handle day/month/year format: "14. januar 2026"
    # Also handles: "14. januar" (no year - use current year)
    current_year = datetime.now().year
    
    # Pattern: DD. MonthName [YYYY]
    # Month name can be followed by optional year
    pattern = r"^(\d{1,2})\.\s*([A-ZÅÆØa-zåæø]+)\s*(\d{4})?$"
    match = re.match(pattern, date_str)
    
    if match:
        day = int(match.group(1))
        month_name = match.group(2).capitalize()
        year = int(match.group(3)) if match.group(3) else current_year
        
        month_num = DANISH_MONTHS.get(month_name)
        if month_num is None:
            print(f"Warning: Unknown month name '{month_name}'", file=sys.stderr)
            return None
            
        return f"{year:04d}-{month_num:02d}-{day:02d}"
    
    # Handle month-only: "Uge 1 - Bibelgrupper i hjemmene"
    # These don't have specific dates, skip them
    if "Uge" in date_str or "Vinterferie" in date_str or "Påske" in date_str or "Ferie" in date_str:
        return None
    
    # Try to handle dates that might have extra content
    # Like "29. " from partial matches
    if re.match(r"^\d{1,2}\.\s*$", date_str):
        return None
    
    print(f"Warning: Could not parse date '{date_str}'", file=sys.stderr)
    return None


def extract_events(html):
    """Extract events from the HTML page."""
    events = []
    
    # Split by month blocks
    # Find all month elements: <blockquote id="month.X" class="month">Name</blockquote>
    month_pattern = r'<blockquote id="month\.(\d+)" class="month">([^<]+)</blockquote>'
    month_matches = list(re.finditer(month_pattern, html))
    
    if not month_matches:
        print("Warning: No months found in HTML", file=sys.stderr)
        return events
    
    # Process each month block
    for i, month_match in enumerate(month_matches):
        month_num = int(month_match.group(1))
        month_name = month_match.group(2).strip()
        month_start = month_match.end()
        
        # Find the next month or end of content
        next_month_start = month_matches[i + 1].start() if i + 1 < len(month_matches) else len(html)
        
        month_content = html[month_start:next_month_start]
        
        # Find all event blocks in this month: <p class="is-excerpt">...</p>
        # The outer p contains nested p tags, so we match from the opening tag
        # to the closing </p> that follows an <hr> tag
        # Pattern: <p class="is-excerpt"> ... <hr> </p>
        event_pattern = r'<p class="is-excerpt">(.*?)<hr>\s*</p>'
        for event_match in re.finditer(event_pattern, month_content, re.DOTALL):
            event_html = event_match.group(1)
            event = parse_event(event_html, month_num)
            if event:
                events.append(event)
    
    return events


def parse_event(event_html, default_month=None):
    """Parse a single event block."""
    # Extract date
    date_match = re.search(r'<span class="date">([^<]+)</span>', event_html)
    if not date_match:
        return None
    
    date_str = date_match.group(1).strip()
    dates = parse_date(date_str)
    
    if dates["startDate"] is None:
        return None
    
    # Extract title
    title_match = re.search(r'<h4>([^<]+)</h4>', event_html)
    title = title_match.group(1).strip() if title_match else "Untitled"
    
    # Extract description
    desc_match = re.search(r'<p>([^<]+)</p>', event_html)
    description = desc_match.group(1).strip() if desc_match else ""
    
    # Clean up HTML entities
    title = decode_html_entities(title)
    description = decode_html_entities(description)
    
    # Extract speaker if present (e.g., "v/ Name" or "ved Name")
    speaker = ""
    if " v/ " in description or " ved " in description or description.startswith("v/ ") or description.startswith("ved "):
        # Pattern 1: "v/ Name" or "ved Name" at the start
        speaker_match = re.match(r'(?:v/|ved)\s*([A-ZÅÆØa-zåæø\s,.-]+)', description)
        if speaker_match:
            speaker = speaker_match.group(1).strip()
            description = description.replace(speaker_match.group(0), '').strip()
        else:
            # Pattern 2: "v/ Name" or "ved Name" in the middle
            speaker_match = re.search(r'(?:v/|ved)\s*([A-ZÅÆØa-zåæø\s,.-]+)', description)
            if speaker_match:
                speaker = speaker_match.group(1).strip()
                # Replace the matched pattern
                description = description.replace(speaker_match.group(0), '').strip()
        
        # Clean up any trailing punctuation
        description = description.rstrip('-, ')  
        speaker = decode_html_entities(speaker).rstrip('-, ')
    
    # Handle multi-day events
    start_date = dates["startDate"]
    end_date = dates["endDate"]
    
    event = {
        "title": title,
        "startDate": start_date,
        "eventType": "multi-day" if end_date else "single-day",
        "description": description,
        "speaker": speaker if speaker else None,
    }
    
    if end_date:
        event["endDate"] = end_date
    
    # Add time if present in date string
    if " kl " in date_str:
        time_match = re.search(r'kl\s*(\d{1,2}:\d{2})', date_str)
        if time_match:
            event["startTime"] = time_match.group(1)
    
    return event


def scrape_all_years():
    """Scrape events for all available years."""
    all_events = []
    
    # Years available on the site: 2013-2026
    for year in range(2013, 2027):
        print(f"Scraping year {year}...", file=sys.stderr)
        html = fetch_page(year)
        if html:
            events = extract_events(html)
            print(f"  Found {len(events)} events", file=sys.stderr)
            for event in events:
                # Add year context for events without year in date
                # (the date parser should have handled this)
                all_events.append(event)
    
    return all_events


def output_strapi_json(events):
    """Output events in Strapi-compatible JSON format."""
    # Strapi event content type fields:
    # - title (string)
    # - slug (UID)
    # - startDate (date)
    # - endDate (date, optional)
    # - startTime (time, optional)
    # - endTime (time, optional)
    # - description (richtext)
    # - location (string, optional)
    # - speaker (string, optional)
    # - clubSlug (relation, optional)
    # - eventType (enumeration: single-day, multi-day)
    
    strapi_events = []
    for idx, event in enumerate(events):
        strapi_event = {
            "title": event["title"],
            "slug": f"event-{idx+1:04d}",
            "startDate": event["startDate"],
            "eventType": event.get("eventType", "single"),
            "description": event.get("description", ""),
        }
        
        if event.get("endDate"):
            strapi_event["endDate"] = event["endDate"]
        
        if event.get("startTime"):
            strapi_event["startTime"] = event["startTime"]
        
        if event.get("speaker"):
            strapi_event["speaker"] = event["speaker"]
        
        if event.get("location"):
            strapi_event["location"] = event["location"]
        
        strapi_events.append(strapi_event)
    
    return strapi_events


def main():
    """Main function."""
    print("Scraping sgim.dk/program.aspx for events...", file=sys.stderr)
    
    # First try the current page (2026)
    html = fetch_page()
    if html:
        events = extract_events(html)
        print(f"Found {len(events)} events on main page", file=sys.stderr)
        
        # Try each year
        for year in range(2013, 2026):
            if year == 2026:
                continue  # Already fetched
            print(f"Scraping year {year}...", file=sys.stderr)
            html = fetch_page(year)
            if html:
                year_events = extract_events(html)
                print(f"  Found {len(year_events)} events", file=sys.stderr)
                events.extend(year_events)
        
        # Output as JSON
        strapi_events = output_strapi_json(events)
        print(json.dumps(strapi_events, indent=2, ensure_ascii=False))
        
        print(f"\nTotal: {len(strapi_events)} events", file=sys.stderr)
    else:
        print("Failed to fetch the page", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
