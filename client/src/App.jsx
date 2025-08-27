// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:roomId" element={<LobbyPage />} />
      </Routes>
    </Router>
  );
}

export default App;