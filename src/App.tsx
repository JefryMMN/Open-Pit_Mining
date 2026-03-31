import React, { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { CoordinatePanel } from './components/CoordinatePanel';
import { MapView } from './components/MapView';
import { AnalysisSummary } from './components/AnalysisSummary';
import { ReportPanel } from './components/ReportPanel';

const App: React.FC = () => {
  const { isLoggedIn, boundaryPolygon, runAnalysis, isAnalyzing, analysisComplete } = useAppStore();
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobilePanelOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <CoordinatePanel
          className={isMobile ? (isMobilePanelOpen ? 'open' : '') : ''}
          onClose={() => setIsMobilePanelOpen(false)}
        />
        <div className="map-container">
          <MapView />
          <AnalysisSummary />
          {/* Hide report panel when mobile coord panel is open */}
          {!(isMobile && isMobilePanelOpen) && <ReportPanel />}

          {/* Run Analysis Button */}
          {boundaryPolygon && !analysisComplete && (
            <button
              className="run-analysis-btn"
              onClick={runAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          )}
        </div>

        {/* Mobile Toggle Button */}
        {isMobile && !isMobilePanelOpen && (
          <button
            className="mobile-panel-toggle"
            onClick={() => setIsMobilePanelOpen(true)}
          >
            Enter Coordinates
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
