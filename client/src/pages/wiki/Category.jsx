import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getArticlesByCategory, getAllCategories, CATEGORY_LABELS, CATEGORY_ICONS } from '../../lib/db'
import { Plus, ChevronRight, Clock, Globe } from 'lucide-react'
import { getUniverseLabel } from '../../lib/universes'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Category() {
  const { cat } = useParams()
  const { isAdmin } = useAuth()
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [catInfo, setCatInfo] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getArticlesByCategory(cat),
      getAllCategories()
    ]).then(([arts, cats]) => {
      setArticles(arts)
      setCategories(cats)
      const found = cats.find(c => c.id === cat)
      setCatInfo(found)
      setLoading(false)
    })
  }, [cat])

  if (!loading && !catInfo) return <Navigate to="/wiki" replace />

  const label = catInfo?.label || cat
  const icon  = catInfo?.icon || '📄'

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div className="breadcrumb" style={{padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)"}}>
        <Link to="/wiki" className="wiki-link">Início</Link>
        <ChevronRight size={11} />
        <span className="text-wiki-charcoal font-medium">{label}</span>
        {isAdmin && (
          <Link to={`/wiki/new?category=${cat}`} className="wiki-link" style={{marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontWeight: 500}}>
            <Plus size={11} /> Novo artigo
          </Link>
        )}
      </div>

      <div className="app-page" style={{maxWidth: 900}}>
        <h1 className="page-title" style={{paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8}}>
          <span>{icon}</span> {label}
        </h1>

        <p style={{fontSize: 13, color: "var(--text-muted)", marginBottom: 20, fontStyle: "italic"}}>
          {loading ? '...' : `${articles.length} ${articles.length === 1 ? 'artigo' : 'artigos'} nesta categoria`}
        </p>

        {loading ? (
          <div style={{display: "flex", flexDirection: "column", gap: 8}}>
            {[...Array(5)].map((_, i) => <div key={i} style={{height: 20, background: "var(--surface-2)", borderRadius: 6}} />)}
          </div>
        ) : articles.length === 0 ? (
          <div className="card" style={{fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: 40}}>
            Nenhum artigo nesta categoria.{' '}
            {isAdmin && <Link to={`/wiki/new?category=${cat}`} className="wiki-link not-italic">Criar o primeiro →</Link>}
          </div>
        ) : (
          <div style={{}}>
            {articles.map((article, i) => {
              const date = article.updatedAt?.toDate
                ? formatDistanceToNow(article.updatedAt.toDate(), { locale: ptBR, addSuffix: true })
                : ''
              return (
                <div key={article.id} style={{display: "flex", alignItems: "flex-start", gap: 12, paddingTop: i !== 0 ? 12 : 0, paddingBottom: 12, borderTop: i !== 0 ? "1px solid var(--border)" : "none", fontSize: 13}}>
                  <div style={{flex: 1, minWidth: 0}}>
                    <Link to={`/wiki/article/${article.id}`} className="wiki-link" style={{fontWeight: 500, fontSize: 14}}>
                      {article.title}
                    </Link>
                    {article.summary && (
                      <p style={{color: "var(--text-muted)", fontSize: 12, marginTop: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"}}>{article.summary}</p>
                    )}
                    {article.tags?.length > 0 && (
                      <div style={{display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap"}}>
                        {article.tags.map(tag => (
                          <span key={tag} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{color: "var(--text-muted)", fontSize: 11, flexShrink: 0, display: "flex", alignItems: "center", gap: 4, marginTop: 2}}>
                    <Clock size={10} /> {date}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
