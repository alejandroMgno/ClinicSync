import { useEffect, useState } from 'react';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import { UserCircleIcon, BuildingOfficeIcon, XMarkIcon } from '@heroicons/react/24/solid';

const Tenants = () => {
    const [clinicas, setClinicas] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estado para el Modal de Detalles
    const [selectedClinic, setSelectedClinic] = useState(null);
    const [clinicUsers, setClinicUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Estado para formulario de creación (lo mantenemos igual)
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newClinic, setNewClinic] = useState({
        nombre_comercial: '', plan_suscripcion: 'pro', rfc: '',
        admin_nombre: '', admin_email: '', admin_password: ''
    });

    useEffect(() => {
        fetchClinicas();
    }, []);

    const fetchClinicas = async () => {
        try {
            const res = await client.get('/superadmin/clinicas');
            setClinicas(res.data);
        } catch (error) {
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    // Cuando das clic en una clínica
    const handleOpenDetails = async (clinic) => {
        setSelectedClinic(clinic);
        setLoadingUsers(true);
        try {
            // Llamamos al nuevo endpoint del backend
            const res = await client.get(`/superadmin/clinicas/${clinic.id}/usuarios`);
            setClinicUsers(res.data);
        } catch (error) {
            toast.error("No se pudieron cargar los usuarios");
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newClinic,
                razon_social: newClinic.nombre_comercial,
                direccion_fiscal: "Dirección Pendiente"
            };
            await client.post('/superadmin/clinicas', payload);
            toast.success("Clínica creada");
            setShowCreateForm(false);
            fetchClinicas();
            setNewClinic({ nombre_comercial: '', plan_suscripcion: 'pro', rfc: '', admin_nombre: '', admin_email: '', admin_password: '' });
        } catch (error) {
            toast.error("Error al crear");
        }
    };

    // Función visual para calcular el cobro (Lógica de Negocio Visual)
    const getPrecio = (plan) => {
        if (plan === 'basic') return '$700.00 MXN';
        if (plan === 'pro') return '$1,500.00 MXN';
        return '$0.00';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cartera de Clientes</h1>
                    <p className="text-sm text-gray-500">Gestión de suscripciones y accesos</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow font-medium transition-colors"
                >
                    {showCreateForm ? 'Cancelar' : '+ Nueva Clínica'}
                </button>
            </div>

            {/* Formulario de Creación (Ocultable) */}
            {showCreateForm && (
                <div className="bg-white p-6 rounded-xl shadow border border-gray-200 animate-fadeIn">
                    <h3 className="font-bold text-gray-700 mb-4">Datos de Contratación</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ... (Mismos inputs que tenías antes) ... */}
                        <input required placeholder="Nombre Comercial" className="p-2 border rounded" value={newClinic.nombre_comercial} onChange={e => setNewClinic({ ...newClinic, nombre_comercial: e.target.value })} />
                        <input required placeholder="RFC" className="p-2 border rounded" value={newClinic.rfc} onChange={e => setNewClinic({ ...newClinic, rfc: e.target.value })} />
                        <select className="p-2 border rounded" value={newClinic.plan_suscripcion} onChange={e => setNewClinic({ ...newClinic, plan_suscripcion: e.target.value })}>
                            <option value="basic">Plan Básico ($700)</option>
                            <option value="pro">Plan PRO ($1,500)</option>
                        </select>
                        <input required placeholder="Nombre Admin" className="p-2 border rounded" value={newClinic.admin_nombre} onChange={e => setNewClinic({ ...newClinic, admin_nombre: e.target.value })} />
                        <input required placeholder="Email Admin" className="p-2 border rounded" value={newClinic.admin_email} onChange={e => setNewClinic({ ...newClinic, admin_email: e.target.value })} />
                        <input required type="password" placeholder="Password" className="p-2 border rounded" value={newClinic.admin_password} onChange={e => setNewClinic({ ...newClinic, admin_password: e.target.value })} />
                        <button type="submit" className="md:col-span-2 bg-green-600 text-white py-2 rounded font-bold">Guardar Contrato</button>
                    </form>
                </div>
            )}

            {/* TABLA PRINCIPAL */}
            <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Clínica</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ingreso Mensual</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? <tr><td colSpan="5" className="p-4 text-center">Cargando...</td></tr> :
                            clinicas.map((t) => (
                                <tr key={t.id} className="hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => handleOpenDetails(t)}>
                                    <td className="px-6 py-4 text-sm text-gray-500">#{t.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <BuildingOfficeIcon className="w-5 h-5 text-gray-400 mr-2" />
                                            <span className="font-medium text-gray-900">{t.nombre_comercial}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 ml-7">{t.rfc}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${t.plan_suscripcion === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                            {t.plan_suscripcion}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-700">
                                        {getPrecio(t.plan_suscripcion)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">Ver Detalles</button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE DETALLES (Drill Down) */}
            {selectedClinic && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">

                        {/* Header Modal */}
                        <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl font-bold">{selectedClinic.nombre_comercial}</h2>
                                <p className="text-slate-400 text-sm">ID: {selectedClinic.id} | {selectedClinic.rfc}</p>
                            </div>
                            <button onClick={() => setSelectedClinic(null)} className="text-gray-400 hover:text-white">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 text-lg">Personal Activo</h3>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                    {clinicUsers.length} / {selectedClinic.plan_suscripcion === 'basic' ? '2' : '5'} Licencias
                                </span>
                            </div>

                            {/* Lista de Usuarios */}
                            <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                                {loadingUsers ? (
                                    <p className="p-4 text-center text-gray-500">Cargando personal...</p>
                                ) : (
                                    <table className="min-w-full">
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rol</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {clinicUsers.map(u => (
                                                <tr key={u.id}>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 flex items-center">
                                                        <UserCircleIcon className="w-4 h-4 mr-2 text-gray-400" />
                                                        {u.nombre_completo}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{u.rol}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Botones de Acción */}
                            <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                                <button
                                    onClick={() => toast("Funcionalidad de editar completa próximamente")}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                                >
                                    Editar Datos
                                </button>
                                <button
                                    onClick={() => toast("Suspensión de servicio simulada")}
                                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium"
                                >
                                    Suspender Servicio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tenants;