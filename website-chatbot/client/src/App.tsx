import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Admin from './pages/Admin';

const App: React.FC = () => {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A2E',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: { primary: '#7C3AED', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
};

export default App;
