import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';

export default function Home() {
  return (
    <div style={{ position: 'relative', minHeight: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Background */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(1200px 600px at 80% -10%, rgba(59,130,246,0.25), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(147,197,253,0.2), transparent 60%), linear-gradient(#0b0e13, #0b0e13)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          placeItems: 'center',
          minHeight: '100dvh',
          padding: '40px 20px',
        }}
      >
        <section style={{ maxWidth: 900, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, margin: '0 0 12px 0', lineHeight: 1.1 }}>Audio Explorer</h1>
          <p style={{ opacity: 0.85, margin: 0, fontSize: 18 }}>
            Explorez des scènes audio spatialisées en 3D, composez vos propres ambiances,
            et partagez-les facilement. Compatible mobile et capteurs d’orientation.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <Link to={ROUTES.PLAYER} className="button" style={{ padding: '10px 16px', fontSize: 16 }}>
              Lancer le lecteur
            </Link>
            <Link to={ROUTES.ADMIN} className="button button-secondary" style={{ padding: '10px 16px', fontSize: 16 }}>
              Ouvrir l’éditeur
            </Link>
          </div>

          <div className="panel" style={{ marginTop: 28, display: 'inline-block', textAlign: 'left' }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Charge un JSON de scène via l’URL du paramètre <code>?scene=</code></li>
              <li>Active les capteurs pour synchroniser la tête et l’orientation</li>
              <li>Contrôle le mix: largeur de faisceau, normalisation et gain</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
