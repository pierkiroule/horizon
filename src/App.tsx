import { Link, Navigate, Route, Routes } from 'react-router-dom';
import PlayerExplorer from './modes/player/PlayerExplorer';
import AdminComposer from './modes/admin/AdminComposer';

export default function App() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <nav style={{ position: 'fixed', top: 10, left: 10, zIndex: 1000, display: 'flex', gap: 8 }}>
        <Link to="/player">Joueur</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/player" replace />} />
        <Route path="/player" element={<PlayerExplorer />} />
        <Route path="/admin" element={<AdminComposer />} />
      </Routes>
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <div className="panel">{label}</div>
    </div>
  );
}
