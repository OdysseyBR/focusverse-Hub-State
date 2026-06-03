import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToCategorias } from '../lib/db';
import AdminPanel from './AdminPanel';

const MAIN_NAV = [
  {
    section: 'Hub',
    items: [
      { path: '/timeline', label: 'Linha do Tempo', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg> },
      { path: '/personagens', label: 'Personagens', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
      { path: '/faccoes', label: 'Facções', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      { path: '/locais', label: 'Locais', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
      { path: '/mapa', label: 'Mapa', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> },
    ]
  },
  {
    section: 'Wiki',
    items: [
      { path: '/wiki', label: 'Página principal', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
      { path: '/wiki/search', label: 'Buscar', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
    ]
  },
  {
    section: 'Gerador',
    items: [
      { path: '/gerador-personagem', label: 'Gerador — Personagem', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="6" height="4" rx="1"/><rect x="9" y="3" width="6" height="4" rx="1"/><rect x="16" y="3" width="6" height="4" rx="1"/><rect x="2" y="10" width="6" height="4" rx="1"/><rect x="9" y="10" width="6" height="4" rx="1"/><rect x="16" y="10" width="6" height="4" rx="1"/><rect x="2" y="17" width="6" height="4" rx="1"/><rect x="9" y="17" width="6" height="4" rx="1"/></svg> },
      { path: '/gerador-local', label: 'Gerador — Local', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="6" height="4" rx="1"/><rect x="9" y="3" width="6" height="4" rx="1"/><rect x="16" y="3" width="6" height="4" rx="1"/><rect x="2" y="10" width="6" height="4" rx="1"/><rect x="9" y="10" width="6" height="4" rx="1"/><rect x="16" y="10" width="6" height="4" rx="1"/><rect x="2" y="17" width="6" height="4" rx="1"/><rect x="16" y="17" width="6" height="4" rx="1"/></svg> },
    ]
  }
];

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const { theme } = useTheme();
  const [wikiCategories, setWikiCategories] = useState([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const navigate = useNavigate();

  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  useEffect(() => {
    const unsub = subscribeToCategorias(setWikiCategories);
    return () => unsub();
  }, []);

  return (
    <>
      <aside className="sidebar">
        {/* Header / Logo */}
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo">
            {theme.logoUrl
              ? <img src={theme.logoUrl} alt={theme.logoText} className="sidebar-logo-img" />
              : <div className="sidebar-logo-placeholder">{theme.logoText?.[0] || 'F'}</div>
            }
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-title">{theme.logoText || 'Focusverse'}</div>
              <div className="sidebar-logo-sub">{theme.logoSub || 'Hub'}</div>
            </div>
          </NavLink>
        </div>

        {/* Nav scroll area */}
        <div className="sidebar-scroll">
          {MAIN_NAV.map(section => (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* Wiki categories */}
          {wikiCategories.length > 0 && (
            <div>
              <div className="sidebar-section-label">Categorias Wiki</div>
              {wikiCategories.map(cat => (
                <NavLink
                  key={cat.id}
                  to={`/wiki/category/${cat.id}`}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon" style={{ fontSize: 13 }}>{cat.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.label}</span>
                </NavLink>
              ))}
            </div>
          )}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="nav-divider" />
              <div className="sidebar-section-label">Admin</div>
              <NavLink to="/wiki/new" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </span>
                <span>Novo artigo</span>
              </NavLink>
              <NavLink to="/wiki/manage-categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
                </span>
                <span>Gerir categorias</span>
              </NavLink>
              <NavLink to="/api-mapa" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                </span>
                <span>API do Mapa</span>
              </NavLink>
              <button
                onClick={() => setAdminOpen(true)}
                className="nav-item"
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                </span>
                <span>Personalizar</span>
              </button>
            </>
          )}
        </div>

        {/* Footer user */}
        <div className="sidebar-footer">
          {user ? (
            <div className="sidebar-user">
              {user.photoURL
                ? <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
                : <div className="user-avatar-placeholder">{initials}</div>
              }
              <div className="user-info">
                <span className="user-name">{user.displayName || user.email}</span>
                <button className="btn-logout" onClick={logout}>Sair</button>
              </div>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              Entrar
            </button>
          )}
        </div>
      </aside>

      {/* Admin personalization panel */}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </>
  );
}
