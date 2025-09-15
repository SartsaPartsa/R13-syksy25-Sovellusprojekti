import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import Login from './pages/Login.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Reviews from './pages/Reviews.jsx'
import Theaters from './pages/Theaters.jsx'
import Favorites from './pages/Favorites.jsx'
import Groups from './pages/Groups.jsx'
import Account from './pages/Account.jsx'
import Search from './pages/Search.jsx'
import MovieDetails from './pages/MovieDetails.jsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ChangePassword from './pages/ChangePassword.jsx'
import GroupPage from './pages/GroupPage'

export default function App() {
  return (
    <>
     <ToastContainer
        position="top-center"
        autoClose={3000}
        theme="light"
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        limit={3}             
      />
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="movies" element={<Reviews />} />
        <Route path="theaters" element={<Theaters />} />
        <Route path="/search" element={<Search />} />
        <Route path="/movies/:id" element={<MovieDetails />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="favorites" element={<Favorites />} />
          <Route path="groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupPage />} />
          <Route path="account" element={<Account />} />
          <Route path="account/password" element={<ChangePassword />} /> 
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  )
}