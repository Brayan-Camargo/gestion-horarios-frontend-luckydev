// Elementos DOM (Añadimos el nuevo botón)
const btnTema = document.getElementById('btn-tema');
const htmlElement = document.documentElement;
const iconoTema = document.getElementById('icono-tema');
const botonProbar = document.getElementById('btn-probar');
const botonGenerar = document.getElementById('btn-generar'); // <-- NUEVO
const botonDescargar = document.getElementById('btn-descargar');
const selectorSemana = document.getElementById('selector-semana');
const zonaCaptura = document.getElementById('zona-captura');
const tablaHead = document.getElementById('tabla-head');
const tablaBody = document.getElementById('tabla-body');
const tituloSemana = document.getElementById('titulo-semana');

let datosGlobales = [];
let mesPrincipal = "";
let fechasUnicasMes = [];
let empleadosUnicos = [];

iconoTema.innerText = '☀️';
btnTema.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    iconoTema.innerText = htmlElement.classList.contains('dark') ? '☀️' : '🌙';
});



botonGenerar.addEventListener('click', async () => {
    
    // REGLA DE NEGOCIO: Si la tabla ya tiene datos, lanzamos la alerta de peligro
    if (datosGlobales && datosGlobales.length > 0) {
        const { value: textoConfirmacion } = await Swal.fire({
            title: '⚠️ ¡Cuidado!',
            html: `Ya existe un horario generado para este mes. <br><br>
                   Si continúas, <b>se borrará el horario actual y se generará uno completamente diferente</b>.<br><br>
                   Escribe la palabra <b>CONFIRMAR</b> para proceder:`,
            input: 'text',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // Rojo peligro de Tailwind
            cancelButtonColor: '#4b5563', // Gris oscuro
            confirmButtonText: 'Sí, regenerar horario',
            cancelButtonText: 'Cancelar',
            background: htmlElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
            color: htmlElement.classList.contains('dark') ? '#ffffff' : '#374151',
            inputValidator: (value) => {
                if (value !== 'CONFIRMAR') {
                    return 'Debes escribir CONFIRMAR exactamente en mayúsculas.';
                }
            }
        });

        // Si el gerente presionó "Cancelar" o cerró la ventana, detenemos el proceso
        if (!textoConfirmacion) {
            return; 
        }
    }

    // SI PASA LA SEGURIDAD, CONTINUAMOS CON LA GENERACIÓN
    botonGenerar.innerText = "Calculando...";
    botonGenerar.disabled = true;

    try {
        const respuesta = await fetch('http://localhost:8080/api/horarios/generar/1?mes=4&anio=2026', {
            method: 'POST'
        });

        if (!respuesta.ok) throw new Error('Error al generar el horario.');
        
        const textoRespuesta = await respuesta.text();
        
        // Alerta de éxito elegante
        Swal.fire({
            title: '¡Listo!',
            text: textoRespuesta,
            icon: 'success',
            background: htmlElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
            color: htmlElement.classList.contains('dark') ? '#ffffff' : '#374151',
            confirmButtonColor: '#10b981' // Verde esmeralda
        });
        
        // Simulamos clic en "Cargar Mes" para refrescar la tabla en automático
        botonProbar.click(); 

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    } finally {
        botonGenerar.innerText = "⚙️ Generar Nuevo Mes";
        botonGenerar.disabled = false;
    }
});


