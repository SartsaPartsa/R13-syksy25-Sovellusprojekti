import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import Footer from '../components/Footer'

// App shell: navbar, page outlet, footer
export default function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-gray-900 text-slate-200">
      {/* Navbar */}
      <Navbar />

      {/* Page content */}
      <main className="flex-1 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
