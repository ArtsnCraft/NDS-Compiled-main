import os
import re
import shutil
from datetime import datetime
import json

# === Configuration ===
media_folder = "created"
html_file = "index.html"
refresh_mode = True  # True = full refresh, False = only add new items

# === Supported file extensions ===
video_exts = [".mp4", ".webm", ".mov"]
image_exts = [".jpeg", ".jpg", ".png"]

# === Fallback titles/descriptions
titles = ["Beautiful pets", "Beautiful Sunset", "Ocean View", "City Lights", "Starry Night"]
descriptions = [
    "Time-lapse of a girl's pet",
    "Sunset over the mountains",
    "Rolling waves and seagulls",
    "City skyline at night",
    "Stars across the desert sky"
]

# === Keyword-based category mapping ===
keyword_to_category = {
    'bird': 'birds',
    'eagle': 'birds',
    'sparrow': 'birds',
    'pet': 'pets',
    'dog': 'pets',
    'cat': 'pets',
    'sunset': 'landscape',
    'mountain': 'landscape',
    'landscape': 'landscape',
    'tree': 'landscape',
    'night': 'night',
    'stars': 'night',
    'dark': 'night'
}

def detect_category(file, is_video=False):
    if is_video:
        return "video"
    name = os.path.splitext(file)[0]
    # Try to extract category from parentheses, e.g., Archive (Pets) (228)
    match = re.search(r'\(([^)]+)\)', name)
    if match:
        cat = match.group(1).strip().lower()
        # Normalize to match your categories
        cat_map = {
            'pets': 'pets',
            'pet': 'pets',
            'birds': 'birds',
            'bird': 'birds',
            'landscape': 'landscape',
            'night': 'night',
            'video': 'video',
            # Add more as needed
        }
        if cat in cat_map:
            return cat_map[cat]
    # Fallback to keyword mapping (case-insensitive)
    name_lower = name.lower()
    for keyword, category in keyword_to_category.items():
        if keyword in name_lower:
            return category
    return "uncategorized"

def build_item(file, index):
    ext = os.path.splitext(file)[1].lower()
    path = f"{media_folder}/{file}"
    title = titles[index % len(titles)]
    desc = descriptions[index % len(descriptions)]

    is_video = ext in video_exts
    category = detect_category(file, is_video)

    if ext in image_exts:
        return f'''
<div class="gallery-item" draggable="true" data-category="{category}">
    <input type="checkbox" class="batch-select" aria-label="Select item" />
    <div class="image-wrapper">
        <span class="category-tag" data-category="{category}">{category.capitalize()}<span style="margin-left: 0.3rem; font-size: 0.6rem;">▼</span></span>
        <div class="zoom-indicator">
            <i class="fas fa-expand"></i>
        </div>
        <img src="{path}" loading="lazy" alt="{title}">
    </div>
    <div class="caption">
        <div class="caption-text">
            <h3>{title}</h3>
            <p>{desc}</p>
        </div>
        <button class="save-btn" tabindex="0" aria-label="Save">Save</button>
    </div>
</div>
'''
    elif is_video:
        return f'''
<div class="gallery-item" draggable="true" data-category="video">
    <input type="checkbox" class="batch-select" aria-label="Select item" />
    <div class="image-wrapper">
        <span class="category-tag" data-category="video">Video<span style="margin-left: 0.3rem; font-size: 0.6rem;">▼</span></span>
        <div class="zoom-indicator">
            <i class="fas fa-expand"></i>
        </div>
        <video preload="metadata" loading="lazy">
            <source src="{path}" type="video/{ext[1:]}">
            Your browser does not support the video tag.
        </video>
        <div class="video-icon">
            <i class="fas fa-play"></i>
        </div>
    </div>
    <div class="caption">
        <div class="caption-text">
            <h3>{title}</h3>
            <p>{desc}</p>
        </div>
        <button class="save-btn" tabindex="0" aria-label="Save">Save</button>
    </div>
</div>
'''
    else:
        return f'<!-- Skipped unsupported file: {file} -->\n'

# === Read and parse existing HTML ===
with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

start_tag = "<!-- GALLERY_START -->"
end_tag = "<!-- GALLERY_END -->"

if start_tag not in html_content or end_tag not in html_content:
    print("❌ Error: Missing <!-- GALLERY_START --> or <!-- GALLERY_END --> in HTML.")
    exit()

before = html_content.split(start_tag)[0]
after = html_content.split(end_tag)[1]
existing_section = html_content.split(start_tag)[1].split(end_tag)[0]

# === Detect already added media ===
existing_sources = set()
if not refresh_mode:
    existing_sources |= set(re.findall(r'<source src="([^"]+)"', existing_section))
    existing_sources |= set(re.findall(r'<img src="([^"]+)"', existing_section))
    existing_sources = set(os.path.basename(src) for src in existing_sources)

# === Collect media files and filter new ones ===
all_files = sorted(f for f in os.listdir(media_folder) if os.path.splitext(f)[1].lower() in video_exts + image_exts)
new_files = all_files if refresh_mode else [f for f in all_files if f not in existing_sources]

# === Load existing galleryData.json if present ===
user_gallery_data = {}
if os.path.exists("galleryData.json"):
    try:
        with open("galleryData.json", "r", encoding="utf-8") as jf:
            for entry in json.load(jf):
                user_gallery_data[entry["filename"]] = entry
        print(f"ℹ️ Loaded {len(user_gallery_data)} user-edited gallery items from galleryData.json.")
    except Exception as e:
        print(f"⚠️ Could not load existing galleryData.json: {e}")

# === Generate HTML blocks and collect gallery data ===
gallery_data = []
generated_html = ""
for i, f in enumerate(all_files):
    ext = os.path.splitext(f)[1].lower()
    is_video = ext in video_exts
    # Use user-edited data if available
    if f in user_gallery_data:
        entry = user_gallery_data[f]
        category = entry.get("category", detect_category(f, is_video))
        title = entry.get("title", titles[i % len(titles)])
        desc = entry.get("description", descriptions[i % len(descriptions)])
        type_ = entry.get("type", "video" if is_video else "image")
    else:
        category = detect_category(f, is_video)
        title = titles[i % len(titles)]
        desc = descriptions[i % len(descriptions)]
        type_ = "video" if is_video else "image"
    gallery_data.append({
        "filename": f,
        "category": category,
        "title": title,
        "description": desc,
        "type": type_
    })
    if refresh_mode or (not refresh_mode and f in new_files):
        generated_html += build_item(f, i) + "\n"

# === Final section merge ===
if refresh_mode:
    final_section = generated_html.strip()
else:
    final_section = existing_section.strip() + "\n" + generated_html.strip()

final_html = before + start_tag + "\n" + final_section + "\n" + end_tag + after

# === Backup original HTML ===
backup_name = f"{html_file}.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
shutil.copyfile(html_file, backup_name)
print(f"📦 Backup created: {backup_name}")

# === Write final HTML ===
with open(html_file, 'w', encoding='utf-8') as f:
    f.write(final_html)

# === Write galleryData.json ===
with open("galleryData.json", "w", encoding="utf-8") as jf:
    json.dump(gallery_data, jf, indent=2, ensure_ascii=False)
print(f"✅ galleryData.json written with {len(gallery_data)} item(s).")

print(f"✅ Injected {len(new_files)} new item(s). Mode: {'Full Refresh' if refresh_mode else 'Append Only'}")
