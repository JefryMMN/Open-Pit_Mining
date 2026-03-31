import React from 'react';
import { Bell, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const AlertPanel: React.FC = () => {
    const { alerts, clearAlerts } = useAppStore();

    if (alerts.length === 0) return null;

    return (
        <div className="alert-panel">
            <div className="alert-header">
                <div className="alert-title">
                    <Bell size={16} />
                    <span>Alerts ({alerts.length})</span>
                </div>
                <button onClick={clearAlerts} className="alert-close">
                    <X size={14} />
                </button>
            </div>
            <div className="alert-list">
                {alerts.map((alert, i) => (
                    <div key={i} className={`alert-item alert-${alert.severity}`}>
                        {alert.severity === 'critical' ? (
                            <AlertTriangle size={14} />
                        ) : (
                            <Info size={14} />
                        )}
                        <span>{alert.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
