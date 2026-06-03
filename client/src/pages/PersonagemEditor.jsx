import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { uploadImage } from '../utils/cloudinary';

function gerarID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'FV-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const VAZIO = {
  idCodigo: '',
  apelido: '',
  nomeCompleto: '',
  dataNascimento: '',
  dataFalecimento: '',
  cidade: '',
  uf: '',
  nacao: '',
  foto: '',
};

export default function PersonagemEditor() {
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
      apiFetch(`/api/personagens/${id}`)
        .then(data => setForm(data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadando(true);
    try {
      const url = await uploadImage(file, 'focusverse/personagens');
      set('foto', url);
    } catch (err) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploadando(false);
    }
  }

  async function salvar() {
    if (!form.nomeCompleto) return alert('Nome completo é obrigatório.');
    setSalvando(true);
    try {
      if (isNovo) {
        await apiFetch('/api/personagens', { method: 'POST', body: JSON.stringify(form) });
      } else {
        await apiFetch(`/api/personagens/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      }
      navigate('/personagens');
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm('Excluir este registro permanentemente?')) return;
    await apiFetch(`/api/personagens/${id}`, { method: 'DELETE' });
    navigate('/personagens');
  }

  function exportar() { window.print(); }

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;

  return (
    <div className="editor-wrap">
      {/* Header */}
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/personagens')}>
            ← Voltar
          </button>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Courier New', marginBottom: 4 }}>
              Ficha de Registro
            </div>
            <span className="editor-id-badge">{form.idCodigo}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNovo && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={exportar}>↓ Exportar PDF</button>
              <button className="btn btn-danger btn-sm" onClick={excluir}>Excluir</button>
            </>
          )}
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : isNovo ? 'Criar registro' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="editor-body">
        {/* Foto */}
        <div className="foto-upload-area">
          <div className="foto-frame" onClick={() => fileRef.current.click()}>
            {form.foto
              ? <img src={form.foto} alt="Foto" />
              : <>
                  <div className="foto-frame-icon">📷</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {uploadando ? 'Enviando...' : 'Clique para upload'}
                  </span>
                </>
            }
          </div>
          <div className="foto-dim">591 × 1181 px</div>
          {form.foto && (
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>
              Trocar foto
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFoto} />
        </div>

        {/* Campos */}
        <div className="editor-fields">
          <div className="editor-section-label">Identificação</div>

          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input
              className="form-input"
              placeholder="Nome completo do personagem"
              value={form.nomeCompleto}
              onChange={e => set('nomeCompleto', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Apelido / Título</label>
            <input
              className="form-input"
              placeholder="Como é conhecido"
              value={form.apelido}
              onChange={e => set('apelido', e.target.value)}
            />
          </div>

          <div className="field-divider" />
          <div className="editor-section-label">Datas</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Data de Nascimento</label>
              <input
                type="date"
                className="form-input"
                value={form.dataNascimento}
                onChange={e => set('dataNascimento', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Falecimento <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(opcional)</span></label>
              <input
                type="date"
                className="form-input"
                value={form.dataFalecimento}
                onChange={e => set('dataFalecimento', e.target.value)}
              />
            </div>
          </div>

          <div className="field-divider" />
          <div className="editor-section-label">Local de Nascimento</div>

          <div className="field-row">
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input
                className="form-input"
                placeholder="Cidade"
                value={form.cidade}
                onChange={e => set('cidade', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estado / UF</label>
              <input
                className="form-input"
                placeholder="UF"
                value={form.uf}
                onChange={e => set('uf', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nação</label>
              <input
                className="form-input"
                placeholder="País"
                value={form.nacao}
                onChange={e => set('nacao', e.target.value)}
              />
            </div>
          </div>

          <div className="field-divider" />
          <div className="editor-section-label">Descrição / Biografia</div>

          <div className="form-group">
            <textarea
              className="form-textarea"
              placeholder="Escreva a biografia completa, história, personalidade, motivações..."
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
