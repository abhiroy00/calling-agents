import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../features/auth/authSlice'

export default function Topbar() {
  const user = useSelector((s) => s.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <header className="h-12 border-b border-gray-200 bg-white flex items-center justify-end px-6 gap-4">
      {user && <span className="text-sm text-gray-600">{user.name}</span>}
      <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
    </header>
  )
}
