import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { KioskProvider, useKiosk } from './context/KioskContext';
import { WelcomePage } from './pages/WelcomePage';
import { CategorySelectionPage } from './pages/CategorySelectionPage';
import { LiveStandeePage } from './pages/LiveStandeePage';
import { GenerationScreenPage } from './pages/GenerationScreenPage';
import { ResultScreenPage } from './pages/ResultScreenPage';
import { MobileUploadPage } from './pages/MobileUploadPage';
import { MobileResultPage } from './pages/MobileResultPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { Footer } from './components/Footer';

const KioskMainView: React.FC = () => {
  const { step } = useKiosk();

  switch (step) {
    case 'WELCOME':
      return <WelcomePage />;
    case 'CATEGORY_SELECT':
      return <CategorySelectionPage />;
    case 'LIVE_STANDEE':
      return <LiveStandeePage />;
    case 'GENERATING':
      return <GenerationScreenPage />;
    case 'RESULT':
      return <ResultScreenPage />;
    default:
      return <WelcomePage />;
  }
};

const AppContent: React.FC = () => {
  const { step } = useKiosk();
  const location = useLocation();
  const isResult = step === 'RESULT' || location.pathname.startsWith('/result/');

  return (
    <div className={`min-h-screen flex flex-col justify-between ${isResult ? 'h-screen overflow-hidden' : 'bg-[#0B0D17] text-white'}`}>
      <Routes>
        {/* Main Kiosk Flow Routes */}
        <Route path="/" element={<KioskMainView />} />
        <Route path="/kiosk" element={<KioskMainView />} />
        <Route path="/standee/:token" element={<ResultScreenPage />} />
        <Route path="/mirror/:token" element={<ResultScreenPage />} />

        {/* Mobile Scan Routes */}
        <Route path="/mobile-upload/:token" element={<MobileUploadPage />} />
        <Route path="/result/:token" element={<MobileResultPage />} />

        {/* Admin Portal Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>

      {!isResult && <Footer />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <KioskProvider>
        <AppContent />
      </KioskProvider>
    </Router>
  );
};

export default App;
