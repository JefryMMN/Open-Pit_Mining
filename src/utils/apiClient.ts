/**
 * API Client for communicating with the Python ML backend.
 * Calls the FastAPI server for UNet-based mining analysis.
 */

const API_BASE = '/api';

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface MiningZoneResult {
    id: string;
    polygon: GeoJSON.Feature;
    isLegal: boolean;
    area_ha: number;
    confidence: number;
}

export interface AnalysisResult {
    success: boolean;
    mode: 'ml' | 'demo';
    mining_zones: MiningZoneResult[];
    total_area_ha: number;
    compliant_area_ha: number;
    illegal_area_ha: number;
    violations: string[];
}

export interface HealthStatus {
    status: string;
    model_loaded: boolean;
    torch_available: boolean;
    device: string;
    mode: 'ml' | 'demo';
}

/**
 * Check if the Python backend is running and healthy.
 */
export async function checkBackendHealth(): Promise<HealthStatus | null> {
    try {
        const response = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Send coordinates to the backend for UNet-based mining analysis.
 * Returns detected mining zones as GeoJSON with legality classification.
 */
export async function analyzeMiningArea(coordinates: Coordinate[]): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Analysis failed with status ${response.status}`);
    }

    return await response.json();
}
