const btnTema = document.getElementById('btn-tema');
const htmlElement = document.documentElement;
const iconoTema = document.getElementById('icono-tema');
const botonProbar = document.getElementById('btn-probar');
const botonGenerar = document.getElementById('btn-generar');
const botonDescargar = document.getElementById('btn-descargar');
const selectorSemana = document.getElementById('selector-semana');
const zonaCaptura = document.getElementById('zona-captura');
const tablaHead = document.getElementById('tabla-head');
const tablaBody = document.getElementById('tabla-body');
const tituloSemana = document.getElementById('titulo-semana');

// Elementos del Modal de Novedades
const btnNovedades = document.getElementById('btn-novedades');
const modalNovedades = document.getElementById('modal-novedades');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const btnCerrarModalFooter = document.getElementById('btn-cerrar-modal-footer');
const tablaNovedadesBody = document.getElementById('tabla-novedades-body');
const badgeNovedades = document.getElementById('badge-novedades');

// Variables Globales de Estado
let datosGlobales = [];
let mesPrincipal = "";
let fechasUnicasMes = [];
let empleadosUnicos = [];
let novedadesPendientes = [];
const DEPARTAMENTO_ID = 1;

// ==========================================
// 2. CONFIGURACIÓN INICIAL Y TEMA
// ==========================================
iconoTema.innerText = '☀️';
btnTema.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    iconoTema.innerText = htmlElement.classList.contains('dark') ? '☀️' : '🌙';
});

