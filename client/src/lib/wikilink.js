// Converte [[Título]] em links HTML
// Links válidos ficam em âmbar, links quebrados ficam em vermelho
export function parseWikiLinks(html, articles) {
  const titleMap = {}
  articles.forEach(a => {
    titleMap[a.title.toLowerCase()] = a.id
  })

  return html.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
    const key = title.trim().toLowerCase()
    const id = titleMap[key]
    if (id) {
      return `<a href="/article/${id}" class="wiki-link">${title.trim()}</a>`
    } else {
      return `<span class="wiki-link-broken" title="Artigo '${title.trim()}' não existe ainda">${title.trim()}</span>`
    }
  })
}
