import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { apiFetch } from '../utils/api';
import { uploadImage } from '../utils/cloudinary';

const MAP_SIZE = 6000;

const DEFAULT_LAYERS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1, url: '', name: `Camada ${i + 1}`, visible: true,
}));

const NIVEL_CONFIG = {
  0: { label: 'Global',   desc: 'País, Região',      range: '0–10%',    minZoom: 0,    maxZoom: 0.10 },
  1: { label: 'Regional', desc: 'Capital',            range: '10–300%',  minZoom: 0.10, maxZoom: 3.00 },
  2: { label: 'Local',    desc: 'Cidade',             range: '50–300%',  minZoom: 0.50, maxZoom: 3.00 },
  3: { label: 'Micro',    desc: 'Edifício, Hospital', range: '300–600%', minZoom: 3.00, maxZoom: 6.00 },
};

const TIPOS_RODOVIA = {
  federal:   { label: 'Federal',   cor: '#f5c518', outline: '#9a7a00', textCor: '#7a5200', width: 3.5, minZoom: 0.10, maxZoom: 6.00, temCodigo: true  },
  estadual:  { label: 'Estadual',  cor: '#5ba3e0', outline: '#1a5a9a', textCor: '#0a2a5a', width: 2.5, minZoom: 0.10, maxZoom: 6.00, temCodigo: true  },
  municipal: { label: 'Municipal', cor: '#d4d4d4', outline: '#707070', textCor: '#484848', width: 2,   minZoom: 3.00, maxZoom: 6.00, temCodigo: false },
  avenida:   { label: 'Avenida',   cor: '#f0f0f0', outline: '#909090', textCor: '#565656', width: 1.8, minZoom: 3.00, maxZoom: 6.00, temCodigo: false },
  rua:       { label: 'Rua',       cor: '#ffffff', outline: '#aaaaaa', textCor: '#707070', width: 1.2, minZoom: 3.00, maxZoom: 6.00, temCodigo: false },
  trilha:    { label: 'Trilha',    cor: '#c4a35a', outline: '#7a5a14', textCor: '#4a2800', width: 1.2, minZoom: 3.00, maxZoom: 6.00, temCodigo: false, dash: '30 15' },
};

const TIPOS_TERRITORIO = {
  ambiental: { label: 'Ambiental', cor: '#22c55e', desc: 'Áreas verdes, reservas, parques' },
  neutro:    { label: 'Neutro',    cor: '#d4d4d4', desc: 'Estados, municípios, regiões' },
  perigo:    { label: 'Perigo',    cor: '#ef4444', desc: 'Zonas de risco, áreas restritas' },
};

function isPinVisible(pin, zoom) {
  const cfg = NIVEL_CONFIG[pin.nivel ?? 1];
  return zoom >= cfg.minZoom && zoom <= cfg.maxZoom;
}

function polygonSVGPath(pontos) {
  if (pontos.length < 2) return '';
  const coords = pontos.map(p => `${(p.x/100*MAP_SIZE).toFixed(1)},${(p.y/100*MAP_SIZE).toFixed(1)}`);
  return `M ${coords.join(' L ')} Z`;
}

function optimizeUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/q_auto,f_auto/');
}

// Catmull-Rom → Cubic Bezier para SVG
function catmullRomPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function toMapPts(pontos) {
  return pontos.map(p => ({ x: p.x / 100 * MAP_SIZE, y: p.y / 100 * MAP_SIZE }));
}

