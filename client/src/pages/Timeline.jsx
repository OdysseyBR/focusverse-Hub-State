import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export default function Timeline() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ data: '', titulo: '', descricao: '' });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const data = await apiFetch('/api/eventos');
      setEventos(data.sort((a, b) => new Date(b.data) - new Date(a.data)));
    } finally {
      setLoading(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ data: '', titulo: '', descricao: '' });
    setModal(true);
  }

  function abrirEditar(ev) {
    setEditando(ev);
    setForm({ data: ev.data, titulo: ev.titulo, descricao: ev.descricao });
    setModal(true);
  }

  async function salvar() {
    if (!form.titulo || !form.data) return;
    if (editando) {
      const updated = await apiFetch(`/api/eventos/${editando.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setEventos(prev => prev.map(e => e.id === editando.id ? { ...e, ...updated } : e).sort((a, b) => new Date(b.data) - new Date(a.data)));
    } else {
      const novo = await apiFetch('/api/eventos', { method: 'POST', body: JSON.stringify(form) });
      setEventos(prev => [novo, ...prev].sort((a, b) => new Date(b.data) - new Date(a.data)));
    }
    setModal(false);
  }

  async function excluir(id) {
    if (!confirm('Excluir este evento?')) return;
    await apiFetch(`/api/eventos/${id}`, { method: 'DELETE' });
    setEventos(prev => prev.filter(e => e.id !== id));
  }

  function exportarTXT() {
    const txt = eventos.map(e => `[${e.data}] ${e.titulo}\n${e.descricao}`).join('\n\n---\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
    a.download = 'focusverse-timeline.txt';
    a.click();
  }

  function formatarData(d) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${day} ${meses[parseInt(m)-1]} ${y}`;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Linha do Tempo</h1>
          <p className="page-sub">Acontecimentos do Focusverse</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={exportarTXT}>↓ Exportar TXT</button>
          <button className="btn btn-primary" onClick={abrirNovo}>+ Novo evento</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Carregando...</p></div>
      ) : eventos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">Nenhum evento ainda</div>
          <p className="empty-sub">Crie o primeiro acontecimento do seu universo</p>
          <button className="btn btn-primary" onClick={abrirNovo}>+ Novo evento</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {eventos.map(ev => (
            <div key={ev.id} className="card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 110, color: 'var(--text-muted)', fontSize: 12, paddingTop: 2 }}>
                {formatarData(ev.data)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{ev.titulo}</div>
                {ev.descricao && <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>{ev.descricao}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(ev)}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => excluir(ev.id)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editando ? 'Editar evento' : 'Novo evento'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input type="date" className="form-input" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Título</label>
                <input type="text" className="form-input" placeholder="Nome do acontecimento" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea className="form-textarea" placeholder="Descreva o acontecimento..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
