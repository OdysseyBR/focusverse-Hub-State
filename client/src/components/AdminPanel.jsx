import { useState } from 'react';
import { useTheme, FONT_OPTIONS } from '../contexts/ThemeContext';
import { uploadImage } from '../utils/cloudinary';

const COLOR_FIELDS = [
  { key: 'accent',      label: 'Cor de destaque (accent)' },
  { key: 'accentHover', label: 'Accent hover' },
  { key: 'bg',          label: 'Fundo principal' },
  { key: 'surface',     label: 'Superfície (cards)' },
  { key: 'surface2',    label: 'Superfície 2 (inputs)' },
  { key: 'border',      label: 'Bordas' },
  { key: 'text',        label: 'Texto principal' },
  { key: 'textMuted',   label: 'Texto secundário' },
];

const PRESETS = [
  {
    name: 'Dark Violeta',
    values: { accent: '#7c3aed', accentHover: '#6d28d9', bg: '#07070a', surface: '#0f0f14', surface2: '#16161e', border: '#1e1e2a', text: '#e2e2e8', textMuted: '#6b6b80' }
  },
  {
    name: 'Dark Azul',
    values: { accent: '#3b82f6', accentHover: '#2563eb', bg: '#060b14', surface: '#0d1526', surface2: '#121f36', border: '#1a2f50', text: '#dce8f8', textMuted: '#5c78a8' }
  },
  {
    name: 'Dark Verde',
    values: { accent: '#10b981', accentHover: '#059669', bg: '#060c09', surface: '#0c1610', surface2: '#121f18', border: '#1a2e22', text: '#d1f5e0', textMuted: '#4d8b6a' }
  },
  {
    name: 'Dark Âmbar',
    values: { accent: '#f59e0b', accentHover: '#d97706', bg: '#0a0800', surface: '#161000', surface2: '#1e1800', border: '#2e2400', text: '#f5e8c0', textMuted: '#8a7530' }
  },
  {
    name: 'Claro Neutro',
    values: { accent: '#7c3aed', accentHover: '#6d28d9', bg: '#f8f8fc', surface: '#ffffff', surface2: '#f0f0f8', border: '#e0e0ee', text: '#1a1a2e', textMuted: '#666680' }
  },
];

