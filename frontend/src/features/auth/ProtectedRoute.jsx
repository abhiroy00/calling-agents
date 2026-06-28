import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const token = useSelector((s) => s.auth.token)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