// --- FUNCIÓN DE CARGAR (Protegida) ---
botonProbar.addEventListener('click', async () => {
    botonProbar.innerText = "Cargando...";

    try {
        const respuesta = await fetch('http://localhost:8080/api/horarios/1');
        if (!respuesta.ok) throw new Error('Error en el servidor');
        
        datosGlobales = await respuesta.json();

        // 🛡️ EL ESCUDO: Si Java nos devuelve 0 datos, avisamos y detenemos el proceso
        if (datosGlobales.length === 0) {
            alert("⚠️ No hay horarios generados para este departamento aún. Haz clic en 'Generar Nuevo Mes'.");
            botonProbar.innerText = "Cargar Mes";
            return; // Nos salimos aquí para que no explote el Invalid Date
        }

        fechasUnicasMes = [...new Set(datosGlobales.map(d => d.inicio.split('T')[0]))].sort();
        empleadosUnicos = [...new Set(datosGlobales.map(d => d.nombreEmpleado))].sort();

        const fechaMedio = fechasUnicasMes[Math.floor(fechasUnicasMes.length / 2)];
        mesPrincipal = fechaMedio.split('-')[1]; // Guarda "04" si es Abril

        configurarSelectorSemanas();
        selectorSemana.classList.remove('hidden');
        zonaCaptura.classList.remove('hidden');
        botonDescargar.classList.remove('hidden');

        renderizarMatrizSemanal(0);

    } catch (error) {
        alert("❌ Error: " + error.message);
    } finally {
        if(datosGlobales.length > 0) botonProbar.innerText = "Actualizar Datos";
    }
});

function configurarSelectorSemanas() {
    selectorSemana.innerHTML = '';
    const totalSemanas = Math.ceil(fechasUnicasMes.length / 7);

    for (let i = 0; i < totalSemanas; i++) {
        const opcion = document.createElement('option');
        opcion.value = i;
        opcion.innerText = `Semana ${i + 1}`;
        selectorSemana.appendChild(opcion);
    }

    selectorSemana.addEventListener('change', (e) => {
        renderizarMatrizSemanal(parseInt(e.target.value));
    });
}

function renderizarMatrizSemanal(indiceSemana) {
    const inicio = indiceSemana * 7;
    let diasDeEstaSemana = fechasUnicasMes.slice(inicio, inicio + 7);

    // Lógica para rellenar si faltan días al final (ya la tenías)
    const diasFaltantes = 7 - diasDeEstaSemana.length;
    if (diasFaltantes > 0) {
        let ultimaFecha = new Date(diasDeEstaSemana[diasDeEstaSemana.length - 1] + "T12:00:00");
        for (let i = 1; i <= diasFaltantes; i++) {
            ultimaFecha.setDate(ultimaFecha.getDate() + 1);
            diasDeEstaSemana.push(ultimaFecha.toISOString().split('T')[0]);
        }
    }

    // 1. Pintamos los encabezados usando la función de fechas bonitas
    let trHead = `<tr><th class="p-3 border border-gray-200 dark:border-gray-700 text-left bg-gray-50 dark:bg-gray-800/50">EMPLEADO</th>`;
    diasDeEstaSemana.forEach(fecha => {
        const esRelleno = fecha.split('-')[1] !== mesPrincipal;
        const estiloCabecera = esRelleno ? "text-gray-400 dark:text-gray-500 italic" : "";
        const fechaBonita = formatearFechaBonita(fecha); // Usamos el traductor
        
        trHead += `<th class="p-3 border border-gray-200 dark:border-gray-700 min-w-[120px] ${estiloCabecera}">
                        <div class="font-normal text-xs mb-1">${fechaBonita.diaPalabra}</div>
                        <div class="font-bold text-sm tracking-wide">${fechaBonita.fechaCorta}</div>
                   </th>`;
    });
    trHead += `</tr>`;
    tablaHead.innerHTML = trHead;

    // Actualizamos el título principal
    const primera = formatearFechaBonita(diasDeEstaSemana[0]);
    const ultima = formatearFechaBonita(diasDeEstaSemana[6]);
    tituloSemana.innerText = `Semana ${indiceSemana + 1} | ${primera.fechaCorta} AL ${ultima.fechaCorta}`;

    // 2. Pintamos las celdas de los turnos
    tablaBody.innerHTML = '';
    empleadosUnicos.forEach(emp => {
        let trBody = `<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                        <td class="p-3 border border-gray-200 dark:border-gray-700 text-left font-bold bg-gray-50 dark:bg-gray-800/20">${emp}</td>`;
        
        diasDeEstaSemana.forEach(fecha => {
            const mesActualCelda = parseInt(fecha.split('-')[1]);
            const mesPrincipalNum = parseInt(mesPrincipal);
            const esOtroMes = mesActualCelda !== mesPrincipalNum;
            
            // Determinamos si es Mes Anterior o Próximo Mes
            let etiquetaMes = "";
            if (esOtroMes) {
                // Si el mes de la celda es menor al principal, es "Mes Anterior" (Ej. Marzo vs Abril). 
                // Cuidado con el cruce de años (Diciembre 12 vs Enero 1).
                if (mesActualCelda < mesPrincipalNum || (mesActualCelda === 12 && mesPrincipalNum === 1)) {
                    etiquetaMes = "Mes Anterior";
                } else {
                    etiquetaMes = "Próximo Mes";
                }
            }

            const turno = datosGlobales.find(d => d.nombreEmpleado === emp && d.inicio.split('T')[0] === fecha);
            
            let contenidoCelda = '<span class="text-gray-300 dark:text-gray-600">-</span>';
            let clasesCelda = "p-3 border border-gray-200 dark:border-gray-700 relative h-16 ";

            if (turno) {
                if (turno.esDescanso) {
                    contenidoCelda = 'DESCANSO';
                    clasesCelda += 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 font-bold text-xs tracking-widest';
                } else {
                    const horaIn = turno.inicio.split('T')[1].substring(0, 5);
                    const horaFin = turno.fin.split('T')[1].substring(0, 5);
                    contenidoCelda = `
                        <div class="font-bold ${turno.tipoTurno === 'APERTURA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'} text-xs uppercase mb-1">${turno.tipoTurno}</div>
                        <div class="font-mono text-gray-800 dark:text-gray-200">${horaIn} - ${horaFin}</div>
                    `;
                }

                // Aplicamos la etiqueta correspondiente
                if (esOtroMes) {
                    clasesCelda += ' opacity-60 bg-gray-50/50 dark:bg-gray-900/50';
                    // Cambié el color del texto a un gris medio (gray-500) para que no sea tan chillón como el naranja, y sea más elegante.
                    contenidoCelda += `<div class="absolute bottom-0 right-0 left-0 text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-center pb-1">${etiquetaMes}</div>`;
                }
            }

            trBody += `<td class="${clasesCelda}">${contenidoCelda}</td>`;
        });
        
        trBody += `</tr>`;
        tablaBody.innerHTML += trBody;
    });
}

