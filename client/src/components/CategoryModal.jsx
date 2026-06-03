import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { createCategory } from '../lib/db'

const ICON_OPTIONS = [
  '📁','🌐','🗺️','🏔️','🌊','🌿','🔥','❄️','⚡','🌙','☀️','⭐',
  '👑','🗡️','🛡️','⚔️','🏹','🔮','📜','📚','🔬','🧬','💊','🏗️',
  '🚂','✈️','🚢','🏛️','🏰','🕌','⛪','🏟️','🏦','🏭','🌆','🌉',
  '👥','🤝','💼','🎭','🎨','🎵','🏆','🎯','💡','🔑','🗝️','📡',
  '💰','📈','⚙️','🔧','🛢️','⚛️','🧪','🌋','🏝️','🦁','🦅','🐉',
]

export default function CategoryModal({ onClose, onCreated }) {
  const [name, setName]   = useState('')
  const [icon, setIcon]   = useState('📁')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return alert('Nome é obrigatório.')
    setSaving(true)
    const id = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    try {
      await createCategory({ id, label: name.trim(), icon })
      onCreated({ id, label: name.trim(), icon })
      onClose()
    } catch {
      alert('Erro ao criar categoria.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-ink-900 border border-ink-700/60 rounded-2xl w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-ink-50">Nova categoria</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Nome */}
          <div>
            <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-2">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Mitologia, Tecnologia..."
              className="w-full bg-ink-800 border border-ink-700/50 rounded-lg px-4 py-2.5 text-ink-100 placeholder-ink-600 focus:outline-none focus:border-amber-500/50"
              autoFocus
            />
          </div>

          {/* Ícone */}
          <div>
            <label className="block text-xs font-mono text-ink-500 uppercase tracking-wider mb-2">
              Ícone — selecionado: <span className="text-base">{icon}</span>
            </label>
            <div className="grid grid-cols-10 gap-1 max-h-40 overflow-y-auto bg-ink-800/50 rounded-xl p-2 border border-ink-700/30">
              {ICON_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-xl p-1.5 rounded-lg transition-all ${
                    icon === emoji
                      ? 'bg-amber-500/20 ring-1 ring-amber-500/50'
                      : 'hover:bg-ink-700/60'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-ink-800/40 rounded-lg border border-ink-700/30">
            <span className="text-xl">{icon}</span>
            <span className="text-sm text-ink-300">{name || 'Nome da categoria'}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            <Plus size={15} />
            {saving ? 'Criando...' : 'Criar categoria'}
          </button>
        </div>
      </div>
    </div>
  )
}
