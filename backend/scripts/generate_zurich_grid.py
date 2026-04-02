#!/usr/bin/env python3
"""Generate a hex grid of ~3,500 pins covering Canton Zürich.

Outputs:
  - output/zurich_hex_grid.json  — pin coordinates + metadata
  - output/zurich_grid_map.html  — interactive Leaflet.js visualization
"""

import json
import math
from pathlib import Path

from shapely.geometry import Point, Polygon

# --- Constants ---
RADIUS_M = 500        # circle radius per pin
SPACING_M = 750       # center-to-center distance (hex grid)
LAT_CENTER = 47.4     # for metric conversions

# Metric conversions at lat ~47.4°
DEG_LAT_PER_M = 1 / 111_100                            # ~0.000009°/m
DEG_LON_PER_M = 1 / (111_100 * math.cos(math.radians(LAT_CENTER)))  # ~0.0000133°/m

ROW_STEP = SPACING_M * math.sqrt(3) / 2 * DEG_LAT_PER_M   # vertical spacing
COL_STEP = SPACING_M * DEG_LON_PER_M                       # horizontal spacing

# Bounding box for Canton Zürich
BBOX = {"lat_min": 47.15, "lat_max": 47.70, "lon_min": 8.35, "lon_max": 8.99}

# Simplified Canton Zürich boundary polygon (~40 vertices, clockwise)
# Traced from official canton boundary map
CANTON_BOUNDARY = [
    (47.695, 8.558), (47.694, 8.520), (47.685, 8.480), (47.670, 8.445),
    (47.650, 8.410), (47.635, 8.370), (47.610, 8.360), (47.585, 8.355),
    (47.560, 8.360), (47.535, 8.365), (47.510, 8.358), (47.485, 8.360),
    (47.460, 8.365), (47.440, 8.355), (47.420, 8.360), (47.395, 8.370),
    (47.370, 8.380), (47.350, 8.400), (47.330, 8.420), (47.315, 8.450),
    (47.295, 8.480), (47.275, 8.500), (47.255, 8.520), (47.240, 8.540),
    (47.225, 8.560), (47.210, 8.590), (47.200, 8.620), (47.195, 8.660),
    (47.195, 8.700), (47.200, 8.740), (47.210, 8.770), (47.225, 8.800),
    (47.245, 8.830), (47.265, 8.850), (47.290, 8.870), (47.315, 8.890),
    (47.340, 8.900), (47.365, 8.910), (47.390, 8.920), (47.415, 8.935),
    (47.435, 8.945), (47.455, 8.955), (47.480, 8.965), (47.505, 8.970),
    (47.530, 8.975), (47.555, 8.980), (47.580, 8.975), (47.600, 8.960),
    (47.615, 8.935), (47.625, 8.910), (47.635, 8.880), (47.645, 8.850),
    (47.655, 8.820), (47.660, 8.790), (47.665, 8.760), (47.670, 8.730),
    (47.680, 8.700), (47.690, 8.670), (47.695, 8.640), (47.700, 8.610),
    (47.698, 8.580), (47.695, 8.558),
]

OUTPUT_DIR = Path(__file__).parent / "output"


def build_canton_polygon() -> Polygon:
    """Build shapely Polygon from boundary vertices (lon, lat order for shapely)."""
    return Polygon([(lon, lat) for lat, lon in CANTON_BOUNDARY])


def generate_grid(polygon: Polygon) -> list[dict]:
    """Generate triangular lattice points within the canton polygon."""
    pins = []
    pin_id = 1
    row = 0
    lat = BBOX["lat_min"]

    while lat <= BBOX["lat_max"]:
        col = 0
        # Offset odd rows by half a column step
        lon_offset = (COL_STEP / 2) if (row % 2 == 1) else 0
        lon = BBOX["lon_min"] + lon_offset

        while lon <= BBOX["lon_max"]:
            if polygon.contains(Point(lon, lat)):
                pins.append({
                    "id": pin_id,
                    "lat": round(lat, 6),
                    "lon": round(lon, 6),
                    "row": row,
                    "col": col,
                })
                pin_id += 1
            lon += COL_STEP
            col += 1

        lat += ROW_STEP
        row += 1

    return pins


