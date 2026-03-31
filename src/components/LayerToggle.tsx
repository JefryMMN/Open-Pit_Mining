import React from 'react';
import { Satellite, Camera } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const LayerToggle: React.FC = () => {
    const { activeLayer, setActiveLayer } = useAppStore();

    return (
        <div className="layer-toggle">
            <span className="layer-title">📹 Data Source</span>
            <div className="layer-buttons">
                <button
                    className={`layer-btn ${activeLayer === 'satellite' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('satellite')}
                >
                    <Satellite size={14} />
                    <span>Satellite</span>
                </button>
                <button
                    className={`layer-btn ${activeLayer === 'drone' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('drone')}
                >
                    <Camera size={14} />
                    <span>Drone</span>
                </button>
            </div>
        </div>
    );
};
