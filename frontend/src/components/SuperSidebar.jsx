import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ChartBarIcon,
    BuildingOffice2Icon,
    BanknotesIcon,
    ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const SuperSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const menuItems = [
        { name: 'SaaS Dashboard', path: '/backoffice', icon: <ChartBarIcon className="w-5 h-5" /> },
        { name: 'Clínicas (Tenants)', path: '/backoffice/clinicas', icon: <BuildingOffice2Icon className="w-5 h-5" /> },
        { name: 'Pagos y Planes', path: '/backoffice/planes', icon: <BanknotesIcon className="w-5 h-5" /> },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        toast('Hasta luego, Master', { icon: '👋' });
        navigate('/');
    };

    return (
        <div className="h-screen w-64 bg-slate-900 text-white flex flex-col shadow-xl fixed left-0 top-0">
            {/* Logo SaaS */}
            <div className="h-16 flex items-center px-6 border-b border-slate-700 bg-slate-800">
                <span className="text-xl font-bold tracking-tight text-blue-400">ClinicSync</span>
                <span className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded text-white">MASTER</span>
            </div>

            {/* Menú */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            {item.icon}
                            <span className="ml-3">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Botón Salir */}
            <div className="p-4 border-t border-slate-700">
                <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-400 bg-slate-800 hover:bg-red-900/20 rounded-lg transition-colors">
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-2" />
                    Salir
                </button>
            </div>
        </div>
    );
};

export default SuperSidebar;