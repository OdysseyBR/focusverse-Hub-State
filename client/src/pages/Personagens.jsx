import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

function formatarData(d) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function Personagens() {
  const [personagens, setPersonagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const data = await apiFetch('/api/personagens');
      setPersonagens(data);
    } finally {
      setLoading(false);
    }
  }

  const filtrados = personagens.filter(p => {
    const q = busca.toLowerCase();
    return (
      p.nomeCompleto?.toLowerCase().includes(q) ||
      p.apelido?.toLowerCase().includes(q) ||
      p.idCodigo?.toLowerCase().includes(q) ||
      p.nacao?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="registro-header">
        <div className="registro-sistema">Sistema de Registros — Focusverse Hub</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Buscar por nome, apelido ou ID..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/personagens/novo')}>
            + Novo registro
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="registro-total">
          {loading ? 'Carregando...' : `${filtrados.length} registro${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {!loading && personagens.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <div className="empty-title">Nenhum registro ainda</div>
          <p className="empty-sub">Cadastre o primeiro personagem do Focusverse</p>
          <button className="btn btn-primary" onClick={() => navigate('/personagens/novo')}>+ Novo registro</button>
        </div>
      ) : (
        <div className="registro-list">
          {filtrados.map(p => (
            <div key={p.docId} className="registro-card" onClick={() => navigate(`/personagens/${p.docId}`)}>
              <div className="registro-foto">
                {p.foto
                  ? <img src={p.foto} alt={p.nomeCompleto} />
                  : <div className="registro-foto-placeholder">👤</div>}
              </div>
              <div className="registro-info">
                <div className="registro-top">
                  <span className="registro-id">{p.idCodigo}</span>
                  <span className={`badge-ativo ${p.dataFalecimento ? 'encerrado' : 'ativo'}`}>
                    {p.dataFalecimento ? '● ENCERRADO' : '● ATIVO'}
                  </span>
                </div>
                <div className="registro-nome">{p.nomeCompleto || '—'}</div>
                {p.apelido && <div className="registro-apelido">"{p.apelido}"</div>}
                <div className="registro-dados">
                  {formatarData(p.dataNascimento) && `Nasc.: ${formatarData(p.dataNascimento)}`}
                  {p.dataFalecimento && ` — Óbito: ${formatarData(p.dataFalecimento)}`}
                  {(p.cidade || p.uf || p.nacao) && (
                    <span style={{ marginLeft: 12 }}>
                      {[p.cidade, p.uf, p.nacao].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
