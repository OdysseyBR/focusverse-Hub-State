import { useRef, useState } from 'react'
import { Plus, Trash2, X, Loader, Image, Music } from 'lucide-react'
import { uploadImage, validateImage, validateAudio } from '../utils/cloudinary'

const ROW_TYPES = [
  { id: 'normal',  label: 'Normal' },
  { id: 'sub',     label: '• Subitem' },
  { id: 'section', label: 'Seção' },
]
const MAX_ROWS   = 15
const MAX_IMAGES = 3

/* ── Upload helper ─────────────────────────────────────── */
function ImageSlot({ url, onUpload, onRemove, uploading, label }) {
  const ref = useRef()
  return (
    <div className="flex-1">
      {url ? (
        <div className="relative">
          <img src={url} alt="" className="w-full h-20 object-cover border border-wiki-border" />
          <button type="button" onClick={onRemove}
            className="absolute -top-1 -right-1 w-5 h-5 bg-wiki-red rounded-full flex items-center justify-center text-white">
            <X size={10} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-20 border border-dashed border-wiki-border cursor-pointer hover:bg-wiki-silver/30 transition-colors bg-wiki-bg-sidebar">
          {uploading ? <Loader size={14} className="animate-spin text-wiki-teal" /> : <Image size={14} className="text-wiki-text-muted" />}
          <span className="text-xs text-wiki-text-muted mt-1" style={{ fontSize: '10px' }}>{uploading ? 'Enviando...' : label}</span>
          <input ref={ref} type="file" accept="image/*" className="hidden"
            onChange={async e => {
              const f = e.target.files[0]
              if (!f) return
              const err = validateImage(f)
              if (err) return alert(err)
              await onUpload(f)
              if (ref.current) ref.current.value = ''
            }} />
        </label>
      )}
    </div>
  )
}

/* ── Editor component ──────────────────────────────────── */
export default function InfoboxEditor({ rows, onChange, images, onImagesChange, audio, onAudioChange }) {
  const [uploadingImg, setUploadingImg] = useState([false, false, false])
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const audioRef = useRef()

  async function handleImageUpload(slot, file) {
    setUploadingImg(prev => prev.map((v, i) => i === slot ? true : v))
    try {
      const url = await uploadImage(file, 'universe-wiki/infobox')
      const next = [...images]
      next[slot] = url
      onImagesChange(next)
    } catch { alert('Erro ao enviar imagem.') }
    setUploadingImg(prev => prev.map((v, i) => i === slot ? false : v))
  }

  function removeImage(slot) {
    const next = [...images]
    next[slot] = ''
    onImagesChange(next)
  }

  async function handleAudioUpload(file) {
    const err = validateAudio(file)
    if (err) return alert(err)
    setUploadingAudio(true)
    try {
      const url = await uploadImage(file, 'universe-wiki/audios')
      onAudioChange(url)
    } catch { alert('Erro ao enviar áudio.') }
    setUploadingAudio(false)
    if (audioRef.current) audioRef.current.value = ''
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) return
    onChange([...rows, { type: 'normal', label: '', value: '' }])
  }

  function removeRow(i) {
    onChange(rows.filter((_, idx) => idx !== i))
  }

  function updateRow(i, field, value) {
    onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function moveRow(i, dir) {
    const next = [...rows]
    const target = i + dir
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target], next[i]]
    onChange(next)
  }

  const filledImages = images.filter(Boolean).length

  return (
    <div className="space-y-4">
      <label className="block text-xs font-bold text-wiki-text-muted uppercase tracking-wider">
        Infobox lateral
      </label>

      {/* Imagens da infobox */}
      <div>
        <p className="text-xs text-wiki-text-muted mb-2">
          Imagens ({filledImages}/{MAX_IMAGES}) —
          <span className="italic"> 1 foto: grande · 2 fotos: lado a lado · 3 fotos: 2 pequenas + 1 grande</span>
        </p>
        <div className="flex gap-2">
          {[0, 1, 2].map(slot => (
            <ImageSlot
              key={slot}
              url={images[slot] || ''}
              onUpload={f => handleImageUpload(slot, f)}
              onRemove={() => removeImage(slot)}
              uploading={uploadingImg[slot]}
              label={`Foto ${slot + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Áudio na infobox */}
      <div>
        <p className="text-xs font-bold text-wiki-text-muted uppercase tracking-wider mb-2">Áudio (hino, tema...)</p>
        {audio ? (
          <div className="border border-wiki-border bg-wiki-bg-sidebar p-2 flex items-center gap-2">
            <Music size={14} className="text-wiki-teal flex-shrink-0" />
            <audio controls src={audio} className="flex-1" style={{ height: '28px' }} />
            <button type="button" onClick={() => onAudioChange('')} className="text-wiki-red hover:opacity-80">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 border border-dashed border-wiki-border p-3 cursor-pointer hover:bg-wiki-silver/30 transition-colors bg-wiki-bg-sidebar">
            {uploadingAudio ? <Loader size={14} className="animate-spin text-wiki-teal" /> : <Music size={14} className="text-wiki-text-muted" />}
            <span style={{fontSize: 11, color: "var(--text-muted)"}}>{uploadingAudio ? 'Enviando...' : 'Clique para adicionar áudio'}</span>
            <input ref={audioRef} type="file" accept="audio/*" className="hidden"
              onChange={e => { const f = e.target.files[0]; if (f) handleAudioUpload(f) }} />
          </label>
        )}
      </div>

      {/* Linhas da infobox */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-wiki-text-muted uppercase tracking-wider">
            Linhas de informação ({rows.length}/{MAX_ROWS})
          </p>
          <button type="button" onClick={addRow} disabled={rows.length >= MAX_ROWS}
            className="flex items-center gap-1 text-xs text-wiki-teal hover:underline font-medium disabled:opacity-40">
            <Plus size={12} /> Adicionar linha
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="border border-dashed border-wiki-border p-3 text-center text-xs text-wiki-text-muted">
            Nenhuma linha. Clique em "Adicionar linha" para começar.
          </div>
        ) : (
          <div className="border border-wiki-border divide-y divide-wiki-border">
            {rows.map((row, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 ${row.type === 'section' ? 'bg-wiki-navy/5' : 'bg-white'}`}>
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button type="button" onClick={() => moveRow(i, -1)} disabled={i === 0}
                    className="text-wiki-text-muted hover:text-wiki-navy disabled:opacity-20 text-xs leading-none">▲</button>
                  <button type="button" onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1}
                    className="text-wiki-text-muted hover:text-wiki-navy disabled:opacity-20 text-xs leading-none">▼</button>
                </div>

                <select value={row.type} onChange={e => updateRow(i, 'type', e.target.value)}
                  className="text-xs border border-wiki-border px-1.5 py-1 text-wiki-text bg-white focus:outline-none w-24 flex-shrink-0">
                  {ROW_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>

                <input type="text" value={row.label} onChange={e => updateRow(i, 'label', e.target.value)}
                  placeholder={row.type === 'section' ? 'Título da seção...' : 'Rótulo...'}
                  className="flex-1 text-xs border border-wiki-border px-2 py-1 text-wiki-text bg-white focus:outline-none focus:border-wiki-navy" />

                {row.type !== 'section' && (
                  <input type="text" value={row.value} onChange={e => updateRow(i, 'value', e.target.value)}
                    placeholder="Valor..."
                    className="flex-1 text-xs border border-wiki-border px-2 py-1 text-wiki-text bg-white focus:outline-none focus:border-wiki-navy" />
                )}

                <button type="button" onClick={() => removeRow(i)} className="text-wiki-text-muted hover:text-wiki-red flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
