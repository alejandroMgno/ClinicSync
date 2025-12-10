import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/axios'; // ⚠️ DESCOMENTA ESTA LÍNEA EN TU PROYECTO
import toast from 'react-hot-toast';
import {
    UserPlus, Search, FolderOpen, Edit2, Trash2,
    X, Phone, Mail, Briefcase, Calendar, User
} from 'lucide-react';


const Patients = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal y Edición
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const initialForm = {
        nombre: '', apellidos: '', telefono_movil: '', email: '',
        fecha_nacimiento: '', sexo: 'M', ocupacion: ''
    };
    const [formData, setFormData] = useState(initialForm);

    useEffect(() => { loadPatients(); }, []);

    const loadPatients = async () => {
        setLoading(true);
        try {
            // En tu proyecto real, esto llamará a tu backend
            const res = await client.get('/pacientes/');

            // Validación robusta de datos
            let data = [];
            if (Array.isArray(res.data)) data = res.data;
            else if (res.data && Array.isArray(res.data.results)) data = res.data.results;
            else if (res.data && Array.isArray(res.data.data)) data = res.data.data;

            setPatients(data);
        } catch (error) {
            toast.error("Error cargando pacientes");
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setFormData(initialForm);
        setIsEditing(false);
        setShowModal(true);
    };

    const openEdit = (patient) => {
        setFormData({
            nombre: patient.nombre,
            apellidos: patient.apellidos,
            telefono_movil: patient.telefono_movil,
            email: patient.email,
            fecha_nacimiento: patient.fecha_nacimiento,
            sexo: patient.sexo,
            ocupacion: patient.ocupacion || ''
        });
        setSelectedId(patient.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, datos_personales: { registro: "Web App" } };

            if (isEditing) {
                await client.put(`/pacientes/${selectedId}`, payload);
                toast.success("Paciente actualizado");
            } else {
                await client.post('/pacientes/', payload);
                toast.success("Paciente registrado");
            }

            setShowModal(false);
            loadPatients();
        } catch (error) {
            toast.error("Error al guardar");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este expediente?")) return;
        try {
            await client.delete(`/pacientes/${id}`);
            toast.success("Paciente eliminado");
            loadPatients();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const calcularEdad = (fecha) => {
        if (!fecha) return '-';
        const hoy = new Date();
        const cumple = new Date(fecha);
        let edad = hoy.getFullYear() - cumple.getFullYear();
        const m = hoy.getMonth() - cumple.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
        return edad;
    };

    const filteredPatients = patients.filter(p =>
        (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.apellidos || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-200">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pacientes</h1>
                        <p className="text-slate-500 mt-2 text-sm flex items-center gap-2">
                            Gestiona tu base de datos de clientes
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {patients.length} total
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative group w-full md:w-80">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full rounded-lg border-0 py-2.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white shadow-sm transition-all"
                                placeholder="Buscar por nombre, apellido..."
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={openCreate}
                            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all active:scale-95"
                        >
                            <UserPlus className="h-4 w-4" />
                            Nuevo Paciente
                        </button>
                    </div>
                </div>

                {/* --- TABLA --- */}
                <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Edad / Sexo</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {loading ? (
                                    <tr><td colSpan="4" className="p-10 text-center text-slate-400 animate-pulse">Cargando registros...</td></tr>
                                ) : filteredPatients.length === 0 ? (
                                    <tr><td colSpan="4" className="p-10 text-center text-slate-500">No se encontraron resultados.</td></tr>
                                ) : filteredPatients.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                {/* Avatar con iniciales */}
                                                <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${p.sexo === 'M' ? 'bg-gradient-to-tr from-blue-500 to-cyan-500' : 'bg-gradient-to-tr from-pink-500 to-rose-500'}`}>
                                                    {p.nombre ? p.nombre.charAt(0).toUpperCase() : ''}{p.apellidos ? p.apellidos.charAt(0).toUpperCase() : ''}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{p.nombre} {p.apellidos}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Briefcase className="w-3 h-3" />
                                                        {p.ocupacion || 'Sin registro'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-700">{calcularEdad(p.fecha_nacimiento)} años</span>
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${p.sexo === 'M' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-pink-50 text-pink-700 ring-pink-600/20'}`}>
                                                        {p.sexo === 'M' ? 'Hombre' : 'Mujer'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" /> {p.fecha_nacimiento}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {p.telefono_movil}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {p.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                                <button onClick={() => navigate(`/dashboard/pacientes/${p.id}`)} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Ver detalle">
                                                    <FolderOpen className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => openEdit(p)} className="text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 p-2 rounded-lg transition-colors" title="Editar">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Eliminar">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- MODAL LIMPIO Y LUMINOSO --- */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        {/* Overlay claro con blur en lugar de negro */}
                        <div
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setShowModal(false)}
                        ></div>

                        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:w-full sm:max-w-2xl border border-slate-100 animate-fade-in-up">

                            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-semibold leading-6 text-slate-900">
                                        {isEditing ? 'Editar Expediente' : 'Registrar Nuevo Paciente'}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">Complete la información requerida.</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="px-6 py-6">
                                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">

                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Nombre(s)</label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <User className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input required
                                                className="block w-full rounded-md border-0 py-2.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-slate-50/50"
                                                placeholder="Ej. Juan"
                                                value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Apellidos</label>
                                        <input required
                                            className="block w-full rounded-md border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-slate-50/50 px-3"
                                            placeholder="Ej. Pérez López"
                                            value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Fecha de Nacimiento</label>
                                        <input required type="date"
                                            className="block w-full rounded-md border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-slate-50/50 px-3"
                                            value={formData.fecha_nacimiento} onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Sexo</label>
                                        <select
                                            className="block w-full rounded-md border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-slate-50/50 px-3"
                                            value={formData.sexo} onChange={e => setFormData({ ...formData, sexo: e.target.value })}
                                        >
                                            <option value="M">Masculino</option>
                                            <option value="F">Femenino</option>
                                        </select>
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Teléfono</label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Phone className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input required
                                                className="block w-full rounded-md border-0 py-2.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-slate-50/50"
                                                placeholder="(555) 123-4567"
                                                value={formData.telefono_movil} onChange={e => setFormData({ ...formData, telefono_movil: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Email</label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input type="email"
                                                className="block w-full rounded-md border-0 py-2.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-slate-50/50"
                                                placeholder="cliente@ejemplo.com"
                                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-1 sm:col-span-2">
                                        <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Ocupación</label>
                                        <input
                                            className="block w-full rounded-md border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-slate-50/50 px-3"
                                            placeholder="Ej. Profesor, Estudiante..."
                                            value={formData.ocupacion} onChange={e => setFormData({ ...formData, ocupacion: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-end gap-x-3 border-t border-slate-100 pt-5">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all transform active:scale-95"
                                    >
                                        {isEditing ? 'Guardar Cambios' : 'Registrar Paciente'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default Patients;