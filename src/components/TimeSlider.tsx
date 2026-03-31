import React from 'react';
import { useAppStore } from '../store/useAppStore';

const TIME_PERIODS = [
    { label: 'Jan 2023', value: '2023-01' },
    { label: 'Apr 2023', value: '2023-04' },
    { label: 'Jul 2023', value: '2023-07' },
    { label: 'Oct 2023', value: '2023-10' },
    { label: 'Jan 2024', value: '2024-01' },
    { label: 'Current', value: 'current' },
];

export const TimeSlider: React.FC = () => {
    const { selectedDate, setSelectedDate } = useAppStore();

    const currentIndex = TIME_PERIODS.findIndex(p => p.value === selectedDate);

    return (
        <div className="time-slider">
            <div className="time-slider-header">
                <span>📅 Temporal Analysis</span>
                <span className="time-label">{TIME_PERIODS[currentIndex]?.label || 'Current'}</span>
            </div>
            <input
                type="range"
                min={0}
                max={TIME_PERIODS.length - 1}
                value={currentIndex >= 0 ? currentIndex : TIME_PERIODS.length - 1}
                onChange={(e) => setSelectedDate(TIME_PERIODS[parseInt(e.target.value)].value)}
                className="time-range"
            />
            <div className="time-labels">
                <span>Jan 2023</span>
                <span>Current</span>
            </div>
        </div>
    );
};
