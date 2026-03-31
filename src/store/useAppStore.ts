import { create } from 'zustand';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import { analyzeMiningArea, checkBackendHealth } from '../utils/apiClient';

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface GridCell {
    id: string;
    polygon: Feature<Polygon>;
    miningDetected: boolean;
    insideLease: boolean;
    status: 'Legal' | 'Potential Illegal' | 'No Activity';
}

export interface MiningZone {
    id: string;
    polygon: Feature<Polygon>;
    isLegal: boolean;
}

export interface Alert {
    message: string;
    severity: 'info' | 'warning' | 'critical';
}

interface AppState {
    // Login state
    isLoggedIn: boolean;
    setIsLoggedIn: (val: boolean) => void;

    // Coordinate input
    coordinates: Coordinate[];
    addCoordinate: (coord: Coordinate) => void;
    updateCoordinate: (index: number, coord: Coordinate) => void;
    removeCoordinate: (index: number) => void;
    clearCoordinates: () => void;

    // Boundary polygon
    boundaryPolygon: Feature<Polygon> | null;
    setBoundaryPolygon: (polygon: Feature<Polygon> | null) => void;

    // Analysis state
    isAnalyzing: boolean;
    setIsAnalyzing: (val: boolean) => void;
    analysisComplete: boolean;
    setAnalysisComplete: (val: boolean) => void;

    // Grid cells
    gridCells: GridCell[];
    setGridCells: (cells: GridCell[]) => void;

    // Mining zones (from ML model or simulated)
    miningZones: MiningZone[];
    setMiningZones: (zones: MiningZone[]) => void;

    // ML Analysis results
    analysisMode: 'ml' | 'demo' | 'mock' | null;
    totalAreaHa: number;
    compliantAreaHa: number;
    illegalAreaHa: number;
    violations: string[];
    backendAvailable: boolean | null;

    // Layer visibility
    layers: {
        satellite: boolean;
        cadastral: boolean;
        grid: boolean;
        mining: boolean;
        illegal: boolean;
    };
    toggleLayer: (layer: keyof AppState['layers']) => void;

    // Alerts
    alerts: Alert[];
    clearAlerts: () => void;

    // Active layer (satellite/drone)
    activeLayer: 'satellite' | 'drone';
    setActiveLayer: (layer: 'satellite' | 'drone') => void;

    // Temporal analysis
    selectedDate: string;
    setSelectedDate: (date: string) => void;

    // Plot boundary from coordinates
    plotBoundary: () => void;

    // Run analysis
    runAnalysis: () => void;

    // Reset all
    resetAnalysis: () => void;

    // Check backend health
    checkBackend: () => Promise<void>;
}

const generateGridCells = (
    boundaryPolygon: Feature<Polygon>,
    miningZones: MiningZone[]
): GridCell[] => {
    const bbox = turf.bbox(boundaryPolygon);
    const cellSize = 0.002; // ~200m cells
    const grid = turf.squareGrid(bbox, cellSize, { units: 'degrees' });

    const cells: GridCell[] = [];

    grid.features.forEach((cell, index) => {
        let miningDetected = false;
        let insideLease = false;

        // Check if cell intersects with any mining zone
        for (const zone of miningZones) {
            const intersection = turf.booleanIntersects(cell, zone.polygon);
            if (intersection) {
                miningDetected = true;
                break;
            }
        }

        // Check if cell center is inside the lease boundary
        const cellCenter = turf.centroid(cell);
        insideLease = turf.booleanPointInPolygon(cellCenter, boundaryPolygon);

        let status: GridCell['status'] = 'No Activity';
        if (miningDetected) {
            status = insideLease ? 'Legal' : 'Potential Illegal';
        }

        cells.push({
            id: `GRID-${String(index + 1).padStart(4, '0')}`,
            polygon: cell as Feature<Polygon>,
            miningDetected,
            insideLease,
            status,
        });
    });

    return cells;
};

const generateMockMiningZones = (
    boundaryPolygon: Feature<Polygon>
): MiningZone[] => {
    const centroid = turf.centroid(boundaryPolygon);
    const [lng, lat] = centroid.geometry.coordinates;

    // Legal mining zone (inside boundary)
    const legalZone: MiningZone = {
        id: 'MINE-001',
        polygon: turf.circle([lng - 0.003, lat + 0.002], 0.3, { units: 'kilometers' }) as Feature<Polygon>,
        isLegal: true,
    };

    // Another legal zone
    const legalZone2: MiningZone = {
        id: 'MINE-002',
        polygon: turf.circle([lng + 0.002, lat - 0.001], 0.25, { units: 'kilometers' }) as Feature<Polygon>,
        isLegal: true,
    };

    // Illegal mining zone (outside boundary)
    const illegalZone: MiningZone = {
        id: 'MINE-003',
        polygon: turf.circle([lng + 0.012, lat + 0.008], 0.35, { units: 'kilometers' }) as Feature<Polygon>,
        isLegal: false,
    };

    // Another illegal zone
    const illegalZone2: MiningZone = {
        id: 'MINE-004',
        polygon: turf.circle([lng - 0.010, lat - 0.012], 0.2, { units: 'kilometers' }) as Feature<Polygon>,
        isLegal: false,
    };

    return [legalZone, legalZone2, illegalZone, illegalZone2];
};