export default function AdminPanel({ onClose }) {
  const { theme, saveTheme, FONT_OPTIONS: fonts } = useTheme();
  const [local, setLocal] = useState({ ...theme });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('marca'); // marca | cores | tipografia

  function update(key, value) {
    setLocal(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveTheme(local);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'focusverse/logos');
      update('logoUrl', url);
    } catch (err) {
      alert('Erro no upload da logo: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  function applyPreset(preset) {
    setLocal(prev => ({ ...prev, ...preset.values }));
  }

  const tabs = [
    { id: 'marca', label: 'Marca' },
    { id: 'cores', label: 'Cores' },
    { id: 'tipografia', label: 'Tipografia' },
  ];

  return (
    <div className="admin-panel">
      <div className="admin-panel-overlay" onClick={onClose} />
      <div className="admin-panel-drawer slide-in">
        {/* Header */}
        <div className="admin-panel-header">
          <div>
            <div className="admin-panel-title">⚙ Personalização</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Aparência global do site</div>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', gap: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'color 0.12s',
                fontFamily: 'var(--font-body)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="admin-panel-body">

          {/* ── Tab: Marca ────────────────────────────── */}
          {tab === 'marca' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p className="admin-section-title">Identidade</p>

              {/* Logo */}
              <div className="form-group">
                <label className="form-label">Logo (imagem)</label>
                {local.logoUrl && (
                  <div style={{ marginBottom: 8 }}>
                    <img src={local.logoUrl} alt="logo" style={{ height: 40, borderRadius: 6, border: '1px solid var(--border)' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    {uploading ? 'Enviando...' : 'Upload logo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                  {local.logoUrl && (
                    <button className="btn btn-danger btn-sm" onClick={() => update('logoUrl', '')}>Remover</button>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG ou SVG. Se não houver imagem, usa a inicial do nome.</p>
              </div>

              {/* Nome */}
              <div className="form-group">
                <label className="form-label">Nome do site</label>
                <input className="form-input" value={local.logoText} onChange={e => update('logoText', e.target.value)} placeholder="Focusverse" />
              </div>

              {/* Subtítulo */}
              <div className="form-group">
                <label className="form-label">Subtítulo / tagline</label>
                <input className="form-input" value={local.logoSub} onChange={e => update('logoSub', e.target.value)} placeholder="Hub" />
              </div>

              {/* Preview */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Preview</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {local.logoUrl
                    ? <img src={local.logoUrl} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} />
                    : <div style={{ width: 32, height: 32, background: local.accent || 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{(local.logoText || 'F')[0]}</div>
                  }
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{local.logoText || 'Focusverse'}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', color: local.accent || 'var(--accent)', textTransform: 'uppercase' }}>{local.logoSub || 'Hub'}</div>
                  </div>
                </div>
              </div>

              {/* Sidebar width */}
              <div className="form-group">
                <label className="form-label">Largura da sidebar: {local.sidebarWidth}px</label>
                <input
                  type="range" min="180" max="320" step="10"
                  value={local.sidebarWidth}
                  onChange={e => update('sidebarWidth', e.target.value)}
                  className="sidebar-width-slider"
                />
              </div>
            </div>
          )}

          {/* ── Tab: Cores ────────────────────────────── */}
          {tab === 'cores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Presets */}
              <div>
                <p className="admin-section-title">Paletas prontas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PRESETS.map(preset => (
                    <button key={preset.name} onClick={() => applyPreset(preset)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)', background: 'var(--surface-2)',
                        cursor: 'pointer', transition: 'all 0.12s',
                        color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      {/* Mini preview */}
                      <div style={{ display: 'flex', gap: 3 }}>
                        {[preset.values.bg, preset.values.surface, preset.values.accent].map((c, i) => (
                          <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                      <span style={{ fontWeight: 500 }}>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="nav-divider" />

              {/* Custom colors */}
              <div>
                <p className="admin-section-title">Cores personalizadas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {COLOR_FIELDS.map(({ key, label }) => (
                    <div key={key} className="color-row">
                      <span className="color-label">{label}</span>
                      <div className="color-picker-wrap">
                        <div className="color-preview" style={{ background: local[key] }} />
                        <input
                          type="color"
                          className="color-input"
                          value={local[key] || '#000000'}
                          onChange={e => update(key, e.target.value)}
                        />
                        <input
                          type="text"
                          className="color-hex"
                          value={local[key] || ''}
                          onChange={e => update(key, e.target.value)}
                          maxLength={7}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Tipografia ───────────────────────── */}
          {tab === 'tipografia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="admin-section-title">Família tipográfica</p>
              {fonts.map(font => (
                <button
                  key={font.id}
                  onClick={() => update('fontId', font.id)}
                  className={`font-option ${local.fontId === font.id ? 'selected' : ''}`}
                  style={{ fontFamily: font.stack }}
                >
                  <span className="font-option-name" style={{ fontFamily: font.stack }}>{font.label}</span>
                  <span className="font-option-preview" style={{ fontFamily: font.stack }}>Aa Bb Cc</span>
                </button>
              ))}

              <div style={{ marginTop: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Preview de texto</p>
                {(() => {
                  const f = fonts.find(x => x.id === local.fontId) || fonts[0];
                  return (
                    <div style={{ fontFamily: f.stack }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: f.stack }}>Focusverse Hub</p>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, fontFamily: f.stack }}>Uma ferramenta para organizar e documentar universos ficcionais com personagens, locais, eventos e muito mais.</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
            {saving
              ? <svg className="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
            }
            {saving ? 'Salvando...' : 'Salvar e aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
