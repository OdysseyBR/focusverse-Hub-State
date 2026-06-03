import { UNIVERSES } from '../lib/universes'

export default function UniverseSelector({ value, variant, onChange, onVariantChange }) {
  const selected = UNIVERSES.find(u => u.id === value) || UNIVERSES[0]

  return (
    <div className="space-y-3">
      <div>
        <label className="form-label">
          Universo Focusverse
        </label>
        <div className="flex flex-wrap gap-2">
          {UNIVERSES.map(u => (
            <button key={u.id} type="button"
              onClick={() => { onChange(u.id); onVariantChange('') }}
              className={`px-3 py-1.5 text-sm border rounded transition-all ${
                value === u.id
                  ? 'bg-wiki-navy/10 border-wiki-navy/40 text-wiki-navy font-semibold'
                  : 'border-wiki-border text-wiki-text-muted hover:border-wiki-navy/30 hover:text-wiki-navy'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {selected.variants.length > 0 && (
        <div>
          <label className="form-label">
            Variante
          </label>
          <div className="flex gap-2">
            {selected.variants.map(v => (
              <button key={v} type="button"
                onClick={() => onVariantChange(variant === v ? '' : v)}
                className={`w-10 h-10 text-sm border rounded font-bold transition-all ${
                  variant === v
                    ? 'bg-wiki-teal text-white border-wiki-teal'
                    : 'border-wiki-border text-wiki-text-muted hover:border-wiki-teal hover:text-wiki-teal'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-wiki-text-muted bg-wiki-bg-sidebar border border-wiki-border px-3 py-2">
        Classificação: <span className="font-semibold text-wiki-charcoal">
          {selected.label}{variant ? ` — ${variant}` : ''}
        </span>
      </div>
    </div>
  )
}