export const useAppStore = create<AppState>((set, get) => ({
    isLoggedIn: false,
    setIsLoggedIn: (val) => set({ isLoggedIn: val }),

    coordinates: [],
    addCoordinate: (coord) => set((state) => ({
        coordinates: state.coordinates.length < 10
            ? [...state.coordinates, coord]
            : state.coordinates
    })),
    updateCoordinate: (index, coord) => set((state) => ({
        coordinates: state.coordinates.map((c, i) => i === index ? coord : c)
    })),
    removeCoordinate: (index) => set((state) => ({
        coordinates: state.coordinates.filter((_, i) => i !== index)
    })),
    clearCoordinates: () => set({ coordinates: [], boundaryPolygon: null, analysisComplete: false, gridCells: [], miningZones: [] }),

    boundaryPolygon: null,
    setBoundaryPolygon: (polygon) => set({ boundaryPolygon: polygon }),

    isAnalyzing: false,
    setIsAnalyzing: (val) => set({ isAnalyzing: val }),
    analysisComplete: false,
    setAnalysisComplete: (val) => set({ analysisComplete: val }),

    gridCells: [],
    setGridCells: (cells) => set({ gridCells: cells }),

    miningZones: [],
    setMiningZones: (zones) => set({ miningZones: zones }),

    layers: {
        satellite: true,
        cadastral: true,
        grid: true,
        mining: true,
        illegal: true,
    },
    toggleLayer: (layer) => set((state) => ({
        layers: { ...state.layers, [layer]: !state.layers[layer] }
    })),

    // Alerts
    alerts: [],
    clearAlerts: () => set({ alerts: [] }),

    // Active layer
    activeLayer: 'satellite',
    setActiveLayer: (layer) => set({ activeLayer: layer }),

    // Selected date for temporal analysis
    selectedDate: 'current',
    setSelectedDate: (date) => set({ selectedDate: date }),

    plotBoundary: () => {
        const { coordinates } = get();
        if (coordinates.length < 3) return;

        // Create a closed polygon from coordinates
        const coords = coordinates.map(c => [c.lng, c.lat] as [number, number]);
        coords.push(coords[0]); // Close the polygon

        const polygon = turf.polygon([coords]);
        set({ boundaryPolygon: polygon, analysisComplete: false, gridCells: [], miningZones: [] });
    },

    // ML analysis result state
    analysisMode: null,
    totalAreaHa: 0,
    compliantAreaHa: 0,
    illegalAreaHa: 0,
    violations: [],
    backendAvailable: null,

    runAnalysis: async () => {
        const { boundaryPolygon, coordinates } = get();
        if (!boundaryPolygon) return;

        set({ isAnalyzing: true });

        try {
            // Try calling the ML backend
            const result = await analyzeMiningArea(
                coordinates.map(c => ({ lat: c.lat, lng: c.lng }))
            );

            // Convert API response zones to app MiningZone format
            const mlZones: MiningZone[] = result.mining_zones.map((zone) => {
                // Convert GeoJSON feature to turf Feature<Polygon>
                const polygon = zone.polygon as unknown as Feature<Polygon>;
                return {
                    id: zone.id,
                    polygon,
                    isLegal: zone.isLegal,
                };
            });

            const gridCells = generateGridCells(boundaryPolygon, mlZones);

            set({
                miningZones: mlZones,
                gridCells,
                isAnalyzing: false,
                analysisComplete: true,
                analysisMode: result.mode,
                totalAreaHa: result.total_area_ha,
                compliantAreaHa: result.compliant_area_ha,
                illegalAreaHa: result.illegal_area_ha,
                violations: result.violations,
                backendAvailable: true,
            });

            console.log(`✅ Analysis complete (${result.mode} mode): ${result.mining_zones.length} zones found`);

        } catch (error) {
            console.warn('Backend unavailable, falling back to mock analysis:', error);

            // Fallback to mock data
            const miningZones = generateMockMiningZones(boundaryPolygon);
            const gridCells = generateGridCells(boundaryPolygon, miningZones);

            const updatedZones = miningZones.map(zone => {
                const intersection = turf.booleanIntersects(zone.polygon, boundaryPolygon);
                const centroid = turf.centroid(zone.polygon);
                const isInside = turf.booleanPointInPolygon(centroid, boundaryPolygon);
                return { ...zone, isLegal: isInside && intersection };
            });

            const legalArea = updatedZones.filter(z => z.isLegal).length * 22.25;
            const illegalArea = updatedZones.filter(z => !z.isLegal).length * 6.15;

            set({
                miningZones: updatedZones,
                gridCells,
                isAnalyzing: false,
                analysisComplete: true,
                analysisMode: 'mock',
                totalAreaHa: legalArea + illegalArea,
                compliantAreaHa: legalArea,
                illegalAreaHa: illegalArea,
                violations: updatedZones
                    .filter(z => !z.isLegal)
                    .map(z => `Unauthorized mining detected at Zone ${z.id}`),
                backendAvailable: false,
            });
        }
    },

    resetAnalysis: () => set({
        coordinates: [],
        boundaryPolygon: null,
        gridCells: [],
        miningZones: [],
        isAnalyzing: false,
        analysisComplete: false,
        analysisMode: null,
        totalAreaHa: 0,
        compliantAreaHa: 0,
        illegalAreaHa: 0,
        violations: [],
    }),

    checkBackend: async () => {
        const health = await checkBackendHealth();
        set({ backendAvailable: health !== null });
    },
}));

