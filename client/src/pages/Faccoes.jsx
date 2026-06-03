import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function Faccoes() {
  const [faccoes, setFaccoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const data = await apiFetch('/api/faccoes');
      setFaccoes(data);
    } finally {
      setLoading(false);
    }
  }

  const filtradas = faccoes.filter(f => {
    const q = busca.toLowerCase();
    return (
      f.nomeCompleto?.toLowerCase().includes(q) ||
      f.nomeCurto?.toLowerCase().includes(q) ||
      f.idCodigo?.toLowerCase().includes(q) ||
      f.ramo?.toLowerCase().includes(q) ||
      f.dono?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="registro-header">
        <div className="registro-sistema">Registro de Organizações — Focusverse Hub</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Buscar por nome, ramo ou ID..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/faccoes/novo')}>
            + Nova organização
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="registro-total">
          {loading ? 'Carregando...' : `${filtradas.length} organização${filtradas.length !== 1 ? 'ões' : ''} encontrada${filtradas.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {!loading && faccoes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚔️</div>
          <div className="empty-title">Nenhuma organização ainda</div>
          <p className="empty-sub">Cadastre o primeiro governo, empresa ou facção do Focusverse</p>
          <button className="btn btn-primary" onClick={() => navigate('/faccoes/novo')}>+ Nova organização</button>
        </div>
      ) : (
        <div className="registro-list">
          {filtradas.map(f => (
            <div key={f.docId} className="registro-card" onClick={() => navigate(`/faccoes/${f.docId}`)}>
              <div className="faccao-foto">
                {f.logo
                  ? <img src={f.logo} alt={f.nomeCurto} />
                  : <div className="faccao-foto-placeholder">🏛️</div>}
              </div>
              <div className="registro-info">
                <div className="registro-top">
                  <span className="registro-id">{f.idCodigo}</span>
                  {f.ramo && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Courier New', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {f.ramo}
                    </span>
                  )}
                </div>
                <div className="registro-nome">
                  {f.nomeCurto && <span style={{ color: 'var(--accent)', marginRight: 10 }}>{f.nomeCurto}</span>}
                  {f.nomeCompleto}
                </div>
                <div className="registro-dados">
                  {f.dono && `Dono: ${f.dono}`}
                  {f.dono && f.sede && '  |  '}
                  {f.sede && `Sede: ${f.sede}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
