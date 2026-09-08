const API_BASE = 'http://localhost:8000/api'

function extractErrorMessage(body) {
  if (Array.isArray(body.detail)) return body.detail.map((e) => e.msg).join(', ')
  return body.detail || 'Something went wrong'
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export async function registerUser(data) { /* unchanged from before */
  const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function loginUser(data) { /* unchanged from before */
  const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function addPatient(data) {
  const res = await fetch(`${API_BASE}/patients/`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function listMyPatients() {
  const res = await fetch(`${API_BASE}/patients/`, { headers: authHeaders() })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function createRequest(data) {
  const res = await fetch(`${API_BASE}/requests/`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function listMyRequests() {
  const res = await fetch(`${API_BASE}/requests/mine`, { headers: authHeaders() })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function getRequestDetail(requestId) {
  const res = await fetch(`${API_BASE}/requests/${requestId}`, { headers: authHeaders() })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function claimRequest(requestId) {
  const res = await fetch(`${API_BASE}/requests/${requestId}/claim`, { method: 'PATCH', headers: authHeaders() })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function uploadCT(requestId, file, scanner) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('scanner', scanner)
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}/upload/${requestId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // no Content-Type - browser sets multipart boundary automatically
    body: formData,
  })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}

export async function completeRequest(requestId, notes, referralPathway) {
  const res = await fetch(`${API_BASE}/requests/${requestId}/complete`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ notes, referral_pathway: referralPathway }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(body))
  return body
}