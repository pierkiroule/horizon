import { Link, Route, Routes } from 'react-router-dom';
import PlayerExplorer from './modes/player/PlayerExplorer';
import AdminComposer from './modes/admin/AdminComposer';
import Home from './modes/home/Home';

export default function App() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <nav style={{ position: 'fixed', top: 10, left: 10, zIndex: 1000, display: 'flex', gap: 8 }}>
        <Link to="/">Accueil</Link>
        <Link to="/player">Joueur</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/player" element={<PlayerExplorer />} />
        <Route path="/admin" element={<AdminComposer />} />
      </Routes>
    </div>
  );
}
