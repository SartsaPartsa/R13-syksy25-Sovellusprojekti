import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/useUser'

// Protect routes: only render nested routes when user is authenticated.
// If not authenticated, redirect to "/login" and save the current location
// so the app can navigate back after successful login.
export default function ProtectedRoute() {
  const { isAuthenticated } = useUser()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Render child routes when authenticated
  return <Outlet />
}
