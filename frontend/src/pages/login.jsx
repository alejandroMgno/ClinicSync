import { useState } from 'react';
import client from '../api/axios'; // Importamos la config que acabamos de crear
import toast, { Toaster } from 'react-hot-toast';
import { jwtDecode } from "jwt-decode";

function App() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Creamos un FormData porque el backend espera un formulario, no un JSON simple
        const formData = new FormData();
        formData.append('username', email); // Ojo: Python espera el campo 'username' aunque le mandemos el email
        formData.append('password', password);

        try {
            // 1. Enviar credenciales
            const response = await client.post('/token', formData);
            const token = response.data.access_token;

            // 2. Guardar Token en el navegador (LocalStorage)
            localStorage.setItem('token', token);

            // 3. Decodificar para ver quién entró
            const decoded = jwtDecode(token);
            toast.success(`Bienvenido ${decoded.sub}`);

            // Lógica de Redirección Inteligente
            setTimeout(() => {
                if (decoded.role === 'super_admin') {
                    window.location.href = '/backoffice';
                } else {
                    window.location.href = '/dashboard';
                }
            }, 1000);
            // Aquí redirigiremos al Dashboard (Próximamente)

        } catch (error) {
            console.error(error);
            toast.error('Credenciales incorrectas o servidor apagado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <Toaster position="top-right" />

            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-primary">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-primary tracking-tight">ClinicSync</h1>
                    <p className="text-gray-500 mt-2 text-sm font-medium uppercase tracking-wide">Enterprise Edition V5.0</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Correo Corporativo</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="admin@premium.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-teal-800 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Validando...' : 'Ingresar al Sistema'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">

                </div>
            </div>
        </div>
    );
}

export default App;