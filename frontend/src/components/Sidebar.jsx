import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    HomeIcon,
    CalendarIcon,
    UsersIcon,
    CurrencyDollarIcon,
    BeakerIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Obtener Rol del Usuario (Decodificación Manual sin librería externa)
    const token = localStorage.getItem('token');
    let userRole = 'staff'; // Rol por defecto seguro

    if (token) {
        try {
            // Decodificar payload del JWT (Parte media del token)
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const decoded = JSON.parse(jsonPayload);
            userRole = decoded.role || 'staff';
        } catch (e) {
            console.error("Error leyendo token", e);
        }
    }

    // Definir menú con permisos
    const allMenuItems = [
        {
            name: 'Dashboard',
            path: '/dashboard',
            icon: <HomeIcon className="w-5 h-5" />,
            roles: ['admin']
        },
        {
            name: 'Agenda',
            path: '/dashboard/agenda',
            icon: <CalendarIcon className="w-5 h-5" />,
            roles: ['admin', 'dentista', 'medico', 'staff']
        },
        {
            name: 'Pacientes',
            path: '/dashboard/pacientes',
            icon: <UsersIcon className="w-5 h-5" />,
            roles: ['admin', 'dentista', 'medico']
        },
        {
            name: 'Caja & Finanzas',
            path: '/dashboard/finanzas',
            icon: <CurrencyDollarIcon className="w-5 h-5" />,
            roles: ['admin', 'staff']
        },
        {
            name: 'Inventario',
            path: '/dashboard/inventario',
            icon: <BeakerIcon className="w-5 h-5" />,
            roles: ['admin', 'dentista', 'medico']
        },
        {
            name: 'Configuración',
            path: '/dashboard/configuracion',
            icon: <Cog6ToothIcon className="w-5 h-5" />,
            roles: ['admin']
        },
    ];

    // Filtrar menú según el rol
    const visibleMenu = allMenuItems.filter(item => item.roles.includes(userRole));

    const handleLogout = () => {
        localStorage.removeItem('token');
        toast.success("Sesión cerrada correctamente");
        navigate('/');
    };

    return (
        <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg fixed left-0 top-0 z-50">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
                <Cog6ToothIcon className="w-8 h-8 text-primary mr-2" />
                <span className="text-xl font-bold text-gray-800 tracking-tight">ClinicSync</span>
            </div>

            {/* Perfil Rápido */}
            <div className="px-6 py-4 border-b border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase">Perfil</p>
                <p className="text-sm font-bold text-gray-800 capitalize">{userRole}</p>
            </div>

            {/* Menú */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {visibleMenu.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            {item.icon}
                            <span className="ml-3">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Sidebar */}
            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-2" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

export default Sidebar;