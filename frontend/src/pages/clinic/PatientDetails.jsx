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
    const [paymentPlans, setPaymentPlans] = useState([]); // Planes de financiamiento (Ortodoncia)

    // --- ESTADO HISTORIA CLÍNICA (NOM-004) ---
    const [medForm, setMedForm] = useState({
        enfermedades: '', medicamentos: '', anticonceptivos: '',
        neurologico: '', ta: '', fc: '', fr: '', temp: '',
        peso: '', talla: '', imc: '', diagnostico: '', tratamiento: '',
        heredofamiliares: ''
    });

    // --- MODALES ---
    const [showApptModal, setShowApptModal] = useState(false);
    const [newAppointment, setNewAppointment] = useState({ fecha: '', hora: '', motivo: '' });

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
            // 1. Cargar Paciente
            const resPatient = await client.get(`/pacientes/${id}`);
            setPatient(resPatient.data);

            // 2. Cargar Citas
            try {
                const resAppts = await client.get(`/citas/paciente/${id}`); // Ajustado a tu ruta probable
                setAppointments(resAppts.data);
            } catch (e) { console.log("Sin citas o ruta diferente", e); }

            // 3. Cargar Historia (NOM-004)
            try {
                const resHistory = await client.get(`/pacientes/${id}/historia-nom`);
                if (resHistory.data && resHistory.data.length > 0) {
                    const newFormState = { ...medForm };
                    resHistory.data.forEach(item => {
                        const key = item.clave.toLowerCase();
                        if (Object.keys(newFormState).includes(key)) {
                            newFormState[key] = item.valor;
                        }
                    });
                    setMedForm(newFormState);
                }
            } catch (e) { console.log("Historia vacía"); }

            // 4. Cargar Planes Financiamiento (NUEVO)
            try {
                const resPlanes = await client.get(`/finanzas/planes/paciente/${id}`);
                setPaymentPlans(resPlanes.data);
            } catch (e) { console.log("Sin planes financieros"); }

            // 5. Cargar Presupuestos
            try {
                const resBudgets = await client.get(`/clinica/presupuestos/paciente/${id}`);
                setBudgets(resBudgets.data);
            } catch (e) { console.log("Sin presupuestos"); }

        } catch (error) {
            console.error(error);
            toast.error("Error cargando expediente");
        } finally {
            setLoading(false);
        }
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
            await client.post('/clinica/citas', {
                patient_id: parseInt(id),
                doctor_id: 1, // Ajustar según usuario logueado
                fecha_hora: fechaISO,
                motivo: newAppointment.motivo
            });
            toast.success("Cita agendada");
            setShowApptModal(false);
            loadData();
        } catch (error) { toast.error("Error al agendar"); }
    };

    // --- MANEJADORES: FINANCIAMIENTO (NUEVO) ---
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

    if (loading) return <div className="p-10 text-center">Cargando expediente...</div>;
    if (!patient) return <div className="p-10 text-center text-red-500">Paciente no encontrado</div>;

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-blue-50 rounded-full flex items-center justify-center text-teal-700 font-bold text-2xl border-2 border-white shadow-sm">
                        {patient.nombre.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{patient.nombre} {patient.apellidos}</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <UserCircleIcon className="w-4 h-4" /> Expediente #{patient.id}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowApptModal(true)} className="bg-primary hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow flex items-center gap-2">
                        <PlusIcon className="w-4 h-4" /> Nueva Cita
                    </button>
                </div>
            </div>

            {/* TABS NAVEGACIÓN */}
            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                <button onClick={() => setActiveTab('historia')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'historia' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
                    <DocumentTextIcon className="w-4 h-4" /> Historia Clínica
                </button>
                <button onClick={() => setActiveTab('citas')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'citas' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
                    <CalendarIcon className="w-4 h-4" /> Citas
                </button>
                <button onClick={() => setActiveTab('financiamiento')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'financiamiento' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
                    <CreditCardIcon className="w-4 h-4" /> Financiamiento
                </button>
            </div>

            {/* --- CONTENIDO: HISTORIA CLÍNICA --- */}
            {activeTab === 'historia' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Formulario NOM-004 */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-2">Antecedentes y Signos Vitales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['enfermedades', 'medicamentos', 'anticonceptivos', 'neurologico', 'heredofamiliares'].map(field => (
                                <div key={field} className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">{field}</label>
                                    <input
                                        name={field}
                                        value={medForm[field]}
                                        onChange={handleHistoryChange}
                                        className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            ))}
                            {['ta', 'fc', 'fr', 'temp', 'peso', 'talla'].map(field => (
                                <div key={field}>
                                    <label className="text-xs font-bold text-gray-500 uppercase">{field}</label>
                                    <input
                                        name={field}
                                        value={medForm[field]}
                                        onChange={handleHistoryChange}
                                        className="w-full p-2 border rounded-lg bg-gray-50"
                                    />
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSaveHistory} className="w-full bg-gray-800 text-white py-2 rounded-lg font-bold hover:bg-black transition-colors">
                            Guardar Historia
                        </button>
                    </div>

                    {/* Odontograma (Visual) */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
                        <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Odontograma Actual</h3>
                        <div className="flex justify-center bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                            {/* Pasamos los tratamientos de todos los presupuestos para que los pinte */}
                            <Odontogram
                                mode="view"
                                treatments={budgets.flatMap(b => b.items || [])}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- CONTENIDO: CITAS --- */}
            {activeTab === 'citas' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Motivo</th>
                                <th className="px-6 py-3">Doctor</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {appointments.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-gray-400">No hay citas registradas</td></tr>
                            ) : appointments.map(appt => (
                                <tr key={appt.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">{new Date(appt.fecha_hora).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-medium">{appt.motivo}</td>
                                    <td className="px-6 py-4 text-gray-500">Dr. Asignado</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${appt.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                            {appt.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {appt.estado === 'pendiente' && (
                                            <button className="text-primary font-bold hover:underline">Iniciar Consulta</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- CONTENIDO: FINANCIAMIENTO (NUEVO) --- */}
            {activeTab === 'financiamiento' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div>
                            <h3 className="font-bold text-blue-900">Planes de Ortodoncia y Financiamiento</h3>
                            <p className="text-sm text-blue-700">Gestiona pagos a plazos (12, 18, 24 meses).</p>
                        </div>
                        <button
                            onClick={() => setShowPlanModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" /> Crear Nuevo Plan
                        </button>
                    </div>

                    {paymentPlans.map(plan => (
                        <div key={plan.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800">Plan #{plan.id} - {plan.estado}</p>
                                    <p className="text-xs text-gray-500">Deuda Original: ${plan.monto_total} | Saldo Pendiente: <span className="text-red-500 font-bold">${plan.saldo_pendiente}</span></p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">{plan.plazo_meses} Meses</span>
                                </div>
                            </div>
                            {/* Mensualidades */}
                            <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-xs text-gray-500 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2"># Pago</th>
                                            <th className="px-4 py-2">Vencimiento</th>
                                            <th className="px-4 py-2 text-right">Monto</th>
                                            <th className="px-4 py-2 text-center">Estado</th>
                                            <th className="px-4 py-2 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {plan.mensualidades.map(mes => (
                                            <tr key={mes.id}>
                                                <td className="px-4 py-2">{mes.numero_pago}</td>
                                                <td className="px-4 py-2">{new Date(mes.fecha_vencimiento).toLocaleDateString()}</td>
                                                <td className="px-4 py-2 text-right font-mono">${mes.monto.toFixed(2)}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${mes.estado === 'PAGADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                                                        {mes.estado}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    {mes.estado !== 'PAGADO' && (
                                                        <button onClick={() => handlePayInstallment(mes.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                                                            COBRAR
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">Nueva Cita</h3>
                        <form onSubmit={handleCreateAppointment} className="space-y-4">
                            <input type="date" required className="w-full border p-2 rounded" onChange={e => setNewAppointment({ ...newAppointment, fecha: e.target.value })} />
                            <input type="time" required className="w-full border p-2 rounded" onChange={e => setNewAppointment({ ...newAppointment, hora: e.target.value })} />
                            <input type="text" placeholder="Motivo" required className="w-full border p-2 rounded" onChange={e => setNewAppointment({ ...newAppointment, motivo: e.target.value })} />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowApptModal(false)} className="text-gray-500">Cancelar</button>
                                <button type="submit" className="bg-primary text-white px-4 py-2 rounded">Agendar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: NUEVO PLAN FINANCIAMIENTO --- */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">Nuevo Plan de Financiamiento</h3>
                        <form onSubmit={handleCreatePlan} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Presupuesto Base</label>
                                <select className="w-full border p-2 rounded" onChange={e => setNewPlan({ ...newPlan, budget_id: e.target.value })}>
                                    <option value="">-- Opcional --</option>
                                    {budgets.map(b => <option key={b.id} value={b.id}>#{b.id} - ${b.monto_total}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Monto ($)</label>
                                <input type="number" required className="w-full border p-2 rounded" onChange={e => setNewPlan({ ...newPlan, monto_total: e.target.value })} />
                            </div>
                            <div className="flex gap-2">
                                <div className="w-1/2">
                                    <label className="text-xs font-bold text-gray-500">Meses</label>
                                    <select className="w-full border p-2 rounded" value={newPlan.plazo_meses} onChange={e => setNewPlan({ ...newPlan, plazo_meses: e.target.value })}>
                                        <option value="3">3</option><option value="6">6</option><option value="12">12</option><option value="18">18</option><option value="24">24</option>
                                    </select>
                                </div>
                                <div className="w-1/2">
                                    <label className="text-xs font-bold text-gray-500">Día Corte</label>
                                    <input type="number" className="w-full border p-2 rounded" value={newPlan.dia_corte} onChange={e => setNewPlan({ ...newPlan, dia_corte: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowPlanModal(false)} className="text-gray-500">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PatientDetails;