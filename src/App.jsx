import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Movies from './pages/Movies'
import Theaters from './pages/Theaters'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="movies" element={<Movies />} />
        <Route path="theaters" element={<Theaters />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}