import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom' 
// imported react-router-dom to handle routing
import App from './App.jsx'
import LoginPage from './pages/LoginPage/LoginPage.jsx'
import Cleck from './pages/CleckPage/Cleck.jsx'
import AdministratorPage from './pages/AdministratorPage/AdministratorPage.jsx'
import MayorPage from './pages/MayorPage/MayorPage.jsx'
import SupervisorPage from './pages/SupervisorPage/SupervisorPage.jsx'
import AdminSecurity from './pages/adminSecurity/AdminSecurity.jsx'

const router = createBrowserRouter([
  {path: '/', element: <App />},
  {path: '/LoginPage', element: <LoginPage/>},
  {path: '/CleckPage', element: <Cleck/>},
  {path: '/AdministratorPage', element: <AdministratorPage/>},
  {path: '/MayorPage', element: <MayorPage/>},
  {path: '/SupervisorPage', element: <SupervisorPage/>},
  {path: '/AdminSecurity', element: <AdminSecurity/>},
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
