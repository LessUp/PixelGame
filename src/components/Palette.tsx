import usePixelStore from '../store/usePixelStore'

export default function Palette() {
  const palette = usePixelStore(s => s.palette)
  const selected = usePixelStore(s => s.selected)
  const setSelected = usePixelStore(s => s.setSelected)

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-300">当前颜色</div>
      <div className="w-8 h-8 rounded border" style={{ backgroundColor: palette[selected] }} />
      <div className="grid grid-cols-8 gap-2 mt-2">
        {palette.map((c, i) => (
          <button
            key={i}
            className={
              'w-8 h-8 rounded border focus:outline-none focus:ring-2 focus:ring-white/60 ' +
              (i === selected ? 'ring-2 ring-white/80 border-white' : 'border-black/30')
            }
            style={{ backgroundColor: c }}
            onClick={() => setSelected(i)}
            aria-label={`选择颜色 ${i}`}
            title={`选择颜色 ${i}`}
          />
        ))}
      </div>
    </div>
  )
}
