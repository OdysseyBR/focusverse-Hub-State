export default function GeradorLocal() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gerador de Nomes</h1>
          <p className="page-sub">Locais</p>
        </div>
      </div>
      <div className="empty-state" style={{ height: 'calc(100vh - 160px)' }}>
        <div className="empty-icon">🎲</div>
        <div className="empty-title">Em construção</div>
        <p className="empty-sub">O gerador de nomes para locais será desenvolvido em breve</p>
        <span className="placeholder-badge">Em breve</span>
      </div>
    </div>
  );
}
