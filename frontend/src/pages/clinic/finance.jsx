import React, { useEffect, useState } from 'react';
import client from '../../api/axios'; // ⚠️ DESCOMENTA ESTA LÍNEA EN TU PROYECTO
import toast from 'react-hot-toast';
import {
    CurrencyDollarIcon, QueueListIcon, PlusIcon,
    CreditCardIcon, BanknotesIcon, CalendarIcon,
    DocumentChartBarIcon, CalculatorIcon, XMarkIcon,
    PrinterIcon, ShareIcon, PaperAirplaneIcon, EnvelopeIcon
} from '@heroicons/react/24/solid';



const Finance = () => {
    const [activeTab, setActiveTab] = useState('caja');
    const [loading, setLoading] = useState(false);

    // --- ESTADOS DE CAJA ---
    const [pendientes, setPendientes] = useState([]);
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');

    // --- ESTADOS DE TICKET / RECIBO ---
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [currentTicket, setCurrentTicket] = useState(null);

    // --- ESTADOS DE CATÁLOGO ---
    const [servicios, setServicios] = useState([]);
    const [newService, setNewService] = useState({ codigo: '', nombre: '', precio: '', costo: '', categoria: 'dental' });

    // --- ESTADOS DE REPORTES Y CORTE ---
    const today = new Date().toISOString().split('T')[0];
    const [dateRange, setDateRange] = useState({ start: today, end: today });
    const [salesData, setSalesData] = useState([]);
    const [cortesHistory, setCortesHistory] = useState([]);
    const [reportSubTab, setReportSubTab] = useState('ventas');
    const [summary, setSummary] = useState({ total: 0, efectivo: 0, tarjeta: 0 });

    const [showCorteModal, setShowCorteModal] = useState(false);
    const [corteData, setCorteData] = useState({ inicial: 0, final: 0 });
    const [corteResult, setCorteResult] = useState(null);

    useEffect(() => {
        if (activeTab === 'caja') loadPendientes();
        if (activeTab === 'catalogo') loadCatalogo();
        if (activeTab === 'reportes') loadReportesGeneral();
    }, [activeTab, reportSubTab]);

    // --- CARGA DE DATOS ---
    const loadPendientes = async () => {
        try {
            const res = await client.get('/finanzas/caja/pendientes');
            setPendientes(res.data);
        } catch (error) {
            if (error.response?.status !== 404) console.error("Error cargando pendientes");
        }
    };

    const loadCatalogo = async () => {
        try {
            const res = await client.get('/finanzas/catalogo');
            setServicios(res.data);
        } catch (error) { toast.error("Error cargando precios"); }
    };

    const loadReportesGeneral = () => {
        if (reportSubTab === 'ventas') loadVentas();
        else loadCortes();
    };

    const loadVentas = async () => {
        setLoading(true);
        try {
            const res = await client.get(`/finanzas/reporte-ventas?start_date=${dateRange.start}&end_date=${dateRange.end}`);
            setSalesData(res.data);

            const total = res.data.reduce((sum, item) => sum + item.monto, 0);
            const efectivo = res.data.filter(i => i.metodo_pago === 'efectivo').reduce((sum, i) => sum + i.monto, 0);
            const tarjeta = res.data.filter(i => i.metodo_pago === 'tarjeta').reduce((sum, i) => sum + i.monto, 0);
            setSummary({ total, efectivo, tarjeta });
        } catch (error) { toast.error("Error cargando ventas"); }
        finally { setLoading(false); }
    };

    const loadCortes = async () => {
        setLoading(true);
        try {
            const res = await client.get(`/finanzas/caja/cortes?start_date=${dateRange.start}&end_date=${dateRange.end}`);
            setCortesHistory(res.data);
        } catch (error) { toast.error("Error cargando cortes"); }
        finally { setLoading(false); }
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

            // Preparamos los datos para el ticket
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
        } catch (error) { toast.error("Error al cobrar"); }
    };

    const handleViewTicket = (sale) => {
        const ticketData = {
            patient_name: sale.paciente,
            monto_total: sale.monto,
            fecha: sale.fecha,
            metodo_pago: sale.metodo_pago,
            folio: `TK-${sale.id || 'HIST'}`,
            telefono: sale.telefono,
            concepto: sale.concepto
        };
        setCurrentTicket(ticketData);
        setShowTicketModal(true);
    };

    // --- GENERACIÓN DE CONTENIDO PARA COMPARTIR ---
    const getTicketText = () => {
        if (!currentTicket) return '';
        return `
🧾 *RECIBO DE PAGO*
CLÍNICA DENTAL
------------------------------
📅 Fecha: ${new Date(currentTicket.fecha).toLocaleString()}
🔖 Folio: ${currentTicket.folio}
👤 Paciente: ${currentTicket.patient_name}
📝 Concepto: ${currentTicket.concepto || 'Servicios Dentales'}
------------------------------
💰 *TOTAL: $${currentTicket.monto_total?.toFixed(2)}*
💳 Método: ${currentTicket.metodo_pago?.toUpperCase()}
------------------------------
¡Gracias por su preferencia!
        `.trim();
    };

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(getTicketText());
        const phoneNumber = currentTicket.telefono ? currentTicket.telefono.replace(/\D/g, '') : '';
        const url = phoneNumber
            ? `https://wa.me/${phoneNumber}?text=${text}`
            : `https://wa.me/?text=${text}`;
        window.open(url, '_blank');
    };

    const handleShareEmail = () => {
        const subject = encodeURIComponent(`Recibo de Pago - ${currentTicket.folio}`);
        const body = encodeURIComponent(getTicketText());
        window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    };

    // --- NUEVA FUNCIÓN PARA IMPRIMIR SOLO EL TICKET ---
    const handlePrintTicket = () => {
        if (!currentTicket) return;

        // Abrimos una ventana nueva en blanco
        const w = window.open('', '', 'height=600,width=400');

        // Escribimos el HTML limpio del ticket
        w.document.write('<html><head><title>Ticket de Pago</title>');
        // Estilos CSS básicos para tickets térmicos (ancho fijo, fuente monoespaciada)
        w.document.write(`
            <style>
                body { font-family: 'Courier New', monospace; font-size: 14px; margin: 0; padding: 20px; width: 300px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                .header h2 { margin: 0; font-size: 18px; }
                .info { margin-bottom: 15px; }
                .info p { margin: 5px 0; }
                .total { border-top: 1px dashed #000; margin-top: 15px; padding-top: 10px; font-weight: bold; font-size: 16px; text-align: right; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; }
                @media print {
                    @page { margin: 0; }
                    body { margin: 1cm; }
                }
            </style>
        `);
        w.document.write('</head><body>');

        // Contenido del Ticket
        w.document.write('<div class="header">');
        w.document.write('<h2>CLÍNICA DENTAL</h2>');
        w.document.write(`<p>${new Date(currentTicket.fecha).toLocaleString()}</p>`);
        w.document.write(`<p>Folio: ${currentTicket.folio}</p>`);
        w.document.write('</div>');

        w.document.write('<div class="info">');
        w.document.write(`<p><strong>Paciente:</strong> ${currentTicket.patient_name}</p>`);
        w.document.write(`<p><strong>Concepto:</strong> ${currentTicket.concepto || 'Servicios Dentales'}</p>`);
        w.document.write(`<p><strong>Método Pago:</strong> ${currentTicket.metodo_pago?.toUpperCase()}</p>`);
        w.document.write('</div>');

        w.document.write('<div class="total">');
        w.document.write(`<p>TOTAL: $${currentTicket.monto_total?.toFixed(2)}</p>`);
        w.document.write('</div>');

        w.document.write('<div class="footer">');
        w.document.write('<p>¡Gracias por su preferencia!</p>');
        w.document.write('</div>');

        w.document.write('</body></html>');
        w.document.close(); // Cierra el flujo de escritura
        w.focus(); // Enfoca la ventana para asegurar la impresión

        // Retraso ligero para asegurar que los estilos carguen antes de imprimir
        setTimeout(() => {
            w.print();
            // w.close(); // Opcional: cerrar la ventana automáticamente después de imprimir
        }, 250);
    };

    const handleCreateService = async (e) => {
        e.preventDefault();
        try {
            await client.post('/finanzas/catalogo', { ...newService, precio: parseFloat(newService.precio), costo: parseFloat(newService.costo) });
            toast.success("Servicio agregado");
            setNewService({ codigo: '', nombre: '', precio: '', costo: '', categoria: 'dental' });
            loadCatalogo();
        } catch (error) { toast.error("Error al guardar"); }
    };

    const handleRealizarCorte = async (e) => {
        e.preventDefault();
        try {
            const res = await client.post('/finanzas/caja/corte', {
                monto_inicial: parseFloat(corteData.inicial),
                monto_final_real: parseFloat(corteData.final)
            });
            setCorteResult(res.data);
            toast.success("Corte Z registrado");
            if (activeTab === 'reportes' && reportSubTab === 'cortes') loadCortes();
        } catch (error) { toast.error("Error al realizar corte"); }
    };

    const handlePrintCorte = (corte) => {
        const w = window.open('', '', 'height=600,width=400');
        w.document.write('<html><body style="font-family:monospace;text-align:center;">');
        w.document.write('<h3>CORTE DE CAJA</h3>');
        w.document.write(`<p>${new Date(corte.fecha).toLocaleString()}</p>`);
        w.document.write(`<p>Cajero: ${corte.usuario}</p><hr/>`);
        w.document.write(`<div style="display:flex;justify-content:space-between;"><span>Inicial:</span><span>$${corte.monto_inicial.toFixed(2)}</span></div>`);
        w.document.write(`<div style="display:flex;justify-content:space-between;"><span>+ Ventas:</span><span>$${(corte.monto_sistema - corte.monto_inicial).toFixed(2)}</span></div>`);
        w.document.write('<hr/>');
        w.document.write(`<div style="display:flex;justify-content:space-between;"><span>Total Real:</span><span>$${corte.monto_real.toFixed(2)}</span></div>`);
        w.document.write(`<p>DIFERENCIA: $${corte.diferencia.toFixed(2)}</p>`);
        w.document.write('</body></html>');
        w.document.close();
        w.print();
    };

    return (
        <div className="space-y-6 animate-fade-in font-sans text-gray-800 p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finanzas</h1>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex w-full sm:w-auto">
                    <button onClick={() => setActiveTab('caja')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'caja' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <CurrencyDollarIcon className="w-4 h-4 inline mr-2" /> Caja
                    </button>
                    <button onClick={() => { setActiveTab('reportes'); loadReportesGeneral(); }} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'reportes' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <DocumentChartBarIcon className="w-4 h-4 inline mr-2" /> Reportes
                    </button>
                    <button onClick={() => setActiveTab('catalogo')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'catalogo' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <QueueListIcon className="w-4 h-4 inline mr-2" /> Catálogo
                    </button>
                </div>
            </div>

            {activeTab === 'caja' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-gray-700">Cuentas por Cobrar</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                    <tr><th className="px-6 py-3 text-left">Folio</th><th className="px-6 py-3 text-left">Paciente</th><th className="px-6 py-3 text-right">Total</th><th className="px-6 py-3 text-center">Acción</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {pendientes.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay cobros pendientes</td></tr> :
                                        pendientes.map(p => (
                                            <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-600 font-mono">#{p.id}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-800">{p.patient_name}</td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">${p.monto_total.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => setSelectedBudget(p)} className="bg-white border border-gray-200 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 hover:border-blue-200 shadow-sm transition-all">Cobrar</button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-fit">
                        <h3 className="font-bold text-gray-800 mb-4 text-lg">Procesar Pago</h3>
                        {selectedBudget ? (
                            <div className="space-y-6">
                                <div className="bg-blue-50 p-6 rounded-2xl text-center border border-blue-100">
                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">Total a Pagar</p>
                                    <p className="text-4xl font-extrabold text-blue-900">${selectedBudget.monto_total.toFixed(2)}</p>
                                    <p className="text-sm text-blue-600 mt-2 font-medium bg-blue-100/50 inline-block px-3 py-1 rounded-full">{selectedBudget.patient_name}</p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Método de Pago</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setPaymentMethod('efectivo')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'efectivo' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            <BanknotesIcon className="w-6 h-6" />
                                            <span className="text-xs font-bold">Efectivo</span>
                                        </button>
                                        <button onClick={() => setPaymentMethod('tarjeta')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'tarjeta' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            <CreditCardIcon className="w-6 h-6" />
                                            <span className="text-xs font-bold">Tarjeta</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button onClick={handleCobrar} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all transform active:scale-95">
                                        Confirmar Ingreso
                                    </button>
                                    <button onClick={() => setSelectedBudget(null)} className="w-full text-gray-400 text-xs hover:text-gray-600 font-medium mt-3 py-2">
                                        Cancelar operación
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <CurrencyDollarIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-400 text-sm">Selecciona un folio de la lista para iniciar el cobro.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'reportes' && (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                            <input type="date" className="bg-transparent text-sm border-r border-gray-300 pr-2 outline-none text-gray-600" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                            <span className="text-gray-400 text-xs">a</span>
                            <input type="date" className="bg-transparent text-sm pl-2 outline-none text-gray-600" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                            <button onClick={loadReportesGeneral} className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-gray-100 ml-2 shadow-sm">Filtrar</button>
                        </div>
                        <button onClick={() => { setCorteResult(null); setShowCorteModal(true); }} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-gray-200 font-bold flex items-center hover:bg-black transition-transform active:scale-95 text-sm">
                            <CalculatorIcon className="w-4 h-4 mr-2" /> Realizar Corte Z
                        </button>
                    </div>

                    <div className="flex space-x-6 border-b border-gray-200">
                        <button onClick={() => setReportSubTab('ventas')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${reportSubTab === 'ventas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Ventas Detalladas</button>
                        <button onClick={() => setReportSubTab('cortes')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${reportSubTab === 'cortes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Historial de Cortes</button>
                    </div>

                    {reportSubTab === 'ventas' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Total Ingresos</p>
                                    <p className="text-3xl font-extrabold text-gray-900">${summary.total.toFixed(2)}</p>
                                </div>
                                <div className="bg-emerald-50 p-5 rounded-xl shadow-sm border border-emerald-100 flex flex-col items-center">
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Efectivo</p>
                                    <p className="text-3xl font-extrabold text-emerald-700">${summary.efectivo.toFixed(2)}</p>
                                </div>
                                <div className="bg-blue-50 p-5 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Tarjeta</p>
                                    <p className="text-3xl font-extrabold text-blue-700">${summary.tarjeta.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold"><tr><th className="px-6 py-3 text-left">Fecha</th><th className="px-6 py-3 text-left">Paciente</th><th className="px-6 py-3 text-left">Concepto</th><th className="px-6 py-3 text-center">Método</th><th className="px-6 py-3 text-right">Monto</th><th className="px-6 py-3 text-center">Ticket</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {salesData.map((r, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 text-gray-500">{new Date(r.fecha).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(r.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                                                <td className="px-6 py-3 font-medium text-gray-900">{r.paciente}</td>
                                                <td className="px-6 py-3 text-gray-600">{r.concepto || 'Consulta General'}</td>
                                                <td className="px-6 py-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold capitalize ${r.metodo_pago === 'efectivo' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{r.metodo_pago}</span></td>
                                                <td className="px-6 py-3 text-right font-bold text-gray-900">${r.monto.toFixed(2)}</td>
                                                <td className="px-6 py-3 text-center">
                                                    <button onClick={() => handleViewTicket(r)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Ver Recibo"><ShareIcon className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold"><tr><th className="px-6 py-3 text-left">Fecha</th><th className="px-6 py-3 text-left">Cajero</th><th className="px-6 py-3 text-right">Sistema</th><th className="px-6 py-3 text-right">Real</th><th className="px-6 py-3 text-right">Dif</th><th className="px-6 py-3 text-center">Ticket</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {cortesHistory.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-600">{new Date(c.fecha).toLocaleString()}</td>
                                            <td className="px-6 py-3 font-medium">{c.usuario}</td>
                                            <td className="px-6 py-3 text-right text-gray-600">${c.monto_sistema.toFixed(2)}</td>
                                            <td className="px-6 py-3 text-right font-bold text-gray-900">${c.monto_real.toFixed(2)}</td>
                                            <td className={`px-6 py-3 text-right font-bold ${c.diferencia === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>${c.diferencia.toFixed(2)}</td>
                                            <td className="px-6 py-3 text-center"><button onClick={() => handlePrintCorte(c)} className="text-gray-400 hover:text-gray-800"><PrinterIcon className="w-5 h-5" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'catalogo' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center"><PlusIcon className="w-5 h-5 mr-2 text-blue-600" /> Nuevo Servicio</h3>
                        <form onSubmit={handleCreateService} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Código</label>
                                <input required className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" value={newService.codigo} onChange={e => setNewService({ ...newService, codigo: e.target.value })} placeholder="Ej. CONS-01" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre del Servicio</label>
                                <input required className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" value={newService.nombre} onChange={e => setNewService({ ...newService, nombre: e.target.value })} placeholder="Ej. Limpieza General" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Precio Público</label>
                                    <input required type="number" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" value={newService.precio} onChange={e => setNewService({ ...newService, precio: e.target.value })} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Costo Insumos</label>
                                    <input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" value={newService.costo} onChange={e => setNewService({ ...newService, costo: e.target.value })} placeholder="0.00" />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95 mt-2">Guardar Servicio</button>
                        </form>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold"><tr><th className="px-6 py-3 text-left">Código</th><th className="px-6 py-3 text-left">Servicio</th><th className="px-6 py-3 text-right">Precio</th><th className="px-6 py-3 text-right">Costo</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {servicios.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 text-sm transition-colors">
                                        <td className="px-6 py-3 font-mono text-gray-500">{s.codigo}</td>
                                        <td className="px-6 py-3 font-bold text-gray-800">{s.nombre}</td>
                                        <td className="px-6 py-3 text-right font-bold text-blue-600">${s.precio.toFixed(2)}</td>
                                        <td className="px-6 py-3 text-right text-gray-400">${s.costo.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODAL DE CORTE DE CAJA --- */}
            {showCorteModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up border border-gray-100">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="font-bold text-xl text-gray-900">Cierre de Turno</h3>
                            <button onClick={() => setShowCorteModal(false)} className="bg-gray-100 p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        {!corteResult ? (
                            <form onSubmit={handleRealizarCorte} className="space-y-5">
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fondo Inicial en Caja</label><input type="number" className="w-full p-3 border border-gray-200 rounded-xl font-mono text-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={corteData.inicial} onChange={e => setCorteData({ ...corteData, inicial: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Efectivo Real (Conteo Físico)</label><input type="number" required className="w-full p-3 border border-gray-200 rounded-xl font-mono text-xl font-bold text-gray-900 border-blue-500 ring-1 ring-blue-500 outline-none" value={corteData.final} onChange={e => setCorteData({ ...corteData, final: e.target.value })} /></div>
                                <button type="submit" className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-black transition-all transform active:scale-95 mt-2">Generar Corte y Cerrar</button>
                            </form>
                        ) : (
                            <div className="space-y-6 text-center">
                                <div className={`p-4 rounded-xl ${corteResult.diferencia === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    <p className="text-sm font-medium uppercase tracking-wide">Resultado del Balance</p>
                                    <h2 className="text-2xl font-black mt-1">{corteResult.estado}</h2>
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-sm space-y-3">
                                    <div className="flex justify-between"><span>Esperado (Sistema):</span> <strong className="font-mono text-gray-700">${corteResult.monto_sistema.toFixed(2)}</strong></div>
                                    <div className="flex justify-between"><span>Real (En Caja):</span> <strong className="font-mono text-gray-900">${corteResult.monto_real.toFixed(2)}</strong></div>
                                    <div className="border-t border-gray-200 pt-2 flex justify-between"><span>Diferencia:</span> <strong className={`font-mono ${corteResult.diferencia === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>${corteResult.diferencia.toFixed(2)}</strong></div>
                                </div>
                                <button onClick={() => setShowCorteModal(false)} className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">Finalizar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- MODAL DE TICKET (RECIBO) --- */}
            {showTicketModal && currentTicket && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-up overflow-hidden">
                        <div className="bg-gray-800 text-white p-4 text-center relative">
                            <h3 className="font-bold text-lg">Recibo de Pago</h3>
                            <p className="text-xs text-gray-400">Comprobante Digital</p>
                            <button onClick={() => setShowTicketModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Visualización del Ticket */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-sm shadow-inner">
                                <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                                    <p className="font-bold text-gray-800 text-base">CLÍNICA DENTAL</p>
                                    <p className="text-xs text-gray-500">{new Date(currentTicket.fecha).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Folio: {currentTicket.folio}</p>
                                </div>
                                <div className="space-y-2 mb-3">
                                    <div className="flex justify-between"><span className="text-gray-500">Paciente:</span> <span className="font-bold text-gray-800 text-right">{currentTicket.patient_name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Concepto:</span> <span className="text-gray-800 text-right">{currentTicket.concepto}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Método:</span> <span className="uppercase text-gray-800">{currentTicket.metodo_pago}</span></div>
                                </div>
                                <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between items-end">
                                    <span className="font-bold text-gray-500">TOTAL</span>
                                    <span className="text-xl font-bold text-gray-900">${currentTicket.monto_total?.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Botones de Acción */}
                            <div className="space-y-3">
                                <button onClick={handleShareWhatsApp} className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-green-100 transition-all transform active:scale-95">
                                    <PaperAirplaneIcon className="w-5 h-5 mr-2 -rotate-45" /> Enviar por WhatsApp
                                </button>
                                <button onClick={handleShareEmail} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-blue-100 transition-all transform active:scale-95">
                                    <EnvelopeIcon className="w-5 h-5 mr-2" /> Enviar por Correo
                                </button>
                                <button onClick={handlePrintTicket} className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center hover:bg-gray-50 transition-colors">
                                    <PrinterIcon className="w-5 h-5 mr-2" /> Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default Finance;