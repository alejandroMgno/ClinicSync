import React from 'react';
import {
  ChevronRightIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

function App() {
  const goToApp = () => {
    window.location.href = 'https://app.clinicsyncs.com';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-black text-indigo-600 tracking-tighter">
          CLINIC<span className="text-slate-800">SYNC</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-bold text-slate-500">
          <a href="#funciones" className="hover:text-indigo-600 transition-colors">Funciones</a>
          <a href="#seguridad" className="hover:text-indigo-600 transition-colors">Seguridad</a>
        </div>
        <button
          onClick={goToApp}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-indigo-600 transition-all active:scale-95"
        >
          Iniciar Sesión
        </button>
      </nav>

      {/* HERO SECTION */}
      <header className="pt-16 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 inline-block">
            Software Dental Inteligente
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8 leading-tight">
            Gestiona tu clínica con <br />
            <span className="text-indigo-600">precisión quirúrgica.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            La plataforma diseñada para odontólogos que buscan eficiencia.
            Expedientes NOM-004, finanzas automatizadas y agenda en la nube.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={goToApp}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all text-lg active:scale-95"
            >
              Comenzar ahora <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* SECCIÓN DE FUNCIONES */}
      <section id="funciones" className="py-20 bg-white rounded-t-[3rem] shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              Icon={CalendarDaysIcon}
              title="Agenda Inteligente"
              desc="Control total de citas y recordatorios para reducir el ausentismo de pacientes."
            />
            <FeatureCard
              Icon={DocumentTextIcon}
              title="Expediente Digital"
              desc="Notas SOAP y recetas electrónicas bajo la normativa NOM-004."
            />
            <FeatureCard
              Icon={ChartBarIcon}
              title="Finanzas Reales"
              desc="Presupuestos, planes de financiamiento y reportes de ingresos diarios."
            />
          </div>
        </div>
      </section>

      {/* SECCIÓN SEGURIDAD */}
      <section id="seguridad" className="py-20 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ShieldCheckIcon className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-4">Tus datos están protegidos</h2>
          <p className="text-slate-400 leading-relaxed">
            ClinicSync utiliza encriptación de grado bancario y cumple con los estándares
            de protección de datos médicos para tu tranquilidad y la de tus pacientes.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm font-medium">
            © 2026 CLINICSYNC. Potenciando la odontología moderna.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Componente auxiliar para las tarjetas
function FeatureCard({ Icon, title, desc }) {
  return (
    <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all group">
      <div className="bg-white w-12 h-12 rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
        <Icon className="w-6 h-6 text-indigo-600 group-hover:text-white" />
      </div>
      <h4 className="text-xl font-black mb-2 text-slate-800">{title}</h4>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

export default App;