import React, { useState } from 'react';

// Aceptamos la propiedad "variant" que puede ser 'mini' o 'full' (por defecto)
const Odontograma = ({ variant = 'full' }) => {
    const [teethState, setTeethState] = useState({});

    // --- CONFIGURACIÓN DE TAMAÑOS ---
    const isMini = variant === 'mini';

    // Clases dinámicas según el tamaño
    const toothSize = isMini
        ? 'w-6 h-6 text-[9px] border'       // Mini: 24px, texto diminuto, borde fino
        : 'w-10 h-10 text-sm border-2';     // Full: 40px, texto normal, borde grueso

    const gapSize = isMini ? 'gap-0.5' : 'gap-2';      // Espacio entre dientes
    const quadrantGap = isMini ? 'gap-2' : 'gap-6';    // Espacio entre cuadrantes (izq/der)
    const verticalGap = isMini ? 'gap-1' : 'gap-4';    // Espacio entre filas (arriba/abajo)
    const dividerHeight = isMini ? 'h-6' : 'h-12';     // Altura de la línea central

    // Definición de Cuadrantes (Adulto)
    const quadrants = {
        upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
        upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
        lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
        lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
    };

    const handleToothClick = (id) => {
        // Si es mini, quizás no quieras que sea interactivo, o sí. Aquí lo dejamos activo.
        const states = ['sano', 'seleccionado', 'presupuesto', 'realizado'];
        const current = teethState[id] || 'sano';
        const nextIndex = (states.indexOf(current) + 1) % states.length;
        setTeethState({ ...teethState, [id]: states[nextIndex] });
    };

    const getToothColor = (id) => {
        const state = teethState[id] || 'sano';
        switch (state) {
            case 'seleccionado': return 'bg-green-500 text-white border-green-600';
            case 'presupuesto': return 'bg-yellow-400 text-white border-yellow-500';
            case 'realizado': return 'bg-blue-600 text-white border-blue-700';
            default: return 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50';
        }
    };

    // Sub-componente para cada diente
    const Tooth = ({ id }) => (
        <button
            onClick={() => handleToothClick(id)}
            className={`rounded-full flex items-center justify-center font-bold transition-all shadow-sm ${toothSize} ${getToothColor(id)}`}
            title={`Pieza ${id}`} // Tooltip nativo para ver el número si es muy pequeño
        >
            {id}
        </button>
    );

    return (
        <div className="w-full flex flex-col items-center justify-center p-2">
            <div className={`flex flex-col items-center ${verticalGap}`}>

                {/* --- ARCO SUPERIOR --- */}
                <div className={`flex items-center ${quadrantGap}`}>
                    {/* Cuadrante 1 (18-11) */}
                    <div className={`flex ${gapSize}`}>
                        {quadrants.upperRight.map(id => <Tooth key={id} id={id} />)}
                    </div>

                    {/* Divisor Central */}
                    <div className={`w-px bg-gray-300 ${dividerHeight}`}></div>

                    {/* Cuadrante 2 (21-28) */}
                    <div className={`flex ${gapSize}`}>
                        {quadrants.upperLeft.map(id => <Tooth key={id} id={id} />)}
                    </div>
                </div>

                {/* --- ARCO INFERIOR --- */}
                <div className={`flex items-center ${quadrantGap}`}>
                    {/* Cuadrante 4 (48-41) */}
                    <div className={`flex ${gapSize}`}>
                        {quadrants.lowerRight.map(id => <Tooth key={id} id={id} />)}
                    </div>

                    {/* Divisor Central */}
                    <div className={`w-px bg-gray-300 ${dividerHeight}`}></div>

                    {/* Cuadrante 3 (31-38) */}
                    <div className={`flex ${gapSize}`}>
                        {quadrants.lowerLeft.map(id => <Tooth key={id} id={id} />)}
                    </div>
                </div>
            </div>

            {/* LEYENDA (Opcional en mini, completa en full) */}
            <div className={`mt-4 flex flex-wrap justify-center gap-3 text-gray-600 ${isMini ? 'text-[10px]' : 'text-xs'}`}>
                <div className="flex items-center gap-1"><div className={`rounded-full bg-white border ${isMini ? 'w-2 h-2' : 'w-3 h-3'}`}></div> Sano</div>
                <div className="flex items-center gap-1"><div className={`rounded-full bg-green-500 ${isMini ? 'w-2 h-2' : 'w-3 h-3'}`}></div> Selecc.</div>
                <div className="flex items-center gap-1"><div className={`rounded-full bg-yellow-400 ${isMini ? 'w-2 h-2' : 'w-3 h-3'}`}></div> Presup.</div>
                <div className="flex items-center gap-1"><div className={`rounded-full bg-blue-600 ${isMini ? 'w-2 h-2' : 'w-3 h-3'}`}></div> Realiz.</div>
            </div>
        </div>
    );
};

export default Odontograma;