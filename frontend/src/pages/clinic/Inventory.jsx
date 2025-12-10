import { useEffect, useState } from 'react';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import {
    BeakerIcon, PlusIcon, ArchiveBoxArrowDownIcon,
    ExclamationTriangleIcon, ClipboardDocumentListIcon,
    ArrowUpCircleIcon, ArrowDownCircleIcon, CurrencyDollarIcon,
    NoSymbolIcon, PrinterIcon, PencilSquareIcon, TrashIcon
} from '@heroicons/react/24/solid';

const Inventory = () => {
    const [activeTab, setActiveTab] = useState('stock');
    const [items, setItems] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);

    // Estado para Crear/Editar
    const [editingItem, setEditingItem] = useState(null); // null = creando, obj = editando
    const [newItem, setNewItem] = useState({ nombre: '', sku: '', unidad: 'pza', stock_inicial: 0, costo: 0 });

    // Estado para Movimientos
    const [movement, setMovement] = useState({ item_id: null, cantidad: 0, tipo: 'entrada', nombre: '' });

    // KPIs
    const totalItems = items.length;
    const outOfStockCount = items.filter(i => i.stock === 0).length;
    const lowStockCount = items.filter(i => i.stock > 0 && i.stock < 5).length;
    const totalInventoryValue = items.reduce((sum, item) => sum + (item.stock * (item.costo || 0)), 0);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const resItems = await client.get('/inventario/items');
            setItems(resItems.data);

            if (activeTab === 'history') {
                const resHistory = await client.get('/inventario/movimientos');
                setHistory(resHistory.data);
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                // ACTUALIZAR
                await client.put(`/inventario/items/${editingItem.id}`, {
                    nombre: newItem.nombre,
                    sku: newItem.sku,
                    unidad: newItem.unidad,
                    costo: newItem.costo
                });
                toast.success("Producto actualizado");
            } else {
                // CREAR
                await client.post('/inventario/items', newItem);
                toast.success("Producto registrado");
            }
            setShowModal(false);
            setEditingItem(null);
            setNewItem({ nombre: '', sku: '', unidad: 'pza', stock_inicial: 0, costo: 0 });
            loadData();
        } catch (error) {
            if (error.response?.data?.detail) toast.error(error.response.data.detail);
            else toast.error("Error al guardar");
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("¿Seguro que quieres eliminar este producto?")) return;
        try {
            await client.delete(`/inventario/items/${id}`);
            toast.success("Producto eliminado");
            loadData();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setNewItem({ nombre: '', sku: '', unidad: 'pza', stock_inicial: 0, costo: 0 });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setNewItem({
            nombre: item.nombre,
            sku: item.sku,
            unidad: item.unidad,
            costo: item.costo,
            stock_inicial: 0 // No editable al editar
        });
        setShowModal(true);
    };

    const handleStockMovement = async (e) => {
        e.preventDefault();
        try {
            await client.put(`/inventario/items/${movement.item_id}/movimiento`, {
                cantidad: parseInt(movement.cantidad),
                tipo: movement.tipo
            });
            toast.success("Stock actualizado");
            setShowStockModal(false);
            loadData();
        } catch (error) {
            if (error.response && error.response.data) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Error desconocido");
            }
        }
    };

    // --- FUNCIÓN EXPORTAR PDF (IGUAL QUE ANTES) ---
    const handleExportPDF = () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Reporte de Inventario</title>');
        printWindow.document.write('<style>body{font-family:Arial; padding:20px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background-color:#f2f2f2;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h2>Reporte de Existencias - ClinicSync</h2>');
        printWindow.document.write(`<p>Fecha: ${new Date().toLocaleString()}</p>`);
        printWindow.document.write('<table><thead><tr><th>SKU</th><th>Producto</th><th>Unidad</th><th>Stock</th><th>Costo U.</th><th>Valor Total</th></tr></thead><tbody>');

        items.forEach(item => {
            printWindow.document.write(`<tr>
              <td>${item.sku}</td>
              <td>${item.nombre}</td>
              <td>${item.unidad}</td>
              <td>${item.stock}</td>
              <td>$${item.costo.toFixed(2)}</td>
              <td>$${(item.stock * item.costo).toFixed(2)}</td>
          </tr>`);
        });

        printWindow.document.write('</tbody></table>');
        printWindow.document.write(`<h3 style="text-align:right; margin-top:20px;">Valor Total Inventario: $${totalInventoryValue.toFixed(2)}</h3>`);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    };

    const openStockModal = (item, tipo) => {
        setMovement({ item_id: item.id, cantidad: 1, tipo, nombre: item.nombre });
        setShowStockModal(true);
    };

    if (loading && items.length === 0) return <div className="p-10 text-center">Cargando almacén...</div>;

    return (
        <div className="space-y-6 animate-fade-in text-gray-800">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center">
                        <BeakerIcon className="w-7 h-7 mr-2 text-primary" /> Inventario General
                    </h1>
                    <p className="text-sm text-gray-500">Gestión de materiales e insumos clínicos.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportPDF} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm flex items-center hover:bg-gray-80">
                        <PrinterIcon className="w-5 h-5 mr-2" /> Imprimir Reporte
                    </button>
                    <button onClick={openCreateModal} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow flex items-center hover:bg-teal-700 transition-colors">
                        <PlusIcon className="w-5 h-5 mr-2" /> Nuevo Producto
                    </button>
                </div>
            </div>

            {/* DASHBOARD DE INVENTARIO (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Productos</p>
                    <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                    <p className="text-xs font-bold text-gray-400 uppercase flex items-center"><CurrencyDollarIcon className="w-4 h-4 mr-1" /> Valor Inventario</p>
                    <p className="text-2xl font-bold text-green-600">${totalInventoryValue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-red-500">
                    <p className="text-xs font-bold text-gray-400 uppercase flex items-center"><NoSymbolIcon className="w-4 h-4 mr-1" /> Agotados</p>
                    <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-orange-500">
                    <p className="text-xs font-bold text-gray-400 uppercase flex items-center"><ExclamationTriangleIcon className="w-4 h-4 mr-1" /> Stock Bajo</p>
                    <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
                </div>
            </div>

            {/* TABS */}
            <div className="bg-white rounded-xl shadow min-h-[500px]">
                <div className="flex border-b px-6 bg-gray-50 rounded-t-xl">
                    <button onClick={() => setActiveTab('stock')} className={`py-4 px-4 border-b-2 font-bold text-sm ${activeTab === 'stock' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <ArchiveBoxArrowDownIcon className="w-4 h-4 inline mr-2" /> Almacén Actual
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`py-4 px-4 border-b-2 font-bold text-sm ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <ClipboardDocumentListIcon className="w-4 h-4 inline mr-2" /> Historial Movimientos
                    </button>
                </div>

                <div className="p-6">
                    {/* VISTA STOCK */}
                    {activeTab === 'stock' && (
                        <>
                            {items.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <ArchiveBoxArrowDownIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p>No hay insumos registrados.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map(item => (
                                        <div key={item.id} className={`bg-white p-4 rounded-xl border flex flex-col justify-between transition-shadow hover:shadow-md ${item.stock === 0 ? 'border-red-400 bg-red-50' : item.stock < 5 ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center mb-1">
                                                        <h3 className="font-bold text-gray-800 text-lg">{item.nombre}</h3>
                                                        {item.stock === 0 && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 rounded font-bold">AGOTADO</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-mono">SKU: {item.sku}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEditModal(item)} className="p-1 text-blue-500 hover:bg-blue-100 rounded" title="Editar"><PencilSquareIcon className="w-5 h-5" /></button>
                                                    <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Eliminar"><TrashIcon className="w-5 h-5" /></button>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-baseline gap-2 border-t pt-2 border-dashed border-gray-300">
                                                <span className={`text-2xl font-extrabold ${item.stock < 5 ? 'text-red-600' : 'text-green-600'}`}>{item.stock}</span>
                                                <span className="text-xs text-gray-400 font-bold uppercase">{item.unidad}</span>
                                                <span className="text-xs text-gray-400 ml-auto">Costo: ${item.costo}</span>
                                            </div>

                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => openStockModal(item, 'entrada')} className="flex-1 text-xs bg-green-100 text-green-800 px-3 py-2 rounded hover:bg-green-200 font-bold flex items-center justify-center"><ArrowUpCircleIcon className="w-4 h-4 mr-1" /> Entrada</button>
                                                <button onClick={() => openStockModal(item, 'salida')} className="flex-1 text-xs bg-red-100 text-red-800 px-3 py-2 rounded hover:bg-red-200 font-bold flex items-center justify-center"><ArrowDownCircleIcon className="w-4 h-4 mr-1" /> Salida</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* VISTA HISTORIAL */}
                    {activeTab === 'history' && (
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold"><tr><th className="px-6 py-3 text-left">Fecha</th><th className="px-6 py-3 text-left">Responsable</th><th className="px-6 py-3 text-left">Producto</th><th className="px-6 py-3 text-center">Tipo</th><th className="px-6 py-3 text-right">Cantidad</th></tr></thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {history.length === 0 ? (
                                        <tr><td colSpan="5" className="p-6 text-center text-gray-400">Sin movimientos recientes.</td></tr>
                                    ) : history.map(mov => (
                                        <tr key={mov.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-600">{new Date(mov.fecha).toLocaleString()}</td>
                                            <td className="px-6 py-3 font-bold text-gray-700">{mov.usuario_nombre}</td>
                                            <td className="px-6 py-3 font-medium text-gray-800">{mov.item_nombre} <span className="text-gray-400 text-xs">({mov.sku})</span></td>
                                            <td className="px-6 py-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${mov.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{mov.tipo}</span></td>
                                            <td className="px-6 py-3 text-right font-mono font-bold">{mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL CREAR/EDITAR PRODUCTO */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">{editingItem ? 'Editar Producto' : 'Registrar Insumo'}</h3>
                        <form onSubmit={handleSaveItem} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Nombre del Producto</label>
                                <input required placeholder="Ej. Guantes Latex M" className="w-full p-2 border rounded" value={newItem.nombre} onChange={e => setNewItem({ ...newItem, nombre: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">SKU / Código</label>
                                    <input required placeholder="GT-001" className="w-full p-2 border rounded" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Unidad</label>
                                    <select className="w-full p-2 border rounded" value={newItem.unidad} onChange={e => setNewItem({ ...newItem, unidad: e.target.value })}>
                                        <option value="pza">Pieza</option><option value="caja">Caja</option><option value="ml">Mililitros</option><option value="gr">Gramos</option><option value="par">Par</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Costo Unitario ($)</label>
                                    <input type="number" step="0.01" className="w-full p-2 border rounded bg-green-50 border-green-200" value={newItem.costo} onChange={e => setNewItem({ ...newItem, costo: parseFloat(e.target.value) || 0 })} />
                                </div>
                                {!editingItem && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Stock Inicial</label>
                                        <input type="number" min="0" className="w-full p-2 border rounded bg-blue-50 border-blue-200" value={newItem.stock_inicial} onChange={e => setNewItem({ ...newItem, stock_inicial: parseInt(e.target.value) || 0 })} />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-teal-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL MOVIMIENTO STOCK */}
            {showStockModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-fade-in-up">
                        <h3 className="font-bold text-lg mb-1 flex items-center">
                            {movement.tipo === 'entrada' ? <ArrowUpCircleIcon className="w-6 h-6 text-green-600 mr-2" /> : <ArrowDownCircleIcon className="w-6 h-6 text-red-600 mr-2" />}
                            {movement.tipo === 'entrada' ? 'Entrada de Material' : 'Salida de Material'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6 ml-8">{movement.nombre}</p>
                        <form onSubmit={handleStockMovement}>
                            <div className="mb-6 text-center"><label className="text-xs font-bold text-gray-500 uppercase block mb-2">Cantidad</label><input type="number" min="1" autoFocus className="w-32 p-3 border-2 rounded-lg text-3xl font-bold text-center outline-none focus:border-primary" value={movement.cantidad} onChange={e => setMovement({ ...movement, cantidad: e.target.value })} /></div>
                            <button type="submit" className={`w-full py-3 rounded-lg font-bold text-white shadow-lg ${movement.tipo === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar</button>
                            <button type="button" onClick={() => setShowStockModal(false)} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 underline">Cancelar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;