// ==========================================
// 3. MOTOR DE GENERACIÓN Y CARGA DE HORARIOS
// ==========================================
botonGenerar.addEventListener('click', async () => {
    if (datosGlobales && datosGlobales.length > 0) {
        const { value: textoConfirmacion } = await Swal.fire({
            title: '⚠️ ¡Cuidado!',
            html: `Ya existe un horario generado para este mes. <br><br>
                   Si continúas, <b>se borrará el horario actual y se generará uno completamente diferente</b>.<br><br>
                   Escribe la palabra <b>CONFIRMAR</b> para proceder:`,
            input: 'text',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#4b5563',
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

        if (!textoConfirmacion) return; 
    }

    botonGenerar.innerText = "Calculando...";
    botonGenerar.disabled = true;

    try {
        const respuesta = await fetch('http://localhost:8080/api/horarios/generar/1?mes=4&anio=2026', {
            method: 'POST'
        });

        if (!respuesta.ok) throw new Error('Error al generar el horario.');
        
        const textoRespuesta = await respuesta.text();
        
        Swal.fire({
            title: '¡Listo!',
            text: textoRespuesta,
            icon: 'success',
            background: htmlElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
            color: htmlElement.classList.contains('dark') ? '#ffffff' : '#374151',
            confirmButtonColor: '#10b981'
        });
        
        botonProbar.click(); 

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    } finally {
        botonGenerar.innerText = "⚙️ Generar Nuevo Mes";
        botonGenerar.disabled = false;
    }
});

botonProbar.addEventListener('click', async () => {
    botonProbar.innerText = "Cargando...";

    try {
        const respuesta = await fetch('http://localhost:8080/api/horarios/1');
        if (!respuesta.ok) throw new Error('Error en el servidor');
        
        datosGlobales = await respuesta.json();

        if (datosGlobales.length === 0) {
            alert("⚠️ No hay horarios generados para este departamento aún. Haz clic en 'Generar Nuevo Mes'.");
            botonProbar.innerText = "Cargar Mes";
            return; 
        }

        fechasUnicasMes = [...new Set(datosGlobales.map(d => d.inicio.split('T')[0]))].sort();
        empleadosUnicos = [...new Set(datosGlobales.map(d => d.nombreEmpleado))].sort();

        const fechaMedio = fechasUnicasMes[Math.floor(fechasUnicasMes.length / 2)];
        mesPrincipal = fechaMedio.split('-')[1]; 

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

// ==========================================
// 4. RENDERIZADO VISUAL Y EXPORTACIÓN
// ==========================================
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

    const diasFaltantes = 7 - diasDeEstaSemana.length;
    if (diasFaltantes > 0) {
        let ultimaFecha = new Date(diasDeEstaSemana[diasDeEstaSemana.length - 1] + "T12:00:00");
        for (let i = 1; i <= diasFaltantes; i++) {
            ultimaFecha.setDate(ultimaFecha.getDate() + 1);
            diasDeEstaSemana.push(ultimaFecha.toISOString().split('T')[0]);
        }
    }

    // 🌙 ARREGLO DARK MODE: Forzamos el texto claro en la cabecera
    let trHead = `<tr><th class="p-3 border border-gray-200 dark:border-gray-700 text-left bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">EMPLEADO</th>`;
    diasDeEstaSemana.forEach(fecha => {
        const esRelleno = fecha.split('-')[1] !== mesPrincipal;
        const estiloCabecera = esRelleno ? "text-gray-400 dark:text-gray-500 italic" : "text-gray-800 dark:text-gray-200";
        const fechaBonita = formatearFechaBonita(fecha); 
        
        trHead += `<th class="p-3 border border-gray-200 dark:border-gray-700 min-w-[120px] ${estiloCabecera} bg-gray-50 dark:bg-gray-800/80">
                        <div class="font-normal text-xs mb-1">${fechaBonita.diaPalabra}</div>
                        <div class="font-bold text-sm tracking-wide">${fechaBonita.fechaCorta}</div>
                   </th>`;
    });
    trHead += `</tr>`;
    tablaHead.innerHTML = trHead;

    const primera = formatearFechaBonita(diasDeEstaSemana[0]);
    const ultima = formatearFechaBonita(diasDeEstaSemana[6]);
    tituloSemana.innerText = `Semana ${indiceSemana + 1} | ${primera.fechaCorta} AL ${ultima.fechaCorta}`;

    // 🌙 ARREGLO DARK MODE: Forzamos el texto claro en el cuerpo de la tabla
    tablaBody.className = "text-gray-800 dark:text-gray-200";
    tablaBody.innerHTML = '';
    
    empleadosUnicos.forEach(emp => {
        let trBody = `<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                        <td class="p-3 border border-gray-200 dark:border-gray-700 text-left font-bold bg-gray-50 dark:bg-gray-800/50">${emp}</td>`;
        
        diasDeEstaSemana.forEach(fecha => {
            const mesActualCelda = parseInt(fecha.split('-')[1]);
            const mesPrincipalNum = parseInt(mesPrincipal);
            const esOtroMes = mesActualCelda !== mesPrincipalNum;
            
            let etiquetaMes = "";
            if (esOtroMes) {
                if (mesActualCelda < mesPrincipalNum || (mesActualCelda === 12 && mesPrincipalNum === 1)) {
                    etiquetaMes = "Mes Anterior";
                } else {
                    etiquetaMes = "Próximo Mes";
                }
            }

            const turno = datosGlobales.find(d => d.nombreEmpleado === emp && d.inicio.split('T')[0] === fecha);
            
            let contenidoCelda = '<span class="text-gray-300 dark:text-gray-600">-</span>';
            let clasesCelda = "p-3 border border-gray-200 dark:border-gray-700 relative h-16 text-center ";

            if (turno) {
                if (turno.esDescanso) {
                    const esDescansoNormal = turno.tipoTurno === "DESCANSO" || turno.tipoTurno === "DESCANSO_SEMANAL";
                    
                    if (esDescansoNormal) {
                        contenidoCelda = 'DESCANSO';
                        clasesCelda += 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 font-bold text-xs tracking-widest';
                    
                    } else if (turno.tipoTurno === "APOYO_SUCURSAL") {
                        contenidoCelda = `
                            <div class="w-full h-full flex flex-col items-center justify-center">
                                <span class="text-amber-600 dark:text-amber-400 font-bold text-[10px] tracking-wider uppercase text-center leading-tight">APOYO<br>OTRA TIENDA</span>
                            </div>
                        `;
                        clasesCelda += 'bg-amber-50 dark:bg-amber-900/20';

                    } else {
                        // 🕵️‍♂️ REGLA DE PRIVACIDAD
                        const esPrivado = turno.tipoTurno.includes('PERMISO');
                        const textoGerente = esPrivado ? 'DESCANSO' : turno.tipoTurno.replace('_', ' ');

                        contenidoCelda = `
                            <div class="w-full h-full flex items-center justify-center">
                                <span class="vista-gerente text-purple-700 dark:text-purple-300 font-bold text-[11px] tracking-wider uppercase">${textoGerente}</span>
                                <span class="vista-empleado hidden text-gray-600 dark:text-gray-400 font-bold text-xs tracking-widest">DESCANSO</span>
                            </div>
                        `;
                        clasesCelda += 'bg-purple-50 dark:bg-purple-900/20';
                    }
                } else {
                    // 🚀 AQUÍ ESTÁ EL BLOQUE QUE NOS FALTABA PARA APERTURAS Y CIERRES
                    const horaIn = turno.inicio.split('T')[1].substring(0, 5);
                    const horaFin = turno.fin.split('T')[1].substring(0, 5);
                    contenidoCelda = `
                        <div class="font-bold ${turno.tipoTurno === 'APERTURA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'} text-xs uppercase mb-1">${turno.tipoTurno}</div>
                        <div class="font-mono text-gray-800 dark:text-gray-200">${horaIn} - ${horaFin}</div>
                    `;
                }

                if (esOtroMes) {
                    clasesCelda += ' opacity-50 bg-gray-100 dark:bg-gray-900/60';
                    contenidoCelda += `<div class="absolute bottom-0 right-0 left-0 text-[10px] text-gray-500 dark:text-gray-500 font-bold uppercase tracking-wider text-center pb-1">${etiquetaMes}</div>`;
                }
            }

            trBody += `<td class="${clasesCelda}">${contenidoCelda}</td>`;
        }); // Cierra el forEach de diasDeEstaSemana
        
        trBody += `</tr>`;
        tablaBody.innerHTML += trBody;
    }); // Cierra el forEach de empleadosUnicos
}

function formatearFechaBonita(fechaIso) {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    
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

// ==========================================
// 5. BANDEJA DE NOVEDADES (API REST)
// ==========================================
async function cargarNovedadesDesdeAPI() {
    try {
        const respuesta = await fetch(`http://localhost:8080/api/novedades/pendientes/${DEPARTAMENTO_ID}`);
        if (!respuesta.ok) throw new Error('Error al conectar con la bandeja de novedades');
        
        const datos = await respuesta.json();
        
        novedadesPendientes = datos.map(n => ({
            id: n.id,
            empleado: n.empleado.nombre,
            tipo: n.tipo,
            inicio: n.fechaInicio,
            fin: n.fechaFin,
            prioridad: n.nivelPrioridad,
            observacion: n.observacion || "Sin observaciones"
        }));

        renderizarNovedades();
    } catch (error) {
        console.error("❌ Fallo al cargar novedades:", error);
    }
}

function toggleModal() {
    if (modalNovedades.classList.contains('hidden')) {
        modalNovedades.classList.remove('hidden');
        setTimeout(() => {
            modalNovedades.classList.remove('opacity-0');
            modalNovedades.children[0].classList.remove('scale-95');
        }, 10);
        cargarNovedadesDesdeAPI(); // Cargamos datos al abrir
    } else {
        modalNovedades.classList.add('opacity-0');
        modalNovedades.children[0].classList.add('scale-95');
        setTimeout(() => modalNovedades.classList.add('hidden'), 300);
    }
}

// Event Listeners del Modal asignados de forma limpia
btnNovedades.addEventListener('click', toggleModal);
btnCerrarModal.addEventListener('click', toggleModal);
btnCerrarModalFooter.addEventListener('click', toggleModal);

function renderizarNovedades() {
    tablaNovedadesBody.innerHTML = '';
    
    badgeNovedades.innerText = novedadesPendientes.length;
    if(novedadesPendientes.length === 0) {
        badgeNovedades.classList.add('hidden');
    } else {
        badgeNovedades.classList.remove('hidden');
    }

    novedadesPendientes.forEach(nov => {
        let colorPrioridad = "";
        let textoPrioridad = "";
        let botonesAccion = "";

        if (nov.prioridad === 5) {
            colorPrioridad = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-800";
            textoPrioridad = "🚨 EMERGENCIA (Bloqueo Automático)";
            botonesAccion = `<button onclick="aprobarNovedad(${nov.id})" class="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 rounded font-bold transition">Enterado</button>`;
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

async function aprobarNovedad(id) {
    try {
        const respuesta = await fetch(`http://localhost:8080/api/novedades/${id}/aprobar`, {
            method: 'PUT'
        });

        if (respuesta.ok) {
            Swal.fire({
                title: 'Aprobada',
                text: 'La petición ha sido aceptada. El próximo horario la respetará.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            cargarNovedadesDesdeAPI(); 
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo procesar la aprobación', 'error');
    }
}

async function rechazarNovedad(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "La petición será eliminada permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sí, rechazar'
    });

    if (confirmacion.isConfirmed) {
        try {
            const respuesta = await fetch(`http://localhost:8080/api/novedades/${id}/rechazar`, {
                method: 'DELETE'
            });

            if (respuesta.ok) {
                Swal.fire('Eliminada', 'Petición rechazada con éxito.', 'success');
                cargarNovedadesDesdeAPI();
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo eliminar la petición', 'error');
        }
    }
}

function generarBotonesAprobacion(id) {
    return `
        <button onclick="aprobarNovedad(${id})" class="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded font-bold transition flex items-center gap-1"><span>✓</span> Aprobar</button>
        <button onclick="rechazarNovedad(${id})" class="text-xs bg-gray-200 hover:bg-red-500 hover:text-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded font-bold transition flex items-center gap-1"><span>×</span> Rechazar</button>
    `;
}