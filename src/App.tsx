import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReportPage } from './pages/ReportPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { TrackPage } from './pages/TrackPage';
import { DashboardPage } from './pages/DashboardPage';
import { DemoTools } from './components/DemoTools';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen relative font-sans">
        <Routes>
          <Route path="/" element={<Navigate to="/report" replace />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/confirmation/:code" element={<ConfirmationPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/report" replace />} />
        </Routes>

        {/* Small floating Demo tools panel shown only when ?demo=1 is in URL */}
        <DemoTools />
      </div>
    </Router>
  );
};

export default App;
