import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { jwtDecode } from "jwt-decode";

// --- PÁGINAS ---
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import Tenants from './pages/backoffice/Tenants';
import Finance from './pages/clinic/Finance';
import Patients from './pages/clinic/Patients';
import Agenda from './pages/clinic/Agenda';
import Inventory from './pages/clinic/Inventory';
import PatientDetails from './pages/clinic/PatientDetails';
import Settings from './pages/clinic/Settings';
import Consultation from './pages/clinic/Consultation';
import Dashboard from './pages/dashboard';

// --- COMPONENTES ---
import Sidebar from './components/Sidebar';
import SuperSidebar from './components/SuperSidebar';

// --- LAYOUT CLÍNICA (DOCTORES) ---
const ClinicLayout = () => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;

  try {
    const user = jwtDecode(token);
    if (user.role === 'super_admin') return <Navigate to="/backoffice" />;
  } catch (e) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};

// --- LAYOUT BACKOFFICE (SUPER ADMIN) ---
const BackofficeLayout = () => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;

  try {
    const user = jwtDecode(token);
    if (user.role !== 'super_admin') return <Navigate to="/dashboard" />;
  } catch (e) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <SuperSidebar />
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Rutas Clínica */}
        <Route path="/dashboard" element={<ClinicLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="agenda" element={<Agenda />} />

          {/* Módulo Pacientes */}
          <Route path="pacientes" element={<Patients />} />
          <Route path="pacientes/:id" element={<PatientDetails />} />

          {/* RUTA DE CONSULTA (LA QUE FALTABA) */}
          <Route path="consulta/:appointmentId" element={<Consultation />} />
          <Route path="configuracion" element={<Settings />} />
          <Route path="finanzas" element={<Finance />} />
          <Route path="inventario" element={<Inventory />} />
        </Route>

        {/* Rutas Super Admin */}
        <Route path="/backoffice" element={<BackofficeLayout />}>
          <Route index element={<div className="text-2xl font-bold">Bienvenido Master</div>} />
          <Route path="clinicas" element={<Tenants />} />
          <Route path="planes" element={<div>Planes</div>} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;