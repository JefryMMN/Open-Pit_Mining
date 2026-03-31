import React from 'react';

export const TerrainView: React.FC = () => {
    return (
        <div className="terrain-view">
            <div className="terrain-container">
                {/* Simulated 3D pit visualization using CSS */}
                <div className="terrain-pit">
                    <div className="pit-ring pit-ring-1"></div>
                    <div className="pit-ring pit-ring-2"></div>
                    <div className="pit-ring pit-ring-3"></div>
                    <div className="pit-ring pit-ring-4"></div>
                    <div className="pit-ring pit-ring-5"></div>
                    <div className="pit-center"></div>
                </div>

                {/* Stats overlay */}
                <div className="terrain-stats">
                    <h3>3D Terrain Analysis</h3>
                    <div className="stat-row">
                        <span>Estimated Depth:</span>
                        <strong>187 meters</strong>
                    </div>
                    <div className="stat-row">
                        <span>Volume Extracted:</span>
                        <strong>2.4M cubic meters</strong>
                    </div>
                    <div className="stat-row">
                        <span>Surface Area:</span>
                        <strong>56.8 hectares</strong>
                    </div>
                </div>
            </div>

            <p className="terrain-note">
                *3D visualization is simulated. Actual depth analysis requires LiDAR data.
            </p>
        </div>
    );
};