botonDescargar.addEventListener('click', () => {
    zonaCaptura.classList.remove('shadow-lg', 'rounded-xl');
    html2canvas(zonaCaptura, {
        backgroundColor: htmlElement.classList.contains('dark') ? '#1a1d24' : '#ffffff',
        scale: 2 
    }).then(canvas => {
        const urlImagen = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `LuckyDev_Horario_Semana_${selectorSemana.value}.png`;
        link.href = urlImagen;
        link.click();
        zonaCaptura.classList.add('shadow-lg', 'rounded-xl');
    });
});

// Función para convertir "2026-04-17" a "Viernes, 17 Abril 2026"
function formatearFechaBonita(fechaIso) {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    
    // Sumamos "T12:00:00" para evitar problemas de zona horaria que puedan restar un día
    const fecha = new Date(fechaIso + "T12:00:00");
    
    const nombreDia = dias[fecha.getDay()];
    const diaNum = fecha.getDate();
    const nombreMes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    
    return {
        diaPalabra: nombreDia,
        fechaCorta: `${diaNum} ${nombreMes} ${anio}`
    };
}

// --- 🌟 LÓGICA DEL PANEL DE NOVEDADES (BANDEJA DE ENTRADA) ---

const btnNovedades = document.getElementById('btn-novedades');
const modalNovedades = document.getElementById('modal-novedades');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const btnCerrarModalFooter = document.getElementById('btn-cerrar-modal-footer');
const tablaNovedadesBody = document.getElementById('tabla-novedades-body');
const badgeNovedades = document.getElementById('badge-novedades');

// Datos simulados (Lo que después traeremos del backend con un GET /api/novedades/pendientes)
let novedadesPendientes = [
    { id: 1, empleado: "Vendedor 3", tipo: "VACACIONES", inicio: "2026-05-10", fin: "2026-05-15", prioridad: 4, observacion: "Viaje familiar anual" },
    { id: 2, empleado: "Vendedor 1", tipo: "INCAPACIDAD", inicio: "2026-04-20", fin: "2026-04-22", prioridad: 5, observacion: "Infección estomacal (Folico IMSS 092)" },
    { id: 3, empleado: "Vendedor 5", tipo: "PETICION_DESCANSO", inicio: "2026-04-18", fin: "2026-04-18", prioridad: 2, observacion: "Quiero descansar en sábado por un bautizo" }
];

