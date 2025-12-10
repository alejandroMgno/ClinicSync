import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, MagnifyingGlassIcon, UserPlusIcon, CalendarDaysIcon, XCircleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { jwtDecode } from 'jwt-decode';

const Agenda = () => {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [showModal, setShowModal] = useState(false);
    const [viewMode, setViewMode] = useState('week');
    const [newAppointment, setNewAppointment] = useState({
        patient_id: '', doctor_id: '', start_hour: '', duration: 60, motivo: '', date: new Date().toISOString().split('T')[0]
    });

    const [searchPatientTerm, setSearchPatientTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatientName, setSelectedPatientName] = useState('');
    const [isCreatingPatient, setIsCreatingPatient] = useState(false);

    const token = localStorage.getItem('token');
    let currentUserId = 1;
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const decoded = JSON.parse(jsonPayload);
            currentUserId = decoded.id || 1;
        } catch (e) { }
    }

    useEffect(() => {
        loadAgendaData();
    }, [currentDate, viewMode]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchPatientTerm.length > 1 && !selectedPatientName) {
                client.get(`/pacientes/search?query=${searchPatientTerm}`)
                    .then(res => setSearchResults(res.data))
                    .catch(() => setSearchResults([]));
            } else { setSearchResults([]); }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchPatientTerm, selectedPatientName]);

    const loadAgendaData = async () => {
        try {
            setLoading(true);
            let realDoctors = [];
            try {
                const resDocs = await client.get('/usuarios/');
                realDoctors = resDocs.data.filter(u => ['admin', 'dentista', 'medico'].includes(u.rol));
                setDoctors(realDoctors);
            } catch (e) {
                realDoctors = [{ id: 1, nombre_completo: "Dr. Admin" }];
                setDoctors(realDoctors);
            }

            const days = getWeekDays();
            const startDate = days[0].toISOString().split('T')[0];
            const endDate = days[6].toISOString().split('T')[0];

            let res;
            try { res = await client.get(`/clinica/agenda?start_date=${startDate}&end_date=${endDate}`); } catch { res = { data: [] }; }

            const processedApps = res.data.map(appt => {
                const parts = appt.fecha_hora.split(/[-T:]/);
                const localDate = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]);
                const doctor = realDoctors.find(d => d.id === appt.doctor_id);

                return {
                    ...appt,
                    doctor_name: doctor ? doctor.nombre_completo.split(' ')[0] : 'Dr.',
                    localStartDate: localDate,
                    hour: localDate.getHours(),
                    minutes: localDate.getMinutes(),
                    duration: appt.duracion_minutos || 60,
                    patient_name: appt.patient_name || `Paciente #${appt.patient_id}`,
                    // Agregamos timestamps numéricos para facilitar cálculos de colisiones
                    startMin: localDate.getHours() * 60 + localDate.getMinutes(),
                    endMin: localDate.getHours() * 60 + localDate.getMinutes() + (appt.duracion_minutos || 60)
                };
            });

            setAppointments(processedApps);
        } catch (error) { toast.error("Error sincronizando agenda"); } finally { setLoading(false); }
    };

    const handleCreateAppointment = async (e) => {
        e.preventDefault();
        let finalPatientId = newAppointment.patient_id;

        if (isCreatingPatient && !finalPatientId) {
            try {
                const names = searchPatientTerm.split(" ");
                const resP = await client.post('/pacientes/', {
                    nombre: names[0] || "Sin Nombre", apellidos: names.slice(1).join(" ") || "Sin Apellido", telefono_movil: "0000000000",
                    fecha_nacimiento: "2000-01-01", sexo: "M", datos_personales: { registro: "Rápido desde Agenda" }
                });
                finalPatientId = resP.data.id;
                toast.success("Paciente creado");
            } catch (err) { return toast.error("Error creando paciente"); }
        }

        if (!finalPatientId) return toast.error("Selecciona un paciente");

        try {
            const fechaString = `${newAppointment.date}T${newAppointment.start_hour}:00`;
            await client.post('/clinica/citas', {
                patient_id: parseInt(finalPatientId), doctor_id: parseInt(newAppointment.doctor_id),
                fecha_hora: fechaString, motivo: newAppointment.motivo, duracion_minutos: parseInt(newAppointment.duration)
            });
            toast.success("Cita Agendada"); setShowModal(false); resetForm(); loadAgendaData();
        } catch (error) { toast.error("Error al guardar cita"); }
    };

    const handleCancelAppointment = async (e, apptId) => {
        e.stopPropagation();
        if (window.confirm("¿Cancelar esta cita?")) {
            try { await client.put(`/clinica/citas/${apptId}/cancelar`); toast.success("Cancelada"); loadAgendaData(); }
            catch (error) { toast.error("Error al cancelar"); }
        }
    };

    const resetForm = () => {
        const defaultDoc = doctors.length > 0 ? doctors[0].id : '';
        setNewAppointment({ patient_id: '', doctor_id: defaultDoc, start_hour: '', duration: 60, motivo: '', date: '' });
        setSearchPatientTerm(''); setSelectedPatientName(''); setSearchResults([]); setIsCreatingPatient(false);
    };

    const startOfWeek = () => {
        const date = new Date(currentDate);
        const day = date.getDay();
        const diff = date.getDate() - day;
        date.setDate(diff);
        return date;
    };

    const getWeekDays = () => {
        const start = startOfWeek();
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i); days.push(d);
        }
        return days;
    };

    const handleTimeSlotClick = (dateStr, slot) => {
        const defaultDoc = doctors.length > 0 ? doctors[0].id : '';
        resetForm();
        setNewAppointment({ patient_id: '', doctor_id: defaultDoc, start_hour: slot.time.slice(0, 5), duration: 60, motivo: '', date: dateStr });
        setShowModal(true);
    };

    const handleVerCita = (appt) => {
        if (['Finalizada', 'Cancelada', 'No asistió'].includes(appt.estado)) navigate(`/dashboard/pacientes/${appt.patient_id}`);
        else navigate(`/dashboard/consulta/${appt.id}`);
    };

    const generateTimeSlots = () => {
        const slots = [];
        for (let h = 8; h <= 20; h++) {
            slots.push({ time: `${h < 10 ? '0' + h : h}:00`, h, m: 0 });
            if (h < 20) slots.push({ time: `${h < 10 ? '0' + h : h}:30`, h, m: 30 });
        }
        return slots;
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Finalizada': return 'bg-gray-200 text-gray-600 border-l-4 border-gray-500';
            case 'En proceso': return 'bg-green-100 text-green-800 border-l-4 border-green-600 shadow-md z-20'; // Z-index alto para resaltar
            case 'Cancelada':
            case 'No asistió': return 'bg-red-100 text-red-800 border-l-4 border-red-500 opacity-70 line-through';
            default: return 'bg-blue-100 text-blue-800 border-l-4 border-blue-500';
        }
    };

    // --- ALGORITMO DE ACOMODO DE CITAS (RESUELVE SOBREPOSICIÓN) ---
    const organizeEvents = (events) => {
        if (!events || events.length === 0) return [];

        // 1. Ordenar por hora de inicio
        const sortedEvents = [...events].sort((a, b) => a.startMin - b.startMin);

        // 2. Asignar columnas (packing)
        const columns = []; // Array de Arrays (cada uno es una columna visual)

        sortedEvents.forEach(event => {
            let placed = false;
            // Intentar colocar en una columna existente
            for (let i = 0; i < columns.length; i++) {
                const lastInCol = columns[i][columns[i].length - 1];
                // Si la última cita de esta columna termina antes de que empiece la nueva
                if (lastInCol.endMin <= event.startMin) {
                    columns[i].push(event);
                    event.colIndex = i; // Guardamos su índice de columna
                    placed = true;
                    break;
                }
            }
            // Si no cabe en ninguna, crear nueva columna
            if (!placed) {
                columns.push([event]);
                event.colIndex = columns.length - 1;
            }
        });

        // 3. Calcular anchos
        const totalColumns = columns.length;

        return sortedEvents.map(e => ({
            ...e,
            styleWidth: `${100 / totalColumns}%`,
            styleLeft: `${(e.colIndex * 100) / totalColumns}%`
        }));
    };

    const weekDays = getWeekDays();
    const CELL_HEIGHT = 40;
    const PIXELS_PER_MINUTE = CELL_HEIGHT / 30;

    return (
        <div className="h-full flex flex-col space-y-4 max-h-[calc(100vh-4rem)]">

            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 shrink-0">
                <div className="flex items-center gap-4">
                    <CalendarDaysIcon className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Agenda Médica</h1>
                        <p className="text-xs text-gray-500 capitalize">{weekDays[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 ml-4">
                        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-1 hover:bg-white rounded shadow-sm"><ChevronLeftIcon className="w-4 h-4" /></button>
                        <button onClick={() => { setCurrentDate(new Date()) }} className="text-xs font-bold px-2">Hoy</button>
                        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-1 hover:bg-white rounded shadow-sm"><ChevronRightIcon className="w-4 h-4" /></button>
                    </div>
                </div>
                <button onClick={() => { resetForm(); setNewAppointment(p => ({ ...p, date: new Date().toISOString().split('T')[0], start_hour: '09:00' })); setShowModal(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow flex items-center font-medium hover:bg-teal-800"><PlusIcon className="w-5 h-5 mr-2" /> Nueva Cita</button>
            </div>

            <div className="bg-white flex-1 rounded-xl shadow border border-gray-200 flex flex-col overflow-hidden">
                <div className="grid bg-gray-50 text-xs font-bold text-gray-600 border-b border-gray-200 shrink-0" style={{ gridTemplateColumns: '50px repeat(7, 1fr)', paddingRight: '8px' }}>
                    <div className="py-3 px-1 text-right text-gray-400">HORA</div>
                    {weekDays.map((day, index) => {
                        const isToday = day.toDateString() === new Date().toDateString();
                        return (
                            <div key={index} className={`py-2 text-center border-l border-gray-200 ${isToday ? 'bg-blue-50/50 text-primary' : ''}`}>
                                <span className="block uppercase text-[10px]">{day.toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                                <span className="block text-lg font-extrabold">{day.getDate()}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-y-auto relative flex">
                    {/* Columna Horas */}
                    <div className="w-[50px] border-r border-gray-100 bg-white sticky left-0 z-20 shrink-0">
                        {generateTimeSlots().map((slot, i) => (
                            <div key={i} className="text-[10px] text-gray-400 text-right pr-2 border-b border-transparent relative" style={{ height: `${CELL_HEIGHT}px` }}>
                                <span className="relative -top-2">{slot.m === 0 ? slot.time : ''}</span>
                            </div>
                        ))}
                    </div>

                    {/* Grid Principal */}
                    <div className="flex-1 grid grid-cols-7 relative min-w-[800px]">
                        {weekDays.map((day, i) => {
                            const isToday = day.toDateString() === new Date().toDateString();
                            const dateStr = day.toISOString().split('T')[0];

                            // 1. Filtrar eventos del día
                            const rawDayEvents = appointments.filter(apt =>
                                apt.localStartDate.getDate() === day.getDate() &&
                                apt.localStartDate.getMonth() === day.getMonth()
                            );

                            // 2. Organizar eventos (calcular width y left para evitar colisión)
                            const dayEvents = organizeEvents(rawDayEvents);

                            return (
                                <div key={i} className={`border-l border-gray-100 relative min-h-[600px] ${isToday ? 'bg-blue-50/20' : ''}`}>
                                    {generateTimeSlots().map((slot, j) => (
                                        <div key={j} className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors box-border" style={{ height: `${CELL_HEIGHT}px` }} onClick={() => handleTimeSlotClick(dateStr, slot)}></div>
                                    ))}

                                    {dayEvents.map(apt => {
                                        // Calcular top basado en 8:00 AM inicio
                                        const minutesFromStart = (apt.hour - 8) * 60 + apt.minutes;
                                        const top = minutesFromStart * PIXELS_PER_MINUTE;
                                        const height = apt.duration * PIXELS_PER_MINUTE;

                                        return (
                                            <div
                                                key={apt.id}
                                                onClick={(e) => { e.stopPropagation(); handleVerCita(apt); }}
                                                className={`absolute rounded px-2 py-1 text-[10px] shadow-sm cursor-pointer hover:brightness-95 border-l-2 overflow-hidden transition-all ${getStatusStyle(apt.estado)} group`}
                                                // ESTILOS DINÁMICOS AQUÍ:
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${height}px`,
                                                    width: apt.styleWidth,  // Calculado por organizeEvents
                                                    left: apt.styleLeft     // Calculado por organizeEvents
                                                }}
                                            >
                                                {apt.estado === 'Agendada' && (
                                                    <button onClick={(e) => handleCancelAppointment(e, apt.id)} className="absolute top-0.5 right-0.5 text-gray-500 hover:text-red-600 hidden group-hover:block bg-white rounded-full shadow-sm p-0.5 z-20" title="Cancelar"><XCircleIcon className="w-4 h-4" /></button>
                                                )}
                                                <div className="font-bold truncate leading-tight text-blue-900">{apt.patient_name}</div>
                                                <div className="truncate text-[9px] opacity-90 mt-0.5 font-medium">{apt.motivo}</div>
                                            </div>
                                        );
                                    })
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="bg-primary p-4 flex justify-between items-center text-white sticky top-0 z-30">
                            <h3 className="font-bold">Agendar Nueva Cita</h3>
                            <button onClick={() => setShowModal(false)}><XMarkIcon className="w-6 h-6 text-white hover:text-gray-200" /></button>
                        </div>
                        <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
                            <div className="relative z-20">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Paciente</label>
                                {selectedPatientName ? (
                                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 p-2 rounded text-sm text-green-800"><UserPlusIcon className="w-4 h-4" /> {selectedPatientName}<button type="button" onClick={() => { setSelectedPatientName(''); setNewAppointment(p => ({ ...p, patient_id: '' })) }} className="ml-auto text-xs underline">Cambiar</button></div>
                                ) : (
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                                        <input type="text" placeholder="Buscar nombre..." className="w-full pl-10 p-2 border rounded focus:ring-2 focus:ring-primary outline-none" value={searchPatientTerm} onChange={e => setSearchPatientTerm(e.target.value)} />
                                        {searchResults.length > 0 && (
                                            <ul className="absolute w-full bg-white border shadow-lg max-h-40 overflow-y-auto mt-1 rounded z-50">
                                                {searchResults.map(p => (
                                                    <li key={p.id} onClick={() => { setNewAppointment(x => ({ ...x, patient_id: p.id })); setSelectedPatientName(`${p.nombre} ${p.apellidos}`); setSearchResults([]); setIsCreatingPatient(false); }} className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-b">{p.nombre} {p.apellidos}</li>
                                                ))}
                                            </ul>
                                        )}
                                        {searchPatientTerm.length > 1 && searchResults.length === 0 && (
                                            <div onClick={() => setIsCreatingPatient(true)} className={`mt-2 p-2 rounded border-2 border-dashed cursor-pointer text-center text-sm ${isCreatingPatient ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}><UserPlusIcon className="w-5 h-5 mx-auto mb-1" /> {isCreatingPatient ? `Se creará: "${searchPatientTerm}"` : `Crear nuevo: "${searchPatientTerm}"`}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Hora Inicio</label><input required type="time" className="w-full p-2 border rounded" value={newAppointment.start_hour} onChange={(e) => setNewAppointment({ ...newAppointment, start_hour: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Duración</label><select required className="w-full p-2 border rounded" value={newAppointment.duration} onChange={(e) => setNewAppointment({ ...newAppointment, duration: parseInt(e.target.value) })}> <option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">2 Hrs</option></select></div>
                                <div className="col-span-1"><label className="block text-xs font-bold text-gray-500 mb-1">Doctor</label><select required className="w-full p-2 border rounded" value={newAppointment.doctor_id} onChange={(e) => setNewAppointment({ ...newAppointment, doctor_id: e.target.value })}> <option value="">-- Seleccionar --</option>{doctors.length > 0 ? doctors.map(doc => (<option key={doc.id} value={doc.id}>{doc.nombre_completo}</option>)) : <option disabled>Cargando...</option>}</select></div>
                            </div>
                            <input required placeholder="Motivo de la consulta" className="w-full p-3 border rounded focus:ring-2 focus:ring-primary outline-none" value={newAppointment.motivo} onChange={(e) => setNewAppointment({ ...newAppointment, motivo: e.target.value })} />
                            <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-teal-800 transition-colors">Confirmar Cita</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Agenda;