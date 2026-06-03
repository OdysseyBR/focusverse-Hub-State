import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getRecentArticles, getAllCategories, CATEGORY_LABELS, CATEGORY_ICONS } from '../../lib/db'
import { Plus, Clock, ChevronRight, Globe } from 'lucide-react'
import { getUniverseLabel } from '../../lib/universes'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Home() {
  const { isAdmin } = useAuth()
  const [recent, setRecent] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getRecentArticles(10), getAllCategories()]).then(([arts, cats]) => {
      setRecent(arts)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  return (
    <div className="app-page fade-in" style={{maxWidth: 900}}>

      {/* Title */}
      <div style={{borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 20}}>
        <h1 className="page-title">Bem-vindo ao Universe Wiki</h1>
        <p style={{fontSize: 13, color: "var(--text-muted)", marginTop: 4}}>
          A enciclopédia do universo literário — {recent.length} artigos publicados
        </p>
      </div>

      <div style={{display: "flex", gap: 24, flexWrap: "wrap"}}>
        {/* Main */}
        <div style={{flex: 1, minWidth: 0}}>

          {/* Intro box */}
          <div className="card" style={{marginBottom: 20, fontSize: 13}}>
            <p style={{color: "var(--text-muted)", lineHeight: 1.6}}>
              Este wiki documenta o universo literário criado pelo autor — um mundo realista com múltiplas
              histórias que abrangem temas como ciência, política, cultura e muito mais. Use o menu lateral
              para navegar pelas categorias ou a busca para encontrar artigos específicos.
            </p>
          </div>

          {/* Atualizados recentemente */}
          <div style={{marginBottom: 24}}>
            <h2 style={{fontSize: 16, fontWeight: 700, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 12}}>
              Atualizados recentemente
            </h2>
            {loading ? (
              <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                {[...Array(5)].map((_, i) => <div key={i} style={{height: 20, background: "var(--surface-2)", borderRadius: 6, animation: "pulse 1.5s infinite"}} />)}
              </div>
            ) : recent.length === 0 ? (
              <div style={{fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", padding: "16px 0"}}>
                Nenhum artigo ainda.{' '}
                {isAdmin && <Link to="/wiki/new" className="wiki-link">Criar o primeiro artigo →</Link>}
              </div>
            ) : (
              <ul style={{}}>
                {recent.map((article, i) => {
                  const date = article.updatedAt?.toDate
                    ? formatDistanceToNow(article.updatedAt.toDate(), { locale: ptBR, addSuffix: true })
                    : ''
                  return (
                    <li key={article.id} style={{display: "flex", alignItems: "flex-start", gap: 8, paddingTop: i !== 0 ? 10 : 0, paddingBottom: 10, borderTop: i !== 0 ? "1px solid var(--border)" : "none", fontSize: 13}}>
                      <span style={{color: "var(--text-muted)", flexShrink: 0, marginTop: 2}}>
                        {CATEGORY_ICONS[article.category] || '📄'}
                      </span>
                      <div style={{flex: 1, minWidth: 0}}>
                        <Link to={`/wiki/article/${article.id}`} className="wiki-link" style={{fontWeight: 500}}>
                          {article.title}
                        </Link>
                        {article.universe && (
                          <span className="inline-flex items-center gap-0.5 ml-2 text-xs bg-wiki-teal/10 border border-wiki-teal/25 text-wiki-teal px-1.5 py-0.5 rounded font-medium">
                            <Globe size={9} />
                            {getUniverseLabel(article.universe, article.universeVariant)}
                          </span>
                        )}
                        {article.summary && (
                          <span style={{color: "var(--text-muted)", marginLeft: 8, fontSize: 11}}>— {article.summary}</span>
                        )}
                      </div>
                      <span style={{color: "var(--text-muted)", fontSize: 11, flexShrink: 0, display: "flex", alignItems: "center", gap: 4}}>
                        <Clock size={10} /> {date}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar right */}
        <div style={{width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16}}>
          {/* Categorias */}
          <div style={{border: "1px solid var(--border)", borderRadius: "var(--radius)"}}>
            <div style={{background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: "var(--radius) var(--radius) 0 0"}}>
              Categorias
            </div>
            <ul style={{}}>
              {categories.map(cat => (
                <li key={cat.id}>
                  <Link
                    to={`/wiki/category/${cat.id}`}
                    className="wiki-link" style={{display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, borderTop: "1px solid var(--border)"}}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <ChevronRight size={12} className="ml-auto text-wiki-text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Admin box */}
          {isAdmin && (
            <div style={{border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12, background: "var(--surface-2)"}}>
              <p style={{fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8}}>Admin</p>
              <Link to="/wiki/new" className="btn btn-primary btn-sm" style={{width: "100%", justifyContent: "center"}}>
                <Plus size={13} /> Novo artigo
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
