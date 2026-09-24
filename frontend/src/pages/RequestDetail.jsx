import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Download, FileText, Save } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import { getRequestDetail, updatePrescription } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import RequestActionPanel from '../components/RequestActionPanel'
import Topbar from '../components/Topbar'
import CTScanViewer from '../components/CTScanViewer'
import { addReportImages } from '../utils/generateReportPdf'

const STATUS_LABELS = { pending: 'Pending', uploaded: 'Uploaded', reviewed: 'Reviewed' }

function assetUrl(apiBase, path) {
  if (!path) return ''
  return `${apiBase.replace(/\/+$/, '')}/${path.replaceAll('\\', '/')}`
}

function RequestDetail({ reportView = false }) {
  const { requestId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [prescription, setPrescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    try {
      const detail = await getRequestDetail(requestId)
      setData(detail)
      setPrescription(detail.prescription || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [requestId])

  async function savePrescription(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updatePrescription(requestId, prescription)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function downloadReport() {
    if (!data) return
    const doc = new jsPDF()
    const prediction = data.prediction !== null ? `${(data.prediction * 100).toFixed(1)}%` : 'Pending'
    doc.setFontSize(16)
    doc.text('PANCREAAI PDAC Detection - Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Request ID: ${data.id}`, 14, 32)
    doc.text(`Status: ${STATUS_LABELS[data.status] || data.status}`, 14, 38)
    doc.text(`Patient: ${data.patient?.name || 'N/A'} (Age ${data.patient?.age ?? '-'}, ${data.patient?.sex ?? '-'})`, 14, 44)
    doc.text(`Referral pathway: ${data.referral_pathway || '-'}`, 14, 56)
    doc.setFontSize(12)
    doc.text(`AI Prediction (PDAC likelihood): ${prediction}`, 14, 68)
    doc.setFontSize(10)
    doc.text('Radiologist notes:', 14, 80)
    const notes = doc.splitTextToSize(data.radiologist_notes || 'No notes recorded.', 180)
    doc.text(notes, 14, 86)
    const prescriptionY = 86 + notes.length * 5 + 10
    doc.text('Doctor prescription:', 14, prescriptionY)
    doc.text(doc.splitTextToSize(data.prescription || 'No prescription recorded.', 180), 14, prescriptionY + 6)
    doc.setFontSize(8)
    doc.text('Clinical decision support output. Not an autonomous diagnosis.', 14, 280)
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      doc.addPage()
      await addReportImages(doc, data, apiBase, 20)
    } catch (err) {
      setError(err.message)
      return
    }
    doc.save(`${data.id}_report.pdf`)
  }

  function handleNavigate(key) {
    if (key === 'dashboard') navigate(user?.role === 'doctor' ? '/doctor' : '/radiologist')
    if (key === 'upload') navigate('/upload-analysis')
    if (key === 'patients') navigate('/doctor?section=patients')
    if (key === 'requests') navigate('/requests')
    if (key === 'reports') navigate('/reports')
  }

  const reviewed = data?.status === 'reviewed'
  const isPdac = data?.prediction !== null && data?.prediction >= 0.697

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <Sidebar role={user?.role} activeKey={reportView ? 'reports' : 'requests'} onNavigate={handleNavigate} />
      <main className="h-screen min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Topbar title={reportView ? 'Reports' : 'Scan Requests'} user={user} />

        <div className="p-8">
          <Link
            to={reportView ? '/reports' : '/requests'}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent"
          >
            <ArrowLeft size={16} /> {reportView ? 'Back to reports' : 'Back to scan requests'}
          </Link>

          <div className="max-w-4xl mx-auto">
            {loading && <p className="mt-8 text-sm text-text-muted">Loading request...</p>}

            {error && (
              <p className="mt-6 rounded-lg bg-flag-positive-bg px-3 py-2 text-sm text-flag-positive">
                {error}
              </p>
            )}

            {data && (
              <div className="mt-6 space-y-5">

                <section className="rounded-[14px] border border-border bg-panel p-6 shadow-[0_10px_28px_rgba(26,52,73,0.06)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[1.35px] text-text-muted font-bold">
                        Patient request
                      </p>
                      <h2 className="font-display text-2xl font-extrabold mt-2">
                        {data.patient?.name || 'Patient record'}
                      </h2>
                      <p className="mt-1 text-xs font-mono text-text-muted">
                        {data.id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        reviewed
                          ? 'border-flag-negative/30 bg-flag-negative-bg text-flag-negative'
                          : 'border-border bg-bg text-text-muted'
                      }`}
                    >
                      {STATUS_LABELS[data.status] || data.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-text-muted">Age / sex</p>
                      <p className="mt-1 font-medium">
                        {data.patient?.age ?? '—'}y / {data.patient?.sex || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-text-muted">Created</p>
                      <p className="mt-1 font-medium">
                        {data.created_at ? new Date(data.created_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-text-muted">Completed</p>
                      <p className="mt-1 font-medium">
                        {data.completed_at ? new Date(data.completed_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                </section>

                {(() => {
                  const hasAnalysis = data.status === 'uploaded' || data.status === 'reviewed'
                  const isRadiologist = user?.role === 'radiologist'
                  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
                  const confidenceText =
                    data.confidence_label === 'borderline'
                      ? 'Borderline — close to the decision threshold, review carefully'
                      : data.confidence_label === 'moderate'
                        ? 'Moderate confidence'
                        : 'High confidence'

                  return (
                    <>
                      {hasAnalysis && (reviewed || isRadiologist) && (
                        <>
                          <section
                            className={`rounded-[14px] border p-6 shadow-[0_10px_28px_rgba(26,52,73,0.06)] ${
                              isPdac ? 'border-flag-positive/30 bg-flag-positive-bg' : 'border-flag-negative/30 bg-flag-negative-bg'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isPdac ? (
                                <span className="text-flag-positive text-2xl">!</span>
                              ) : (
                                <CheckCircle2 className="text-flag-negative" size={26} />
                              )}
                              <div>
                                <p className={`text-sm font-semibold ${isPdac ? 'text-flag-positive' : 'text-flag-negative'}`}>
                                  {isPdac ? 'PDAC likely' : 'PDAC unlikely'}
                                </p>
                                <p className="font-display text-3xl font-extrabold">
                                  {data.prediction !== null ? `${(data.prediction * 100).toFixed(1)}%` : '—'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/70">
                              <div
                                className={`h-full ${isPdac ? 'bg-flag-positive' : 'bg-flag-negative'}`}
                                style={{ width: `${(data.prediction || 0) * 100}%` }}
                              />
                            </div>
                            <p className="mt-3 text-xs text-text-muted">
                              AI prediction is clinical decision support and not an autonomous diagnosis.
                            </p>
                          </section>

                          <p className="text-xs text-text-muted -mt-2 mb-2">{confidenceText}</p>

                          <CTScanViewer ctSlices={data.ct_slices} apiBase={apiBase} />

                          {data.gradcam_path && (
                            <section className="rounded-[14px] border border-border bg-panel p-6">
                              <p className="text-sm font-semibold mb-3">Grad-CAM — model attention</p>
                              <img
                                src={assetUrl(apiBase, data.gradcam_path)}
                                alt="Grad-CAM"
                                className="rounded-lg border border-border max-w-sm mx-auto"
                              />
                            </section>
                          )}

                          {data.segmentation_path && (
                            <section className="rounded-[14px] border border-border bg-panel p-6">
                              <p className="text-sm font-semibold mb-3">Segmented pancreas boundary</p>
                              <img
                                src={assetUrl(apiBase, data.segmentation_path)}
                                alt="Segmentation"
                                className="rounded-lg border border-border max-w-sm mx-auto"
                              />
                            </section>
                          )}

                          {data.shap_explanation && (
                            <section className="rounded-[14px] border border-border bg-panel p-6">
                              <p className="text-sm font-semibold mb-3">What influenced this result</p>
                              <p className="text-sm leading-relaxed text-text">
                                {data.shap_explanation}
                              </p>

                              {data.shapValues && data.shapValues.length > 0 && (
                                <details className="mt-4 group">
                                  <summary className="cursor-pointer text-xs text-text-muted hover:text-accent select-none">
                                    Show technical details
                                  </summary>
                                  <div className="mt-3 space-y-1">
                                    {data.shapValues
                                      .slice()
                                      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                                      .slice(0, 5)
                                      .map((sv) => (
                                        <div
                                          key={sv.feature}
                                          className="flex justify-between text-xs py-1 border-b border-border/50 last:border-b-0"
                                        >
                                          <span className="text-text-muted">{sv.feature}</span>
                                          <span className={sv.value > 0 ? 'text-flag-positive' : 'text-flag-negative'}>
                                            {sv.value > 0 ? '+' : ''}{sv.value.toFixed(3)}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </details>
                              )}
                            </section>
                          )}
                        </>
                      )}

                      {reviewed && (
                        <>
                          <section className="rounded-[14px] border border-border bg-panel p-6 shadow-[0_10px_28px_rgba(26,52,73,0.06)]">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <CheckCircle2 size={17} className="text-flag-negative" /> Radiologist review
                            </div>
                            <p className="mt-3 text-sm whitespace-pre-wrap">
                              {data.radiologist_notes || 'No radiologist notes recorded.'}
                            </p>
                            <p className="mt-5 text-[10px] uppercase tracking-wide text-text-muted">Referral pathway</p>
                            <p className="mt-1 text-sm capitalize">{data.referral_pathway?.replace('-', ' ') || '—'}</p>
                          </section>

                          {user?.role === 'doctor' && (
                            <section className="rounded-[14px] border border-border bg-panel p-6 shadow-[0_10px_28px_rgba(26,52,73,0.06)]">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 text-sm font-semibold">
                                    <FileText size={17} className="text-accent" /> Doctor prescription
                                  </div>
                                  <p className="mt-1 text-xs text-text-muted">Saved on this request.</p>
                                </div>
                                {data.prescription && (
                                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">Attached</span>
                                )}
                              </div>
                              {reportView ? (
                                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-bg p-4 text-sm text-text-muted">
                                  {data.prescription || 'No prescription recorded.'}
                                </p>
                              ) : (
                                <form onSubmit={savePrescription} className="mt-4">
                                  <textarea
                                    required
                                    value={prescription}
                                    onChange={(event) => setPrescription(event.target.value)}
                                    placeholder="Medication, dosage, instructions, or follow-up plan..."
                                    className="min-h-32 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
                                  />
                                  <button
                                    type="submit"
                                    disabled={saving}
                                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
                                  >
                                    <Save size={15} /> {saving ? 'Saving...' : 'Save prescription'}
                                  </button>
                                </form>
                              )}
                            </section>
                          )}

                          {user?.role === 'doctor' && <button
                            type="button"
                            onClick={downloadReport}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-panel px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent-soft"
                          >
                            <Download size={16} /> Download report
                          </button>}
                        </>
                      )}

                      {isRadiologist && !reviewed && (
                        <RequestActionPanel request={data} onUpdate={load} />
                      )}

                      {!isRadiologist && !hasAnalysis && (
                        <section className="rounded-xl border border-border bg-panel p-6 text-sm text-text-muted">
                          The result and prescription will become available after radiologist review.
                        </section>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default RequestDetail