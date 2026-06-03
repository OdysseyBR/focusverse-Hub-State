import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const BASE_URL = 'https://timelinefocus.vercel.app';

const ENDPOINTS = [
  { method: 'GET',    path: '/api/v1/mapa/pins',          desc: 'Lista todos os pins. Filtros opcionais: ?nivel=0..3 e ?parentId=xxx' },
  { method: 'GET',    path: '/api/v1/mapa/pins/:id',       desc: 'Retorna um pin específico pelo ID' },
  { method: 'POST',   path: '/api/v1/mapa/pins',           desc: 'Cria um novo pin. Body: { x, y, localNome, nivel, cor, parentId }' },
  { method: 'PUT',    path: '/api/v1/mapa/pins/:id',       desc: 'Atualiza um pin existente' },
  { method: 'DELETE', path: '/api/v1/mapa/pins/:id',       desc: 'Remove um pin' },
  { method: 'GET',    path: '/api/v1/mapa/camadas',        desc: 'Lista as camadas do mapa que têm imagem carregada' },
  { method: 'GET',    path: '/api/v1/mapa/hierarquia',     desc: 'Retorna a estrutura hierárquica completa dos pins em árvore' },
];

const METHOD_COLOR = { GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b', DELETE: '#ef4444' };

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  return (
    <button onClick={copy} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: copied ? '#22c55e' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
      {copied ? '✓ copiado' : 'copiar'}
    </button>
  );
}

export default function ApiMapa() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeNova, setNomeNova] = useState('');
  const [criando, setCriando] = useState(false);
  const [novaKey, setNovaKey] = useState(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setKeys(await apiFetch('/api/apikeys')); }
    finally { setLoading(false); }
  }

  async function criarKey() {
    if (!nomeNova.trim()) return;
    setCriando(true);
    try {
      const res = await apiFetch('/api/apikeys', { method: 'POST', body: JSON.stringify({ nome: nomeNova.trim() }) });
      setNovaKey(res.key);
      setNomeNova('');
      carregar();
    } finally { setCriando(false); }
  }

  async function revogarKey(key, nome) {
    if (!confirm(`Revogar a key "${nome}"? Esta ação é irreversível.`)) return;
    await apiFetch(`/api/apikeys/${key}`, { method: 'DELETE' });
    carregar();
  }

  const exampleKey = keys[0]?.key || 'fv_sua_api_key_aqui';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">API do Mapa</h1>
          <p className="page-sub">Integre o mapa do Focusverse em projetos externos</p>
        </div>
      </div>

      {/* Gerenciador de Keys */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'Courier New', marginBottom: 16 }}>
          API Keys
        </div>

        {/* Nova key */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            className="form-input"
            placeholder="Nome da key (ex: Meu Projeto, Website...)"
            value={nomeNova}
            onChange={e => setNomeNova(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && criarKey()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={criarKey} disabled={criando || !nomeNova.trim()}>
            {criando ? '...' : '+ Gerar key'}
          </button>
        </div>

        {/* Key recém criada */}
        {novaKey && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✓ Key criada — copie agora, ela não será exibida novamente:</span>
            <code style={{ fontFamily: 'Courier New', fontSize: 12, color: 'var(--text)', flex: 1, wordBreak: 'break-all' }}>{novaKey}</code>
            <CopyBtn text={novaKey} />
            <button onClick={() => setNovaKey(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Lista de keys */}
        {loading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</p> : keys.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma key criada ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keys.map(k => (
              <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                <code style={{ fontFamily: 'Courier New', fontSize: 12, color: 'var(--accent)', flex: 1 }}>
                  {k.key.slice(0, 10)}••••••••••••••••••••••••••••••
                </code>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>{k.nome}</span>
                <button className="btn btn-danger btn-sm" onClick={() => revogarKey(k.key, k.nome)}>Revogar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Autenticação */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'Courier New', marginBottom: 16 }}>
          Autenticação
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Todas as requisições precisam incluir o header <code style={{ fontFamily: 'Courier New', color: 'var(--accent)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>X-API-Key</code> com uma key válida.
        </p>
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, border: '1px solid var(--border)' }}>
          <code style={{ fontFamily: 'Courier New', fontSize: 12, color: 'var(--text)', flex: 1, whiteSpace: 'pre-wrap' }}>{`curl ${BASE_URL}/api/v1/mapa/pins \\
  -H "X-API-Key: ${exampleKey}"`}</code>
          <CopyBtn text={`curl ${BASE_URL}/api/v1/mapa/pins \\\n  -H "X-API-Key: ${exampleKey}"`} />
        </div>
      </div>

      {/* Endpoints */}
      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'Courier New', marginBottom: 16 }}>
          Endpoints
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ENDPOINTS.map((ep, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'Courier New', fontSize: 11, fontWeight: 700, color: METHOD_COLOR[ep.method] || 'var(--text)', minWidth: 52, paddingTop: 1 }}>{ep.method}</span>
              <div style={{ flex: 1 }}>
                <code style={{ fontFamily: 'Courier New', fontSize: 12, color: 'var(--text)', display: 'block', marginBottom: 4 }}>{BASE_URL}{ep.path}</code>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ep.desc}</span>
              </div>
              <CopyBtn text={`${BASE_URL}${ep.path}`} />
            </div>
          ))}
        </div>

        {/* Exemplo de resposta */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'Courier New', marginBottom: 10 }}>
            Exemplo de resposta — GET /api/v1/mapa/pins
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '14px 16px', border: '1px solid var(--border)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <CopyBtn text={`{\n  "pins": [\n    {\n      "pinId": "abc123",\n      "localNome": "Porto Deoa",\n      "x": 54.2,\n      "y": 61.8,\n      "nivel": 2,\n      "cor": "#3b82f6",\n      "parentId": null\n    }\n  ],\n  "total": 1\n}`} />
            </div>
            <pre style={{ fontFamily: 'Courier New', fontSize: 12, color: 'var(--text)', margin: 0, overflowX: 'auto' }}>{`{
  "pins": [
    {
      "pinId": "abc123",
      "localNome": "Porto Deoa",
      "x": 54.2,
      "y": 61.8,
      "nivel": 2,
      "cor": "#3b82f6",
      "parentId": null
    }
  ],
  "total": 1
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
