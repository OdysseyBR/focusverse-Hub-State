import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { searchArticles, getAllArticles, CATEGORY_LABELS, CATEGORY_ICONS } from '../../lib/db'
import { Search, Loader, ChevronRight } from 'lucide-react'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(q)
  const [searched, setSearched] = useState(false)

  const isTagSearch = q.startsWith('#')
  const searchTerm = isTagSearch ? q.slice(1).toLowerCase().trim() : q

  useEffect(() => {
    if (!q) return
    setLoading(true)
    setSearched(true)
    if (isTagSearch) {
      getAllArticles().then(all => {
        setResults(all.filter(a => (a.tags || []).some(t => t.toLowerCase().includes(searchTerm))))
        setLoading(false)
      })
    } else {
      searchArticles(q).then(data => { setResults(data); setLoading(false) })
    }
  }, [q])

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) setSearchParams({ q: query.trim() })
  }

  return (
    <div className="fade-in">
      <div className="breadcrumb" style={{padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)"}}>
        <Link to="/wiki" className="wiki-link">Início</Link>
        <ChevronRight size={11} />
        <span className="text-wiki-charcoal font-medium">Buscar</span>
      </div>

      <div className="app-page" style={{maxWidth: 760}}>
        <h1 className="page-title" style={{paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 20}}>
          Buscar no wiki
        </h1>

        <form onSubmit={handleSearch} style={{display: "flex", gap: 8, marginBottom: 8}}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar artigos... ou #tag"
            className="form-input"
            autoFocus
          />
          <button type="submit" className="btn btn-primary px-5">
            {loading ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
            Buscar
          </button>
        </form>

        <p style={{fontSize: 12, color: "var(--text-muted)", marginBottom: 20}}>
          Use <code style={{background: "var(--surface-2)", padding: "1px 5px", borderRadius: 4}}>#tag</code> para buscar por tag específica.
        </p>

        {!loading && searched && (
          <>
            <p style={{fontSize: 13, color: "var(--text-muted)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)"}}>
              {results.length === 0
                ? `Nenhum resultado para "${q}".`
                : `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${q}"`
              }
            </p>
            <div style={{}}>
              {results.map((article, i) => (
                <div key={article.id} style={{paddingTop: i !== 0 ? 12 : 0, paddingBottom: 12, borderTop: i !== 0 ? "1px solid var(--border)" : "none", fontSize: 13}}>
                  <Link to={`/wiki/article/${article.id}`} className="wiki-link" style={{fontWeight: 500, fontSize: 14}}>
                    {article.title}
                  </Link>
                  <div style={{display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap"}}>
                    <span style={{color: "var(--text-muted)", fontSize: 11}}>
                      {CATEGORY_ICONS[article.category]} {CATEGORY_LABELS[article.category] || article.category}
                    </span>
                    {article.tags?.map(tag => (
                      <span key={tag} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {article.summary && (
                    <p className="text-wiki-text-muted text-xs mt-1 line-clamp-2">{article.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
