export const UNIVERSES = [
  { id: 'geral',    label: 'Universo Geral',    variants: [] },
  { id: '2b2t',     label: 'Universo 2B2T',     variants: ['A', 'B', 'C'] },
  { id: '4t7u',     label: 'Universo 4T7U',     variants: ['A', 'B', 'C'] },
  { id: '7k8f',     label: 'Universo 7K8F',     variants: ['A', 'B', 'C'] },
  { id: 'kl9b',     label: 'Universo KL9B',     variants: ['A', 'B', 'C'] },
]

export function getUniverseLabel(id, variant) {
  const u = UNIVERSES.find(u => u.id === id)
  if (!u) return null
  if (variant && u.variants.length > 0) return `${u.label} — ${variant}`
  return u.label
}
