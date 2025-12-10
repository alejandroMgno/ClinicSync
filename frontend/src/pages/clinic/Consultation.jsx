import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import toast from 'react-hot-toast';
import Odontogram from '../../components/Odontogram';
import {
    ArrowLeftIcon, PlusCircleIcon, CheckCircleIcon,
    XCircleIcon, BanknotesIcon, PrinterIcon, CloudArrowUpIcon,
    InformationCircleIcon, TrashIcon, PhotoIcon
} from '@heroicons/react/24/solid';

const Consultation = () => {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Estados de Consulta Médica
    const [soap, setSoap] = useState({ subjetivo: '', objetivo: '', analisis: '', plan: '' });
    const [receta, setReceta] = useState('');

    // Estados Financieros y Tratamiento
    const [servicios, setServicios] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedTeeth, setSelectedTeeth] = useState([]);
    const [tratamientos, setTratamientos] = useState([]);
    const [activeBudget, setActiveBudget] = useState(null);

    // Estado para Imágenes
    const [files, setFiles] = useState([]);
    const [filesToUpload, setFilesToUpload] = useState([]);

    // DATOS COMPLETOS PARA IMPRESIÓN
    const [printData, setPrintData] = useState({
        doctor: { nombre: '', cedula: '', universidad: '', especialidad: '' },
        clinica: { nombre: '', direccion: '', telefono: '' },
        paciente: { nombre: '', id: '' }
    });

    const DRAFT_KEY = `consultation_draft_${appointmentId}`;

    const saveDraft = useCallback(() => {
        const draft = { soap, receta, tratamientos, activeBudget };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, [soap, receta, tratamientos, activeBudget]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [resServices, resPrint, resDetail] = await Promise.all([
                    client.get('/finanzas/catalogo'),
                    client.get(`/clinica/citas/${appointmentId}/datos-impresion`),
                    client.get(`/clinica/citas/${appointmentId}/completa`)
                ]);

                setServicios(resServices.data);
                setPrintData(resPrint.data); // Aquí guardamos cedula, dirección, etc.

                const detalle = resDetail.data;
                if (detalle.nota_medica || detalle.receta || (detalle.archivos && detalle.archivos.length > 0)) {
                    if (detalle.nota_medica) setSoap(detalle.nota_medica);
                    if (detalle.receta) setReceta(detalle.receta);
                    if (detalle.archivos) setFiles(detalle.archivos);
                } else {
                    const draft = localStorage.getItem(DRAFT_KEY);
                    if (draft) {
                        const loaded = JSON.parse(draft);
                        setSoap(loaded.soap || soap);
                        setReceta(loaded.receta || receta);
                        setTratamientos(loaded.tratamientos || []);
                        setActiveBudget(loaded.activeBudget || null);
                        toast('Borrador recuperado', { icon: '📝' });
                    }
                }
            } catch (error) {
                // Ignoramos errores menores
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [appointmentId]);

    useEffect(() => {
        if (!loading) saveDraft();
    }, [soap, receta, tratamientos, activeBudget, loading, saveDraft]);

    // --- MANEJADORES TRATAMIENTO ---
    const handleAddTreatment = () => {
        const s = servicios.find(i => i.id === parseInt(selectedServiceId));
        if (!s || selectedTeeth.length === 0) return toast.error("Selecciona tratamiento y dientes");
        setTratamientos([...tratamientos, { tempId: Date.now(), service_id: s.id, nombre: s.nombre, precio: s.precio * selectedTeeth.length, dientes: [...selectedTeeth], estado: 'presupuesto' }]);
        setSelectedTeeth([]);
        toast.success("Agregado");
    };

    const handleRemoveTreatment = (tempId) => {
        setTratamientos(tratamientos.filter(t => t.tempId !== tempId));
    };

    const handleCreateBudget = async () => {
        if (tratamientos.length === 0) return;
        try {
            const res = await client.post('/finanzas/presupuestos', {
                patient_id: printData.paciente.id,
                items: tratamientos.map(t => ({ service_id: t.service_id, cantidad: t.dientes.length }))
            });
            setActiveBudget(res.data); toast.success("Presupuesto Creado");
        } catch (e) { toast.error("Error creando presupuesto"); }
    };

    const handleApproveBudget = async () => {
        if (!activeBudget) return;
        await client.put(`/finanzas/presupuestos/${activeBudget.id}/aprobar`);
        setActiveBudget({ ...activeBudget, estado: 'aprobado' });
        setTratamientos(tratamientos.map(t => ({ ...t, estado: 'realizado' })));
        toast.success("Enviado a Caja");
    };

    const handleRejectBudget = () => {
        if (window.confirm("¿Cancelar presupuesto?")) setActiveBudget(null);
    };

    const handleSaveProgress = async () => {
        try {
            await client.post(`/clinica/citas/${appointmentId}/nota-soap`, {
                ...soap, signos_vitales: { temp: "36.5" }, receta_texto: receta, finalizar: false
            });
            toast.success("Progreso guardado");
        } catch (error) { toast.error("Error al guardar"); }
    };

    const handleFinish = async () => {
        if (!soap.subjetivo) return toast.error("Escribe el Subjetivo");
        try {
            await client.post(`/clinica/citas/${appointmentId}/nota-soap`, {
                ...soap, signos_vitales: { temp: "36.5" }, receta_texto: receta, finalizar: true
            });
            localStorage.removeItem(DRAFT_KEY);
            toast.success("Consulta Finalizada");
            navigate(-1);
        } catch (error) { toast.error("Error guardando"); }
    };

    // --- IMPRESIÓN DE RECETA (MEJORADA) ---
    const handlePrintReceta = () => {
        const { doctor, clinica, paciente } = printData;
        const fechaHoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const w = window.open('', '', 'height=800,width=1000');
        w.document.write('<html><head><title>Receta Médica</title>');
        w.document.write(`
      <style>
        @page { size: letter; margin: 2cm; }
        body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
        .doc-info { width: 60%; }
        .doc-name { font-size: 18px; font-weight: bold; color: #0f766e; text-transform: uppercase; }
        .doc-meta { font-size: 12px; color: #555; }
        .clinic-info { width: 40%; text-align: right; font-size: 12px; color: #555; }
        .clinic-name { font-size: 16px; font-weight: bold; color: #333; }
        .patient-info { background-color: #f0fdfa; padding: 15px; border-radius: 8px; border: 1px solid #ccfbf1; margin-bottom: 30px; }
        .patient-name { font-size: 16px; font-weight: bold; }
        .rx-body { font-family: 'Courier New', monospace; font-size: 14px; min-height: 400px; white-space: pre-wrap; padding: 10px; }
        .footer { border-top: 1px solid #ccc; padding-top: 30px; margin-top: 50px; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .signature-line { width: 250px; border-top: 1px solid #000; margin-bottom: 10px; }
        .footer-text { font-size: 10px; color: #999; margin-top: 20px; }
      </style>
    `);
        w.document.write('</head><body>');

        // ENCABEZADO CON DATOS COMPLETOS
        w.document.write(`
      <div class="header">
        <div class="doc-info">
          <div class="doc-name">${doctor.nombre || 'Dr. Nombre'}</div>
          <div class="doc-meta">${doctor.especialidad || 'Médico Cirujano'}</div>
          <div class="doc-meta">${doctor.universidad || ''}</div>
          <div class="doc-meta" style="margin-top:5px;"><strong>Cédula Prof: ${doctor.cedula || '---'}</strong></div>
        </div>
        <div class="clinic-info">
          <div class="clinic-name">${clinica.nombre || 'CLÍNICA'}</div>
          <div>${clinica.direccion || ''}</div>
          <div>Tel: ${clinica.telefono || ''}</div>
        </div>
      </div>
    `);

        // DATOS DEL PACIENTE
        w.document.write(`
      <div class="patient-info">
        <div><strong>Paciente:</strong> <span class="patient-name">${paciente.nombre}</span></div>
        <div style="margin-top:5px; font-size:12px; color:#666;">Fecha: ${fechaHoy}</div>
      </div>
    `);

        // CUERPO DE LA RECETA
        w.document.write(`<div class="rx-body">${receta || 'Sin prescripción.'}</div>`);

        // PIE DE PÁGINA (FIRMA)
        w.document.write(`
      <div class="footer">
        <div class="signature-line"></div>
        <div style="font-weight:bold;">Firma del Médico</div>
        <div style="font-size:12px;">${doctor.cedula ? 'Céd. ' + doctor.cedula : ''}</div>
      </div>
    `);

        w.document.write('</body></html>');
        w.document.close();

        // Esperar un momento para que carguen estilos antes de imprimir
        setTimeout(() => {
            w.print();
        }, 500);
    };

    // --- MANEJADOR DE ARCHIVOS ---
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        const processedFiles = [];

        for (const file of selectedFiles) {
            const base64 = await convertToBase64(file);
            processedFiles.push({
                id: Date.now() + Math.random(),
                nombre: file.name,
                tipo: file.type,
                data: base64,
                preview: base64
            });
        }
        setFilesToUpload(prev => [...prev, ...processedFiles]);
        toast.success(`${selectedFiles.length} imágenes listas`);
    };

    const handleRemoveNewFile = (id) => {
        setFilesToUpload(filesToUpload.filter(f => f.id !== id));
    };

    const saveDataWithFiles = async (finalizar) => {
        try {
            const filesPayload = filesToUpload.map(f => ({ nombre: f.nombre, tipo: f.tipo, data: f.data }));
            await client.post(`/clinica/citas/${appointmentId}/nota-soap`, {
                ...soap, signos_vitales: { temp: "36.5" }, receta_texto: receta, finalizar: finalizar, nuevos_archivos: filesPayload
            });

            if (finalizar) {
                localStorage.removeItem(DRAFT_KEY);
                toast.success("Consulta Finalizada");
                navigate(-1);
            } else {
                toast.success("Guardado");
                setFilesToUpload([]);
                // Recargar archivos existentes
                const resDetail = await client.get(`/clinica/citas/${appointmentId}/completa`);
                if (resDetail.data.archivos) setFiles(resDetail.data.archivos);
            }
        } catch (error) { toast.error("Error al guardar"); }
    };

    if (loading) return <div className="p-10 text-center">Cargando...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)}><ArrowLeftIcon className="w-5 h-5 text-gray-500" /></button>
                    <h1 className="font-bold text-lg">Consulta #{appointmentId}</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => saveDataWithFiles(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded font-bold hover:bg-gray-200">Guardar Progreso</button>
                    <button onClick={() => saveDataWithFiles(true)} className="bg-green-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-green-700">Finalizar Consulta</button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden bg-gray-50">
                {/* IZQUIERDA */}
                <div className="w-7/12 flex flex-col border-r bg-white p-4 overflow-y-auto">
                    <Odontogram onSelectionChange={setSelectedTeeth} treatments={tratamientos} />

                    <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                        <h3 className="font-bold mb-3 flex items-center"><PlusCircleIcon className="w-5 h-5 mr-2" /> Plan Tratamiento</h3>
                        <div className="flex gap-2 mb-3">
                            <select className="flex-1 border p-2 rounded text-sm" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} disabled={activeBudget?.estado === 'aprobado'}>
                                <option value="">Seleccionar...</option>
                                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio}</option>)}
                            </select>
                            <button onClick={handleAddTreatment} className="bg-green-600 text-white px-4 rounded font-bold text-sm" disabled={activeBudget?.estado === 'aprobado'}>Agregar</button>
                        </div>
                        <div className="space-y-2">
                            {tratamientos.map(t => (
                                <div key={t.tempId} className="flex justify-between text-sm bg-white p-2 border rounded items-center">
                                    <span>{t.nombre} ({t.dientes.join(',')})</span>
                                    <div className="flex items-center gap-2"><span className="font-bold">${t.precio}</span>{(!activeBudget || activeBudget.estado === 'borrador') && <button onClick={() => handleRemoveTreatment(t.tempId)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-2 border-t flex justify-between items-center">
                            <span className="font-bold">Total: ${tratamientos.reduce((s, t) => s + t.precio, 0)}</span>
                            {!activeBudget ? <button onClick={handleCreateBudget} className="bg-gray-800 text-white px-4 py-2 rounded font-bold text-sm">Crear Presupuesto</button> :
                                activeBudget.estado === 'borrador' ? (
                                    <div className="flex gap-2"><button onClick={handleRejectBudget} className="text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-bold">Rechazar</button><button onClick={handleApproveBudget} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Aprobar</button></div>
                                ) : <span className="text-green-600 font-bold text-sm">✅ En Caja</span>}
                        </div>
                    </div>

                    <div className="mt-6 p-4 border rounded-lg bg-white">
                        <h3 className="font-bold mb-3 flex items-center text-gray-700"><PhotoIcon className="w-5 h-5 mr-2 text-primary" /> Expediente Digital</h3>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer relative mb-4 transition-colors">
                            <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <CloudArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Subir imágenes</p>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {files.map((f) => (
                                <div key={f.id} className="aspect-square bg-gray-100 rounded overflow-hidden border relative">
                                    <img src={`http://127.0.0.1:8000/clinica/archivos/${f.id}`} className="w-full h-full object-cover" />
                                </div>
                            ))}
                            {filesToUpload.map((f) => (
                                <div key={f.id} className="relative group border-2 border-green-500 rounded overflow-hidden aspect-square bg-gray-100">
                                    <img src={f.preview} className="w-full h-full object-cover" />
                                    <button onClick={() => handleRemoveNewFile(f.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><TrashIcon className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-5/12 flex flex-col p-4 overflow-y-auto space-y-4">
                    <div className="bg-white p-4 rounded shadow border">
                        <h3 className="font-bold text-primary mb-2">Nota SOAP</h3>
                        <textarea className="w-full border p-2 rounded mb-2 text-sm" rows="2" placeholder="Subjetivo" value={soap.subjetivo} onChange={e => setSoap({ ...soap, subjetivo: e.target.value })} />
                        <textarea className="w-full border p-2 rounded mb-2 text-sm" rows="2" placeholder="Objetivo" value={soap.objetivo} onChange={e => setSoap({ ...soap, objetivo: e.target.value })} />
                        <input className="w-full border p-2 rounded mb-2 text-sm" placeholder="Análisis" value={soap.analisis} onChange={e => setSoap({ ...soap, analisis: e.target.value })} />
                        <textarea className="w-full border p-2 rounded mb-2 text-sm" rows="2" placeholder="Plan" value={soap.plan} onChange={e => setSoap({ ...soap, plan: e.target.value })} />
                    </div>
                    <div className="bg-white p-4 rounded shadow border flex-1 flex flex-col">
                        <div className="flex justify-between mb-2"><h3 className="font-bold">Receta</h3><button onClick={handlePrintReceta}><PrinterIcon className="w-5 h-5" /></button></div>
                        <textarea className="flex-1 w-full border p-2 rounded font-mono text-sm bg-yellow-50" placeholder="Medicamentos..." value={receta} onChange={e => setReceta(e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Consultation;