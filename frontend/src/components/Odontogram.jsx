import React, { useState } from 'react';

const Odontograma = ({ variant = 'full' }) => {
    // Estado de los dientes
    const [teethState, setTeethState] = useState({});

    // Configuración de tamaños según la variante
    const isMini = variant === 'mini';

    // Clases dinámicas basadas en si es mini o full
    const sizeClasses = isMini
        ? 'w-6 h-6 text-[10px] border'      // Mini: 24px, texto muy pequeño
        : 'w-10 h-10 text-sm border-2';     // Full: 40px, texto normal

    const gapClasses = isMini
        ? 'gap-0.5'                         // Mini: Espacio mínimo entre dientes
        : 'gap-2';                          // Full: Espacio cómodo

    const containerGap = isMini ? 'gap-2' : 'gap-8';
    const dividerHeight = isMini ? 'h-8' : 'h-12';

    // Cuadrantes (FDI)
    const quadrants = {
        upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
        upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
        lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
        lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
    };

    const handleToothClick = (id) => {
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
            default: return 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
        }
    };

    // Sub-componente Diente
    const Tooth = ({ id }) => (
        <button
            onClick={() => handleToothClick(id)}
            className={`rounded-full flex items-center justify-center font-bold transition-all shadow-sm ${sizeClasses} ${getToothColor(id)}`}
            title={`Diente ${id}`}
        >
            {id}
        </button>
    );

    return (
        <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Título opcional si no viene del padre */}
            {/* <h3 className="text-gray-700 font-bold mb-4 text-sm">Odontograma</h3> */}

            <div className={`flex flex-col items-center ${containerGap}`}>

                {/* --- ARCADA SUPERIOR --- */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Cuadrante 1 */}
                    <div className={`flex ${gapClasses}`}>
                        {quadrants.upperRight.map(id => <Tooth key={id} id={id} />)}
                    </div>

                    {/* Línea media */}
                    <div className={`w-px bg-gray-300 ${dividerHeight}`}></div>

                    {/* Cuadrante 2 */}
                    <div className={`flex ${gapClasses}`}>
                        {quadrants.upperLeft.map(id => <Tooth key={id} id={id} />)}
                    </div>
                </div>

                {/* --- ARCADA INFERIOR --- */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Cuadrante 4 */}
                    <div className={`flex ${gapClasses}`}>
                        {quadrants.lowerRight.map(id => <Tooth key={id} id={id} />)}
                    </div>

                    {/* Línea media */}
                    <div className={`w-px bg-gray-300 ${dividerHeight}`}></div>

                    {/* Cuadrante 3 */}
                    <div className={`flex ${gapClasses}`}>
                        {quadrants.lowerLeft.map(id => <Tooth key={id} id={id} />)}
                    </div>
                </div>
            </div>

            {/* LEYENDA (Solo mostrar si NO es modo mini, o hacerla más pequeña) */}
            {!isMini && (
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border bg-white"></div> Sano</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Selecc.</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Presup.</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-600"></div> Realiz.</div>
                </div>
            )}

            {/* Leyenda Mini (Opcional) */}
            {isMini && (
                <div className="mt-4 flex justify-center gap-3 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Sel</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Pre</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Rea</span>
                </div>
            )}
        </div>
    );
};

export default Odontograma;