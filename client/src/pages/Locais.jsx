import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function Locais() {
  const [locais, setLocais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const data = await apiFetch('/api/locais');
      setLocais(data);
    } finally {
      setLoading(false);
    }
  }

  const filtrados = locais.filter(l => {
    const q = busca.toLowerCase();
    return (
      l.nome?.toLowerCase().includes(q) ||
      l.tipo?.toLowerCase().includes(q) ||
      l.nacao?.toLowerCase().includes(q) ||
      l.idCodigo?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="registro-header">
        <div className="registro-sistema">Registro de Locais — Focusverse Hub</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Buscar por nome, tipo ou ID..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/locais/novo')}>+ Novo local</button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="registro-total">
          {loading ? 'Carregando...' : `${filtrados.length} local${filtrados.length !== 1 ? 'is' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {!loading && locais.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📍</div>
          <div className="empty-title">Nenhum local ainda</div>
          <p className="empty-sub">Cadastre o primeiro local do Focusverse</p>
          <button className="btn btn-primary" onClick={() => navigate('/locais/novo')}>+ Novo local</button>
        </div>
      ) : (
        <div className="registro-list">
          {filtrados.map(l => (
            <div key={l.docId} className="registro-card" onClick={() => navigate(`/locais/${l.docId}`)}>
              <div className="faccao-foto">
                {l.imagem
                  ? <img src={l.imagem} alt={l.nome} />
                  : <div className="faccao-foto-placeholder">📍</div>}
              </div>
              <div className="registro-info">
                <div className="registro-top">
                  <span className="registro-id">{l.idCodigo}</span>
                  {l.tipo && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Courier New', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {l.tipo}
                    </span>
                  )}
                </div>
                <div className="registro-nome">{l.nome || '—'}</div>
                {l.nacao && <div className="registro-dados">{l.nacao}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
