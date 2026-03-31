import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const AnalysisSummary: React.FC = () => {
    const {
        analysisComplete,
        analysisMode,
        totalAreaHa,
        compliantAreaHa,
        illegalAreaHa,
    } = useAppStore();

    if (!analysisComplete) return null;

    const isCompliant = illegalAreaHa === 0;
    const modeLabel = analysisMode === 'ml' ? '🤖 ML Model' : analysisMode === 'demo' ? '🔬 Demo Mode' : '📊 Simulated';

    return (
        <div className="summary-panel">
            <div className="summary-header">
                <h3>Analysis Summary</h3>
            </div>
            <div className="summary-body">
                <div className="summary-row">
                    <span className="summary-label">Mode:</span>
                    <span className="summary-val" style={{ fontSize: '10px' }}>{modeLabel}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-label">Total Mining Area:</span>
                    <span className="summary-val">{totalAreaHa.toFixed(1)} ha</span>
                </div>
                <div className="summary-row">
                    <span className="summary-label">Compliant Area:</span>
                    <span className="summary-val">{compliantAreaHa.toFixed(1)} ha</span>
                </div>
                <div className="summary-row">
                    <span className="summary-label">Illegal Area:</span>
                    <span className="summary-val">{illegalAreaHa.toFixed(1)} ha</span>
                </div>
                <div className="summary-row" style={{ marginTop: '8px' }}>
                    <span className="summary-label">Status:</span>
                    <span className={`summary-val ${isCompliant ? '' : 'text-red'}`}>
                        {isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
                    </span>
                </div>
            </div>
        </div>
    );
};

