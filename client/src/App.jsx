// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      {/* --- 2. ADD THE TOASTER COMPONENT HERE --- */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: '#334155', // bg-slate-700
            color: '#fff',
          },
        }}
      />
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:roomId" element={<LobbyPage />} />
          <Route path="/lobby/:roomId" element={<LobbyPage />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;