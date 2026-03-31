import React from 'react';
import { FileText, Clock, Bell, User } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { generatePDFReport } from '../utils/pdfGenerator';

export const ReportPanel: React.FC = () => {
    const {
        analysisComplete,
        miningZones,
        totalAreaHa,
        compliantAreaHa,
        illegalAreaHa,
        violations,
    } = useAppStore();

    if (!analysisComplete) return null;

    const illegalZones = miningZones.filter(z => !z.isLegal);
    const legalZones = miningZones.filter(z => z.isLegal);

    const handleGenerateReport = async () => {
        const reportData = {
            totalArea: totalAreaHa,
            compliantArea: compliantAreaHa,
            illegalArea: illegalAreaHa,
            violations: violations.length > 0 ? violations : [
                'No violations detected',
            ],
            timestamp: new Date().toLocaleString(),
        };

        try {
            await generatePDFReport(reportData);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        }
    };

    return (
        <div className="report-panel">
            <div className="report-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} />
                    <h3>Mining Compliance Report</h3>
                </div>
                <div className="report-icons">
                    <FileText size={16} />
                    <Clock size={16} />
                    <Bell size={16} />
                    <User size={16} />
                </div>
            </div>

            <div className="report-content">
                {/* Col 1: Summary */}
                <div className="report-col">
                    <h4>Summary</h4>
                    <div className="summary-row">
                        <span className="summary-label">Total Area:</span>
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
                    <div className="summary-row" style={{ marginTop: '10px' }}>
                        <span className="summary-label">Status:</span>
                        <span className={`summary-val ${illegalAreaHa > 0 ? 'text-red' : ''}`}>
                            {illegalAreaHa > 0 ? 'NON-COMPLIANT' : 'COMPLIANT'}
                        </span>
                    </div>
                </div>

                {/* Col 2: Legend */}
                <div className="report-col">
                    <h4>Mining Compliance Overview</h4>
                    <div className="legend-row">
                        <div className="box-yellow"></div>
                        <span>Authorized Boundary</span>
                    </div>
                    <div className="legend-row">
                        <div className="box-green"></div>
                        <span>Compliant Area ({legalZones.length} zones)</span>
                    </div>
                    <div className="legend-row">
                        <div className="box-red"></div>
                        <span>Illegal Mining Area ({illegalZones.length} zones)</span>
                    </div>
                    <button className="btn-blue" style={{ marginTop: '12px' }} onClick={handleGenerateReport}>
                        Generate Report
                    </button>
                </div>

                {/* Col 3: Violations */}
                <div className="report-col">
                    <h4>Violation Details</h4>
                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                        {violations.length > 0 ? (
                            violations.map((v, i) => (
                                <div key={i}>{i + 1}. {v}</div>
                            ))
                        ) : (
                            <div>No violations detected.</div>
                        )}
                    </div>
                    <button className="btn-blue" style={{ marginTop: '12px', float: 'right' }} onClick={handleGenerateReport}>
                        Generate Report
                    </button>
                </div>
            </div>
        </div>
    );
};

