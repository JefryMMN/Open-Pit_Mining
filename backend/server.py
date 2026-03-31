"""
FastAPI backend for Open Pit Mining Analysis.
Accepts boundary coordinates, fetches satellite imagery,
runs UNet inference, and returns predicted mining zones as GeoJSON.
"""

import os
import io
import math
import logging
import numpy as np
import cv2
import requests
from PIL import Image
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely.geometry import Polygon as ShapelyPolygon, MultiPolygon, mapping, shape
from shapely.ops import unary_union

# ─── Configuration ─────────────────────────────────────────────
IMG_SIZE = 256
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "mine_unet_model.pth")
DEVICE = "cpu"  # Default to CPU for wider compatibility

# Try to import torch and segmentation_models_pytorch
try:
    import torch
    import segmentation_models_pytorch as smp
    TORCH_AVAILABLE = True
    if torch.cuda.is_available():
        DEVICE = "cuda"
except ImportError:
    TORCH_AVAILABLE = False
    logging.warning("PyTorch not installed. Running in DEMO mode (simulated predictions).")

# ─── Logging ───────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── FastAPI App ───────────────────────────────────────────────
app = FastAPI(
    title="Mining Analysis API",
    description="UNet-based satellite image segmentation for mining detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models ──────────────────────────────────────────
class Coordinate(BaseModel):
    lat: float
    lng: float

class AnalyzeRequest(BaseModel):
    coordinates: List[Coordinate]

class MiningZone(BaseModel):
    id: str
    polygon: dict  # GeoJSON Feature
    isLegal: bool
    area_ha: float
    confidence: float

class AnalyzeResponse(BaseModel):
    success: bool
    mode: str  # "ml" or "demo"
    mining_zones: List[MiningZone]
    total_area_ha: float
    compliant_area_ha: float
    illegal_area_ha: float
    violations: List[str]
    mask_data: Optional[str] = None  # Base64 encoded mask image

# ─── Model Loading ─────────────────────────────────────────────
model = None

def load_model():
    """Load the UNet model if available."""
    global model
    if not TORCH_AVAILABLE:
        logger.info("PyTorch not available - using demo mode")
        return False

    if not os.path.exists(MODEL_PATH):
        logger.warning(f"Model file not found at {MODEL_PATH} - using demo mode")
        return False

    try:
        model = smp.Unet(
            encoder_name="resnet50",
            encoder_weights=None,
            in_channels=3,
            classes=1,
        ).to(DEVICE)
        model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        model.eval()
        logger.info("✅ UNet model loaded successfully!")
        return True
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return False

# ─── Satellite Image Fetching ──────────────────────────────────

def lat_lng_to_tile(lat: float, lng: float, zoom: int) -> tuple:
    """Convert lat/lng to tile x, y at given zoom level."""
    n = 2 ** zoom
    x = int((lng + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y

def tile_to_lat_lng(x: int, y: int, zoom: int) -> tuple:
    """Convert tile x, y back to lat/lng (top-left corner)."""
    n = 2 ** zoom
    lng = x / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat = math.degrees(lat_rad)
    return lat, lng

def fetch_satellite_image(coordinates: List[Coordinate], zoom: int = 16) -> tuple:
    """
    Fetch satellite imagery for the bounding box of the given coordinates.
    Returns (image_array, bbox_dict) where bbox_dict has min/max lat/lng.
    """
    lats = [c.lat for c in coordinates]
    lngs = [c.lng for c in coordinates]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)

    bbox = {
        "min_lat": min_lat, "max_lat": max_lat,
        "min_lng": min_lng, "max_lng": max_lng,
    }

    # Get tile range
    x_min, y_max = lat_lng_to_tile(min_lat, min_lng, zoom)
    x_max, y_min = lat_lng_to_tile(max_lat, max_lng, zoom)

    # Ensure we have at least 1 tile in each direction
    if x_min == x_max:
        x_max += 1
    if y_min == y_max:
        y_max += 1

    tile_size = 256
    width = (x_max - x_min + 1) * tile_size
    height = (y_max - y_min + 1) * tile_size

    composite = np.zeros((height, width, 3), dtype=np.uint8)

    esri_url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

    for tx in range(x_min, x_max + 1):
        for ty in range(y_min, y_max + 1):
            url = esri_url.format(z=zoom, y=ty, x=tx)
            try:
                resp = requests.get(url, timeout=10)
                if resp.status_code == 200:
                    img = Image.open(io.BytesIO(resp.content)).convert("RGB")
                    tile_arr = np.array(img)
                    px = (tx - x_min) * tile_size
                    py = (ty - y_min) * tile_size
                    composite[py:py+tile_size, px:px+tile_size] = tile_arr
            except Exception as e:
                logger.warning(f"Failed to fetch tile {tx},{ty}: {e}")

    return composite, bbox

def pixel_to_latlng(px: int, py: int, bbox: dict, img_width: int, img_height: int) -> tuple:
    """Convert pixel coordinates to lat/lng based on bounding box."""
    lng = bbox["min_lng"] + (px / img_width) * (bbox["max_lng"] - bbox["min_lng"])
    lat = bbox["max_lat"] - (py / img_height) * (bbox["max_lat"] - bbox["min_lat"])
    return lat, lng

# ─── Inference ─────────────────────────────────────────────────

def run_inference(image: np.ndarray) -> np.ndarray:
    """Run UNet inference on the image. Returns binary mask."""
    if model is None:
        return generate_demo_mask(image)

    # Preprocess
    img = cv2.resize(image, (IMG_SIZE, IMG_SIZE))
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))
    img_tensor = torch.tensor(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        pred = model(img_tensor)
        pred = torch.sigmoid(pred)
        pred = pred.squeeze().cpu().numpy()

    mask = (pred > 0.5).astype(np.uint8)

    # Post-process: smooth and clean up
    mask = cv2.GaussianBlur(mask.astype(np.float32), (5, 5), 0)
    mask = (mask > 0.5).astype(np.uint8)

    # Resize back to original image size
    mask = cv2.resize(mask, (image.shape[1], image.shape[0]))

    return mask

def generate_demo_mask(image: np.ndarray) -> np.ndarray:
    """
    Generate a realistic demo mask when no model is available.
    Uses simple image processing to simulate mining detection.
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Detect bright/barren areas (typical of open-pit mines)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    # Low saturation + medium-high value = barren/excavated land
    lower = np.array([0, 0, 80])
    upper = np.array([30, 80, 220])
    mask1 = cv2.inRange(hsv, lower, upper)

    # Also detect yellowish-brown areas (exposed earth)
    lower2 = np.array([10, 30, 100])
    upper2 = np.array([30, 150, 255])
    mask2 = cv2.inRange(hsv, lower2, upper2)

    combined = cv2.bitwise_or(mask1, mask2)

    # Clean up with morphological operations
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
    combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel)

    # Only keep large contours (filter noise)
    contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    result = np.zeros((h, w), dtype=np.uint8)
    min_area = (h * w) * 0.005  # At least 0.5% of image
    for cnt in contours:
        if cv2.contourArea(cnt) > min_area:
            cv2.drawContours(result, [cnt], -1, 1, -1)

    return result

def mask_to_geojson_zones(
    mask: np.ndarray,
    bbox: dict,
    boundary_coords: List[Coordinate]
) -> List[dict]:
    """
    Convert a binary mask to GeoJSON mining zone polygons.
    Determines if each zone is inside or outside the lease boundary.
    """
    h, w = mask.shape[:2]
    zones = []

    # Find contours in the mask
    contours, _ = cv2.findContours(
        (mask * 255).astype(np.uint8),
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    # Create the lease boundary polygon for intersection checks
    boundary_ring = [(c.lng, c.lat) for c in boundary_coords]
    boundary_ring.append(boundary_ring[0])  # Close the ring
    try:
        boundary_poly = ShapelyPolygon(boundary_ring)
    except Exception:
        boundary_poly = None

    for i, contour in enumerate(contours):
        if len(contour) < 3:
            continue

        area_px = cv2.contourArea(contour)
        if area_px < 50:  # Skip tiny contours
            continue

        # Convert contour pixels to lat/lng
        geo_coords = []
        for pt in contour:
            px, py = pt[0]
            lat, lng = pixel_to_latlng(int(px), int(py), bbox, w, h)
            geo_coords.append((lng, lat))
        geo_coords.append(geo_coords[0])  # Close the ring

        try:
            zone_poly = ShapelyPolygon(geo_coords)
            if not zone_poly.is_valid:
                zone_poly = zone_poly.buffer(0)
            if zone_poly.is_empty:
                continue
        except Exception:
            continue

        # Calculate area in hectares (approximate)
        # Using the centroid latitude for a rough conversion
        centroid = zone_poly.centroid
        lat_center = centroid.y
        deg_to_m_lat = 111320.0
        deg_to_m_lng = 111320.0 * math.cos(math.radians(lat_center))
        area_deg = zone_poly.area
        area_m2 = area_deg * deg_to_m_lat * deg_to_m_lng
        area_ha = area_m2 / 10000.0

        # Check if zone is inside the lease boundary
        is_legal = False
        if boundary_poly and boundary_poly.is_valid:
            try:
                intersection = zone_poly.intersection(boundary_poly)
                overlap_ratio = intersection.area / zone_poly.area if zone_poly.area > 0 else 0
                is_legal = overlap_ratio > 0.5  # >50% inside = legal
            except Exception:
                is_legal = False

        # Confidence is based on area (larger = more confident)
        confidence = min(0.95, 0.6 + (area_ha / 50.0) * 0.35)

        geojson_feature = {
            "type": "Feature",
            "geometry": mapping(zone_poly),
            "properties": {
                "id": f"MINE-{str(i+1).zfill(3)}",
                "isLegal": is_legal,
                "area_ha": round(area_ha, 2),
                "confidence": round(confidence, 2),
            }
        }

        zones.append({
            "id": f"MINE-{str(i+1).zfill(3)}",
            "polygon": geojson_feature,
            "isLegal": is_legal,
            "area_ha": round(area_ha, 2),
            "confidence": round(confidence, 2),
        })

    return zones

# ─── API Endpoints ─────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Load model on startup."""
    load_model()

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "torch_available": TORCH_AVAILABLE,
        "device": DEVICE,
        "mode": "ml" if model is not None else "demo",
    }

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_mining_area(request: AnalyzeRequest):
    """
    Analyze a mining area for compliance.
    
    Accepts polygon coordinates, fetches satellite imagery,
    runs UNet segmentation, and returns detected mining zones.
    """
    if len(request.coordinates) < 3:
        raise HTTPException(
            status_code=400,
            detail="At least 3 coordinates are required to define a boundary"
        )

    logger.info(f"Analyzing area with {len(request.coordinates)} boundary points")

    try:
        # Step 1: Fetch satellite image
        logger.info("Fetching satellite imagery...")
        image, bbox = fetch_satellite_image(request.coordinates)
        logger.info(f"Satellite image fetched: {image.shape}")

        # Step 2: Run inference
        logger.info("Running inference...")
        mask = run_inference(image)
        mining_pixel_count = np.sum(mask > 0)
        total_pixels = mask.shape[0] * mask.shape[1]
        logger.info(f"Mining detected: {mining_pixel_count}/{total_pixels} pixels ({mining_pixel_count/total_pixels*100:.1f}%)")

        # Step 3: Convert mask to GeoJSON zones
        logger.info("Converting to GeoJSON zones...")
        zones = mask_to_geojson_zones(mask, bbox, request.coordinates)
        logger.info(f"Found {len(zones)} mining zones")

        # Step 4: Calculate stats
        mode = "ml" if model is not None else "demo"
        legal_zones = [z for z in zones if z["isLegal"]]
        illegal_zones = [z for z in zones if not z["isLegal"]]

        total_area = sum(z["area_ha"] for z in zones)
        compliant_area = sum(z["area_ha"] for z in legal_zones)
        illegal_area = sum(z["area_ha"] for z in illegal_zones)

        # Generate violation descriptions
        violations = []
        for z in illegal_zones:
            violations.append(
                f"Unauthorized mining detected at Zone {z['id']} "
                f"({z['area_ha']} ha, confidence: {z['confidence']*100:.0f}%)"
            )

        return AnalyzeResponse(
            success=True,
            mode=mode,
            mining_zones=[MiningZone(**z) for z in zones],
            total_area_ha=round(total_area, 2),
            compliant_area_ha=round(compliant_area, 2),
            illegal_area_ha=round(illegal_area, 2),
            violations=violations,
        )

    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Mining Analysis API", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
