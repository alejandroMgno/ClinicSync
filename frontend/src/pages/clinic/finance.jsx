import React, { useEffect, useState } from 'react';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import {
    CurrencyDollarIcon, QueueListIcon, PlusIcon,
    CreditCardIcon, BanknotesIcon, CalendarIcon,
    DocumentChartBarIcon, CalculatorIcon, XMarkIcon,
    PrinterIcon, ShareIcon, PaperAirplaneIcon, EnvelopeIcon,
    ArrowTrendingUpIcon, ArrowTrendingDownIcon, TrophyIcon
} from '@heroicons/react/24/solid';

// // --- CLIENTE SIMULADO ---
// const mockPendientes = [
//     { id: 101, patient_name: 'Juan Pérez', monto_total: 1500.00, concepto: 'Limpieza Dental', telefono: '5215551234567' },
//     { id: 102, patient_name: 'María Gómez', monto_total: 850.50, concepto: 'Consulta General', telefono: '5215559876543' },
// ];

// const mockSalesData = [
//     { id: 1, fecha: new Date().toISOString(), paciente: 'Ana López', concepto: 'Extracción', metodo_pago: 'efectivo', monto: 1200, telefono: '5215551112222', tipo: 'ingreso' },
//     { id: 2, fecha: new Date().toISOString(), paciente: 'Carlos Ruiz', concepto: 'Blanqueamiento', metodo_pago: 'tarjeta', monto: 2500, telefono: '5215553334444', tipo: 'ingreso' },
//     { id: 3, fecha: new Date().toISOString(), paciente: 'Office Depot', concepto: 'Hojas y Tinta', metodo_pago: 'efectivo', monto: -450, tipo: 'gasto' },
// ];

// const client = {
//     get: (url) => new Promise((resolve) => {
//         setTimeout(() => {
//             if (url.includes('pendientes')) resolve({ data: [...mockPendientes] });
//             else if (url.includes('catalogo')) resolve({ data: [] });
//             else if (url.includes('reporte-ventas')) resolve({ data: [...mockSalesData] });
//             else if (url.includes('cortes')) resolve({ data: [] });
//             else resolve({ data: [] });
//         }, 500);
//     }),
//     post: (url, data) => new Promise((resolve) => {
//         setTimeout(() => {
//             if (url.includes('cobrar')) {
//                 const idx = mockPendientes.findIndex(p => p.id === data.budget_id);
//                 if (idx !== -1) mockPendientes.splice(idx, 1);
//                 resolve({ data: { success: true } });
//             } else if (url.includes('gasto')) {
//                 mockSalesData.push({ ...data, id: Date.now(), tipo: 'gasto', monto: -Math.abs(data.monto) });
//                 resolve({ data: { success: true } });
//             } else if (url.includes('corte')) {
//                 resolve({
//                     data: {
//                         estado: 'Corte Correcto',
//                         monto_sistema: data.monto_sistema, // Usamos el calculado en el frontend para la demo
//                         monto_real: data.monto_final_real,
//                         diferencia: data.monto_final_real - data.monto_sistema
//                     }
//                 });
//             } else {
//                 resolve({ data: { ...data, id: Date.now() } });
//             }
//         }, 500);
//     }),
//     put: () => Promise.resolve({}),
//     delete: () => Promise.resolve({})
// };

