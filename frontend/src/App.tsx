import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ClientPortal from './components/ClientPortal';
import CRM from './components/CRM';
import { LanguageProvider } from './i18n/LanguageContext';

/**
 * ClientPortalWrapper — reads URL params and pre-fills birth data if available.
 * URL format: /?date=YYYY-MM-DD&time=HH:MM&lat=XX&lon=XX&utc=X&name=Name
 */
function ClientPortalWrapper() {
  const location = useLocation();
  return <ClientPortal initialParams={new URLSearchParams(location.search)} />;
}

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/"    element={<ClientPortalWrapper />} />
          <Route path="/crm" element={<CRM />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}
