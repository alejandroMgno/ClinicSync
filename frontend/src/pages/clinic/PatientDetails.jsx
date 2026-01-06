import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import {
    ArrowLeftIcon, PlusIcon, CalendarIcon,
    ClockIcon, CheckCircleIcon,
    BanknotesIcon, DocumentTextIcon,
    CreditCardIcon, UserCircleIcon,
    CurrencyDollarIcon, XCircleIcon, PrinterIcon
} from '@heroicons/react/24/solid';

const PatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- ESTADOS GLOBALES ---
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('historia');

    // --- ESTADOS DE DATOS ---
    const [appointments, setAppointments] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [paymentPlans, setPaymentPlans] = useState([]);
    const [payments, setPayments] = useState([]);

    // --- ESTADOS PARA DETALLE DE CONSULTA ---
    const [showConsultationModal, setShowConsultationModal] = useState(false);
    const [consultationDetail, setConsultationDetail] = useState(null);

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
    const [newPlan, setNewPlan] = useState({ monto_total: '', plazo_meses: 12, dia_corte: 5, budget_id: '' });

    // --- CARGA INICIAL ---
    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const resPatient = await client.get(`/pacientes/${id}`);
            setPatient(resPatient.data);

            if (resPatient.data.history && Array.isArray(resPatient.data.history)) {
                fillHistoryForm(resPatient.data.history);
            } else {
                try {
                    const resHistory = await client.get(`/pacientes/${id}/historia-nom`);
                    fillHistoryForm(resHistory.data);
                } catch (e) { }
            }

            const resAppts = await client.get(`/citas/paciente/${id}`);
            setAppointments(resAppts.data);

            const resPlanes = await client.get(`/finanzas/planes/paciente/${id}`).catch(() => ({ data: [] }));
            setPaymentPlans(resPlanes.data);

            const resBudgets = await client.get(`/finanzas/presupuestos/paciente/${id}`).catch(() => ({ data: [] }));
            setBudgets(resBudgets.data);

            const resPagos = await client.get(`/finanzas/pagos/paciente/${id}`).catch(() => ({ data: [] }));
            setPayments(resPagos.data);

        } catch (error) {
            console.error(error);
            toast.error("Error cargando expediente");
        } finally {
            setLoading(false);
        }
    };

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

    // --- FUNCIONES DE CONSULTA Y RECETA ---
    const handleViewConsultation = async (citaId) => {
        try {
            toast.loading("Obteniendo detalles...");
            const res = await client.get(`/clinica/citas/${citaId}/completa`);
            const resPrint = await client.get(`/clinica/citas/${citaId}/datos-impresion`);

            setConsultationDetail({
                ...res.data,
                ...resPrint.data,
                citaId: citaId
            });
            toast.dismiss();
            setShowConsultationModal(true);
        } catch (error) {
            toast.dismiss();
            toast.error("No se encontró información de esta consulta");
        }
    };

    const handlePrintPrescription = () => {
        const doc = consultationDetail;
        const w = window.open('', '', 'height=600,width=800');
        w.document.write(`
            <html>
                <head><title>Receta - ${doc.paciente.nombre}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; }
                    .header { text-align: center; border-bottom: 2px solid #4f46e5; margin-bottom: 20px; }
                    .meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .content { min-height: 300px; white-space: pre-wrap; border: 1px solid #eee; padding: 20px; }
                </style></head>
                <body>
                    <div class="header">
                        <h1>${doc.clinica.nombre}</h1>
                        <p>Dr. ${doc.doctor.nombre} | Cédula: ${doc.doctor.cedula}</p>
                    </div>
                    <div class="meta">
                        <span>Paciente: ${doc.paciente.nombre}</span>
                        <span>Fecha: ${new Date().toLocaleDateString()}</span>
                    </div>
                    <div class="content">Rx:<br/>${doc.receta}</div>
                </body>
            </html>
        `);
        w.document.close();
        w.print();
    };

    // --- MANEJADORES ---
    const updateAppointmentStatus = async (citaId, nuevoEstado) => {
        try {
            await client.put(`/citas/${citaId}/status`, { estado: nuevoEstado });
            toast.success(`Cita ${nuevoEstado}`);
            loadData();
        } catch (error) {
            toast.error("Error al actualizar estado");
        }
    };

    const handleHistoryChange = (e) => {
        const { name, value } = e.target;
        setMedForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveHistory = async () => {
        const promises = Object.keys(medForm).map(key => {
            const payload = { tipo: 'historia_clinica', clave: key, valor: medForm[key], observaciones: '' };
            return client.post(`/pacientes/${id}/historia-nom`, payload);
        });
        try {
            await Promise.all(promises);
            toast.success("Historia Clínica Actualizada");
        } catch (error) { toast.error("Error al guardar"); }
    };

    const handleCreateAppointment = async (e) => {
        e.preventDefault();
        try {
            const fechaISO = `${newAppointment.fecha}T${newAppointment.hora}:00`;
            await client.post('/citas/', {
                patient_id: parseInt(id),
                doctor_id: 1,
                fecha_hora: fechaISO,
                motivo: newAppointment.motivo,
                duracion_minutos: parseInt(newAppointment.duracion) || 60
            });
            toast.success("Cita agendada");
            setShowApptModal(false);
            loadData();
        } catch (error) { toast.error("Error al agendar"); }
    };

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
            toast.success("Plan creado");
            setShowPlanModal(false);
            loadData();
        } catch (error) { toast.error("Error al crear plan"); }
    };

    const handlePayInstallment = async (installmentId) => {
        if (!window.confirm("¿Confirmar pago?")) return;
        try {
            await client.post(`/finanzas/planes/pagar/${installmentId}?metodo_pago=efectivo`);
            toast.success("Pagado");
            loadData();
        } catch (error) { toast.error("Error"); }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Cargando expediente...</div>;

    return (
        <div className="space-y-6 pb-20 animate-fade-in bg-slate-50 min-h-screen p-6">
            {/* HEADER */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-slate-500" />
                    </button>
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-50 rounded-full flex items-center justify-center text-indigo-700 font-bold text-2xl border-white shadow-sm">
                        {patient.nombre?.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{patient.nombre} {patient.apellidos}</h1>
                        <p className="text-sm text-slate-500 flex items-center gap-2"><UserCircleIcon className="w-4 h-4" /> Expediente #{patient.id}</p>
                    </div>
                </div>
                <button onClick={() => setShowApptModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow flex items-center gap-2 transition-transform active:scale-95">
                    <PlusIcon className="w-4 h-4" /> Nueva Cita
                </button>
            </div>

            {/* TABS */}
            <div className="flex gap-1 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 p-2 rounded-lg">
                <button onClick={() => setActiveTab('historia')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'historia' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500'}`}>Historia Clínica</button>
                <button onClick={() => setActiveTab('citas')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'citas' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500'}`}>Citas</button>
                <button onClick={() => setActiveTab('financiamiento')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'financiamiento' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500'}`}>Financiamiento</button>
            </div>

            {/* --- VISTA: HISTORIA --- */}
            {activeTab === 'historia' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h3 className="font-bold text-slate-800 border-b pb-2">Antecedentes y Signos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['enfermedades', 'medicamentos', 'anticonceptivos', 'neurologico', 'heredofamiliares'].map(field => (
                                <div key={field} className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{field}</label>
                                    <input name={field} value={medForm[field]} onChange={handleHistoryChange} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            ))}
                            {['ta', 'fc', 'fr', 'temp', 'peso', 'talla'].map(field => (
                                <div key={field}>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{field}</label>
                                    <input name={field} value={medForm[field]} onChange={handleHistoryChange} className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-center font-mono" />
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSaveHistory} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg">Guardar Historia</button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-fit overflow-hidden flex flex-col max-h-[600px]">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><BanknotesIcon className="w-5 h-5 text-emerald-600" /> Pagos</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {payments.map(p => (
                                <div key={p.id} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all">
                                    <div>
                                        <p className="font-bold text-slate-700 text-sm">{p.concepto || 'Abono'}</p>
                                        <p className="text-[10px] text-slate-400 uppercase">{new Date(p.fecha).toLocaleDateString()} • {p.metodo_pago}</p>
                                    </div>
                                    <span className="font-bold text-emerald-600 text-sm">+${parseFloat(p.monto).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- VISTA: CITAS (Aquí agregamos el botón de detalle) --- */}
            {activeTab === 'citas' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
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
                            {appointments.map(appt => (
                                <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">{new Date(appt.fecha_hora).toLocaleString()}</td>
                                    <td className="px-6 py-4">{appt.motivo}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${appt.estado === 'Finalizada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            {appt.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        {['Agendada', 'Pendiente'].includes(appt.estado) && (
                                            <button onClick={() => updateAppointmentStatus(appt.id, 'en_proceso')} className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-xs font-bold">INICIAR</button>
                                        )}
                                        {appt.estado === 'Finalizada' && (
                                            <button
                                                onClick={() => handleViewConsultation(appt.id)}
                                                className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-xs font-bold border border-indigo-200 hover:bg-indigo-200 flex items-center gap-1"
                                            >
                                                <DocumentTextIcon className="w-3 h-3" /> Detalle cita
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- VISTA: FINANCIAMIENTO --- */}
            {activeTab === 'financiamiento' && (
                <div className="space-y-6 animate-slide-up">
                    <div className="flex justify-between items-center bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <div><h3 className="font-bold text-blue-900 text-lg">Planes Activos</h3></div>
                        <button onClick={() => setShowPlanModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg">Crear Plan</button>
                    </div>
                    {paymentPlans.map(plan => (
                        <div key={plan.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 p-4 border-b flex justify-between">
                                <span className="font-bold">Plan #{plan.id} - ${plan.monto_total}</span>
                                <span className="text-xs font-bold uppercase">{plan.plazo_meses} Meses</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead><tr className="bg-white text-[10px] text-slate-400 font-bold uppercase tracking-widest"><th className="px-4 py-2">Vencimiento</th><th className="px-4 py-2 text-right">Monto</th><th className="px-4 py-2 text-right">Acción</th></tr></thead>
                                <tbody>
                                    {plan.mensualidades?.map(mes => (
                                        <tr key={mes.id} className="border-t border-slate-50">
                                            <td className="px-4 py-2">{new Date(mes.fecha_vencimiento).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 text-right font-bold">${mes.monto}</td>
                                            <td className="px-4 py-2 text-right">
                                                {mes.estado !== 'PAGADO' ? (
                                                    <button onClick={() => handlePayInstallment(mes.id)} className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-md font-bold">PAGAR</button>
                                                ) : (
                                                    <span className="text-xs text-emerald-600 font-bold tracking-tighter uppercase">Pagado</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL: DETALLE DE CONSULTA (QUÉ PASÓ) --- */}
            {showConsultationModal && consultationDetail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-3xl w-full max-w-2xl shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-slate-800 tracking-tight">Resumen de Consulta</h3>
                            <button onClick={() => setShowConsultationModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircleIcon className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-sm border border-slate-100">
                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doctor</p><p className="font-bold text-slate-700">{consultationDetail.doctor.nombre}</p></div>
                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</p><p className="font-bold text-slate-700">{new Date(consultationDetail.fecha).toLocaleDateString()}</p></div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-700 text-sm mb-2 uppercase tracking-tighter">Nota SOAP</h4>
                                <div className="p-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-600 italic leading-relaxed">
                                    {consultationDetail.nota_medica.subjetivo || 'Sin registro'}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-indigo-700 text-sm mb-2 uppercase tracking-tighter">Receta / Tratamiento</h4>
                                <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                                    {consultationDetail.receta || 'Sin indicaciones registradas.'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button onClick={handlePrintPrescription} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                                <PrinterIcon className="w-5 h-5" /> REIMPRIMIR RECETA
                            </button>
                            <button onClick={() => setShowConsultationModal(false)} className="px-6 bg-slate-100 text-slate-500 rounded-2xl font-bold">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CITA */}
            {showApptModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-2xl w-full max-w-md"><h3 className="font-bold mb-4">Nueva Cita</h3><form onSubmit={handleCreateAppointment} className="space-y-4"><div><label className="block text-xs font-bold mb-1">Fecha</label><input type="date" required className="w-full border p-2 rounded-lg" onChange={e => setNewAppointment({ ...newAppointment, fecha: e.target.value })} /></div><div><label className="block text-xs font-bold mb-1">Hora</label><input type="time" required className="w-full border p-2 rounded-lg" onChange={e => setNewAppointment({ ...newAppointment, hora: e.target.value })} /></div><div><label className="block text-xs font-bold mb-1">Motivo</label><input type="text" required className="w-full border p-2 rounded-lg" onChange={e => setNewAppointment({ ...newAppointment, motivo: e.target.value })} /></div><div className="flex gap-2"><button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">Agendar</button><button type="button" onClick={() => setShowApptModal(false)} className="px-4 text-slate-400">Cerrar</button></div></form></div></div>
            )}
        </div>
    );
}

export default PatientDetails;