import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import DoctorDashboard from './pages/DoctorDashboard'
import RadiologistDashboard from './pages/RadiologistDashboard'
import RequestReport from './pages/RequestReport'

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
          <Route path="/case/:caseId" element={<ProtectedRoute><RequestReport /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App