def write_json(pins: list[dict], path: Path):
    """Write grid data as JSON."""
    data = {
        "metadata": {
            "radius_m": RADIUS_M,
            "spacing_m": SPACING_M,
            "total_pins": len(pins),
            "canton": "Zürich",
            "bounding_box": BBOX,
        },
        "pins": pins,
    }
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"  JSON: {path} ({len(pins)} pins)")


def write_html(pins: list[dict], path: Path):
    """Write interactive Leaflet.js map with live radius/spacing controls."""
    boundary_js = json.dumps([[lat, lon] for lat, lon in CANTON_BOUNDARY])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Canton Zürich — Hex Grid Coverage</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; font-family: system-ui, -apple-system, sans-serif; }}
  #map {{ height: 100vh; width: 100vw; }}

  .control-panel {{
    position: absolute; top: 10px; right: 10px; z-index: 1000;
    background: white; padding: 16px 20px; border-radius: 10px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15); width: 280px;
    font-size: 13px; line-height: 1.5;
  }}
  .control-panel h3 {{
    margin: 0 0 12px; font-size: 15px; border-bottom: 1px solid #e5e7eb;
    padding-bottom: 8px;
  }}

  .slider-group {{ margin-bottom: 14px; }}
  .slider-group label {{
    display: flex; justify-content: space-between; margin-bottom: 4px;
    font-weight: 500;
  }}
  .slider-group label .val {{ color: #2563eb; font-weight: 700; }}
  .slider-group input[type=range] {{
    width: 100%; accent-color: #2563eb; cursor: pointer;
  }}

  .stats {{ border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 4px; }}
  .stats div {{ display: flex; justify-content: space-between; }}
  .stats .val {{ font-weight: 600; color: #2563eb; }}

  .hint {{
    margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;
    color: #6b7280; font-size: 11px;
  }}

  #generating {{
    display: none; position: absolute; top: 50%; left: 50%; z-index: 2000;
    transform: translate(-50%, -50%); background: rgba(0,0,0,0.8);
    color: white; padding: 16px 28px; border-radius: 8px; font-size: 15px;
  }}
</style>
</head>
<body>
<div id="map"></div>
<div id="generating">Regenerating grid...</div>
<div class="control-panel">
  <h3>Grid Controls</h3>

  <div class="slider-group">
    <label>Radius <span class="val" id="radius-val">{RADIUS_M}m</span></label>
    <input type="range" id="radius-slider" min="200" max="2000" step="50" value="{RADIUS_M}">
  </div>

  <div class="slider-group">
    <label>Spacing <span class="val" id="spacing-val">{SPACING_M}m</span></label>
    <input type="range" id="spacing-slider" min="300" max="3000" step="50" value="{SPACING_M}">
  </div>

  <div class="stats">
    <div>Pins: <span class="val" id="stat-pins">—</span></div>
    <div>Overlap: <span class="val" id="stat-overlap">—</span></div>
    <div>Est. queries (dense): <span class="val" id="stat-queries">—</span></div>
    <div>Canton: <span class="val">Zürich</span></div>
  </div>

  <div class="hint">
    Drag sliders to regenerate the grid in real time.
    Circles appear at zoom &ge; 12.
  </div>
</div>
<script>
// --- Canton boundary ---
const BOUNDARY = {boundary_js};
const BBOX = {{ latMin: {BBOX["lat_min"]}, latMax: {BBOX["lat_max"]},
               lonMin: {BBOX["lon_min"]}, lonMax: {BBOX["lon_max"]} }};
const LAT_CENTER = 47.4;
const DEG_LAT_PER_M = 1 / 111100;
const DEG_LON_PER_M = 1 / (111100 * Math.cos(LAT_CENTER * Math.PI / 180));

// --- Map setup ---
const map = L.map('map', {{ preferCanvas: true }}).setView([47.38, 8.54], 10);
L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
  attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
}}).addTo(map);

L.polygon(BOUNDARY, {{
  color: '#2563eb', weight: 2, fillColor: '#2563eb', fillOpacity: 0.03
}}).addTo(map);

