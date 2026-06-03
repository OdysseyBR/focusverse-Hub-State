import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { createArticle, updateArticle, getArticle, subscribeToCategorias } from '../../lib/db'
import CategoryModal from '../../components/CategoryModal'
import UniverseSelector from '../../components/UniverseSelector'
import InfoboxEditor from '../../components/InfoboxEditor'
import RichListEditor from '../../components/RichList'
import { Bold, Italic, List, ListOrdered, Quote, Minus, Heading2, Heading3, ArrowLeft, Save, Loader, Plus } from 'lucide-react'

function ToolbarBtn({ onClick, active, title, children }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`tiptap-btn ${active ? 'active' : ''}`}>
      {children}
    </button>
  )
}

export default function ArticleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditing = Boolean(id)

  const [title, setTitle]                     = useState('')
  const [summary, setSummary]                 = useState('')
  const [category, setCategory]               = useState(searchParams.get('category') || 'characters')
  const [tags, setTags]                       = useState('')
  const [infoboxImages, setInfoboxImages]     = useState(['', '', ''])
  const [infoboxAudio, setInfoboxAudio]       = useState('')
  const [infobox, setInfobox]                 = useState([])
  const [richLists, setRichLists]             = useState([])
  const [universe, setUniverse]               = useState('geral')
  const [universeVariant, setUniverseVariant] = useState('')
  const [saving, setSaving]                   = useState(false)
  const [loading, setLoading]                 = useState(isEditing)
  const [categories, setCategories]           = useState([])
  const [showCatModal, setShowCatModal]       = useState(false)

  useEffect(() => {
    const unsub = subscribeToCategorias(setCategories)
    return () => unsub()
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Escreva o conteúdo do artigo aqui...' }),
    ],
    editorProps: { attributes: { class: 'tiptap-editor' } },
  })

  useEffect(() => {
    if (isEditing && editor) {
      getArticle(id).then(data => {
        if (data) {
          setTitle(data.title || '')
          setSummary(data.summary || '')
          setCategory(data.category || 'characters')
          setTags((data.tags || []).join(', '))
          setInfoboxImages(Array.isArray(data.infoboxImages) && data.infoboxImages.length === 3 ? data.infoboxImages : ['', '', ''])
          setInfoboxAudio(data.infoboxAudio || '')
          setInfobox(data.infobox || [])
          setRichLists(data.richLists || [])
          setUniverse(data.universe || 'geral')
          setUniverseVariant(data.universeVariant || '')
          editor.commands.setContent(data.content || '')
        }
        setLoading(false)
      })
    }
  }, [id, editor])

  async function handleSave() {
    if (!title.trim()) return alert('O título é obrigatório.')
    setSaving(true)
    const data = {
      title: title.trim(),
      summary: summary.trim(),
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      content: editor?.getHTML() || '',
      infoboxImages,
      infoboxAudio: infoboxAudio || '',
      infobox: (infobox || []).filter(r => r?.label?.trim() || r?.value?.trim()),
      richLists: (richLists || []).map(l => ({
        ...l,
        columns: l.columns || [],
        rows: (l.rows || []).map(r => ({ ...r, cells: r.cells || [] }))
      })),
      universe: universe || 'geral',
      universeVariant: universeVariant || '',
    }
    try {
      if (isEditing) { await updateArticle(id, data); navigate(`/wiki/article/${id}`) }
      else { const ref = await createArticle(data); navigate(`/wiki/article/${ref.id}`) }
    } catch { alert('Erro ao salvar.'); setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader size={24} className="animate-spin text-wiki-teal" /></div>

  return (
    <div className="fade-in">
      {showCatModal && (
        <CategoryModal onClose={() => setShowCatModal(false)} onCreated={cat => setCategory(cat.id)} />
      )}

      {/* Topbar */}
      <div style={{borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16}}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ArrowLeft size={16} />
          </button>
          <span style={{fontSize: 14, fontWeight: 600, color: "var(--text)"}}>{isEditing ? 'Editar artigo' : 'Novo artigo'}</span>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm py-1.5">
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="p-5 max-w-4xl space-y-6">

        {/* Categoria */}
        <div>
          <label className="form-label">Categoria</label>
          <div className="flex gap-2 flex-wrap items-center">
            {categories.map(cat => (
              <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border transition-all ${
                  category === cat.id
                    ? 'bg-wiki-navy/10 border-wiki-navy/30 text-wiki-navy font-semibold'
                    : 'border-wiki-border text-wiki-text-muted hover:border-wiki-navy/30 hover:text-wiki-navy'
                }`}>
                {cat.icon} {cat.label}
              </button>
            ))}
            <button type="button" onClick={() => setShowCatModal(true)}
              className="btn btn-ghost btn-sm" style={{borderStyle: "dashed"}}>
              <Plus size={12} /> Nova categoria
            </button>
          </div>
        </div>

        {/* Universo */}
        <UniverseSelector
          value={universe}
          variant={universeVariant}
          onChange={setUniverse}
          onVariantChange={setUniverseVariant}
        />

        {/* Título */}
        <div>
          <label className="form-label">Título *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do artigo..."
            className="form-input" style={{fontSize: 20, fontWeight: 700}} />
        </div>

        {/* Resumo */}
        <div>
          <label className="form-label">Resumo</label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Uma frase descrevendo este artigo..." rows={2}
            className="form-textarea" />
        </div>

        {/* Tags */}
        <div>
          <label className="form-label">
            Tags <span className="normal-case font-normal text-wiki-text-muted">(separadas por vírgula)</span>
          </label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="ex: protagonista, história 1..."
            className="form-input" style={{fontFamily: "JetBrains Mono, monospace"}} />
        </div>

        {/* Infobox */}
        <InfoboxEditor
          rows={infobox}
          onChange={setInfobox}
          images={infoboxImages}
          onImagesChange={setInfoboxImages}
          audio={infoboxAudio}
          onAudioChange={setInfoboxAudio}
        />

        {/* Listas detalhadas */}
        <RichListEditor lists={richLists} onChange={setRichLists} />

        {/* Editor */}
        <div>
          <label className="form-label">Conteúdo</label>
          <div style={{border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)"}}>
            <div className="tiptap-toolbar">
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Negrito"><Bold size={14} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Itálico"><Italic size={14} /></ToolbarBtn>
              <div className="w-px h-4 bg-wiki-border mx-0.5" />
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="H2"><Heading2 size={14} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="H3"><Heading3 size={14} /></ToolbarBtn>
              <div className="w-px h-4 bg-wiki-border mx-0.5" />
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Lista"><List size={14} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Lista numerada"><ListOrdered size={14} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Citação"><Quote size={14} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Separador"><Minus size={14} /></ToolbarBtn>
            </div>
            <div style={{padding: 16, minHeight: 240}}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        <div style={{display: "flex", justifyContent: "flex-end"}}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Salvando...' : 'Salvar artigo'}
          </button>
        </div>
      </div>
    </div>
  )
}
