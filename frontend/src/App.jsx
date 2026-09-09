import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import DoctorDashboard from './pages/DoctorDashboard'
import RadiologistDashboard from './pages/RadiologistDashboard'
import RequestReport from './pages/RequestReport'
import Notifications from './pages/Notifications'
import ScanRequests from './pages/ScanRequests'
import Reports from './pages/Reports'
import RequestDetail from './pages/RequestDetail'
import UploadAnalysis from './pages/UploadAnalysis'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/doctor" element={<ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/radiologist" element={<ProtectedRoute allowedRole="radiologist"><RadiologistDashboard /></ProtectedRoute>} />
          <Route path="/upload-analysis" element={<ProtectedRoute allowedRole="radiologist"><UploadAnalysis /></ProtectedRoute>} />
          <Route path="/case/:caseId" element={<ProtectedRoute><RequestReport /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><ScanRequests /></ProtectedRoute>} />
          <Route path="/requests/:requestId" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/reports/:requestId" element={<ProtectedRoute><RequestDetail reportView /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App