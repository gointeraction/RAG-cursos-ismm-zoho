import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CourseListPage from './pages/courses/CourseListPage'
import CourseCreatePage from './pages/courses/CourseCreatePage'

import ChatAssistantPage from './pages/ChatAssistantPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard/courses" replace />} />
            <Route path="courses" element={<CourseListPage />} />
            <Route path="courses/new" element={<CourseCreatePage />} />
            <Route path="chat" element={<ChatAssistantPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