export default function Mapa() {
  const containerRef = useRef();
  const fileRefs = useRef({});
  const dragRef = useRef({ active: false, startX: 0, startY: 0, moved: false });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(null);

  const animRef = useRef(null);

  const [zoom, setZoom] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [pins, setPins] = useState([]);
  const [locais, setLocais] = useState([]);
  const [rodovias, setRodovias] = useState([]);
  const [showLayers, setShowLayers] = useState(false);
  const [showRoadPanel, setShowRoadPanel] = useState(false);
  const [showRoads, setShowRoads] = useState(true);
  const [addingPin, setAddingPin] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [uploadingLayer, setUploadingLayer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pin modal state
  const [modoNome, setModoNome] = useState('local');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [nomeManual, setNomeManual] = useState('');
  const [nivelPin, setNivelPin] = useState(1);
  const [parentPin, setParentPin] = useState('');
  const [selectedColor, setSelectedColor] = useState('#7c3aed');
  const [tipoPin, setTipoPin] = useState('marcador');

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedTerritoryId, setHighlightedTerritoryId] = useState(null);

  // Territory state
  const [territorios, setTerritorios] = useState([]);
  const [showTerritories, setShowTerritories] = useState(true);
  const [showTerritoryPanel, setShowTerritoryPanel] = useState(false);
  const [modoTerritorio, setModoTerritorio] = useState(false);
  const [pontosTerritorio, setPontosTerritorio] = useState([]);
  const [mouseTerritorio, setMouseTerritorio] = useState(null);
  const [nearStart, setNearStart] = useState(false);
  const [territoryForm, setTerritoryForm] = useState({ nome: '', tipo: 'neutro', categoria: '' });
  const [modalTerritorio, setModalTerritorio] = useState(false);

  // Road drawing state
  const [modoDesenho, setModoDesenho] = useState(false);
  const [pontosDesenho, setPontosDesenho] = useState([]);
  const [mouseDesenho, setMouseDesenho] = useState(null);
  const [roadForm, setRoadForm] = useState({ codigo: '', nome: '', tipo: 'estadual', sentido: 'duplo', velocidade: 80 });
  const [modalRodovia, setModalRodovia] = useState(false);

  useLayoutEffect(() => {
    const el = document.querySelector('.app-content');
    if (!el) return;
    const p = el.style.padding, o = el.style.overflow;
    el.style.padding = '0'; el.style.overflow = 'hidden';
    return () => { el.style.padding = p; el.style.overflow = o; };
  }, []);

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/mapa/config').catch(() => ({ layers: DEFAULT_LAYERS })),
      apiFetch('/api/mapa/pins').catch(() => []),
      apiFetch('/api/locais').catch(() => []),
      apiFetch('/api/rodovias').catch(() => []),
      apiFetch('/api/territorios').catch(() => []),
    ]).then(([config, pinsData, locaisData, rodsData, terrData]) => {
      if (config?.layers?.length) setLayers(config.layers);
      setPins(pinsData);
      setLocais(locaisData);
      setRodovias(rodsData);
      setTerritorios(terrData);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current && zoom === null) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const z = Math.min(width, height) / MAP_SIZE * 0.85;
      setZoom(z);
      setPan({ x: (width - MAP_SIZE * z) / 2, y: (height - MAP_SIZE * z) / 2 });
    }
  }, [loading, zoom]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.85 : 1.15;
    setZoom(prev => {
      if (!prev) return prev;
      const newZoom = Math.min(Math.max(prev * factor, 0.03), 10);
      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      setPan(p => ({ x: mx - (mx - p.x) * (newZoom / prev), y: my - (my - p.y) * (newZoom / prev) }));
      return newZoom;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, loading]);

  function mapCoords(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect();
    const ox = (clientX - rect.left - panRef.current.x) / zoomRef.current;
    const oy = (clientY - rect.top - panRef.current.y) / zoomRef.current;
    return { x: (ox / MAP_SIZE) * 100, y: (oy / MAP_SIZE) * 100 };
  }

  function handleMouseDown(e) {
    if (modoTerritorio || modoDesenho || addingPin || e.button !== 0) return;
    dragRef.current = { active: true, startX: e.clientX - panRef.current.x, startY: e.clientY - panRef.current.y, moved: false };
    setIsDragging(true);
  }

  function handleMouseMove(e) {
    if (modoTerritorio) {
      const coords = mapCoords(e.clientX, e.clientY);
      setMouseTerritorio(coords);
      // Check if near first point
      if (pontosTerritorio.length >= 3) {
        const first = pontosTerritorio[0];
        const rect = containerRef.current.getBoundingClientRect();
        const sx = pan.x + (first.x / 100) * MAP_SIZE * zoom;
        const sy = pan.y + (first.y / 100) * MAP_SIZE * zoom;
        setNearStart(Math.hypot(e.clientX - rect.left - sx, e.clientY - rect.top - sy) < 22);
      }
      return;
    }
    if (modoDesenho) { setMouseDesenho(mapCoords(e.clientX, e.clientY)); return; }
    if (!dragRef.current.active) return;
    dragRef.current.moved = true;
    setPan({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY });
  }

  function handleMouseUp() { dragRef.current.active = false; setIsDragging(false); }

  function handleContainerClick(e) {
    // Territory drawing mode
    if (modoTerritorio) {
      const coords = mapCoords(e.clientX, e.clientY);
      if (nearStart && pontosTerritorio.length >= 3) {
        finalizarTerritorio(); return;
      }
      if (coords.x >= 0 && coords.x <= 100 && coords.y >= 0 && coords.y <= 100) {
        setPontosTerritorio(prev => [...prev, coords]);
      }
      return;
    }
      const coords = mapCoords(e.clientX, e.clientY);
      if (coords.x >= 0 && coords.x <= 100 && coords.y >= 0 && coords.y <= 100) {
        setPontosDesenho(prev => [...prev, coords]);
      }
      return;
    }
    // Pin placement
    if (dragRef.current.moved) { dragRef.current.moved = false; return; }
    if (!addingPin) return;
    const coords = mapCoords(e.clientX, e.clientY);
    if (coords.x >= 0 && coords.x <= 100 && coords.y >= 0 && coords.y <= 100) {
      setPendingPin(coords);
      setPinModal(true);
    }
    setAddingPin(false);
  }

  function resetView() {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const z = Math.min(width, height) / MAP_SIZE * 0.85;
    setZoom(z); setPan({ x: (width - MAP_SIZE * z) / 2, y: (height - MAP_SIZE * z) / 2 });
  }

  async function toggleLayer(id) {
    const updated = layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
    setLayers(updated);
    await apiFetch('/api/mapa/config', { method: 'PUT', body: JSON.stringify({ layers: updated }) });
  }

  async function handleLayerUpload(layerId, e) {
    const file = e.target.files[0]; if (!file) return;
    setUploadingLayer(layerId);
    try {
      const url = await uploadImage(file, 'focusverse/mapa');
      const updated = layers.map(l => l.id === layerId ? { ...l, url } : l);
      setLayers(updated);
      await apiFetch('/api/mapa/config', { method: 'PUT', body: JSON.stringify({ layers: updated }) });
    } catch (err) { alert('Erro no upload: ' + err.message); }
    finally { setUploadingLayer(null); }
  }

  // ── Pin functions ────────────────────────────────────────────────────────
  function resetPinModal() {
    setPinModal(false); setPendingPin(null);
    setModoNome('local'); setSelectedLocal(''); setNomeManual('');
    setNivelPin(1); setParentPin(''); setSelectedColor('#7c3aed'); setTipoPin('marcador');
  }

  async function confirmarPin() {
    if (!pendingPin) return;
    const localNome = modoNome === 'local'
      ? (locais.find(l => l.docId === selectedLocal)?.nome || 'Pin livre')
      : (nomeManual.trim() || 'Pin sem nome');
    const pin = { x: pendingPin.x, y: pendingPin.y, localId: modoNome === 'local' ? selectedLocal : null, localNome, nomeManual: modoNome === 'manual', cor: selectedColor, nivel: nivelPin, parentId: parentPin || null, tipo: tipoPin };
    const novo = await apiFetch('/api/mapa/pins', { method: 'POST', body: JSON.stringify(pin) });
    setPins(prev => [...prev, novo]);
    resetPinModal();
  }

  async function excluirPin(pinId, nome) {
    if (!confirm(`Excluir pin "${nome}"?`)) return;
    await apiFetch(`/api/mapa/pins/${pinId}`, { method: 'DELETE' });
    setPins(prev => prev.filter(p => p.pinId !== pinId));
  }

  // ── Road functions ───────────────────────────────────────────────────────
  function iniciarDesenho() {
    const cfg = TIPOS_RODOVIA[roadForm.tipo];
    if (cfg?.temCodigo && !roadForm.codigo.trim()) { alert('Informe o código da rodovia antes de desenhar.'); return; }
    if (!cfg?.temCodigo && !roadForm.nome.trim()) { alert('Informe o nome da via antes de desenhar.'); return; }
    setModalRodovia(false);
    setModoDesenho(true);
    setPontosDesenho([]);
    setMouseDesenho(null);
  }

  function cancelarDesenho() {
    setModoDesenho(false); setPontosDesenho([]); setMouseDesenho(null);
  }

  function desfazerPonto() {
    setPontosDesenho(prev => prev.slice(0, -1));
  }

  async function finalizarRodovia() {
    if (pontosDesenho.length < 2) { alert('Adicione pelo menos 2 pontos.'); return; }
    const rodovia = { ...roadForm, pontos: pontosDesenho };
    const nova = await apiFetch('/api/rodovias', { method: 'POST', body: JSON.stringify(rodovia) });
    setRodovias(prev => [...prev, nova]);
    cancelarDesenho();
    setRoadForm({ codigo: '', nome: '', tipo: 'estadual', sentido: 'duplo', velocidade: 80 });
  }

  async function excluirRodovia(roadId, codigo) {
    if (!confirm(`Excluir rodovia "${codigo}"?`)) return;
    await apiFetch(`/api/rodovias/${roadId}`, { method: 'DELETE' });
    setRodovias(prev => prev.filter(r => r.roadId !== roadId));
  }

  // ── Visibility ───────────────────────────────────────────────────────────
  function getVisiblePins() {
    if (!zoom || !containerRef.current) return [];
    const { width, height } = containerRef.current.getBoundingClientRect();
    const MARGIN = 120;
    return pins.filter(p => {
      if (!isPinVisible(p, zoom)) return false;
      const sx = pan.x + (p.x / 100) * MAP_SIZE * zoom;
      const sy = pan.y + (p.y / 100) * MAP_SIZE * zoom;
      return sx > -MARGIN && sx < width + MARGIN && sy > -MARGIN && sy < height + MARGIN;
    });
  }

  // ── Territory functions ──────────────────────────────────────────────────
  function iniciarTerritorio() {
    if (!territoryForm.nome.trim()) { alert('Informe o nome do território.'); return; }
    setModalTerritorio(false);
    setModoTerritorio(true);
    setPontosTerritorio([]);
    setMouseTerritorio(null);
    setNearStart(false);
  }

  function cancelarTerritorio() {
    setModoTerritorio(false); setPontosTerritorio([]); setMouseTerritorio(null); setNearStart(false);
  }

  async function finalizarTerritorio() {
    if (pontosTerritorio.length < 3) { alert('Adicione pelo menos 3 pontos.'); return; }
    const novo = await apiFetch('/api/territorios', { method: 'POST', body: JSON.stringify({ ...territoryForm, pontos: pontosTerritorio }) });
    setTerritorios(prev => [...prev, novo]);
    cancelarTerritorio();
    setTerritoryForm({ nome: '', tipo: 'neutro', categoria: '' });
  }

  async function excluirTerritorio(territoryId, nome) {
    if (!confirm(`Excluir território "${nome}"?`)) return;
    await apiFetch(`/api/territorios/${territoryId}`, { method: 'DELETE' });
    setTerritorios(prev => prev.filter(t => t.territoryId !== territoryId));
  }

  function zoomToTerritory(territorio) {
    if (!containerRef.current || !territorio.pontos?.length) return;
    const xs = territorio.pontos.map(p => p.x);
    const ys = territorio.pontos.map(p => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const rangeX = (Math.max(...xs) - Math.min(...xs)) / 100 * MAP_SIZE;
    const rangeY = (Math.max(...ys) - Math.min(...ys)) / 100 * MAP_SIZE;
    const targetZoom = Math.max(Math.min(Math.min(width / rangeX, height / rangeY) * 0.7, 5), 0.05);
    goToLocation(cx, cy, targetZoom);
    setHighlightedTerritoryId(territorio.territoryId);
    setTimeout(() => setHighlightedTerritoryId(null), 2500);
  }

  // ── Animação de zoom ────────────────────────────────────────────────────
  function animateTo(targetPan, targetZoom) {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const startPan = { ...panRef.current };
    const startZoom = zoomRef.current || 0.1;
    const duration = 650;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setZoom(startZoom + (targetZoom - startZoom) * ease);
      setPan({
        x: startPan.x + (targetPan.x - startPan.x) * ease,
        y: startPan.y + (targetPan.y - startPan.y) * ease,
      });
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
  }

  function goToLocation(xPct, yPct, targetZoom) {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const targetPan = {
      x: width / 2 - (xPct / 100) * MAP_SIZE * targetZoom,
      y: height / 2 - (yPct / 100) * MAP_SIZE * targetZoom,
    };
    animateTo(targetPan, targetZoom);
    setShowSearch(false);
    setSearchQuery('');
  }

  function getSearchResults(query) {
    if (!query.trim()) return { pins: [], roads: [], territories: [] };
    const q = query.toLowerCase();
    const matchPins = pins.filter(p => p.localNome?.toLowerCase().includes(q)).slice(0, 5);
    const matchRoads = rodovias.filter(r => r.codigo?.toLowerCase().includes(q) || r.nome?.toLowerCase().includes(q)).slice(0, 3);
    const matchTerritories = territorios.filter(t => t.nome?.toLowerCase().includes(q) || t.categoria?.toLowerCase().includes(q)).slice(0, 3);
    return { pins: matchPins, roads: matchRoads, territories: matchTerritories };
  }

  if (loading) return <div className="empty-state" style={{ height: '100vh' }}><p>Carregando mapa...</p></div>;

  const visiblePins = getVisiblePins();
  const pinsWithChildren = new Set(pins.filter(p => p.parentId).map(p => p.parentId));
  const hasAnyLayer = layers.some(l => l.url);
  const ctrl = { background: 'rgba(15,15,20,0.92)', backdropFilter: 'blur(10px)' };
  const panel = { onClick: e => e.stopPropagation(), onMouseDown: e => e.stopPropagation() };
  const zoomPct = zoom ? Math.round(zoom * 100) : 0;
  const txtShadow = '0 1px 3px rgba(0,0,0,1), 0 -1px 3px rgba(0,0,0,1), 1px 0 3px rgba(0,0,0,1), -1px 0 3px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.9)';

  // Preview road path for drawing mode
  const previewPts = mouseDesenho && pontosDesenho.length > 0
    ? toMapPts([...pontosDesenho, mouseDesenho])
    : toMapPts(pontosDesenho);
  const currentRoadCfg = TIPOS_RODOVIA[roadForm.tipo] || TIPOS_RODOVIA.estadual;

  return (
    <div ref={containerRef}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleContainerClick}
      style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#03030a', userSelect: 'none',
        cursor: modoTerritorio ? (nearStart ? 'cell' : 'crosshair') : modoDesenho ? 'crosshair' : addingPin ? 'crosshair' : isDragging ? 'grabbing' : 'grab' }}>

      {/* Camadas + Rodovias (dentro do div escalado) */}
      {zoom !== null && (
        <div style={{ position: 'absolute', width: MAP_SIZE, height: MAP_SIZE, transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {!hasAnyLayer && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.04)', fontSize: 160, pointerEvents: 'none' }}>🗺️</div>}
          {[...layers].sort((a, b) => a.id - b.id).map(l =>
            l.visible && l.url ? <img key={l.id} src={optimizeUrl(l.url)} alt={l.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} /> : null
          )}

          {/* SVG das rodovias */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
            <defs>
              {rodovias.map(r => (
                <path key={`def-${r.roadId}`} id={`road-${r.roadId}`} d={catmullRomPath(toMapPts(r.pontos))} />
              ))}
            </defs>

            {showRoads && rodovias.filter(r => {
              const cfg = TIPOS_RODOVIA[r.tipo] || TIPOS_RODOVIA.estadual;
              return zoom >= cfg.minZoom && zoom <= cfg.maxZoom;
            }).map(r => {
              const cfg = TIPOS_RODOVIA[r.tipo] || TIPOS_RODOVIA.estadual;
              const d = catmullRomPath(toMapPts(r.pontos));
              const pathId = `road-${r.roadId}`;
              // fontSize em coordenadas do mapa para aparecer ~10px na tela
              const fs = 10 / zoom;
              const sw = 2.5 / zoom; // espessura do halo branco
              // Texto: "VA-101 · Nome" para federais/estaduais, só "Nome" para demais
              const labelText = cfg.temCodigo
                ? [r.codigo, r.nome].filter(Boolean).join(' · ')
                : (r.nome || r.codigo || '');
              // Mostrar label: rodovias acima de 30%, municipais sempre (já filtradas pelo zoom)
              const showLabel = labelText && (cfg.temCodigo ? zoom > 0.3 : true);
              return (
                <g key={r.roadId}>
                  {/* Contorno escuro */}
                  <path d={d} stroke={cfg.outline} strokeWidth={cfg.width + 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={cfg.dash} vectorEffect="non-scaling-stroke" />
                  {/* Cor da via */}
                  <path id={pathId} d={d} stroke={cfg.cor} strokeWidth={cfg.width} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={cfg.dash} vectorEffect="non-scaling-stroke" />
                  {/* Label dentro da via */}
                  {showLabel && (
                    <text
                      fontSize={fs}
                      fontWeight="600"
                      fontFamily="'Inter', sans-serif"
                      fill={cfg.textCor}
                      stroke="rgba(255,255,255,0.75)"
                      strokeWidth={sw}
                      paintOrder="stroke"
                      dominantBaseline="middle"
                    >
                      <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                        {labelText}
                      </textPath>
                    </text>
                  )}
                </g>
              );
            })}

            {/* Preview durante o desenho de rodovias */}
            {modoDesenho && previewPts.length >= 2 && (
              <g>
                <path d={catmullRomPath(previewPts)} stroke={currentRoadCfg.outline} strokeWidth={currentRoadCfg.width + 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={currentRoadCfg.dash} vectorEffect="non-scaling-stroke" opacity="0.7" />
                <path d={catmullRomPath(previewPts)} stroke={currentRoadCfg.cor} strokeWidth={currentRoadCfg.width} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={currentRoadCfg.dash} vectorEffect="non-scaling-stroke" opacity="0.9" />
              </g>
            )}
            {modoDesenho && pontosDesenho.length > 0 && (() => {
              const p = pontosDesenho[0];
              return <circle cx={p.x/100*MAP_SIZE} cy={p.y/100*MAP_SIZE} r="6" fill={currentRoadCfg.cor} stroke={currentRoadCfg.outline} strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.8" />;
            })()}

            {/* Territórios */}
            {showTerritories && territorios.map(t => {
              if (!t.pontos?.length) return null;
              const cfg = TIPOS_TERRITORIO[t.tipo] || TIPOS_TERRITORIO.neutro;
              const isHighlighted = t.territoryId === highlightedTerritoryId;
              const d = polygonSVGPath(t.pontos);
              const fs = 11 / zoom;
              const cx = t.pontos.reduce((s, p) => s + p.x, 0) / t.pontos.length / 100 * MAP_SIZE;
              const cy = t.pontos.reduce((s, p) => s + p.y, 0) / t.pontos.length / 100 * MAP_SIZE;
              return (
                <g key={t.territoryId}>
                  <path d={d} fill="none" stroke={cfg.cor} strokeWidth={isHighlighted ? 3 : 1.8}
                    strokeDasharray="14 7" strokeLinecap="round" strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke" opacity={isHighlighted ? 1 : 0.75} />
                  {isHighlighted && <path d={d} fill={cfg.cor} fillOpacity="0.08" stroke="none" />}
                  {zoom > 0.08 && (
                    <text fontSize={fs} fontWeight="600" fontFamily="'Inter',sans-serif"
                      fill={cfg.cor} stroke="rgba(0,0,0,0.6)" strokeWidth={2/zoom}
                      paintOrder="stroke" textAnchor="middle" dominantBaseline="middle">
                      <tspan x={cx} y={cy}>{t.nome}</tspan>
                      {t.categoria && <tspan x={cx} dy={fs * 1.3} fontSize={fs * 0.85} opacity="0.8">{t.categoria}</tspan>}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Preview território sendo desenhado */}
            {modoTerritorio && (() => {
              const cfg = TIPOS_TERRITORIO[territoryForm.tipo] || TIPOS_TERRITORIO.neutro;
              const allPts = mouseTerritorio ? [...pontosTerritorio, mouseTerritorio] : pontosTerritorio;
              const d = allPts.length >= 2 ? polygonSVGPath(allPts) : '';
              const first = pontosTerritorio[0];
              return (
                <g>
                  {d && <path d={d} fill={`${cfg.cor}10`} stroke={cfg.cor} strokeWidth="2"
                    strokeDasharray="14 7" strokeLinecap="round" strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke" opacity="0.85" />}
                  {first && <circle cx={first.x/100*MAP_SIZE} cy={first.y/100*MAP_SIZE}
                    r={nearStart ? 10 : 6} fill={nearStart ? cfg.cor : 'white'} stroke={cfg.cor}
                    strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                </g>
              );
            })()}
          </svg>
        </div>
      )}

      {/* Pins (fora do div escalado, em coordenadas de tela) */}
      {zoom !== null && visiblePins.map(p => {
        const sx = pan.x + (p.x / 100) * MAP_SIZE * zoom;
        const sy = pan.y + (p.y / 100) * MAP_SIZE * zoom;
        const cor = p.cor || '#7c3aed';
        const nivel = p.nivel ?? 1;
        const tipo = p.tipo || 'marcador';
        const hasChildren = pinsWithChildren.has(p.pinId);

        if (tipo === 'texto') {
          const fontSize = nivel === 0 ? 20 : nivel === 1 ? 16 : nivel === 2 ? 13 : 11;
          return (
            <div key={p.pinId} onDoubleClick={e => { e.stopPropagation(); excluirPin(p.pinId, p.localNome); }}
              style={{ position: 'absolute', left: sx, top: sy, zIndex: 8, pointerEvents: 'all', cursor: 'pointer', transform: 'translate(-50%,-50%)', textAlign: 'center', maxWidth: 200 }}>
              <div style={{ fontSize, fontWeight: nivel <= 1 ? 800 : 600, color: 'white', textShadow: txtShadow, letterSpacing: nivel <= 1 ? '0.06em' : '0.03em', lineHeight: 1.25, userSelect: 'none', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {nivel <= 1 ? p.localNome.toUpperCase() : p.localNome}
              </div>
            </div>
          );
        }

        if (nivel <= 1) return (
          <div key={p.pinId} onDoubleClick={e => { e.stopPropagation(); excluirPin(p.pinId, p.localNome); }}
            style={{ position: 'absolute', left: sx, top: sy, zIndex: 10, pointerEvents: 'all', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 5, transform: 'translate(-9px,-22px)', whiteSpace: 'nowrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {hasChildren && <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 30, height: 30, borderRadius: '50%', border: `2px dashed ${cor}80`, pointerEvents: 'none' }} />}
              <svg width="18" height="22" viewBox="0 0 28 36" fill="none">
                <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z" fill={cor} stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
                <circle cx="14" cy="14" r="5" fill="white" opacity="0.95"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white', textShadow: txtShadow, marginTop: 2, lineHeight: 1.3, maxWidth: 200, whiteSpace: 'normal', userSelect: 'none' }}>{p.localNome}</div>
          </div>
        );

        if (nivel === 2) return (
          <div key={p.pinId} onDoubleClick={e => { e.stopPropagation(); excluirPin(p.pinId, p.localNome); }}
            style={{ position: 'absolute', left: sx, top: sy, zIndex: 10, pointerEvents: 'all', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transform: 'translate(-6px,-6px)' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {hasChildren && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 22, height: 22, borderRadius: '50%', border: `2px dashed ${cor}80`, pointerEvents: 'none' }} />}
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: cor, border: '2.5px solid white', boxShadow: '0 1px 5px rgba(0,0,0,0.6)' }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', textShadow: txtShadow, lineHeight: 1.3, maxWidth: 180, whiteSpace: 'normal', userSelect: 'none' }}>{p.localNome}</div>
          </div>
        );

        return (
          <div key={p.pinId} onDoubleClick={e => { e.stopPropagation(); excluirPin(p.pinId, p.localNome); }}
            style={{ position: 'absolute', left: sx, top: sy, zIndex: 10, pointerEvents: 'all', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transform: 'translate(-4px,-4px)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.6)', flexShrink: 0 }} />
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.95)', textShadow: txtShadow, lineHeight: 1.3, maxWidth: 160, whiteSpace: 'normal', userSelect: 'none' }}>{p.localNome}</div>
          </div>
        );
      })}

      {/* ── Controles topo ─────────────────────────────────────────────── */}
      <div {...panel} style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, zIndex: 20 }}>
        <button className="btn btn-ghost btn-sm" style={{ ...ctrl, border: showLayers ? '1px solid var(--accent)' : undefined }} onClick={() => { setShowLayers(v => !v); setShowRoadPanel(false); setShowSearch(false); setShowTerritoryPanel(false); }}>☰ Camadas</button>
        <button className="btn btn-ghost btn-sm" style={{ ...ctrl, border: showRoadPanel ? '1px solid var(--accent)' : undefined }} onClick={() => { setShowRoadPanel(v => !v); setShowLayers(false); setShowSearch(false); setShowTerritoryPanel(false); }}>🛣️ Vias</button>
        <button className="btn btn-ghost btn-sm" style={{ ...ctrl, border: showTerritoryPanel ? '1px solid var(--accent)' : undefined }} onClick={() => { setShowTerritoryPanel(v => !v); setShowLayers(false); setShowRoadPanel(false); setShowSearch(false); }}>⬡ Territórios</button>
        <button className="btn btn-ghost btn-sm" style={{ ...ctrl, border: showSearch ? '1px solid var(--accent)' : undefined }} onClick={() => { setShowSearch(v => !v); setShowLayers(false); setShowRoadPanel(false); setShowTerritoryPanel(false); }}>🔍</button>
        <button className="btn btn-ghost btn-sm" style={ctrl} onClick={() => setZoom(z => Math.min((z||0.1)*1.3, 10))}>+</button>
        <button className="btn btn-ghost btn-sm" style={ctrl} onClick={() => setZoom(z => Math.max((z||0.1)*0.77, 0.03))}>−</button>
        <button className="btn btn-ghost btn-sm" style={ctrl} onClick={resetView}>⟲</button>
        {zoom && <div style={{ ...ctrl, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Courier New', display: 'flex', alignItems: 'center' }}>{zoomPct}%</div>}
        {zoom && (
          <div style={{ ...ctrl, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            {Object.entries(NIVEL_CONFIG).map(([n, cfg]) => {
              const ativo = zoom >= cfg.minZoom && zoom <= cfg.maxZoom;
              return <span key={n} style={{ width: 8, height: 8, borderRadius: '50%', background: ativo ? 'var(--accent)' : 'var(--border)', display: 'inline-block' }} title={`${cfg.label}: ${cfg.range}`} />;
            })}
          </div>
        )}
      </div>

      {/* Toolbar de desenho de rodovia */}
      {modoDesenho && (
        <div {...panel} style={{ position: 'absolute', top: 56, left: 16, zIndex: 25, background: 'rgba(15,15,20,0.96)', backdropFilter: 'blur(12px)', border: `1px solid ${currentRoadCfg.cor}60`, borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: currentRoadCfg.cor, border: `2px solid ${currentRoadCfg.outline}`, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'Courier New' }}>
            {currentRoadCfg.temCodigo ? roadForm.codigo : roadForm.nome}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{TIPOS_RODOVIA[roadForm.tipo]?.label}</span>
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>{pontosDesenho.length} ponto{pontosDesenho.length !== 1 ? 's' : ''}</span>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <button className="btn btn-ghost btn-sm" onClick={desfazerPonto} disabled={pontosDesenho.length === 0}>⟵ Desfazer</button>
          <button className="btn btn-ghost btn-sm" onClick={cancelarDesenho} style={{ color: 'var(--danger)' }}>✕ Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={finalizarRodovia} disabled={pontosDesenho.length < 2} style={{ background: currentRoadCfg.cor, color: '#000' }}>✓ Salvar</button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clique para adicionar pontos • duplo-clique para salvar</span>
        </div>
      )}

      {/* Toolbar de desenho de território */}
      {modoTerritorio && (() => {
        const cfg = TIPOS_TERRITORIO[territoryForm.tipo] || TIPOS_TERRITORIO.neutro;
        return (
          <div {...panel} style={{ position: 'absolute', top: 56, left: 16, zIndex: 25, background: 'rgba(15,15,20,0.96)', backdropFilter: 'blur(12px)', border: `1px solid ${cfg.cor}60`, borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 2, border: `2.5px dashed ${cfg.cor}`, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{territoryForm.nome}</span>
            <span style={{ fontSize: 12, color: cfg.cor }}>{cfg.label}</span>
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>{pontosTerritorio.length} ponto{pontosTerritorio.length !== 1 ? 's' : ''}</span>
            {nearStart && pontosTerritorio.length >= 3 && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>● Fechar polígono</span>}
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <button className="btn btn-ghost btn-sm" onClick={() => setPontosTerritorio(prev => prev.slice(0, -1))} disabled={pontosTerritorio.length === 0}>⟵ Desfazer</button>
            <button className="btn btn-ghost btn-sm" onClick={cancelarTerritorio} style={{ color: 'var(--danger)' }}>✕ Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={finalizarTerritorio} disabled={pontosTerritorio.length < 3} style={{ background: cfg.cor, color: '#000' }}>✓ Fechar e salvar</button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clique para vértices • clique no início ou ✓ para fechar</span>
          </div>
        );
      })()}

      {/* Painel Territórios */}
      {showTerritoryPanel && (
        <div {...panel} style={{ position: 'absolute', top: 56, left: 16, zIndex: 20, background: 'rgba(15,15,20,0.96)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, width: 280, maxHeight: 460, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'Courier New' }}>Territórios ({territorios.length})</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowTerritories(v => !v)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)', background: showTerritories ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)', color: showTerritories ? '#22c55e' : 'var(--text-muted)' }}>
                {showTerritories ? '👁 visível' : '👁 oculto'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setModalTerritorio(true); setShowTerritoryPanel(false); }}>+ Novo</button>
            </div>
          </div>
          {/* Legenda */}
          <div style={{ display: 'flex', gap: 10 }}>
            {Object.entries(TIPOS_TERRITORIO).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <div style={{ width: 16, height: 0, border: `2px dashed ${cfg.cor}`, borderRadius: 1 }} />
                {cfg.label}
              </div>
            ))}
          </div>
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {territorios.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum território ainda.</p> :
              territorios.map(t => {
                const cfg = TIPOS_TERRITORIO[t.tipo] || TIPOS_TERRITORIO.neutro;
                return (
                  <div key={t.territoryId} onClick={() => zoomToTerritory(t)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 6, padding: '8px 10px', border: '1px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = cfg.cor}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <div style={{ width: 16, height: 16, border: `2.5px dashed ${cfg.cor}`, borderRadius: 3, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nome}</div>
                      {t.categoria && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.categoria}</div>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); excluirTerritorio(t.territoryId, t.nome); }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
      {showLayers && (
        <div {...panel} style={{ position: 'absolute', top: 56, left: 16, zIndex: 20, background: 'rgba(15,15,20,0.96)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, width: 260, maxHeight: 420, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'Courier New', marginBottom: 12 }}>Camadas — topo → base</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[...layers].sort((a, b) => b.id - a.id).map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => toggleLayer(l.id)} style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0, border: '1px solid var(--border)', background: l.visible ? 'var(--accent)' : 'transparent', cursor: 'pointer' }} />
                <span style={{ flex: 1, fontSize: 12, color: l.visible ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'Courier New' }}>{l.name}</span>
                <button onClick={() => fileRefs.current[l.id]?.click()} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)', background: l.url ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)', color: uploadingLayer === l.id ? 'var(--accent)' : l.url ? '#22c55e' : 'var(--text-muted)' }}>
                  {uploadingLayer === l.id ? '...' : l.url ? '✓' : '↑ upload'}
                </button>
                <input type="file" accept="image/png,image/webp" style={{ display: 'none' }} ref={el => fileRefs.current[l.id] = el} onChange={e => handleLayerUpload(l.id, e)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Painel de Busca */}
      {showSearch && (() => {
        const results = getSearchResults(searchQuery);
        const total = results.pins.length + results.roads.length;
        return (
          <div {...panel} style={{ position: 'absolute', top: 56, left: 16, zIndex: 20, background: 'rgba(15,15,20,0.97)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: 300, overflow: 'hidden' }}>
            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
              <input
                autoFocus
                className="form-input"
                placeholder="Buscar pins e vias..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); }
                  if (e.key === 'Enter' && results.pins[0]) {
                    goToLocation(results.pins[0].x, results.pins[0].y, NIVEL_CONFIG[results.pins[0].nivel ?? 1].minZoom + 0.1 || 0.5);
                  }
                }}
                style={{ border: 'none', background: 'none', fontSize: 13, flex: 1, padding: 0 }}
              />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
            </div>

            {/* Resultados */}
            {searchQuery && (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {total === 0 ? (
                  <div style={{ padding: '20px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum resultado para "{searchQuery}"</div>
                ) : (
                  <>
                    {/* Pins */}
                    {results.pins.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'Courier New', padding: '8px 14px 4px' }}>
                          Pins ({results.pins.length})
                        </div>
                        {results.pins.map(p => {
                          const nivelCfg = NIVEL_CONFIG[p.nivel ?? 1];
                          const targetZoom = Math.max(nivelCfg.minZoom + 0.05, nivelCfg.minZoom * 2);
                          return (
                            <div key={p.pinId} onClick={() => goToLocation(p.x, p.y, targetZoom)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <span style={{ fontSize: 14 }}>{p.tipo === 'texto' ? '🔤' : '📍'}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.localNome}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{nivelCfg.label} · {nivelCfg.desc}</div>
                              </div>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.cor || 'var(--accent)', flexShrink: 0 }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Vias */}
                    {results.roads.length > 0 && (
                      <div style={{ borderTop: results.pins.length > 0 ? '1px solid var(--border)' : undefined }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'Courier New', padding: '8px 14px 4px' }}>
                          Vias ({results.roads.length})
                        </div>
                        {results.roads.map(r => {
                          const cfg = TIPOS_RODOVIA[r.tipo] || TIPOS_RODOVIA.estadual;
                          const mid = r.pontos[Math.floor(r.pontos.length / 2)] || r.pontos[0];
                          const targetZoom = cfg.minZoom > 1 ? cfg.minZoom + 0.5 : Math.max(cfg.minZoom * 3, 0.5);
                          return (
                            <div key={r.roadId} onClick={() => goToLocation(mid.x, mid.y, targetZoom)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: 24, height: 4, background: cfg.cor, borderRadius: 2, border: `1px solid ${cfg.outline}`, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: r.codigo ? 'Courier New' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r.codigo ? `${r.codigo}${r.nome ? ' · ' + r.nome : ''}` : r.nome}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cfg.label}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Territórios */}
                    {results.territories.length > 0 && (
                      <div style={{ borderTop: (results.pins.length > 0 || results.roads.length > 0) ? '1px solid var(--border)' : undefined }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'Courier New', padding: '8px 14px 4px' }}>
                          Territórios ({results.territories.length})
                        </div>
                        {results.territories.map(t => {
                          const cfg = TIPOS_TERRITORIO[t.tipo] || TIPOS_TERRITORIO.neutro;
                          return (
                            <div key={t.territoryId} onClick={() => zoomToTerritory(t)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: 16, height: 16, border: `2.5px dashed ${cfg.cor}`, borderRadius: 3, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nome}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cfg.label}{t.categoria ? ` · ${t.categoria}` : ''}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {!searchQuery && (
              <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                Digite para buscar pins e vias no mapa
              </div>
            )}
          </div>
        );
      })()}
      {showRoadPanel && (
        <div {...panel} style={{ position: 'absolute', top: 56, left: 16, zIndex: 20, background: 'rgba(15,15,20,0.96)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, width: 280, maxHeight: 460, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'Courier New' }}>Rodovias ({rodovias.length})</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowRoads(v => !v)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)', background: showRoads ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)', color: showRoads ? '#22c55e' : 'var(--text-muted)' }}>
                {showRoads ? '👁 visível' : '👁 oculto'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setModalRodovia(true); setShowRoadPanel(false); }}>+ Nova</button>
            </div>
          </div>

          {/* Legenda de tipos */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(TIPOS_RODOVIA).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                <div style={{ width: 24, height: 3, background: cfg.cor, borderRadius: 2 }} />
                {cfg.label}
              </div>
            ))}
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rodovias.length === 0 ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma rodovia ainda.</p> : rodovias.map(r => {
              const cfg = TIPOS_RODOVIA[r.tipo] || TIPOS_RODOVIA.estadual;
              return (
                <div key={r.roadId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 6, padding: '6px 10px', border: '1px solid var(--border)' }}>
                  <div style={{ width: 20, height: 4, background: cfg.cor, borderRadius: 2, flexShrink: 0, border: `1px solid ${cfg.outline}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Courier New', color: 'var(--text)' }}>{r.codigo}</div>
                    {r.nome && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</div>}
                  </div>
                  <button onClick={() => excluirRodovia(r.roadId, r.codigo)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão adicionar pin */}
      <div {...panel} style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        {addingPin && <div style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid var(--accent)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: 'var(--accent)' }}>Clique no mapa para posicionar</div>}
        {!modoDesenho && <button className="btn btn-primary" style={{ background: addingPin ? '#6d28d9' : 'var(--accent)' }} onClick={() => setAddingPin(v => !v)}>
          {addingPin ? '✕ Cancelar' : '📍 Adicionar pin'}
        </button>}
      </div>

      {/* Legenda de pins */}
      {pins.length > 0 && !modoDesenho && (
        <div {...panel} style={{ position: 'absolute', bottom: 24, left: 16, zIndex: 20, background: 'rgba(15,15,20,0.92)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', maxWidth: 220, maxHeight: 200, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'Courier New', marginBottom: 8 }}>Pins ({pins.length})</div>
          {pins.map(p => (
            <div key={p.pinId} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'Courier New', minWidth: 12 }}>{p.nivel ?? 1}</span>
              <span style={{ color: p.cor || 'var(--accent)', fontSize: 11 }}>{p.tipo === 'texto' ? '🔤' : '◈'}</span>
              <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.localNome}</span>
              <button onClick={() => excluirPin(p.pinId, p.localNome)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova rodovia */}
      {modalRodovia && (
        <div className="modal-overlay" {...panel} style={{ zIndex: 30 }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h2 className="modal-title">🛣️ Nova Rodovia</h2>

            <div style={{ display: 'grid', gridTemplateColumns: TIPOS_RODOVIA[roadForm.tipo]?.temCodigo ? '140px 1fr' : '1fr', gap: 12 }}>
              {TIPOS_RODOVIA[roadForm.tipo]?.temCodigo && (
              <div className="form-group">
                <label className="form-label">Código *</label>
                <input className="form-input" placeholder="VA-101" value={roadForm.codigo} onChange={e => setRoadForm(f => ({ ...f, codigo: e.target.value }))} style={{ fontFamily: 'Courier New', fontWeight: 700 }} />
              </div>
              )}
              <div className="form-group">
                <label className="form-label">{TIPOS_RODOVIA[roadForm.tipo]?.temCodigo ? 'Nome completo' : 'Nome *'}</label>
                <input className="form-input" placeholder={TIPOS_RODOVIA[roadForm.tipo]?.temCodigo ? 'Rod. Presidente X' : 'Avenida Central, Rua das Flores...'} value={roadForm.nome} onChange={e => setRoadForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {Object.entries(TIPOS_RODOVIA).map(([key, cfg]) => (
                  <button key={key} onClick={() => setRoadForm(f => ({ ...f, tipo: key }))} style={{ padding: '8px 6px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', textAlign: 'center', transition: 'all 0.15s', borderColor: roadForm.tipo === key ? cfg.cor : 'var(--border)', background: roadForm.tipo === key ? `${cfg.cor}20` : 'var(--surface-2)' }}>
                    <div style={{ width: '60%', height: 4, background: cfg.cor, borderRadius: 2, margin: '0 auto 4px', border: `1px solid ${cfg.outline}` }} />
                    <div style={{ fontSize: 11, color: roadForm.tipo === key ? cfg.cor : 'var(--text-muted)', fontWeight: roadForm.tipo === key ? 700 : 400 }}>{cfg.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Sentido</label>
                <select className="form-select" value={roadForm.sentido} onChange={e => setRoadForm(f => ({ ...f, sentido: e.target.value }))}>
                  <option value="duplo">Mão dupla</option>
                  <option value="unico">Mão única</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vel. máx. (km/h)</label>
                <input type="number" className="form-input" value={roadForm.velocidade} onChange={e => setRoadForm(f => ({ ...f, velocidade: Number(e.target.value) }))} />
              </div>
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>ℹ️</span>
              Após confirmar, você desenhará o traçado clicando ponto a ponto no mapa. Curvas são geradas automaticamente.
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalRodovia(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: TIPOS_RODOVIA[roadForm.tipo]?.cor, color: '#000' }} onClick={iniciarDesenho}>
                ✏️ Começar a desenhar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo território */}
      {modalTerritorio && (
        <div className="modal-overlay" {...panel} style={{ zIndex: 30 }}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <h2 className="modal-title">⬡ Novo Território</h2>
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" placeholder="Ex: Estado de Vasória, Zona Verde Norte..." value={territoryForm.nome} onChange={e => setTerritoryForm(f => ({ ...f, nome: e.target.value }))} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input className="form-input" placeholder="Ex: Estado, Município, Zona Industrial..." value={territoryForm.categoria} onChange={e => setTerritoryForm(f => ({ ...f, categoria: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(TIPOS_TERRITORIO).map(([key, cfg]) => (
                  <button key={key} onClick={() => setTerritoryForm(f => ({ ...f, tipo: key }))} style={{ flex: 1, padding: '10px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '2px solid', textAlign: 'center', transition: 'all 0.15s', borderColor: territoryForm.tipo === key ? cfg.cor : 'var(--border)', background: territoryForm.tipo === key ? `${cfg.cor}15` : 'var(--surface-2)' }}>
                    <div style={{ width: '60%', height: 0, border: `2px dashed ${cfg.cor}`, margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: territoryForm.tipo === key ? cfg.cor : 'var(--text-muted)' }}>{cfg.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.3 }}>{cfg.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>ℹ️</span> Após confirmar, clique no mapa para definir os vértices do polígono. Clique no ponto inicial para fechar.
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalTerritorio(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: TIPOS_TERRITORIO[territoryForm.tipo]?.cor, color: territoryForm.tipo === 'neutro' ? '#333' : 'white' }} onClick={iniciarTerritorio}>
                ✏️ Começar a desenhar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo pin */}
      {pinModal && (
        <div className="modal-overlay" {...panel} style={{ zIndex: 30 }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h2 className="modal-title">Novo pin</h2>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ val: 'marcador', icon: '📍', label: 'Marcador', desc: 'Pin com ícone' }, { val: 'texto', icon: '🔤', label: 'Texto', desc: 'Label flutuante' }].map(t => (
                  <button key={t.val} onClick={() => setTipoPin(t.val)} style={{ flex: 1, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', textAlign: 'left', transition: 'all 0.15s', borderColor: tipoPin === t.val ? 'var(--accent)' : 'var(--border)', background: tipoPin === t.val ? 'var(--accent-glow)' : 'var(--surface-2)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: tipoPin === t.val ? 'var(--accent)' : 'var(--text)' }}>{t.icon} {t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {modoNome === 'local' ? (
              <div className="form-group">
                <label className="form-label">Local</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {['local', 'manual'].map(m => (
                    <button key={m} onClick={() => setModoNome(m)} style={{ flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, border: '1px solid', borderColor: modoNome === m ? 'var(--accent)' : 'var(--border)', background: modoNome === m ? 'var(--accent-glow)' : 'var(--surface-2)', color: modoNome === m ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {m === 'local' ? '🔗 Local existente' : '✏️ Nome manual'}
                    </button>
                  ))}
                </div>
                <select className="form-select" value={selectedLocal} onChange={e => setSelectedLocal(e.target.value)}>
                  <option value="">Selecione um local...</option>
                  {locais.map(l => <option key={l.docId} value={l.docId}>{l.nome}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {['local', 'manual'].map(m => (
                    <button key={m} onClick={() => setModoNome(m)} style={{ flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, border: '1px solid', borderColor: modoNome === m ? 'var(--accent)' : 'var(--border)', background: modoNome === m ? 'var(--accent-glow)' : 'var(--surface-2)', color: modoNome === m ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {m === 'local' ? '🔗 Local existente' : '✏️ Nome manual'}
                    </button>
                  ))}
                </div>
                <input className="form-input" placeholder="Ex: Hospital Central..." value={nomeManual} onChange={e => setNomeManual(e.target.value)} autoFocus />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Nível de zoom</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(NIVEL_CONFIG).map(([n, cfg]) => (
                  <button key={n} onClick={() => setNivelPin(Number(n))} style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', textAlign: 'left', borderColor: nivelPin === Number(n) ? 'var(--accent)' : 'var(--border)', background: nivelPin === Number(n) ? 'var(--accent-glow)' : 'var(--surface-2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: nivelPin === Number(n) ? 'var(--accent)' : 'var(--text)' }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cfg.desc}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'Courier New', marginTop: 2 }}>{cfg.range}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pin pai <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(opcional)</span></label>
              <select className="form-select" value={parentPin} onChange={e => setParentPin(e.target.value)}>
                <option value="">Sem pai (pin raiz)</option>
                {pins.map(p => <option key={p.pinId} value={p.pinId}>[N{p.nivel ?? 1}] {p.localNome}</option>)}
              </select>
            </div>
            {tipoPin === 'marcador' && (
              <div className="form-group">
                <label className="form-label">Cor</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {['#7c3aed','#ef4444','#3b82f6','#22c55e','#f59e0b','#ec4899','#ffffff','#64748b'].map(cor => (
                    <button key={cor} onClick={() => setSelectedColor(cor)} style={{ width: 28, height: 28, borderRadius: '50%', background: cor, cursor: 'pointer', flexShrink: 0, border: selectedColor === cor ? '3px solid white' : '2px solid rgba(255,255,255,0.15)', boxShadow: selectedColor === cor ? `0 0 0 2px ${cor}` : 'none', transition: 'all 0.1s' }} />
                  ))}
                  <input type="color" value={selectedColor} onChange={e => setSelectedColor(e.target.value)} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 2, background: 'var(--surface-2)' }} />
                </div>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={resetPinModal}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: tipoPin === 'marcador' ? selectedColor : 'var(--accent)' }} onClick={confirmarPin}>Criar pin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

