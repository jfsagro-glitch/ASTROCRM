import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ClientPortal from './components/ClientPortal';
import CRM from './components/CRM';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ClientPortal />} />
        <Route path="/crm" element={<CRM />} />
      </Routes>
    </Router>
  );
}
