import { useState } from 'react';

const Odontogram = ({ onSelectionChange, treatments = [] }) => {
    // Representación de los dientes
    const initialTeeth = [
        { id: 18, label: '18' }, { id: 17, label: '17' }, { id: 16, label: '16' }, { id: 15, label: '15' }, { id: 14, label: '14' }, { id: 13, label: '13' }, { id: 12, label: '12' }, { id: 11, label: '11' },
        { id: 21, label: '21' }, { id: 22, label: '22' }, { id: 23, label: '23' }, { id: 24, label: '24' }, { id: 25, label: '25' }, { id: 26, label: '26' }, { id: 27, label: '27' }, { id: 28, label: '28' },
        { id: 48, label: '48' }, { id: 47, label: '47' }, { id: 46, label: '46' }, { id: 45, label: '45' }, { id: 44, label: '44' }, { id: 43, label: '43' }, { id: 42, label: '42' }, { id: 41, label: '41' },
        { id: 31, label: '31' }, { id: 32, label: '32' }, { id: 33, label: '33' }, { id: 34, label: '34' }, { id: 35, label: '35' }, { id: 36, label: '36' }, { id: 37, label: '37' }, { id: 38, label: '38' },
    ];

    const [selectedTeeth, setSelectedTeeth] = useState([]);

    // Manejador de Clics
    const handleToothClick = (id) => {
        let newSelection;
        // Si ya estaba seleccionado, lo quitamos
        if (selectedTeeth.includes(id)) {
            newSelection = selectedTeeth.filter(t => t !== id);
        } else {
            // Si no, lo agregamos
            newSelection = [...selectedTeeth, id];
        }

        setSelectedTeeth(newSelection);

        // --- AQUÍ ESTÁ LA CLAVE ---
        // Avisamos al padre (Consultation.jsx) que la selección cambió
        if (onSelectionChange) {
            onSelectionChange(newSelection);
        }
    };

    // Estilos dinámicos
    const getToothStyle = (id) => {
        // 1. Selección actual (Borde amarillo)
        if (selectedTeeth.includes(id)) {
            return 'bg-yellow-100 border-2 border-yellow-500 text-yellow-700 shadow-md scale-110 z-10';
        }

        // 2. Tratamientos ya aplicados (Azul, Naranja, Rojo)
        const treatment = treatments.find(t => t.dientes.includes(id));
        if (treatment) {
            if (treatment.estado === 'realizado') return 'bg-blue-500 text-white border-blue-700';
            if (treatment.estado === 'presupuesto') return 'bg-orange-100 text-orange-600 border-orange-300';
            if (treatment.estado === 'caries') return 'bg-red-500 text-white border-red-700';
        }

        // 3. Default
        return 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
    };

    return (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 select-none">
            <div className="flex justify-center gap-1 mb-2">
                {initialTeeth.slice(0, 16).map(t => (
                    <div key={t.id} onClick={() => handleToothClick(t.id)} className={`w-8 h-10 flex items-center justify-center border rounded cursor-pointer transition-all text-xs font-bold ${getToothStyle(t.id)}`}>
                        {t.label}
                    </div>
                ))}
            </div>
            <div className="flex justify-center gap-1">
                {initialTeeth.slice(16, 32).map(t => (
                    <div key={t.id} onClick={() => handleToothClick(t.id)} className={`w-8 h-10 flex items-center justify-center border rounded cursor-pointer transition-all text-xs font-bold ${getToothStyle(t.id)}`}>
                        {t.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Odontogram;