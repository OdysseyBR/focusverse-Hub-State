import { useState, useRef } from 'react'
import { Plus, Trash2, Image, X, Loader, Settings } from 'lucide-react'
import { uploadFile, validateImage } from '../lib/cloudinary'

const MAX_ROWS = 50
const MAX_COLS = 10
const MAX_LISTS = 10

// ─── Editor de colunas ────────────────────────────────────
function ColumnEditor({ columns, onChange }) {
  function addCol() {
    if (columns.length >= MAX_COLS) return
    onChange([...columns, { name: '', type: 'text' }])
  }
  function removeCol(i) {
    onChange(columns.filter((_, idx) => idx !== i))
  }
  function updateCol(i, field, value) {
    onChange(columns.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  return (
    <div className="border border-wiki-border bg-wiki-bg-infobox p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-wiki-text-muted uppercase tracking-wider">
          Colunas ({columns.length}/{MAX_COLS})
        </p>
        <button type="button" onClick={addCol} disabled={columns.length >= MAX_COLS}
          className="flex items-center gap-1 text-xs text-wiki-teal hover:underline disabled:opacity-40">
          <Plus size={11} /> Adicionar coluna
        </button>
      </div>
      <div className="space-y-1.5">
        {columns.map((col, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-wiki-text-muted w-5 flex-shrink-0 font-mono">{i + 1}</span>
            <input
              type="text"
              value={col.name}
              onChange={e => updateCol(i, 'name', e.target.value)}
              placeholder={`Nome da coluna ${i + 1}...`}
              className="flex-1 text-xs border border-wiki-border px-2 py-1 bg-white focus:outline-none focus:border-wiki-navy text-wiki-charcoal"
            />
            <select
              value={col.type}
              onChange={e => updateCol(i, 'type', e.target.value)}
              className="text-xs border border-wiki-border px-1.5 py-1 bg-white focus:outline-none w-20 flex-shrink-0 text-wiki-text"
            >
              <option value="text">Texto</option>
              <option value="image">Imagem</option>
            </select>
            <button type="button" onClick={() => removeCol(i)}
              className="text-wiki-text-muted hover:text-wiki-red flex-shrink-0">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {columns.length === 0 && (
          <p className="text-xs text-wiki-text-muted italic">Nenhuma coluna. Adicione pelo menos uma.</p>
        )}
      </div>
    </div>
  )
}

// ─── Célula de imagem ─────────────────────────────────────
function ImageCell({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef()

  async function handleFile(file) {
    const err = validateImage(file)
    if (err) return alert(err)
    setUploading(true)
    try {
      const url = await uploadFile(file, 'universe-wiki/lists')
      onChange(url)
    } catch { alert('Erro ao enviar.') }
    setUploading(false)
    if (ref.current) ref.current.value = ''
  }

  if (value) return (
    <div className="relative w-10 h-10">
      <img src={value} alt="" className="w-10 h-10 object-cover border border-wiki-border" />
      <button type="button" onClick={() => onChange('')}
        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-wiki-red rounded-full flex items-center justify-center text-white">
        <X size={8} />
      </button>
    </div>
  )

  return (
    <label className="w-10 h-10 border border-dashed border-wiki-border flex items-center justify-center cursor-pointer hover:bg-wiki-silver/30 transition-colors flex-shrink-0">
      {uploading ? <Loader size={10} className="animate-spin text-wiki-teal" /> : <Image size={10} className="text-wiki-text-muted" />}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files[0]; if (f) handleFile(f) }} />
    </label>
  )
}

// ─── Editor principal ─────────────────────────────────────
export default function RichListEditor({ lists, onChange }) {

  function addList() {
    if (lists.length >= MAX_LISTS) return
    onChange([...lists, { title: '', columns: [], rows: [] }])
  }

  function removeList(li) {
    onChange(lists.filter((_, i) => i !== li))
  }

  function updateList(li, field, value) {
    onChange(lists.map((l, i) => i === li ? { ...l, [field]: value } : l))
  }

  function updateColumns(li, columns) {
    const rows = (lists[li].rows || []).map(row => {
      const cells = columns.map((_, ci) => (row.cells || [])[ci] ?? '')
      return { ...row, cells }
    })
    onChange(lists.map((l, i) => i === li ? { ...l, columns, rows } : l))
  }

  function addRow(li) {
    const currentRows = lists[li].rows || []
    const currentCols = lists[li].columns || []
    if (currentRows.length >= MAX_ROWS) return
    const cells = currentCols.map(() => '')
    onChange(lists.map((l, i) => i === li
      ? { ...l, rows: [...(l.rows || []), { cells }] }
      : l))
  }

  function removeRow(li, ri) {
    onChange(lists.map((l, i) => i === li
      ? { ...l, rows: (l.rows || []).filter((_, j) => j !== ri) }
      : l))
  }

  function updateCell(li, ri, ci, value) {
    onChange(lists.map((l, i) => i === li
      ? {
          ...l,
          rows: (l.rows || []).map((r, j) => j === ri
            ? { ...r, cells: (r.cells || []).map((c, k) => k === ci ? value : c) }
            : r)
        }
      : l))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-wiki-text-muted uppercase tracking-wider">
          Tabelas / Listas detalhadas
        </label>
        <button type="button" onClick={addList} disabled={lists.length >= MAX_LISTS}
          className="flex items-center gap-1 text-xs text-wiki-teal hover:underline font-medium disabled:opacity-40">
          <Plus size={12} /> Nova tabela
        </button>
      </div>

      {lists.map((list, li) => (
        <div key={li} className="border border-wiki-border">
          {/* Header */}
          <div className="flex items-center gap-2 p-2 border-b border-wiki-border bg-wiki-bg-sidebar">
            <input
              type="text"
              value={list.title}
              onChange={e => updateList(li, 'title', e.target.value)}
              placeholder="Título da tabela..."
              className="flex-1 text-sm font-semibold border border-wiki-border px-2 py-1 text-wiki-charcoal focus:outline-none focus:border-wiki-navy bg-white"
            />
            <button type="button" onClick={() => removeList(li)} className="text-wiki-red hover:opacity-80">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="p-3 space-y-3 bg-white">
            {/* Editor de colunas */}
            <ColumnEditor
              columns={list.columns}
              onChange={cols => updateColumns(li, cols)}
            />

            {/* Linhas */}
            {list.columns.length > 0 && (
              <>
                {/* Preview header */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs min-w-max">
                    <thead>
                      <tr>
                        <th className="bg-wiki-navy text-white px-2 py-1 border border-wiki-border w-8 text-center">#</th>
                        {list.columns.map((col, ci) => (
                          <th key={ci} className="bg-wiki-navy text-white px-2 py-1 border border-wiki-border text-left whitespace-nowrap">
                            {col.name || `Coluna ${ci + 1}`}
                            {col.type === 'image' && ' 🖼'}
                          </th>
                        ))}
                        <th className="bg-wiki-navy text-white px-2 py-1 border border-wiki-border w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(list.rows || []).map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-wiki-bg-sidebar'}>
                          <td className="border border-wiki-border px-2 py-1 text-center text-wiki-text-muted">{ri + 1}</td>
                          {(list.columns || []).map((col, ci) => (
                            <td key={ci} className="border border-wiki-border px-1 py-1">
                              {col.type === 'image' ? (
                                <ImageCell
                                  value={(row.cells || [])[ci] || ''}
                                  onChange={val => updateCell(li, ri, ci, val)}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={(row.cells || [])[ci] || ''}
                                  onChange={e => updateCell(li, ri, ci, e.target.value)}
                                  placeholder="..."
                                  className="w-full text-xs px-1 py-0.5 focus:outline-none bg-transparent border-b border-transparent focus:border-wiki-navy min-w-20"
                                />
                              )}
                            </td>
                          ))}
                          <td className="border border-wiki-border px-1 py-1 text-center">
                            <button type="button" onClick={() => removeRow(li, ri)}
                              className="text-wiki-text-muted hover:text-wiki-red">
                              <Trash2 size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="button" onClick={() => addRow(li)} disabled={list.rows.length >= MAX_ROWS}
                  className="flex items-center gap-1 text-xs text-wiki-navy hover:underline font-medium disabled:opacity-40">
                  <Plus size={12} /> Adicionar linha ({list.rows.length}/{MAX_ROWS})
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Renderizador no artigo ───────────────────────────────
export function RichListRenderer({ lists }) {
  if (!lists?.length) return null
  return (
    <div className="space-y-6 clear-both mt-6">
      {lists.map((list, li) => {
        const columns = list.columns || []
        const rows = list.rows || []
        if (!columns.length) return null
        return (
          <div key={li} className="overflow-x-auto">
            {list.title && (
              <h3 className="font-sans font-bold text-wiki-charcoal border-b-2 border-wiki-navy pb-1 mb-0 text-base">
                {list.title}
              </h3>
            )}
            <table style={{width: "100%", borderCollapse: "collapse", fontSize: 13}}>
              <thead>
                <tr>
                  {columns.map((col, ci) => (
                    <th key={ci} className="bg-wiki-navy text-white px-3 py-2 border border-wiki-border text-left font-semibold whitespace-nowrap">
                      {col.name || `Coluna ${ci + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const cells = row.cells || []
                  return (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-wiki-bg-sidebar'}>
                      {columns.map((col, ci) => (
                        <td key={ci} className="border border-wiki-border px-3 py-2 align-middle">
                          {col.type === 'image' && cells[ci] ? (
                            <img src={cells[ci]} alt="" className="h-8 w-auto object-contain" />
                          ) : (
                            <span>{cells[ci] || ''}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
