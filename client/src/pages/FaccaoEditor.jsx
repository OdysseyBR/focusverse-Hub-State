import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { uploadImage } from '../utils/cloudinary';

function gerarID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'ORG-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const VAZIO = {
  idCodigo: '',
  nomeCurto: '',
  nomeCompleto: '',
  sede: '',
  dono: '',
  ramo: '',
  logo: '',
};

export default function FaccaoEditor() {
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
      apiFetch(`/api/faccoes/${id}`)
        .then(data => setForm(data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadando(true);
    try {
      const url = await uploadImage(file, 'focusverse/faccoes');
      set('logo', url);
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
        await apiFetch('/api/faccoes', { method: 'POST', body: JSON.stringify(form) });
      } else {
        await apiFetch(`/api/faccoes/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      }
      navigate('/faccoes');
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm('Excluir esta organização permanentemente?')) return;
    await apiFetch(`/api/faccoes/${id}`, { method: 'DELETE' });
    navigate('/faccoes');
  }

  if (loading) return <div className="empty-state"><p>Carregando...</p></div>;

  return (
    <div className="editor-wrap">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/faccoes')}>← Voltar</button>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Courier New', marginBottom: 4 }}>
              Registro de Organização
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
        {/* Logo */}
        <div className="foto-upload-area">
          <div className="logo-frame" onClick={() => fileRef.current.click()}>
            {form.logo
              ? <img src={form.logo} alt="Logo" />
              : <>
                  <div className="foto-frame-icon">🏛️</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '0 8px' }}>
                    {uploadando ? 'Enviando...' : 'Clique para upload'}
                  </span>
                </>
            }
          </div>
          <div className="foto-dim">Logo da organização</div>
          {form.logo && (
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>Trocar logo</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
        </div>

        {/* Campos */}
        <div className="editor-fields">
          <div className="editor-section-label">Identificação</div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Nome Curto / Sigla</label>
              <input
                className="form-input"
                placeholder="Ex: BYD"
                value={form.nomeCurto}
                onChange={e => set('nomeCurto', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                className="form-input"
                placeholder="Ex: Build Your Dreams LTDA"
                value={form.nomeCompleto}
                onChange={e => set('nomeCompleto', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ramo / Setor</label>
            <input
              className="form-input"
              placeholder="Ex: Automotivo, Governo Federal, Tecnologia..."
              value={form.ramo}
              onChange={e => set('ramo', e.target.value)}
            />
          </div>

          <div className="field-divider" />
          <div className="editor-section-label">Informações</div>

          <div className="form-group">
            <label className="form-label">Dono / Dirigente</label>
            <input
              className="form-input"
              placeholder="Nome do responsável"
              value={form.dono}
              onChange={e => set('dono', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sede</label>
            <input className="form-input" placeholder="Ex: Shenzhen, China" value={form.sede} onChange={e => set('sede', e.target.value)} />
          </div>

          <div className="field-divider" />
          <div className="editor-section-label">Descrição / História</div>

          <div className="form-group">
            <textarea
              className="form-textarea"
              placeholder="Descreva a organização, sua história, objetivos, estrutura interna..."
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
