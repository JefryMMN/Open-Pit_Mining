import React from 'react';
import { Grid3X3, Bell, User, LogOut } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Header: React.FC = () => {
    const setIsLoggedIn = useAppStore((s) => s.setIsLoggedIn);

    return (
        <div className="dashboard-header">
            <div className="title">
                <Grid3X3 size={20} />
                <h1>Mining Compliance Dashboard</h1>
            </div>
            <div className="actions">
                <button title="Notifications">
                    <Bell size={18} />
                </button>
                <button title="Profile">
                    <User size={18} />
                </button>
                <button title="Logout" onClick={() => setIsLoggedIn(false)}>
                    <LogOut size={18} />
                </button>
            </div>
        </div>
    );
};