// --- Point-in-polygon (ray casting) ---
function pointInPolygon(lat, lon, poly) {{
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {{
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if (((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {{
      inside = !inside;
    }}
  }}
  return inside;
}}

// --- Grid generation ---
const pinLayer = L.layerGroup().addTo(map);
const circleLayer = L.layerGroup();
let currentPins = [];

function generateGrid(radiusM, spacingM) {{
  const rowStep = spacingM * Math.sqrt(3) / 2 * DEG_LAT_PER_M;
  const colStep = spacingM * DEG_LON_PER_M;
  const pins = [];
  let id = 1, row = 0, lat = BBOX.latMin;

  while (lat <= BBOX.latMax) {{
    let col = 0;
    const lonOffset = (row % 2 === 1) ? colStep / 2 : 0;
    let lon = BBOX.lonMin + lonOffset;
    while (lon <= BBOX.lonMax) {{
      if (pointInPolygon(lat, lon, BOUNDARY)) {{
        pins.push([lat, lon, id, row, col]);
        id++;
      }}
      lon += colStep;
      col++;
    }}
    lat += rowStep;
    row++;
  }}
  return pins;
}}

function renderGrid(radiusM, spacingM) {{
  pinLayer.clearLayers();
  circleLayer.clearLayers();

  currentPins = generateGrid(radiusM, spacingM);

  currentPins.forEach(([lat, lon, id, row, col]) => {{
    const m = L.circleMarker([lat, lon], {{
      radius: 3, color: '#e11d48', fillColor: '#e11d48',
      fillOpacity: 0.7, weight: 1
    }});
    m.bindPopup(`<b>Pin #${{id}}</b><br>Lat: ${{lat.toFixed(6)}}<br>Lon: ${{lon.toFixed(6)}}<br>Row: ${{row}}, Col: ${{col}}`);
    pinLayer.addLayer(m);
  }});

  currentPins.forEach(([lat, lon]) => {{
    circleLayer.addLayer(L.circle([lat, lon], {{
      radius: radiusM, color: '#2563eb', weight: 0.5,
      fillColor: '#3b82f6', fillOpacity: 0.08
    }}));
  }});

  updateCircleVisibility();
  updateStats(radiusM, spacingM);
}}

function updateStats(radiusM, spacingM) {{
  const n = currentPins.length;
  const overlap = 2 * radiusM - spacingM;
  document.getElementById('stat-pins').textContent = n.toLocaleString();
  document.getElementById('stat-overlap').textContent =
    overlap > 0 ? `~${{overlap}}m` : `gap ~${{-overlap}}m`;
  document.getElementById('stat-queries').textContent =
    `~${{(n * 5).toLocaleString()}} (5 cat)`;
}}

// --- Zoom-dependent circles ---
function updateCircleVisibility() {{
  if (map.getZoom() >= 12) {{
    if (!map.hasLayer(circleLayer)) map.addLayer(circleLayer);
  }} else {{
    if (map.hasLayer(circleLayer)) map.removeLayer(circleLayer);
  }}
}}
map.on('zoomend', updateCircleVisibility);

// --- Slider controls ---
const radiusSlider = document.getElementById('radius-slider');
const spacingSlider = document.getElementById('spacing-slider');
const radiusVal = document.getElementById('radius-val');
const spacingVal = document.getElementById('spacing-val');
const genIndicator = document.getElementById('generating');

let debounceTimer = null;

function onSliderChange() {{
  const r = parseInt(radiusSlider.value);
  const s = parseInt(spacingSlider.value);
  radiusVal.textContent = r + 'm';
  spacingVal.textContent = s + 'm';

  clearTimeout(debounceTimer);
  genIndicator.style.display = 'block';
  debounceTimer = setTimeout(() => {{
    renderGrid(r, s);
    genIndicator.style.display = 'none';
  }}, 150);
}}

radiusSlider.addEventListener('input', onSliderChange);
spacingSlider.addEventListener('input', onSliderChange);

// --- Initial render ---
renderGrid({RADIUS_M}, {SPACING_M});
</script>
</body>
</html>"""
    path.write_text(html)
    print(f"  HTML: {path}")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Building canton polygon...")
    polygon = build_canton_polygon()

    print("Generating hex grid...")
    pins = generate_grid(polygon)
    print(f"  → {len(pins)} pins inside canton boundary")

    json_path = OUTPUT_DIR / "zurich_hex_grid.json"
    html_path = OUTPUT_DIR / "zurich_grid_map.html"

    write_json(pins, json_path)
    write_html(pins, html_path)
    print("\nDone! Open the HTML file in a browser to inspect the grid.")


if __name__ == "__main__":
    main()
