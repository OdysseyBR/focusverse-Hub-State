import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { uploadImage } from '../utils/cloudinary';

function gerarID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'LOC-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const VAZIO = { idCodigo: '', nome: '', tipo: '', nacao: '', imagem: '' };

export default function LocalEditor() {
  const { id } = useParams();
  const isNovo = !id;
  const navigate = useNavigate();
  const fileRef = useRef();

  const [form, setForm] = useState({ ...VAZIO, idCodigo: gerarID() });
  const [loading, setLoading] = useState(!isNovo);
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);

  useEffect(() => {
    if (!isNovo) {
      apiFetch(`/api/locais/${id}`)
        .then(data => setForm(data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleImagem(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadando(true);
    try {
      const url = await uploadImage(file, 'focusverse/locais');
      set('imagem', url);
    } catch (err) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploadando(false);
    }
  }

  async function salvar() {
    if (!form.nome) return alert('Nome é obrigatório.');
    setSalvando(true);
    try {
      if (isNovo) {
        await apiFetch('/api/locais', { method: 'POST', body: JSON.stringify(form) });
      } else {
        await apiFetch(`/api/locais/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      }
      navigate('/locais');
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm('Excluir este local permanentemente?')) return;
    await apiFetch(`/api/locais/${id}`, { method: 'DELETE' });
    navigate('/locais');
  }

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;

  return (
    <div className="editor-wrap">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/locais')}>← Voltar</button>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Courier New', marginBottom: 4 }}>
              Registro de Local
            </div>
            <span className="editor-id-badge">{form.idCodigo}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNovo && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>↓ Exportar PDF</button>
              <button className="btn btn-danger btn-sm" onClick={excluir}>Excluir</button>
            </>
          )}
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : isNovo ? 'Criar registro' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="editor-body" style={{ gridTemplateColumns: '180px 1fr' }}>
        {/* Imagem */}
        <div className="foto-upload-area">
          <div className="logo-frame" onClick={() => fileRef.current.click()}>
            {form.imagem
              ? <img src={form.imagem} alt="Local" />
              : <>
                  <div className="foto-frame-icon">🌍</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '0 8px' }}>
                    {uploadando ? 'Enviando...' : 'Clique para upload'}
                  </span>
                </>
            }
          </div>
          <div className="foto-dim">Imagem do local</div>
          {form.imagem && (
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>Trocar imagem</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagem} />
        </div>

        {/* Campos */}
        <div className="editor-fields">
          <div className="editor-section-label">Identificação</div>

          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input
              className="form-input"
              placeholder="Nome do local"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <input
                className="form-input"
                placeholder="Ex: Cidade, País, Região..."
                value={form.tipo}
                onChange={e => set('tipo', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nação</label>
              <input
                className="form-input"
                placeholder="País ao qual pertence"
                value={form.nacao}
                onChange={e => set('nacao', e.target.value)}
              />
            </div>
          </div>

          <div className="field-divider" />
          <div className="editor-section-label">Descrição / História</div>

          <div className="form-group">
            <textarea
              className="form-textarea"
              placeholder="Descreva o local, sua história, cultura, clima, pontos de interesse..."
              value={form.descricao || ''}
              onChange={e => set('descricao', e.target.value)}
              style={{ minHeight: 240 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