const Finance = () => {
    const [activeTab, setActiveTab] = useState('caja');
    const [loading, setLoading] = useState(false);

    // Configuración de Metas (Podría venir de base de datos)
    const dailyGoal = 5000;

    // --- ESTADOS DE CAJA ---
    const [pendientes, setPendientes] = useState([]);
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');

    // --- ESTADOS DE GASTOS ---
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseData, setExpenseData] = useState({ concepto: '', monto: '', metodo: 'efectivo' });

    // --- ESTADOS DE TICKET / RECIBO ---
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [currentTicket, setCurrentTicket] = useState(null);

    // --- ESTADOS DE CATÁLOGO ---
    const [servicios, setServicios] = useState([]);
    const [newService, setNewService] = useState({ codigo: '', nombre: '', precio: '', costo: '', categoria: 'dental' });

    // --- ESTADOS DE REPORTES Y CORTE ---
    const today = new Date().toISOString().split('T')[0];
    const [dateRange, setDateRange] = useState({ start: today, end: today });
    const [salesData, setSalesData] = useState([]); // Ingresos y Gastos
    const [cortesHistory, setCortesHistory] = useState([]);
    const [reportSubTab, setReportSubTab] = useState('ventas');
    const [summary, setSummary] = useState({ totalIngresos: 0, totalGastos: 0, balance: 0, efectivoEnCaja: 0 });

    const [showCorteModal, setShowCorteModal] = useState(false);
    const [corteData, setCorteData] = useState({ inicial: 0, final: 0 });
    const [corteResult, setCorteResult] = useState(null);

    useEffect(() => {
        if (activeTab === 'caja') loadPendientes();
        if (activeTab === 'catalogo') loadCatalogo();
        loadReportesGeneral(); // Cargamos siempre para actualizar la meta
    }, [activeTab, reportSubTab, dateRange]);

    // --- CARGA DE DATOS ---
    const loadPendientes = async () => {
        try {
            const res = await client.get('/finanzas/caja/pendientes');
            setPendientes(res.data);
        } catch (error) { if (error.response?.status !== 404) console.error("Error"); }
    };

    const loadCatalogo = async () => {
        try {
            const res = await client.get('/finanzas/catalogo');
            setServicios(res.data);
        } catch (error) { toast.error("Error cargando precios"); }
    };

    const loadReportesGeneral = async () => {
        if (reportSubTab === 'cortes' && activeTab === 'reportes') {
            loadCortes();
            return;
        }

        setLoading(true);
        try {
            const res = await client.get(`/finanzas/reporte-ventas?start_date=${dateRange.start}&end_date=${dateRange.end}`);
            setSalesData(res.data);

            // Cálculos Financieros
            const ingresos = res.data.filter(i => i.tipo === 'ingreso' || !i.tipo);
            const gastos = res.data.filter(i => i.tipo === 'gasto');

            const totalIngresos = ingresos.reduce((sum, item) => sum + item.monto, 0);
            const totalGastos = gastos.reduce((sum, item) => sum + Math.abs(item.monto), 0);

            // Cálculo específico de efectivo para el corte
            const ingresosEfectivo = ingresos.filter(i => i.metodo_pago === 'efectivo').reduce((sum, i) => sum + i.monto, 0);
            const gastosEfectivo = gastos.filter(i => i.metodo_pago === 'efectivo').reduce((sum, i) => sum + Math.abs(item.monto), 0);

            setSummary({
                totalIngresos,
                totalGastos,
                balance: totalIngresos - totalGastos,
                efectivoEnCaja: ingresosEfectivo - gastosEfectivo
            });

        } catch (error) { toast.error("Error actualizando datos"); }
        finally { setLoading(false); }
    };

    const loadCortes = async () => {
        try {
            const res = await client.get(`/finanzas/caja/cortes?start_date=${dateRange.start}&end_date=${dateRange.end}`);
            setCortesHistory(res.data);
        } catch (error) { toast.error("Error cargando cortes"); }
    };

    const handleSaveService = async (e) => {
        e.preventDefault();

        // Validación básica
        if (!newService.codigo || !newService.nombre || !newService.precio) {
            toast.error("El código, nombre y precio son obligatorios");
            return;
        }

        try {
            // Enviamos los datos al endpoint /finanzas/catalogo que ya tienes en backend
            await client.post('/finanzas/catalogo', {
                ...newService,
                precio: parseFloat(newService.precio),
                costo: parseFloat(newService.costo || 0)
            });

            toast.success("Servicio agregado correctamente");

            // Limpiamos el formulario y recargamos la lista
            setNewService({ codigo: '', nombre: '', precio: '', costo: '', categoria: 'dental' });
            loadCatalogo();

        } catch (error) {
            console.error(error);
            // Si el backend responde con un error específico (ej. "Solo Admin")
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Error al guardar servicio");
            }
        }
    };

    // --- ACCIONES ---
    const handleCobrar = async () => {
        if (!selectedBudget) return;
        try {
            await client.post('/finanzas/caja/cobrar', {
                budget_id: selectedBudget.id,
                metodo_pago: paymentMethod,
                monto_recibido: selectedBudget.monto_total
            });
            toast.success(`Cobro registrado`);

            const ticketData = {
                ...selectedBudget,
                fecha: new Date().toISOString(),
                metodo_pago: paymentMethod,
                folio: `TK-${Date.now().toString().slice(-6)}`
            };
            setCurrentTicket(ticketData);
            setShowTicketModal(true);
            setSelectedBudget(null);
            loadPendientes();
            loadReportesGeneral(); // Actualizar meta
        } catch (error) { toast.error("Error al cobrar"); }
    };

    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        try {
            await client.post('/finanzas/caja/gasto', {
                concepto: expenseData.concepto,
                monto: parseFloat(expenseData.monto),
                metodo_pago: expenseData.metodo,
                fecha: new Date().toISOString()
            });
            toast.success("Salida de efectivo registrada");
            setShowExpenseModal(false);
            setExpenseData({ concepto: '', monto: '', metodo: 'efectivo' });
            loadReportesGeneral();
        } catch (error) { toast.error("Error al registrar gasto"); }
    };

    // --- TICKET Y CORTE ---
    const handleViewTicket = (sale) => {
        const ticketData = {
            patient_name: sale.paciente,
            monto_total: Math.abs(sale.monto),
            fecha: sale.fecha,
            metodo_pago: sale.metodo_pago,
            folio: `TK-${sale.id || 'HIST'}`,
            telefono: sale.telefono,
            concepto: sale.concepto,
            isExpense: sale.tipo === 'gasto'
        };
        setCurrentTicket(ticketData);
        setShowTicketModal(true);
    };

    const getTicketText = () => {
        if (!currentTicket) return '';
        const titulo = currentTicket.isExpense ? 'COMPROBANTE DE EGRESO' : 'RECIBO DE PAGO';
        return `
🧾 *${titulo}*
CLÍNICA DENTAL
------------------------------
📅 Fecha: ${new Date(currentTicket.fecha).toLocaleString()}
🔖 Folio: ${currentTicket.folio}
👤 ${currentTicket.isExpense ? 'Destino' : 'Paciente'}: ${currentTicket.patient_name}
📝 Concepto: ${currentTicket.concepto || 'Servicios Dentales'}
------------------------------
💰 *TOTAL: $${currentTicket.monto_total?.toFixed(2)}*
💳 Método: ${currentTicket.metodo_pago?.toUpperCase()}
------------------------------
${currentTicket.isExpense ? 'Salida autorizada' : '¡Gracias por su preferencia!'}
        `.trim();
    };

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(getTicketText());
        const phoneNumber = currentTicket.telefono ? currentTicket.telefono.replace(/\D/g, '') : '';
        const url = phoneNumber ? `https://wa.me/${phoneNumber}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(url, '_blank');
    };

    const handlePrintTicket = () => {
        if (!currentTicket) return;
        const w = window.open('', '', 'height=600,width=400');
        w.document.write('<html><head><title>Ticket</title><style>body{font-family:monospace;margin:20px;width:300px;text-align:center;}.line{border-top:1px dashed #000;margin:10px 0;}.left{text-align:left;}.right{text-align:right;}.flex{display:flex;justify-content:space-between;}</style></head><body>');
        w.document.write(`<h2>CLÍNICA DENTAL</h2><p>${new Date(currentTicket.fecha).toLocaleString()}</p><div class="line"></div>`);
        w.document.write(`<div class="left"><p><strong>Folio:</strong> ${currentTicket.folio}</p><p><strong>${currentTicket.isExpense ? 'Destino' : 'Paciente'}:</strong> ${currentTicket.patient_name}</p><p><strong>Concepto:</strong> ${currentTicket.concepto}</p></div><div class="line"></div>`);
        w.document.write(`<div class="flex"><strong>TOTAL:</strong><span>$${currentTicket.monto_total?.toFixed(2)}</span></div>`);
        w.document.write(`<div class="flex"><span>Método:</span><span>${currentTicket.metodo_pago?.toUpperCase()}</span></div>`);
        w.document.write(`<div class="line"></div><p>${currentTicket.isExpense ? 'Firma de Autorización' : '¡Gracias por su visita!'}</p>`);
        w.document.write('</body></html>');
        w.document.close();
        setTimeout(() => w.print(), 250);
    };

    const handleRealizarCorte = async (e) => {
        e.preventDefault();
        try {
            // El sistema calcula: Fondo Inicial + Ventas Efectivo - Gastos Efectivo
            const montoEsperadoSistema = parseFloat(corteData.inicial) + summary.efectivoEnCaja;

            const res = await client.post('/finanzas/caja/corte', {
                monto_inicial: parseFloat(corteData.inicial),
                monto_final_real: parseFloat(corteData.final),
                monto_sistema: montoEsperadoSistema
            });
            setCorteResult(res.data);
            toast.success("Corte Z registrado");
        } catch (error) { toast.error("Error al realizar corte"); }
    };

    // --- UTILS ---
    const progressPercent = Math.min((summary.totalIngresos / dailyGoal) * 100, 100);

    return (
        <div className="space-y-6 animate-fade-in font-sans text-gray-800 p-6 bg-gray-50 min-h-screen">

            {/* HEADER CON METAS Y RESUMEN (IRRESISTIBLE #1) */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><TrophyIcon className="w-40 h-40" /></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-4">
                    <div className="w-full md:w-1/2">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Meta Diaria de Ingresos</p>
                        <div className="flex items-end gap-2 mb-2">
                            <h2 className="text-4xl font-bold">${summary.totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
                            <span className="text-gray-400 mb-1">/ ${dailyGoal.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                            <div className={`h-3 rounded-full transition-all duration-1000 ${progressPercent >= 100 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`} style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <p className="text-xs mt-2 text-gray-400">{progressPercent >= 100 ? '¡Felicidades! Meta superada 🎉' : `Faltan $${(dailyGoal - summary.totalIngresos).toLocaleString()} para la meta`}</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                            <p className="text-xs text-gray-300">Balance Total</p>
                            <p className="text-xl font-bold text-emerald-400">+${summary.balance.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                            <p className="text-xs text-gray-300">Gastos/Salidas</p>
                            <p className="text-xl font-bold text-rose-400">-${summary.totalGastos.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BARRA DE NAVEGACIÓN */}
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Operaciones</h1>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex">
                    <button onClick={() => setActiveTab('caja')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'caja' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Caja</button>
                    <button onClick={() => { setActiveTab('reportes'); loadReportesGeneral(); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'reportes' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Reportes</button>
                    <button onClick={() => setActiveTab('catalogo')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'catalogo' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Catálogo</button>
                </div>
            </div>

            {/* --- PESTAÑA CAJA --- */}
            {activeTab === 'catalogo' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLUMNA IZQUIERDA: FORMULARIO */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-2 text-blue-600" /> Nuevo Servicio
                        </h3>

                        <form onSubmit={handleSaveService} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Código Interno</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                    value={newService.codigo}
                                    onChange={e => setNewService({ ...newService, codigo: e.target.value })}
                                    placeholder="Ej. EXT-001"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Servicio</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                    value={newService.nombre}
                                    onChange={e => setNewService({ ...newService, nombre: e.target.value })}
                                    placeholder="Ej. Extracción Simple"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Precio Público</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-6 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                                            value={newService.precio}
                                            onChange={e => setNewService({ ...newService, precio: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Costo (Opcional)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-6 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newService.costo}
                                            onChange={e => setNewService({ ...newService, costo: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                                <select
                                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={newService.categoria}
                                    onChange={e => setNewService({ ...newService, categoria: e.target.value })}
                                >
                                    <option value="dental">Dental</option>
                                    <option value="medicina">Medicina General</option>
                                    <option value="ortodoncia">Ortodoncia</option>
                                    <option value="cirugia">Cirugía</option>
                                    <option value="rayos-x">Rayos X / Imagen</option>
                                    <option value="laboratorio">Laboratorio</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95 flex justify-center items-center">
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Guardar Servicio
                            </button>
                        </form>
                    </div>

                    {/* COLUMNA DERECHA: TABLA DE SERVICIOS */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 flex items-center">
                                <QueueListIcon className="w-5 h-5 mr-2 text-gray-400" />
                                Catálogo de Precios
                            </h3>
                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-200">
                                {servicios.length} Servicios Activos
                            </span>
                        </div>

                        <div className="overflow-x-auto flex-1 overflow-y-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-white text-gray-500 text-xs uppercase font-semibold sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left bg-gray-50/50 backdrop-blur-sm">Código</th>
                                        <th className="px-6 py-4 text-left bg-gray-50/50 backdrop-blur-sm">Servicio</th>
                                        <th className="px-6 py-4 text-center bg-gray-50/50 backdrop-blur-sm">Categoría</th>
                                        <th className="px-6 py-4 text-right bg-gray-50/50 backdrop-blur-sm">Precio</th>
                                        <th className="px-6 py-4 text-center bg-gray-50/50 backdrop-blur-sm">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {servicios.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                                                <QueueListIcon className="w-12 h-12 mb-2 text-gray-200" />
                                                <p>No hay servicios registrados.</p>
                                                <p className="text-xs mt-1">Usa el formulario de la izquierda para agregar uno.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        servicios.map((s) => (
                                            <tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{s.codigo}</td>
                                                <td className="px-6 py-4 font-bold text-gray-800">{s.nombre}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium capitalize border border-gray-200">
                                                        {s.categoria}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                                        ${s.precio.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors" title="Eliminar (No implementado en demo)">
                                                            <XMarkIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PESTAÑA REPORTES --- */}
            {activeTab === 'reportes' && (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                            <input type="date" className="bg-transparent text-sm border-r border-gray-300 pr-2 outline-none text-gray-600" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                            <span className="text-gray-400 text-xs">a</span>
                            <input type="date" className="bg-transparent text-sm pl-2 outline-none text-gray-600" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                            <button onClick={loadReportesGeneral} className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-gray-100 ml-2 shadow-sm">Filtrar</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setReportSubTab('ventas')} className={`px-3 py-1.5 rounded text-xs font-bold ${reportSubTab === 'ventas' ? 'bg-gray-800 text-white' : 'text-gray-500 bg-gray-100'}`}>Movimientos</button>
                            <button onClick={() => setReportSubTab('cortes')} className={`px-3 py-1.5 rounded text-xs font-bold ${reportSubTab === 'cortes' ? 'bg-gray-800 text-white' : 'text-gray-500 bg-gray-100'}`}>Historial Cortes</button>
                        </div>
                        <button onClick={() => { setCorteResult(null); setShowCorteModal(true); }} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 font-bold flex items-center hover:bg-emerald-700 transition-transform active:scale-95 text-sm">
                            <CalculatorIcon className="w-4 h-4 mr-2" /> Corte Z
                        </button>
                    </div>

                    {reportSubTab === 'ventas' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200"><h3 className="font-bold text-gray-700">Movimientos Detallados</h3></div>
                            <table className="min-w-full text-sm">
                                <thead className="bg-white text-gray-500 text-xs uppercase font-semibold"><tr><th className="px-6 py-3 text-left">Fecha</th><th className="px-6 py-3 text-left">Descripción</th><th className="px-6 py-3 text-left">Tipo</th><th className="px-6 py-3 text-center">Método</th><th className="px-6 py-3 text-right">Monto</th><th className="px-6 py-3 text-center">Ver</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {salesData.map((r, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-500">{new Date(r.fecha).toLocaleDateString()}</td>
                                            <td className="px-6 py-3">
                                                <p className="font-bold text-gray-800">{r.paciente}</p>
                                                <p className="text-xs text-gray-500">{r.concepto || 'Sin concepto'}</p>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${r.tipo === 'gasto' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {r.tipo === 'gasto' ? 'SALIDA' : 'INGRESO'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center uppercase text-xs">{r.metodo_pago}</td>
                                            <td className={`px-6 py-3 text-right font-bold ${r.tipo === 'gasto' ? 'text-rose-600' : 'text-gray-900'}`}>
                                                {r.tipo === 'gasto' ? '-' : ''}${Math.abs(r.monto).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button onClick={() => handleViewTicket(r)} className="text-gray-400 hover:text-blue-600"><ShareIcon className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {reportSubTab === 'cortes' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200"><h3 className="font-bold text-gray-700">Historial de Cortes de Caja</h3></div>
                            {/* Tabla de cortes existente... simplificada para la demo */}
                            <div className="p-8 text-center text-gray-400">Selecciona un rango de fechas para ver cortes pasados.</div>
                        </div>
                    )}
                </div>
            )}

            {/* --- PESTAÑA CATÁLOGO (Igual que antes) --- */}
            {activeTab === 'catalogo' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center"><PlusIcon className="w-5 h-5 mr-2 text-blue-600" /> Nuevo Servicio</h3>
                        {/* Formulario existente */}
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Tabla existente */}
                        <div className="p-4 text-center text-gray-500">Tabla de catálogo de servicios...</div>
                    </div>
                </div>
            )}

            {/* --- MODAL REGISTRAR GASTO (NUEVO) --- */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-rose-600 flex items-center"><ArrowTrendingDownIcon className="w-5 h-5 mr-2" /> Registrar Salida</h3>
                            <button onClick={() => setShowExpenseModal(false)}><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleRegistrarGasto} className="space-y-4">
                            <div><label className="text-xs font-bold text-gray-500">Concepto (¿En qué se gastó?)</label><input autoFocus required className="w-full p-2 border rounded-lg" placeholder="Ej. Pago de garrafones" value={expenseData.concepto} onChange={e => setExpenseData({ ...expenseData, concepto: e.target.value })} /></div>
                            <div><label className="text-xs font-bold text-gray-500">Monto</label><input type="number" required className="w-full p-2 border rounded-lg" placeholder="0.00" value={expenseData.monto} onChange={e => setExpenseData({ ...expenseData, monto: e.target.value })} /></div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Método de Salida</label>
                                <select className="w-full p-2 border rounded-lg" value={expenseData.metodo} onChange={e => setExpenseData({ ...expenseData, metodo: e.target.value })}>
                                    <option value="efectivo">Efectivo (Caja)</option>
                                    <option value="tarjeta">Transferencia/Tarjeta</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700">Registrar Gasto</button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL CORTE DE CAJA (ACTUALIZADO CON GASTOS) --- */}
            {showCorteModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up border border-gray-100">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="font-bold text-xl text-gray-900">Cierre de Turno (Corte Z)</h3>
                            <button onClick={() => setShowCorteModal(false)} className="bg-gray-100 p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        {!corteResult ? (
                            <form onSubmit={handleRealizarCorte} className="space-y-5">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm">
                                    <div className="flex justify-between mb-1"><span>Ventas Efectivo:</span> <span className="font-bold text-emerald-600">+${(summary.efectivoEnCaja + summary.totalGastos).toFixed(2)}</span></div>
                                    <div className="flex justify-between mb-2"><span>Gastos Efectivo:</span> <span className="font-bold text-rose-600">-${summary.totalGastos.toFixed(2)}</span></div>
                                    <div className="flex justify-between border-t border-blue-200 pt-2"><span>Debe haber en caja (+Fondo):</span> <span className="font-bold text-blue-900">${(parseFloat(corteData.inicial || 0) + summary.efectivoEnCaja).toFixed(2)}</span></div>
                                </div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fondo Inicial</label><input type="number" className="w-full p-3 border border-gray-200 rounded-xl font-mono text-lg" value={corteData.inicial} onChange={e => setCorteData({ ...corteData, inicial: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Conteo Físico Real</label><input type="number" required className="w-full p-3 border border-gray-200 rounded-xl font-mono text-xl font-bold text-gray-900 border-blue-500 ring-1 ring-blue-500" value={corteData.final} onChange={e => setCorteData({ ...corteData, final: e.target.value })} /></div>
                                <button type="submit" className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-black mt-2">Generar Corte</button>
                            </form>
                        ) : (
                            <div className="space-y-6 text-center">
                                {/* Resultado del corte (Igual que antes) */}
                                <div className={`p-4 rounded-xl ${corteResult.diferencia === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    <h2 className="text-2xl font-black mt-1">{corteResult.estado}</h2>
                                    <p className="text-sm">Diferencia: ${corteResult.diferencia.toFixed(2)}</p>
                                </div>
                                <button onClick={() => setShowCorteModal(false)} className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold">Finalizar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- MODAL DE TICKET (Igual que antes) --- */}
            {showTicketModal && currentTicket && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-up overflow-hidden">
                        <div className="bg-gray-800 text-white p-4 text-center relative">
                            <h3 className="font-bold text-lg">{currentTicket.isExpense ? 'Comprobante de Salida' : 'Recibo de Pago'}</h3>
                            <button onClick={() => setShowTicketModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-sm shadow-inner">
                                <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                                    <p className="font-bold text-gray-800 text-base">CLÍNICA DENTAL</p>
                                    <p className="text-xs text-gray-500">{new Date(currentTicket.fecha).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Folio: {currentTicket.folio}</p>
                                </div>
                                <div className="space-y-2 mb-3">
                                    <div className="flex justify-between"><span className="text-gray-500">{currentTicket.isExpense ? 'Destino' : 'Paciente'}:</span> <span className="font-bold text-gray-800 text-right">{currentTicket.patient_name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Concepto:</span> <span className="text-gray-800 text-right">{currentTicket.concepto}</span></div>
                                </div>
                                <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between items-end">
                                    <span className="font-bold text-gray-500">TOTAL</span>
                                    <span className="text-xl font-bold text-gray-900">${currentTicket.monto_total?.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <button onClick={handleShareWhatsApp} className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold flex justify-center"><PaperAirplaneIcon className="w-5 h-5 mr-2 -rotate-45" /> WhatsApp</button>
                                <button onClick={handlePrintTicket} className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex justify-center"><PrinterIcon className="w-5 h-5 mr-2" /> Imprimir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; } @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }`}</style>
        </div>
    );
};

export default Finance;