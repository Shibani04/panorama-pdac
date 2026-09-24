import { useState } from 'react'

function CTScanViewer({ ctSlices, apiBase }) {
  const [idx, setIdx] = useState(ctSlices?.mid_slice ?? 0)
  if (!ctSlices) return null
  const basePath = ctSlices.base_path.replaceAll('\\', '/').replace(/\/+$/, '')
  const imageUrl = `${apiBase.replace(/\/+$/, '')}/${basePath}/slice_${idx}.png`

  return (
    <div className="rounded-[14px] border border-border bg-panel p-6">
      <p className="text-sm font-semibold mb-3">CT scan (preprocessed)</p>
      <img
        src={imageUrl}
        alt={`CT slice ${idx}`}
        className="rounded-lg border border-border max-w-sm mx-auto"
      />
      <input
        type="range" min={0} max={ctSlices.n_slices - 1} value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        className="w-full max-w-sm mt-3"
      />
      <p className="text-xs text-text-muted text-center mt-1">Slice {idx + 1} / {ctSlices.n_slices}</p>
    </div>
  )
}
export default CTScanViewer