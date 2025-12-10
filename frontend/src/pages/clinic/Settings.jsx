import { useEffect, useState } from 'react';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import {
    BuildingOfficeIcon, UsersIcon,
    PencilSquareIcon, TrashIcon, PlusIcon,
    UserCircleIcon
} from '@heroicons/react/24/solid';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('clinica'); // 'clinica' o 'usuarios'
    const [loading, setLoading] = useState(false);

    // --- ESTADOS CLÍNICA ---
    const [clinicData, setClinicData] = useState({
        nombre_comercial: '', razon_social: '', rfc: '', direccion_fiscal: '', telefono_contacto: ''
    });

    // --- ESTADOS USUARIOS ---
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null = creando, obj = editando
    const [userForm, setUserForm] = useState({
        nombre_completo: '', email: '', password: '', rol: 'staff', cedula: '', comision_default: 0
    });

    useEffect(() => {
        if (activeTab === 'clinica') loadClinicData();
        if (activeTab === 'usuarios') loadUsers();
    }, [activeTab]);

    // --- API CLÍNICA ---
    const loadClinicData = async () => {
        try {
            const res = await client.get('/configuracion/mi-clinica');
            // Mapear nulls a strings vacios para evitar warnings de react
            const data = res.data;
            setClinicData({
                nombre_comercial: data.nombre_comercial || '',
                razon_social: data.razon_social || '',
                rfc: data.rfc || '',
                direccion_fiscal: data.direccion_fiscal || '',
                telefono_contacto: data.telefono_contacto || ''
            });
        } catch (error) { toast.error("Error cargando datos"); }
    };

    const handleSaveClinic = async (e) => {
        e.preventDefault();
        try {
            await client.put('/configuracion/mi-clinica', clinicData);
            toast.success("Información actualizada");
        } catch (error) { toast.error("Error al guardar"); }
    };

    // --- API USUARIOS ---
    const loadUsers = async () => {
        try {
            const res = await client.get('/usuarios/');
            setUsers(res.data);
        } catch (error) { toast.error("Error cargando personal"); }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await client.put(`/usuarios/${editingUser.id}`, userForm);
                toast.success("Usuario actualizado");
            } else {
                await client.post('/usuarios/', userForm);
                toast.success("Usuario creado");
            }
            setShowUserModal(false);
            loadUsers();
        } catch (error) { toast.error("Error al guardar usuario"); }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("¿Eliminar usuario?")) return;
        try {
            await client.delete(`/usuarios/${id}`);
            toast.success("Eliminado");
            loadUsers();
        } catch (error) { toast.error("Error al eliminar"); }
    };

    const openUserModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setUserForm({
                nombre_completo: user.nombre_completo,
                email: user.email,
                password: '', // No mostramos password
                rol: user.rol,
                cedula: user.cedula_profesional || '',
                comision_default: user.porcentaje_comision_default || 0
            });
        } else {
            setEditingUser(null);
            setUserForm({ nombre_completo: '', email: '', password: '', rol: 'staff', cedula: '', comision_default: 0 });
        }
        setShowUserModal(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-lg px-4">
                <button onClick={() => setActiveTab('clinica')} className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'clinica' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
                    <BuildingOfficeIcon className="w-4 h-4 inline mr-2" /> Datos de la Clínica
                </button>
                <button onClick={() => setActiveTab('usuarios')} className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'usuarios' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
                    <UsersIcon className="w-4 h-4 inline mr-2" /> Equipo y Permisos
                </button>
            </div>

            {/* CONTENIDO: DATOS CLÍNICA */}
            {activeTab === 'clinica' && (
                <div className="bg-white p-6 rounded-b-lg shadow border border-t-0">
                    <form onSubmit={handleSaveClinic} className="max-w-2xl">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Comercial</label>
                                <input className="w-full p-2 border rounded" value={clinicData.nombre_comercial} onChange={e => setClinicData({ ...clinicData, nombre_comercial: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Razón Social</label>
                                    <input className="w-full p-2 border rounded" value={clinicData.razon_social} onChange={e => setClinicData({ ...clinicData, razon_social: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">RFC</label>
                                    <input className="w-full p-2 border rounded" value={clinicData.rfc} onChange={e => setClinicData({ ...clinicData, rfc: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Dirección Completa (Para Recetas)</label>
                                <input className="w-full p-2 border rounded" value={clinicData.direccion_fiscal} onChange={e => setClinicData({ ...clinicData, direccion_fiscal: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono de Contacto</label>
                                <input className="w-full p-2 border rounded" value={clinicData.telefono_contacto} onChange={e => setClinicData({ ...clinicData, telefono_contacto: e.target.value })} />
                            </div>

                            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-teal-800 w-fit">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            )}

            {/* CONTENIDO: USUARIOS */}
            {activeTab === 'usuarios' && (
                <div className="bg-white p-6 rounded-b-lg shadow border border-t-0">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-gray-700">Personal Activo</h3>
                        <button onClick={() => openUserModal()} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center hover:bg-green-700">
                            <PlusIcon className="w-4 h-4 mr-2" /> Agregar Usuario
                        </button>
                    </div>

                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Nombre</th>
                                <th className="px-4 py-2 text-left">Rol</th>
                                <th className="px-4 py-2 text-left">Cédula</th>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-center">Comisión</th>
                                <th className="px-4 py-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="px-4 py-3 font-medium flex items-center"><UserCircleIcon className="w-5 h-5 text-gray-400 mr-2" /> {u.nombre_completo}</td>
                                    <td className="px-4 py-3 capitalize">{u.rol}</td>
                                    <td className="px-4 py-3 text-gray-500">{u.cedula_profesional || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                                    <td className="px-4 py-3 text-center">{u.porcentaje_comision_default > 0 ? `${(u.porcentaje_comision_default * 100).toFixed(0)}%` : '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => openUserModal(u)} className="text-blue-600 hover:text-blue-800 mr-3"><PencilSquareIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800"><TrashIcon className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL USUARIO */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Empleado'}</h3>
                        <form onSubmit={handleSaveUser} className="space-y-3">
                            <input required placeholder="Nombre Completo" className="w-full p-2 border rounded" value={userForm.nombre_completo} onChange={e => setUserForm({ ...userForm, nombre_completo: e.target.value })} />
                            <input required type="email" placeholder="Correo (Login)" className="w-full p-2 border rounded" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                            {!editingUser && <input required type="password" placeholder="Contraseña" className="w-full p-2 border rounded" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />}
                            {editingUser && <input type="password" placeholder="Nueva Contraseña (Opcional)" className="w-full p-2 border rounded" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />}

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Rol</label>
                                    <select className="w-full p-2 border rounded" value={userForm.rol} onChange={e => setUserForm({ ...userForm, rol: e.target.value })}>
                                        <option value="staff">Staff / Recepción</option>
                                        <option value="dentista">Dentista / Médico</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Comisión (0.10 = 10%)</label>
                                    <input type="number" step="0.01" className="w-full p-2 border rounded" value={userForm.comision_default} onChange={e => setUserForm({ ...userForm, comision_default: e.target.value })} />
                                </div>
                            </div>

                            <input placeholder="Cédula Profesional (Opcional)" className="w-full p-2 border rounded" value={userForm.cedula} onChange={e => setUserForm({ ...userForm, cedula: e.target.value })} />

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-bold">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;