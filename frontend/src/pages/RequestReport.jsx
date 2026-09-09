import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, AlertTriangle, CheckCircle2 } from 'lucide-react'
import jsPDF from 'jspdf'
import { getRequestDetail } from '../api/client'
import { useAuth } from '../context/AuthContext'
import RequestActionPanel from '../components/RequestActionPanel'

function RequestReport() {
  const { caseId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getRequestDetail(caseId).then(setData).catch((e) => setError(e.message))
  }, [caseId])

  function downloadPdf() {
    const doc = new jsPDF()
    const pred = data.prediction !== null ? `${(data.prediction * 100).toFixed(1)}%` : 'Pending'

    doc.setFontSize(16)
    doc.text('PANCREAAI PDAC Detection — Report', 14, 20)

    doc.setFontSize(10)
    doc.text(`Request ID: ${data.id}`, 14, 32)
    doc.text(`Status: ${data.status}`, 14, 38)
    doc.text(`Patient: ${data.patient?.name || 'N/A'}  (Age ${data.patient?.age ?? '—'}, ${data.patient?.sex ?? '—'})`, 14, 44)
    doc.text(`Scanner: ${data.scanner || '—'}`, 14, 50)
    doc.text(`Referral pathway: ${data.referral_pathway || '—'}`, 14, 56)

    doc.setFontSize(12)
    doc.text(`AI Prediction (PDAC likelihood): ${pred}`, 14, 68)

    doc.setFontSize(10)
    doc.text('Radiologist notes:', 14, 80)
    const notesLines = doc.splitTextToSize(data.radiologist_notes || 'No notes recorded.', 180)
    doc.text(notesLines, 14, 86)

    const prescriptionY = 86 + (notesLines.length * 5) + 10
    doc.text('Doctor prescription:', 14, prescriptionY)
    const prescriptionLines = doc.splitTextToSize(data.prescription || 'No prescription recorded.', 180)
    doc.text(prescriptionLines, 14, prescriptionY + 6)

    doc.setFontSize(8)
    doc.text(
      'This AI prediction is a clinical decision-support output and does not constitute an autonomous',
      14, 280
    )
    doc.text('medical diagnosis. Reviewed and confirmed by a qualified radiologist.', 14, 285)

    doc.save(`${data.id}_report.pdf`)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-sm text-flag-positive">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    )
  }

  const backTo = user?.role === 'doctor' ? '/doctor' : '/radiologist'
  const isPdac = data.prediction !== null && data.prediction >= 0.5

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 bg-panel/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to={backTo} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        {data.status === 'reviewed' && user?.role === 'doctor' && (
          <button
            onClick={downloadPdf}
            className="flex items-center gap-1.5 text-sm font-medium bg-text text-bg px-3 py-1.5 rounded"
          >
            <Download size={14} /> Download PDF
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="bg-panel border border-border rounded-xl shadow-[0_6px_20px_rgba(49,87,183,0.04)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold font-mono">{data.id}</h1>
            <span className={`text-xs px-2 py-0.5 rounded border ${data.status === 'reviewed' ? 'border-flag-negative bg-flag-negative-bg text-flag-negative' : 'bg-bg border-border text-text-muted'}`}>
              {data.status === 'reviewed' ? 'Reviewed' : data.status === 'pending' ? 'Pending' : 'Uploaded'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-mono text-text-muted uppercase tracking-wide mb-1">Patient</p>
              <p>{data.patient?.name || '—'}</p>
              <p className="text-text-muted">{data.patient?.age ?? '—'}y, {data.patient?.sex ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-text-muted uppercase tracking-wide mb-1">Scanner</p>
              <p>{data.scanner || '—'}</p>
            </div>
          </div>
        </div>

        {data.prediction !== null && (
          <div className={`border rounded-xl p-6 shadow-[0_6px_20px_rgba(49,87,183,0.04)] ${isPdac ? 'bg-flag-positive-bg border-flag-positive' : 'bg-flag-negative-bg border-flag-negative'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
              {isPdac ? (
                <AlertTriangle className="text-flag-positive" size={28} />
              ) : (
                <CheckCircle2 className="text-flag-negative" size={28} />
              )}
              <div>
                <p className={`text-sm font-medium ${isPdac ? 'text-flag-positive' : 'text-flag-negative'}`}>
                  {isPdac ? 'PDAC likely' : 'PDAC unlikely'}
                </p>
                <p className="text-2xl font-semibold">{(data.prediction * 100).toFixed(1)}%</p>
              </div>
              </div>
              <span className="text-xs font-mono uppercase tracking-wide">AI result</span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/70 overflow-hidden">
              <div className={`h-full ${isPdac ? 'bg-flag-positive' : 'bg-flag-negative'}`} style={{ width: `${data.prediction * 100}%` }} />
            </div>
            <p className="text-xs text-text-muted mt-3">
              AI prediction is a clinical decision-support output, not an autonomous diagnosis.
            </p>
          </div>
        )}

        {data.status === 'reviewed' && (
          <div className="bg-panel border border-border rounded-xl shadow-[0_6px_20px_rgba(49,87,183,0.04)] p-6">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-flag-negative">
              <CheckCircle2 size={17} /> Reviewed by radiologist
            </div>
            <p className="text-xs font-mono text-text-muted uppercase tracking-wide mb-2">
              Referral pathway
            </p>
            <p className="text-sm mb-4 capitalize">{data.referral_pathway?.replace('-', ' ') || '—'}</p>

            <p className="text-xs font-mono text-text-muted uppercase tracking-wide mb-2">
              Radiologist notes
            </p>
            <p className="text-sm whitespace-pre-wrap">{data.radiologist_notes || 'No notes recorded.'}</p>

            <p className="text-xs font-mono text-text-muted uppercase tracking-wide mb-2 mt-5">
              Doctor prescription
            </p>
            <p className="text-sm whitespace-pre-wrap">{data.prescription || 'No prescription recorded.'}</p>
          </div>
        )}

        {data.status !== 'reviewed' && (
        user?.role === 'radiologist' ? (
            <RequestActionPanel
            request={data}
            onUpdate={() => getRequestDetail(caseId).then(setData)}
            />
        ) : (
            <div className="bg-panel border border-border rounded-lg p-6">
            <p className="text-sm text-text-muted">
                {data.status === 'pending' ? 'Awaiting radiologist review.' : 'Analysis complete — awaiting radiologist sign-off.'}
            </p>
            </div>
        )
        )}
      </div>
    </div>
  )
}

export default RequestReport