import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ClientPortal from './components/ClientPortal';
import CRM from './components/CRM';
import { LanguageProvider } from './i18n/LanguageContext';

/**
 * ClientPortalWrapper reads URL params and pre-fills birth data if available.
 * URL format: /?date=YYYY-MM-DD&time=HH:MM&lat=XX&lon=XX&utc=X&name=Name
 */
function ClientPortalWrapper() {
  const location = useLocation();
  return <ClientPortal initialParams={new URLSearchParams(location.search)} />;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10"
      >
        <Routes location={location}>
          <Route path="/" element={<ClientPortalWrapper />} />
          <Route path="/crm" element={<CRM />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="midnight-app min-h-screen">
          <div className="stars-layer stars-layer-a" aria-hidden="true" />
          <div className="stars-layer stars-layer-b" aria-hidden="true" />
          <div className="aurora-layer" aria-hidden="true" />
          <AnimatedRoutes />
        </div>
      </Router>
    </LanguageProvider>
  );
}