// Funciones para abrir y cerrar el modal con animación
function toggleModal() {
    if (modalNovedades.classList.contains('hidden')) {
        modalNovedades.classList.remove('hidden');
        setTimeout(() => {
            modalNovedades.classList.remove('opacity-0');
            modalNovedades.children[0].classList.remove('scale-95');
        }, 10);
        renderizarNovedades();
    } else {
        modalNovedades.classList.add('opacity-0');
        modalNovedades.children[0].classList.add('scale-95');
        setTimeout(() => modalNovedades.classList.add('hidden'), 300);
    }
}

btnNovedades.addEventListener('click', toggleModal);
btnCerrarModal.addEventListener('click', toggleModal);
btnCerrarModalFooter.addEventListener('click', toggleModal);

// Función para pintar la tabla
function renderizarNovedades() {
    tablaNovedadesBody.innerHTML = '';
    
    // Actualizamos el globito rojo
    badgeNovedades.innerText = novedadesPendientes.length;
    if(novedadesPendientes.length === 0) badgeNovedades.classList.add('hidden');

    novedadesPendientes.forEach(nov => {
        // Configuramos el "Semáforo" según la prioridad
        let colorPrioridad = "";
        let textoPrioridad = "";
        let botonesAccion = "";

        if (nov.prioridad === 5) {
            colorPrioridad = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-800";
            textoPrioridad = "🚨 EMERGENCIA (Bloqueo Automático)";
            // El gerente no puede rechazar una emergencia médica, solo decir "Enterado"
            botonesAccion = `<button onclick="removerNovedad(${nov.id})" class="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 rounded font-bold transition">Enterado</button>`;
        } else if (nov.prioridad >= 3) {
            colorPrioridad = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800";
            textoPrioridad = "⭐ ALTA (Derecho / Permiso)";
            botonesAccion = generarBotonesAprobacion(nov.id);
        } else {
            colorPrioridad = "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800";
            textoPrioridad = "💡 BAJA (Preferencia)";
            botonesAccion = generarBotonesAprobacion(nov.id);
        }

        const fila = `
            <tr class="hover:bg-gray-50 dark:hover:bg-[#20242c] transition-colors border-b border-gray-50 dark:border-gray-800/50">
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800 dark:text-white">${nov.empleado}</div>
                    <div class="text-xs text-gray-500 italic mt-1">"${nov.observacion}"</div>
                </td>
                <td class="px-6 py-4">
                    <div class="font-bold text-[11px] tracking-wider text-gray-500 dark:text-gray-400 uppercase">${nov.tipo}</div>
                    <div class="font-mono text-sm mt-1">${nov.inicio} <span class="text-gray-400">al</span> ${nov.fin}</div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded text-[10px] font-bold border ${colorPrioridad}">
                        ${textoPrioridad}
                    </span>
                </td>
                <td class="px-6 py-4 text-center flex justify-center gap-2">
                    ${botonesAccion}
                </td>
            </tr>
        `;
        tablaNovedadesBody.innerHTML += fila;
    });

    if (novedadesPendientes.length === 0) {
        tablaNovedadesBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">No hay peticiones pendientes. ¡Todo en orden! 🎉</td></tr>`;
    }
}

function generarBotonesAprobacion(id) {
    return `
        <button onclick="removerNovedad(${id})" class="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded font-bold transition flex items-center gap-1"><span>✓</span> Aprobar</button>
        <button onclick="removerNovedad(${id})" class="text-xs bg-gray-200 hover:bg-red-500 hover:text-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded font-bold transition flex items-center gap-1"><span>×</span> Rechazar</button>
    `;
}

// Simula que el gerente procesó la petición (la quita de la lista)
window.removerNovedad = function(id) {
    novedadesPendientes = novedadesPendientes.filter(n => n.id !== id);
    renderizarNovedades(); // Repintamos
}