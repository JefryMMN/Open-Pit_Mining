import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

interface CoordinatePanelProps {
    className?: string;
    onClose?: () => void;
}

export const CoordinatePanel: React.FC<CoordinatePanelProps> = ({ className = '', onClose }) => {
    const {
        addCoordinate,
        clearCoordinates,
        plotBoundary,
    } = useAppStore();

    const [inputs, setInputs] = useState<{ lat: string; lng: string }[]>(
        Array(6).fill(null).map(() => ({ lat: '', lng: '' }))
    );
    const [showError, setShowError] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const inputListRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (index: number, field: 'lat' | 'lng', value: string) => {
        const newInputs = [...inputs];
        newInputs[index] = { ...newInputs[index], [field]: value };
        setInputs(newInputs);
        setShowError(false); // Clear error when user starts typing
    };

    const handleClear = () => {
        setInputs(Array(6).fill(null).map(() => ({ lat: '', lng: '' })));
        clearCoordinates();
        setShowError(false);
    };

    const getValidInputs = () => {
        return inputs.filter(input => {
            const lat = parseFloat(input.lat);
            const lng = parseFloat(input.lng);
            return !isNaN(lat) && !isNaN(lng);
        });
    };

    const handleAddAllPoints = () => {
        const validInputs = getValidInputs();
        if (validInputs.length === 0) {
            triggerShake();
            return;
        }
        // Clear existing and add all valid points
        clearCoordinates();
        validInputs.forEach(input => {
            addCoordinate({ lat: parseFloat(input.lat), lng: parseFloat(input.lng) });
        });
    };

    const triggerShake = () => {
        setIsShaking(true);
        setShowError(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const handleDrawBoundary = () => {
        const validInputs = getValidInputs();

        if (validInputs.length < 3) {
            triggerShake();
            return;
        }

        // Add all valid coordinates to store
        clearCoordinates();
        validInputs.forEach(input => {
            addCoordinate({ lat: parseFloat(input.lat), lng: parseFloat(input.lng) });
        });

        // Plot boundary after a small delay to ensure state is updated
        setTimeout(() => {
            plotBoundary();
            if (onClose) onClose(); // Close mobile panel after drawing
        }, 100);
    };

    const getEmptyInputIndices = () => {
        const emptyIndices: number[] = [];
        inputs.slice(0, 3).forEach((input, i) => {
            if (!input.lat || !input.lng || isNaN(parseFloat(input.lat)) || isNaN(parseFloat(input.lng))) {
                emptyIndices.push(i);
            }
        });
        return emptyIndices;
    };

    const emptyIndices = showError ? getEmptyInputIndices() : [];

    return (
        <div className={`coord-panel ${className}`}>
            <div className="panel-header">
                Coordinate Input
                {onClose && (
                    <button className="panel-close-btn" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                )}
            </div>

            <div className={`coord-input-list ${isShaking ? 'shake' : ''}`} ref={inputListRef}>
                {inputs.map((input, i) => (
                    <div key={i} className="coord-row">
                        <span className="label-text">Point {i + 1}.</span>
                        <div className="coord-inputs">
                            <input
                                type="text"
                                placeholder="Lat"
                                value={input.lat}
                                onChange={(e) => handleInputChange(i, 'lat', e.target.value)}
                                className={emptyIndices.includes(i) ? 'error' : ''}
                            />
                            <input
                                type="text"
                                placeholder="Long"
                                value={input.lng}
                                onChange={(e) => handleInputChange(i, 'lng', e.target.value)}
                                className={emptyIndices.includes(i) ? 'error' : ''}
                            />
                        </div>
                    </div>
                ))}

                {showError && (
                    <div className="validation-message">
                        ⚠ Please enter at least 3 coordinate points
                    </div>
                )}

                <div className="coord-actions">
                    <button className="btn-blue" onClick={handleAddAllPoints}>Add Point</button>
                    <button className="btn-gray" onClick={handleClear}>Clear</button>
                </div>

                <button className="btn-gold" onClick={handleDrawBoundary}>
                    Draw Boundary
                </button>
            </div>
        </div>
    );
};
