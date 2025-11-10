import usePixelStore from '../store/usePixelStore'

export default function Palette() {
  const palette = usePixelStore(s => s.palette)
  const selected = usePixelStore(s => s.selected)
  const setSelected = usePixelStore(s => s.setSelected)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-sky-200/80">当前颜色</span>
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-2xl border border-white/10 shadow-inner shadow-slate-950/60"
            style={{ backgroundColor: palette[selected] }}
          />
          <div className="text-xs text-slate-300/80">{palette[selected]}</div>
        </div>
      </div>
      <div className="grid grid-cols-8 gap-2">
        {palette.map((c, i) => (
          <button
            key={i}
            className={`relative h-9 w-9 rounded-xl border transition duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400/70 ${
              i === selected
                ? 'border-white/90 shadow-lg shadow-slate-900/60'
                : 'border-white/10 hover:-translate-y-0.5 hover:border-sky-300/50 hover:shadow-lg hover:shadow-slate-900/60'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => setSelected(i)}
            aria-label={`选择颜色 ${i}`}
            title={`选择颜色 ${i}`}
          >
            {i === selected && <span className="absolute inset-1 rounded-lg border border-white/70" />}
          </button>
        ))}
      </div>
    </div>
  )
}
