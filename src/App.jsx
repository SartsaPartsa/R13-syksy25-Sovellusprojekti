import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import Movies from './pages/Movies'
import Theaters from './pages/Theaters'
import Favorites from './pages/Favorites'
import Groups from './pages/Groups'
import Account from './pages/Account'
import Search from './pages/Search.jsx'
import MovieDetails from './pages/MovieDetails.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="movies" element={<Movies />} />
        <Route path="theaters" element={<Theaters />} />
        <Route path="/search" element={<Search />} />
        <Route path="/movies/:id" element={<MovieDetails />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="favorites" element={<Favorites />} />
          <Route path="groups" element={<Groups />} />
          <Route path="account" element={<Account />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}