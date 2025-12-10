import { useEffect, useState } from 'react';
// CORRECCIÓN: Usamos ruta relativa (un nivel arriba)
import client from '../api/axios';
import {
    BanknotesIcon, UsersIcon, CalendarDaysIcon,
    ClockIcon, ArrowTrendingUpIcon, CurrencyDollarIcon,
    PlusIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';

const DashboardHome = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        incomeToday: 0,
        appointmentsToday: 0,
        pendingCount: 0,
        receivableAmount: 0,
        totalPatients: 0,
        nextAppointment: null
    });
    const [recentSales, setRecentSales] = useState([]);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];

                // Carga paralela de datos para velocidad
                const [resAgenda, resVentas, resPendientes, resPacientes] = await Promise.all([
                    client.get(`/clinica/agenda?start_date=${today}&end_date=${today}`), // Citas de HOY
                    client.get(`/finanzas/reporte-ventas?start_date=${today}&end_date=${today}`), // Ventas de HOY
                    client.get('/finanzas/caja/pendientes'), // Deuda pendiente total
                    client.get('/pacientes/') // Total pacientes
                ]);

                // Cálculos
                const appointments = resAgenda.data;
                const sales = resVentas.data;
                const pending = resPendientes.data;

                // --- CORRECCIÓN DE FECHA (Parseo Local) ---
                const parseLocal = (dateStr) => {
                    if (!dateStr) return new Date(0);
                    const parts = dateStr.split(/[-T:]/);
                    // new Date(year, monthIndex, day, hours, minutes)
                    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]);
                };

                const now = new Date();

                // Buscar la próxima cita pendiente usando la hora REAL
                const upcoming = appointments
                    .filter(a => a.estado !== 'Finalizada' && a.estado !== 'Cancelada')
                    .sort((a, b) => parseLocal(a.fecha_hora) - parseLocal(b.fecha_hora))
                    .find(a => parseLocal(a.fecha_hora) > now) || null;
                // ------------------------------------------

                setStats({
                    incomeToday: sales.reduce((sum, item) => sum + item.monto, 0),
                    appointmentsToday: appointments.length,
                    pendingCount: pending.length,
                    receivableAmount: pending.reduce((sum, item) => sum + item.monto_total, 0),
                    totalPatients: resPacientes.data.length,
                    nextAppointment: upcoming
                });

                setRecentSales(sales.slice(0, 5)); // Últimas 5 ventas

            } catch (error) {
                console.error("Error cargando dashboard", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    const KpiCard = ({ title, value, icon: Icon, color, subtext }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-extrabold text-gray-800 mt-1">{value}</p>
                {subtext && <p className={`text-xs font-medium mt-1 ${color.text}`}>{subtext}</p>}
            </div>
            <div className={`p-4 rounded-xl ${color.bg} ${color.text}`}>
                <Icon className="w-8 h-8" />
            </div>
        </div>
    );

    if (loading) return <div className="p-10 text-center text-gray-400 animate-pulse">Cargando centro de control...</div>;

    return (
        <div className="space-y-8 animate-fade-in">

            {/* HEADER DE BIENVENIDA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Hola, Doctor 👋</h1>
                    <p className="text-gray-500">Aquí tienes el resumen de tu clínica hoy.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/dashboard/agenda')} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm  hover:bg-gray-100 flex items-center">
                        <CalendarDaysIcon className="w-5 h-5 mr-2 text-gray-400" /> Ver Agenda
                    </button>
                    <button onClick={() => navigate('/dashboard/pacientes')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-teal-700 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" /> Nuevo Paciente
                    </button>
                </div>
            </div>

            {/* GRID DE KPIS (INDICADORES CLAVE) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Ingresos Hoy"
                    value={`$${stats.incomeToday.toLocaleString()}`}
                    icon={BanknotesIcon}
                    color={{ bg: 'bg-green-100', text: 'text-green-600' }}
                    subtext="+12% vs ayer" // Simulado para efecto visual
                />
                <KpiCard
                    title="Citas Hoy"
                    value={stats.appointmentsToday}
                    icon={CalendarDaysIcon}
                    color={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
                    subtext="Agenda al 80%"
                />
                <KpiCard
                    title="Por Cobrar"
                    value={`$${stats.receivableAmount.toLocaleString()}`}
                    icon={CurrencyDollarIcon}
                    color={{ bg: 'bg-orange-100', text: 'text-orange-600' }}
                    subtext={`${stats.pendingCount} cuentas pendientes`}
                />
                <KpiCard
                    title="Pacientes Activos"
                    value={stats.totalPatients}
                    icon={UsersIcon}
                    color={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
                    subtext="Total histórico"
                />
            </div>

            {/* SECCIÓN PRINCIPAL DIVIDIDA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUMNA IZQUIERDA (2/3): PRÓXIMA CITA Y GRÁFICA */}
                <div className="lg:col-span-2 space-y-8">

                    {/* TARJETA PRÓXIMA CITA (HIGHLIGHT) */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">Siguiente en agenda</p>
                            {stats.nextAppointment ? (
                                <>
                                    {/* CORRECCIÓN VISUAL: Parseamos la fecha localmente al mostrarla */}
                                    <h2 className="text-2xl font-bold">
                                        {(() => {
                                            const parts = stats.nextAppointment.fecha_hora.split(/[-T:]/);
                                            const d = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]);
                                            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        })()} - Nombre de paciente: {stats.nextAppointment.patient_name}
                                    </h2>
                                    <p className="text-slate-300 mt-1">{stats.nextAppointment.motivo}</p>
                                    <button
                                        onClick={() => navigate(`/dashboard/consulta/${stats.nextAppointment.id}`)}
                                        className="mt-4 bg-white text-slate-900 px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors"
                                    >
                                        Iniciar Consulta Ahora
                                    </button>
                                </>
                            ) : (
                                <p className="text-xl font-bold text-slate-300">No hay más citas programadas hoy 🎉</p>
                            )}
                        </div>
                        <ClockIcon className="w-32 h-32 text-slate-700 absolute -right-4 -bottom-8 opacity-50" />
                    </div>

                    {/* TABLA DE ÚLTIMOS INGRESOS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Últimos Ingresos</h3>
                            <button onClick={() => navigate('/dashboard/finanzas')} className="text-primary text-xs font-bold hover:underline">Ver Todo</button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Hora</th>
                                    <th className="px-6 py-3 font-medium">Concepto</th>
                                    <th className="px-6 py-3 font-medium text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentSales.length === 0 ? (
                                    <tr><td colSpan="3" className="p-6 text-center text-gray-400">Sin movimientos hoy</td></tr>
                                ) : recentSales.map((sale, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 text-gray-600">{new Date(sale.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="px-6 py-3 font-medium text-gray-800">{sale.concepto} <span className="text-gray-400 font-normal">- {sale.paciente}</span></td>
                                        <td className="px-6 py-3 text-right font-bold text-green-600">+${sale.monto.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* COLUMNA DERECHA (1/3): ACCIONES RÁPIDAS Y RENDIMIENTO */}
                <div className="space-y-6">

                    {/* ACCESOS RÁPIDOS */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4">Accesos Rápidos</h3>
                        <div className="space-y-3">
                            <button onClick={() => navigate('/dashboard/agenda')} className="w-full flex items-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors font-medium">
                                <div className="bg-white p-2 rounded-lg mr-3 shadow-sm"><CalendarDaysIcon className="w-5 h-5" /></div>
                                Agendar Cita
                            </button>
                            <button onClick={() => navigate('/dashboard/finanzas')} className="w-full flex items-center p-3 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 transition-colors font-medium">
                                <div className="bg-white p-2 rounded-lg mr-3 shadow-sm"><CurrencyDollarIcon className="w-5 h-5" /></div>
                                Cobrar en Caja
                            </button>
                            <button onClick={() => navigate('/dashboard/pacientes')} className="w-full flex items-center p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors font-medium">
                                <div className="bg-white p-2 rounded-lg mr-3 shadow-sm"><MagnifyingGlassIcon className="w-5 h-5" /></div>
                                Buscar Paciente
                            </button>
                        </div>
                    </div>

                    {/* META SEMANAL (VISUAL SIMPLE) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-800">Meta Semanal</h3>
                            <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-3xl font-extrabold text-gray-800 mb-4">$12,500 <span className="text-sm font-normal text-gray-400">/ $20k</span></p>

                        {/* Barra de progreso CSS pura */}
                        <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                            <div className="bg-primary h-3 rounded-full" style={{ width: '62%' }}></div>
                        </div>
                        <p className="text-xs text-gray-500 text-right">62% Completado</p>
                    </div>

                </div>
            </div>
        </div >
    );
};

export default DashboardHome;