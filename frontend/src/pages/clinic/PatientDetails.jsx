import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import {
    ArrowLeftIcon, PlusIcon, CalendarIcon,
    ClockIcon, CheckCircleIcon, EyeIcon, XMarkIcon,
    BanknotesIcon, DocumentTextIcon, PlayIcon,
    XCircleIcon, PrinterIcon, PhotoIcon // <--- IMPORTANTE: Agregamos PhotoIcon
} from '@heroicons/react/24/solid';

const PatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- ESTADOS DE DATOS ---
    const [patient, setPatient] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('historia');

    // --- ESTADO DEL FORMULARIO DE HISTORIA CLÍNICA (NOM-004) ---
    const [medForm, setMedForm] = useState({
        enfermedades: '',
        medicamentos: '',
        anticonceptivos: '',
        neurologico: '',
        ta: '', fc: '', fr: '', temp: '', peso: '', talla: '', imc: '',
        examenes: '',
        laboratorio: '',
        diagnostico: '',
        tratamiento: '',
        heredofamiliares: ''
    });

    // --- ESTADOS DE MODALES ---
    const [showModal, setShowModal] = useState(false);
    const [newAppointment, setNewAppointment] = useState({ fecha: '', hora: '', motivo: '' });

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [newHistory, setNewHistory] = useState({ tipo: 'patologico', clave: '', valor: '', observaciones: '' });

    const [viewModal, setViewModal] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);

    const currentUserId = 1;

    // --- CARGA DE DATOS ---
    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            // 1. Paciente
            const resPatient = await client.get(`/pacientes/${id}`);
            setPatient(resPatient.data);

            // 2. Citas
            const resAppts = await client.get(`/pacientes/${id}/citas`);
            setAppointments(resAppts.data);

            // 3. Presupuestos (Finanzas)
            try {
                const resBudgets = await client.get(`/finanzas/presupuestos/paciente/${id}`);
                setBudgets(resBudgets.data);
            } catch (e) { console.log("No budgets"); }

            // 4. Historia Clínica (NOM-004)
            try {
                const resHistory = await client.get(`/pacientes/${id}/historia-nom`);

                // Llenamos el formulario visual si hay datos guardados
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
            } catch (e) { console.log("No history"); }

        } catch (error) {
            toast.error("Error cargando el expediente");
        } finally {
            setLoading(false);
        }
    };

    // --- MANEJADORES DEL FORMULARIO DE HISTORIA ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setMedForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveHistoryForm = async () => {
        const promises = [];
        Object.keys(medForm).forEach(key => {
            const payload = {
                tipo: 'historia_clinica',
                clave: key,
                valor: medForm[key],
                observaciones: ''
            };
            promises.push(client.post(`/pacientes/${id}/historia-nom`, payload));
        });

        try {
            await Promise.all(promises);
            toast.success("Historia Clínica Actualizada");
            loadData();
        } catch (error) {
            toast.error("Error al guardar los datos");
        }
    };

    // --- ACCIONES DE CITA ---
    const handleStartConsultation = async (apptId) => {
        try {
            await client.put(`/clinica/citas/${apptId}/iniciar`);
            toast.success("Consulta iniciada");
            navigate(`/dashboard/consulta/${apptId}`);
        } catch (error) {
            toast.error("Error al iniciar");
        }
    };

    const handleCreateAppointment = async (e) => {
        e.preventDefault();
        try {
            const fechaISO = `${newAppointment.fecha}T${newAppointment.hora}:00`;
            await client.post('/clinica/citas', {
                patient_id: parseInt(id),
                doctor_id: currentUserId,
                fecha_hora: fechaISO,
                motivo: newAppointment.motivo
            });
            toast.success("Cita agendada");
            setShowModal(false);
            setNewAppointment({ fecha: '', hora: '', motivo: '' });
            loadData();
        } catch (error) {
            toast.error("Error al agendar");
        }
    };

    // --- ACCIONES FINANCIERAS ---
    const handleApproveBudget = async (budgetId) => {
        try {
            await client.put(`/finanzas/presupuestos/${budgetId}/aprobar`);
            toast.success("Presupuesto Aprobado");
            loadData();
        } catch (error) { toast.error("Error al aprobar"); }
    };

    const handleRejectBudget = async (budgetId) => {
        if (window.confirm("¿Estás seguro de rechazar este presupuesto?")) {
            try {
                await client.put(`/finanzas/presupuestos/${budgetId}/rechazar`);
                toast.success("Presupuesto Rechazado");
                loadData();
            } catch (error) {
                toast.success("Presupuesto Rechazado (Local)");
                loadData();
            }
        }
    };

    // --- ACCIONES HISTORIA EXTRA ---
    const handleAddHistory = async (e) => {
        e.preventDefault();
        try {
            await client.post(`/pacientes/${id}/historia-nom`, newHistory);
            toast.success("Dato guardado");
            setShowHistoryModal(false);
            setNewHistory({ tipo: 'patologico', clave: '', valor: '', observaciones: '' });
            loadData();
        } catch (error) {
            toast.error("Error guardando");
        }
    };

    const handleViewDetail = async (appointmentId) => {
        try {
            const res = await client.get(`/clinica/citas/${appointmentId}/completa`);
            setSelectedDetail(res.data);
            setViewModal(true);
        } catch (error) {
            toast.error("Error cargando detalles");
        }
    };

    const handleReprintReceta = (detail) => {
        const w = window.open('', '', 'height=800,width=1000');
        w.document.write('<html><head><title>Receta Médica (Copia)</title><style>body{font-family:Arial;padding:40px;} pre{font-family:monospace;white-space:pre-wrap;}</style></head><body>');
        w.document.write(`<div style="border-bottom:2px solid #0f766e;margin-bottom:20px;padding-bottom:10px;"><strong>RECETA (COPIA)</strong></div>`);
        w.document.write(`<p><strong>Paciente:</strong> ${patient.nombre} ${patient.apellidos}<br/><strong>Fecha:</strong> ${new Date(detail.fecha_hora).toLocaleDateString()}</p>`);
        w.document.write('<hr/><br/>');
        w.document.write(`<pre>${detail.receta}</pre>`);
        w.document.write('</body></html>');
        w.document.close();
        w.print();
    };

    const calculateAge = (dob) => {
        if (!dob) return '';
        const diff = Date.now() - new Date(dob).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };

    if (loading || !patient) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="space-y-6 animate-fade-in text-gray-800">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/dashboard/pacientes')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{patient.nombre} {patient.apellidos}</h1>
                        <p className="text-sm text-gray-500">Expediente #{patient.id} | {patient.sexo}</p>
                    </div>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-primary hover:bg-teal-800 text-white px-4 py-2 rounded-lg shadow flex items-center transition-all">
                    <PlusIcon className="w-5 h-5 mr-2" /> Nueva Consulta
                </button>
            </div>

            {/* RESUMEN */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                    <p className="text-xs text-gray-500 uppercase font-bold">Saldo Pendiente</p>
                    <p className={`text-2xl font-bold ${patient.saldo_actual > 0 ? 'text-red-500' : 'text-green-600'}`}>${patient.saldo_actual.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
                    <p className="text-xs text-gray-500 uppercase font-bold">Citas Totales</p>
                    <p className="text-2xl font-bold text-gray-800">{appointments.length}</p>
                </div>
            </div>

            {/* TABS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
                <div className="border-b border-gray-200 px-6 flex space-x-8 bg-gray-50 rounded-t-xl">
                    <button onClick={() => setActiveTab('historia')} className={`py-4 px-4 border-b-2 font-bold text-sm ${activeTab === 'historia' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <DocumentTextIcon className="w-4 h-4 mr-2" /> Historia Clínica
                    </button>
                    <button onClick={() => setActiveTab('citas')} className={`py-4 px-4 border-b-2 font-bold text-sm ${activeTab === 'citas' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <CalendarIcon className="w-4 h-4 mr-2" /> Citas
                    </button>
                    <button onClick={() => setActiveTab('financiero')} className={`py-4 px-4 border-b-2 font-bold text-sm ${activeTab === 'financiero' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <BanknotesIcon className="w-4 h-4 mr-2" /> Pagos
                    </button>
                </div>

                <div className="p-6">

                    {/* TAB HISTORIA CLÍNICA */}
                    {activeTab === 'historia' && (
                        <div className="space-y-4">
                            <div className="bg-white border-2 border-gray-800 p-1 text-gray-800 text-sm font-medium">
                                <div className="bg-gray-200 px-2 py-1 border-b-2 border-gray-800 font-bold text-center uppercase tracking-wider text-sm">
                                    Control de Paciente
                                </div>
                                <div className="p-6 text-sm space-y-6">
                                    <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                        <div><strong>Nombre:</strong> {patient.nombre} {patient.apellidos}</div>
                                        <div><strong>Fecha Nac:</strong> {patient.fecha_nacimiento} ({calculateAge(patient.fecha_nacimiento)} años)</div>
                                        <div><strong>Teléfono:</strong> {patient.telefono_movil}</div>
                                        <div><strong>Email:</strong> {patient.email}</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center"><label className="w-48 font-bold text-gray-800 uppercase text-xs">Enfermedades actuales:</label><input name="enfermedades" className="flex-1 border-b border-gray-400 outline-none px-2 py-1 bg-blue-50/20" value={medForm.enfermedades} onChange={handleInputChange} /></div>
                                        <div className="flex items-center"><label className="w-48 font-bold text-gray-800 uppercase text-xs">Medicamentos:</label><input name="medicamentos" className="flex-1 border-b border-gray-400 outline-none px-2 py-1 bg-blue-50/20" value={medForm.medicamentos} onChange={handleInputChange} /></div>
                                        <div className="flex items-center"><label className="w-48 font-bold text-gray-800 uppercase text-xs">Alergias / Otros:</label><input name="anticonceptivos" className="flex-1 border-b border-gray-400 outline-none px-2 py-1 bg-blue-50/20" value={medForm.anticonceptivos} onChange={handleInputChange} /></div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                        <label className="font-bold text-gray-800 block mb-3 border-b border-gray-300 pb-1 text-xs uppercase">Signos Vitales</label>
                                        <div className="grid grid-cols-7 gap-4 text-center">
                                            <div><span className="text-xs font-bold block">TA</span><input name="ta" className="w-full border-b text-center bg-white" value={medForm.ta} onChange={handleInputChange} placeholder="-" /></div>
                                            <div><span className="text-xs font-bold block">FC</span><input name="fc" className="w-full border-b text-center bg-white" value={medForm.fc} onChange={handleInputChange} placeholder="-" /></div>
                                            <div><span className="text-xs font-bold block">FR</span><input name="fr" className="w-full border-b text-center bg-white" value={medForm.fr} onChange={handleInputChange} placeholder="-" /></div>
                                            <div><span className="text-xs font-bold block">Temp</span><input name="temp" className="w-full border-b text-center bg-white" value={medForm.temp} onChange={handleInputChange} placeholder="-" /></div>
                                            <div><span className="text-xs font-bold block">Peso</span><input name="peso" className="w-full border-b text-center bg-white" value={medForm.peso} onChange={handleInputChange} placeholder="-" /></div>
                                            <div><span className="text-xs font-bold block">Talla</span><input name="talla" className="w-full border-b text-center bg-white" value={medForm.talla} onChange={handleInputChange} placeholder="-" /></div>
                                            <div><span className="text-xs font-bold block">IMC</span><input name="imc" className="w-full border-b text-center bg-white" value={medForm.imc} onChange={handleInputChange} placeholder="-" /></div>
                                        </div>
                                    </div>
                                    <div className="border-t-2 border-gray-800 pt-2">
                                        <label className="font-bold text-sm block mb-1">Antecedentes Heredo Familiares:</label>
                                        <textarea name="heredofamiliares" className="w-full border border-gray-300 rounded p-2 text-sm bg-blue-50/20" rows="2" value={medForm.heredofamiliares} onChange={handleInputChange}></textarea>
                                    </div>
                                    <div className="flex justify-end pt-4 border-t">
                                        <button onClick={handleSaveHistoryForm} className="bg-blue-800 text-white px-6 py-2 rounded font-bold shadow hover:bg-black">GUARDAR HISTORIA CLÍNICA</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CITAS */}
                    {activeTab === 'citas' && (
                        <div className="space-y-4">
                            {appointments.length === 0 && <p className="text-center text-gray-400 py-10">Sin historial de citas.</p>}
                            {appointments.map((appt) => {
                                const isCancelled = ['Cancelada', 'No asistió'].includes(appt.estado);
                                const isActive = appt.estado === 'En proceso';
                                return (
                                    <div key={appt.id} className={`flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isCancelled ? 'border-l-4 border-l-red-500 bg-red-50/30' :
                                            isActive ? 'border-l-4 border-l-green-500' :
                                                'border-l-4 border-l-blue-500'
                                        }`}>
                                        <div className="mr-4">
                                            {isCancelled ? <XCircleIcon className="w-6 h-6 text-red-500" /> :
                                                isActive ? <PlayIcon className="w-6 h-6 text-green-500 animate-pulse" /> :
                                                    <ClockIcon className="w-6 h-6 text-blue-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between font-bold text-sm">
                                                <span className={isCancelled ? 'line-through text-gray-500' : ''}>{new Date(appt.fecha_hora).toLocaleString()}</span>
                                                <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${isCancelled ? 'bg-red-100 text-red-700' :
                                                        isActive ? 'bg-green-100 text-green-700' :
                                                            'bg-blue-100 text-blue-700'
                                                    }`}>{appt.estado}</span>
                                            </div>
                                            <p className={`text-sm ${isCancelled ? 'italic text-gray-400' : 'text-gray-600'}`}>{appt.motivo}</p>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            {['Agendada', 'Pendiente'].includes(appt.estado) && !isCancelled && (
                                                <button onClick={() => handleStartConsultation(appt.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700">Iniciar</button>
                                            )}
                                            {isActive && <button onClick={() => navigate(`/dashboard/consulta/${appt.id}`)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold animate-pulse">Continuar</button>}
                                            <button onClick={() => handleViewDetail(appt.id)} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded font-medium hover:bg-gray-200 flex items-center border border-gray-300">
                                                <EyeIcon className="w-4 h-4 mr-1" /> Ver Detalle
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* TAB PAGOS */}
                    {activeTab === 'financiero' && (
                        <div className="space-y-3">
                            {budgets.length === 0 && <p className="text-center text-gray-400 py-10">Sin movimientos financieros.</p>}
                            {budgets.map(b => (
                                <div key={b.id} className="border rounded p-3 shadow-sm">
                                    <div className="flex justify-between items-center mb-2 border-b pb-2">
                                        <span className="font-bold text-sm">Presupuesto #{b.id}</span>
                                        <div className="flex gap-2 items-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${b.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                                                    b.estado === 'aprobado' ? 'bg-blue-100 text-blue-700' :
                                                        b.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                                                            'bg-orange-100 text-orange-700'
                                                }`}>{b.estado}</span>
                                            <span className="font-bold">${b.monto_total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    {b.estado === 'borrador' && (
                                        <div className="flex justify-end gap-2 mt-2 border-t pt-2">
                                            <button onClick={() => handleRejectBudget(b.id)} className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded flex items-center"><XCircleIcon className="w-3 h-3 mr-1" /> Rechazar</button>
                                            <button onClick={() => handleApproveBudget(b.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded flex items-center"><CheckCircleIcon className="w-3 h-3 mr-1" /> Aprobar</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALES */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-xl w-full max-w-md"><h3 className="font-bold mb-4">Nueva Cita</h3><form onSubmit={handleCreateAppointment}><input className="w-full border p-2 mb-2 rounded" placeholder="Motivo" value={newAppointment.motivo} onChange={e => setNewAppointment({ ...newAppointment, motivo: e.target.value })} /><div className="grid grid-cols-2 gap-2 mb-4"><input type="date" className="border p-2 rounded" value={newAppointment.fecha} onChange={e => setNewAppointment({ ...newAppointment, fecha: e.target.value })} /><input type="time" className="border p-2 rounded" value={newAppointment.hora} onChange={e => setNewAppointment({ ...newAppointment, hora: e.target.value })} /></div><button type="submit" className="bg-primary text-white px-4 py-2 rounded w-full">Agendar</button><button type="button" onClick={() => setShowModal(false)} className="text-gray-500 w-full mt-2">Cancelar</button></form></div></div>
            )}

            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-sm p-6"><h3 className="font-bold text-lg mb-4">Dato Extra</h3><form onSubmit={handleAddHistory} className="space-y-3"><select className="w-full p-2 border rounded" value={newHistory.tipo} onChange={e => setNewHistory({ ...newHistory, tipo: e.target.value })}><option value="patologico">General</option><option value="hereditario">Heredo</option></select><input required placeholder="Etiqueta" className="w-full p-2 border rounded" value={newHistory.clave} onChange={e => setNewHistory({ ...newHistory, clave: e.target.value })} /><input required placeholder="Valor" className="w-full p-2 border rounded" value={newHistory.valor} onChange={e => setNewHistory({ ...newHistory, valor: e.target.value })} /><button type="submit" className="w-full bg-primary text-white py-2 rounded">Guardar</button></form></div></div>
            )}

            {/* MODAL DETALLE CON IMÁGENES Y RECETA */}
            {viewModal && selectedDetail && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
                        <button onClick={() => setViewModal(false)} className="absolute top-4 right-4 text-gray-400"><XMarkIcon className="w-6 h-6" /></button>
                        <h3 className="font-bold text-xl mb-1 text-gray-800">Detalle de Consulta</h3>
                        <p className="text-sm text-gray-500 mb-4 border-b pb-2">{new Date(selectedDetail.fecha_hora).toLocaleString()} | {selectedDetail.doctor_nombre}</p>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase">Motivo</p>
                                <p className="font-medium text-gray-800">{selectedDetail.motivo}</p>
                            </div>

                            {/* NOTA SOAP */}
                            {selectedDetail.nota_medica ? (
                                <div className="border rounded-lg overflow-hidden border-blue-100">
                                    <div className="bg-blue-50 px-3 py-1 border-b text-xs font-bold text-blue-800">NOTA DE EVOLUCIÓN</div>
                                    <div className="p-3 text-sm space-y-1">
                                        <p><strong>S:</strong> {selectedDetail.nota_medica.subjetivo}</p>
                                        <p><strong>O:</strong> {selectedDetail.nota_medica.objetivo}</p>
                                        <p><strong>A:</strong> {selectedDetail.nota_medica.analisis}</p>
                                        <p><strong>P:</strong> {selectedDetail.nota_medica.plan}</p>
                                    </div>
                                </div>
                            ) : <p className="text-center italic text-gray-400">Sin nota médica.</p>}

                            {/* RECETA MÉDICA (SIEMPRE VISIBLE) */}
                            <div className="border rounded-lg overflow-hidden border-yellow-200 mt-2 bg-yellow-50/30">
                                <div className="bg-yellow-50 px-3 py-2 border-b border-yellow-200 text-xs font-bold text-yellow-800 flex justify-between items-center">
                                    <span>RECETA MÉDICA</span>
                                    {selectedDetail.receta && (
                                        <button onClick={() => handleReprintReceta(selectedDetail)} className="flex items-center bg-white border border-yellow-300 px-2 py-1 rounded hover:bg-yellow-100 text-yellow-900 cursor-pointer">
                                            <PrinterIcon className="w-3 h-3 mr-1" /> Reimprimir PDF
                                        </button>
                                    )}
                                </div>
                                <div className="p-3 text-sm font-mono whitespace-pre-wrap text-gray-700">
                                    {selectedDetail.receta || <span className="italic text-gray-400">Sin receta registrada.</span>}
                                </div>
                            </div>

                            {/* GALERÍA DE IMÁGENES (AGREGADA) */}
                            {selectedDetail.archivos && selectedDetail.archivos.length > 0 && (
                                <div className="mt-4 border rounded-lg overflow-hidden border-gray-200 bg-gray-50">
                                    <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 flex items-center">
                                        <PhotoIcon className="w-4 h-4 mr-2" /> EVIDENCIA DIGITAL
                                    </div>
                                    <div className="p-2 grid grid-cols-3 gap-2">
                                        {selectedDetail.archivos.map(file => (
                                            <div key={file.id} className="aspect-square bg-gray-200 rounded overflow-hidden relative group cursor-pointer"
                                                onClick={() => window.open(`http://127.0.0.1:8000/clinica/archivos/${file.id}`, '_blank')}>
                                                <img
                                                    src={`http://127.0.0.1:8000/clinica/archivos/${file.id}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { client.get(`/clinica/archivos/${file.id}`).then(res => e.target.src = res.data.data); }}
                                                />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">Ver</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setViewModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDetails;