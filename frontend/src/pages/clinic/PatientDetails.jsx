import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import {
    ArrowLeftIcon, PlusIcon, CalendarIcon,
    ClockIcon, CheckCircleIcon,
    BanknotesIcon, DocumentTextIcon,
    PrinterIcon, PhotoIcon, CreditCardIcon, UserCircleIcon, CurrencyDollarIcon
} from '@heroicons/react/24/solid';
import Odontogram from '../../components/Odontogram';

const PatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- ESTADOS GLOBALES ---
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('historia'); // historia, citas, financiamiento

    // --- ESTADOS DE DATOS ---
    const [appointments, setAppointments] = useState([]);
    const [budgets, setBudgets] = useState([]); // Presupuestos normales
    const [paymentPlans, setPaymentPlans] = useState([]); // Planes de financiamiento

    // --- ESTADO HISTORIA CLÍNICA (NOM-004) ---
    const [medForm, setMedForm] = useState({
        enfermedades: '', medicamentos: '', anticonceptivos: '',
        neurologico: '', ta: '', fc: '', fr: '', temp: '',
        peso: '', talla: '', imc: '', diagnostico: '', tratamiento: '',
        heredofamiliares: ''
    });

    // --- MODALES ---
    const [showApptModal, setShowApptModal] = useState(false);
    const [newAppointment, setNewAppointment] = useState({ fecha: '', hora: '', motivo: '', duracion: 60 });

    const [showPlanModal, setShowPlanModal] = useState(false);
    const [newPlan, setNewPlan] = useState({
        monto_total: '', plazo_meses: 12, dia_corte: 5, budget_id: ''
    });

    // --- CARGA INICIAL ---
    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Cargar Paciente (y su historia si viene anidada)
            const resPatient = await client.get(`/pacientes/${id}`);
            setPatient(resPatient.data);

            // Intentar poblar historia clínica si viene en el paciente (optimización)
            if (resPatient.data.history && Array.isArray(resPatient.data.history)) {
                fillHistoryForm(resPatient.data.history);
            } else {
                // Si no viene anidada, intentar endpoint separado
                try {
                    const resHistory = await client.get(`/pacientes/${id}/historia-nom`);
                    fillHistoryForm(resHistory.data);
                } catch (e) { /* Silencio si no hay historia extra */ }
            }

            // 2. Cargar Citas (CORREGIDO)
            try {
                const resAppts = await client.get(`/paciente/${id}/citas`);
                setAppointments(resAppts.data);
            } catch (e) { console.log("Sin citas", e); }

            // 3. Cargar Planes Financiamiento (Si tienes el endpoint)
            try {
                const resPlanes = await client.get(`/finanzas/planes/paciente/${id}`);
                setPaymentPlans(resPlanes.data);
            } catch (e) { /* Ignorar si no hay módulo de planes aun */ }

            // 4. Cargar Presupuestos (RUTA CORREGIDA de /clinica a /finanzas)
            try {
                const resBudgets = await client.get(`/finanzas/presupuestos/paciente/${id}`);
                setBudgets(resBudgets.data);
            } catch (e) { console.log("Sin presupuestos", e); }

        } catch (error) {
            console.error(error);
            toast.error("Error cargando expediente");
        } finally {
            setLoading(false);
        }
    };

    // Helper para llenar el formulario de historia
    const fillHistoryForm = (data) => {
        if (!data || data.length === 0) return;
        const newFormState = { ...medForm };
        data.forEach(item => {
            const key = item.clave.toLowerCase();
            if (Object.keys(newFormState).includes(key)) {
                newFormState[key] = item.valor;
            }
        });
        setMedForm(newFormState);
    };

    // --- MANEJADORES: HISTORIA CLÍNICA ---
    const handleHistoryChange = (e) => {
        const { name, value } = e.target;
        setMedForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveHistory = async () => {
        const promises = [];
        Object.keys(medForm).forEach(key => {
            const payload = { tipo: 'historia_clinica', clave: key, valor: medForm[key], observaciones: '' };
            promises.push(client.post(`/pacientes/${id}/historia-nom`, payload));
        });
        try {
            await Promise.all(promises);
            toast.success("Historia Clínica Actualizada");
        } catch (error) { toast.error("Error al guardar historia"); }
    };

    // --- MANEJADORES: CITAS ---
    const handleCreateAppointment = async (e) => {
        e.preventDefault();
        try {
            const fechaISO = `${newAppointment.fecha}T${newAppointment.hora}:00`;
            // CORREGIDO: URL de /clinica/citas a /citas/
            await client.post('/citas/', {
                patient_id: parseInt(id),
                doctor_id: 1, // Puedes mejorar esto tomando el usuario actual
                fecha_hora: fechaISO,
                motivo: newAppointment.motivo,
                duracion_minutos: parseInt(newAppointment.duracion) || 60
            });
            toast.success("Cita agendada");
            setShowApptModal(false);
            loadData(); // Recargar para ver la nueva cita
        } catch (error) {
            console.error(error);
            toast.error("Error al agendar");
        }
    };

    // --- MANEJADORES: FINANCIAMIENTO ---
    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            await client.post('/finanzas/planes', {
                patient_id: parseInt(id),
                budget_id: newPlan.budget_id ? parseInt(newPlan.budget_id) : null,
                monto_total: parseFloat(newPlan.monto_total),
                plazo_meses: parseInt(newPlan.plazo_meses),
                dia_corte: parseInt(newPlan.dia_corte)
            });
            toast.success("Plan creado correctamente");
            setShowPlanModal(false);
            loadData();
        } catch (error) { toast.error("Error al crear plan"); }
    };

    const handlePayInstallment = async (installmentId) => {
        if (!window.confirm("¿Confirmar pago de esta mensualidad?")) return;
        try {
            await client.post(`/finanzas/planes/pagar/${installmentId}?metodo_pago=efectivo`);
            toast.success("Mensualidad pagada");
            loadData();
        } catch (error) { toast.error("Error al registrar pago"); }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Cargando expediente...</div>;
    if (!patient) return <div className="p-10 text-center text-red-500">Paciente no encontrado</div>;

    return (
        <div className="space-y-6 pb-20 animate-fade-in bg-slate-50 min-h-screen p-6">
            {/* HEADER */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-slate-500" />
                    </button>
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-50 rounded-full flex items-center justify-center text-indigo-700 font-bold text-2xl border-4 border-white shadow-sm">
                        {patient.nombre ? patient.nombre.charAt(0) : 'P'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{patient.nombre} {patient.apellidos}</h1>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <UserCircleIcon className="w-4 h-4" /> Expediente #{patient.id}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowApptModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow flex items-center gap-2 transition-transform active:scale-95">
                        <PlusIcon className="w-4 h-4" /> Nueva Cita
                    </button>
                </div>
            </div>

            {/* TABS NAVEGACIÓN */}
            <div className="flex gap-1 border-b border-slate-200 overflow-x-auto bg-white/50 backdrop-blur-sm sticky top-0 z-10 p-2 rounded-lg">
                <button onClick={() => setActiveTab('historia')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'historia' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>
                    <DocumentTextIcon className="w-4 h-4" /> Historia Clínica
                </button>
                <button onClick={() => setActiveTab('citas')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'citas' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>
                    <CalendarIcon className="w-4 h-4" /> Citas
                </button>
                <button onClick={() => setActiveTab('financiamiento')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'financiamiento' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>
                    <CreditCardIcon className="w-4 h-4" /> Financiamiento
                </button>
            </div>

            {/* --- CONTENIDO: HISTORIA CLÍNICA --- */}
            {activeTab === 'historia' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
                    {/* Formulario NOM-004 */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-indigo-500" /> Antecedentes y Signos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['enfermedades', 'medicamentos', 'anticonceptivos', 'neurologico', 'heredofamiliares'].map(field => (
                                <div key={field} className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">{field}</label>
                                    <input
                                        name={field}
                                        value={medForm[field]}
                                        onChange={handleHistoryChange}
                                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        placeholder={`Ingrese ${field}...`}
                                    />
                                </div>
                            ))}
                            {['ta', 'fc', 'fr', 'temp', 'peso', 'talla'].map(field => (
                                <div key={field}>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">{field}</label>
                                    <input
                                        name={field}
                                        value={medForm[field]}
                                        onChange={handleHistoryChange}
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-center font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSaveHistory} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200">
                            Guardar Cambios en Historia
                        </button>
                    </div>

                    {/* Odontograma (Visual) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                        <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">Odontograma Actual</h3>
                        <div className="flex justify-center bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                            <Odontogram
                                mode="view"
                                treatments={budgets.flatMap(b => b.items || [])}
                            />
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-4">Visualización basada en tratamientos presupuestados.</p>
                    </div>
                </div>
            )}

            {/* --- CONTENIDO: CITAS --- */}
            {activeTab === 'citas' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Historial de Visitas</h3>
                        <span className="text-xs bg-white border px-2 py-1 rounded-full text-slate-500">{appointments.length} registros</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Motivo</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {appointments.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-10 text-slate-400 italic">No hay citas registradas para este paciente.</td></tr>
                                ) : appointments.map(appt => (
                                    <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                                {new Date(appt.fecha_hora).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{appt.motivo}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${appt.estado === 'programada' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                appt.estado === 'en_proceso' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                    appt.estado === 'Finalizada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                        'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}>
                                                {appt.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Aquí podrías agregar lógica para ir al detalle de la cita */}
                                            <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">Ver Detalle</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- CONTENIDO: FINANCIAMIENTO --- */}
            {activeTab === 'financiamiento' && (
                <div className="space-y-6 animate-slide-up">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                        <div className="mb-4 md:mb-0">
                            <h3 className="font-bold text-blue-900 text-lg flex items-center gap-2">
                                <BanknotesIcon className="w-6 h-6 text-blue-600" /> Planes de Financiamiento
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">Gestiona pagos diferidos para tratamientos costosos (Ortodoncia, Implantes).</p>
                        </div>
                        <button
                            onClick={() => setShowPlanModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <PlusIcon className="w-5 h-5" /> Crear Nuevo Plan
                        </button>
                    </div>

                    {paymentPlans.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                            <CreditCardIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No hay planes de financiamiento activos.</p>
                        </div>
                    )}

                    {paymentPlans.map(plan => (
                        <div key={plan.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="font-bold text-slate-800 flex items-center gap-2">
                                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">#{plan.id}</span>
                                        Plan de Pagos
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Total: <span className="font-mono font-medium">${plan.monto_total}</span> |
                                        Pendiente: <span className="text-red-500 font-bold font-mono">${plan.saldo_pendiente}</span>
                                    </p>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full font-bold">
                                        {plan.plazo_meses} Meses
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white text-xs text-slate-400 font-bold uppercase sticky top-0 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-2 bg-slate-50"># Pago</th>
                                            <th className="px-4 py-2 bg-slate-50">Vencimiento</th>
                                            <th className="px-4 py-2 bg-slate-50 text-right">Monto</th>
                                            <th className="px-4 py-2 bg-slate-50 text-center">Estado</th>
                                            <th className="px-4 py-2 bg-slate-50 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {plan.mensualidades.map(mes => (
                                            <tr key={mes.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2 text-slate-600 font-medium">{mes.numero_pago}</td>
                                                <td className="px-4 py-2 text-slate-500">{new Date(mes.fecha_vencimiento).toLocaleDateString()}</td>
                                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-700">${mes.monto.toFixed(2)}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${mes.estado === 'PAGADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                        {mes.estado}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    {mes.estado !== 'PAGADO' && (
                                                        <button onClick={() => handlePayInstallment(mes.id)} className="text-[10px] bg-emerald-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-emerald-700 shadow-sm transition-colors">
                                                            REGISTRAR PAGO
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL: NUEVA CITA --- */}
            {showApptModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
                        <h3 className="font-bold text-xl mb-6 text-slate-800">Nueva Cita</h3>
                        <form onSubmit={handleCreateAppointment} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label>
                                    <input type="date" required className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" onChange={e => setNewAppointment({ ...newAppointment, fecha: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Hora</label>
                                    <input type="time" required className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" onChange={e => setNewAppointment({ ...newAppointment, hora: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Motivo de consulta</label>
                                <input type="text" placeholder="Ej. Dolor de muela, Limpieza..." required className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" onChange={e => setNewAppointment({ ...newAppointment, motivo: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowApptModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-200">Agendar Cita</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: NUEVO PLAN FINANCIAMIENTO --- */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
                        <h3 className="font-bold text-xl mb-6 text-slate-800">Nuevo Plan de Financiamiento</h3>
                        <form onSubmit={handleCreatePlan} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Presupuesto Base (Opcional)</label>
                                <select className="w-full border border-slate-300 p-2.5 rounded-lg" onChange={e => setNewPlan({ ...newPlan, budget_id: e.target.value })}>
                                    <option value="">-- Seleccionar Presupuesto --</option>
                                    {/* CORREGIDO: Ahora budgets se llena desde /finanzas y debería mostrar opciones */}
                                    {budgets.map(b => (
                                        <option key={b.id} value={b.id}>
                                            Presupuesto #{b.id} - ${b.monto_total}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1">Si seleccionas uno, vincularemos los pagos a este presupuesto.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Monto Total a Financiar ($)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                    <input type="number" required className="w-full border border-slate-300 p-2.5 pl-8 rounded-lg font-bold text-slate-700" onChange={e => setNewPlan({ ...newPlan, monto_total: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Plazo (Meses)</label>
                                    <select className="w-full border border-slate-300 p-2.5 rounded-lg" value={newPlan.plazo_meses} onChange={e => setNewPlan({ ...newPlan, plazo_meses: e.target.value })}>
                                        <option value="3">3 Meses</option>
                                        <option value="6">6 Meses</option>
                                        <option value="12">12 Meses</option>
                                        <option value="18">18 Meses</option>
                                        <option value="24">24 Meses</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Día de Corte</label>
                                    <input type="number" min="1" max="30" className="w-full border border-slate-300 p-2.5 rounded-lg" value={newPlan.dia_corte} onChange={e => setNewPlan({ ...newPlan, dia_corte: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-6">
                                <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-200">Crear Plan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PatientDetails;