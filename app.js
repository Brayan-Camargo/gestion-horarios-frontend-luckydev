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

// ... (Tus variables globales arriba igual) ...

// TEMA
btnTema.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    iconoTema.innerText = htmlElement.classList.contains('dark') ? '☀️' : '🌙';
    // Forzamos re-render para asegurar que el CSS aplique bien
    const indexActual = selectorSemana.value || 0;
    renderizarMatrizSemanal(parseInt(indexActual));
});

// DESCARGAR (CORREGIDO)
botonDescargar.addEventListener('click', () => {
    const tituloOriginal = tituloSemana.innerText;
    const elementosGerente = document.querySelectorAll('.vista-gerente');
    const elementosEmpleado = document.querySelectorAll('.vista-empleado');

    elementosGerente.forEach(el => el.classList.add('hidden'));
    elementosEmpleado.forEach(el => el.classList.remove('hidden'));

    // Estilo temporal para foto limpia
    const originalBg = zonaCaptura.style.backgroundColor;
    zonaCaptura.style.borderRadius = "0px";

    html2canvas(zonaCaptura, {
        backgroundColor: htmlElement.classList.contains('dark') ? "#0f1115" : "#ffffff",
        scale: 2,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Horario_${tituloOriginal.replace(/ /g, "_")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        elementosGerente.forEach(el => el.classList.remove('hidden'));
        elementosEmpleado.forEach(el => el.classList.add('hidden'));
        zonaCaptura.style.borderRadius = "1rem";

        Swal.fire({ title: '¡Listo!', text: 'Horario enviado a descargas', icon: 'success', timer: 2000 });
        selectorSemana.value = 0; // Reinicia el selector a la semana 1
    });
});

// RENDERIZADO (PURIFICADO)
function renderizarMatrizSemanal(indiceSemana) {
    const inicio = indiceSemana * 7;
    let diasDeEstaSemana = fechasUnicasMes.slice(inicio, inicio + 7);
    const hoy = new Date().toISOString().split('T')[0];

    let trHead = `<tr><th class="columna-empleado text-left">EMPLEADO</th>`;
    diasDeEstaSemana.forEach(fecha => {
        const esRelleno = fecha.split('-')[1] !== mesPrincipal;
        const esHoy = fecha === hoy;
        const fechaBonita = formatearFechaBonita(fecha);
        let clases = esRelleno ? "dia-relleno " : "";
        if (esHoy) clases += "cabecera-hoy ";

        trHead += `<th class="${clases} text-center">
            <div class="opacity-60 mb-1 text-[10px]">${fechaBonita.diaPalabra}</div>
            <div class="text-sm font-bold">${fechaBonita.fechaCorta}</div>
            ${esHoy ? '<div class="text-[9px] font-black text-orange-500 mt-1">HOY</div>' : ''}
        </th>`;
    });
    trHead += `</tr>`;
    tablaHead.innerHTML = trHead;

    const primera = formatearFechaBonita(diasDeEstaSemana[0]);
    const ultima = formatearFechaBonita(diasDeEstaSemana[diasDeEstaSemana.length - 1]);
    tituloSemana.innerText = `Semana ${indiceSemana + 1} | ${primera.fechaCorta} AL ${ultima.fechaCorta}`;

    tablaBody.innerHTML = '';
    empleadosUnicos.forEach(emp => {
        let trBody = `<tr><td class="columna-empleado">${emp}</td>`;
        diasDeEstaSemana.forEach(fecha => {
            const esHoy = fecha === hoy;
            const esRelleno = fecha.split('-')[1] !== mesPrincipal;
            const turno = datosGlobales.find(d => d.nombreEmpleado === emp && d.inicio.split('T')[0] === fecha);
            let contenido = '<span class="opacity-10">-</span>';
            let clases = `text-center transition-all ${esHoy ? 'celda-hoy ' : ''}${esRelleno ? 'dia-relleno ' : ''}`;

            if (turno) {

                if (turno.esDescanso) {
                    if (turno.tipoTurno === "DESCANSO" || turno.tipoTurno === "DESCANSO_SEMANAL") {
                        contenido = '<div class="estado-descanso p-2">DESCANSO</div>';
                    } else {
                        const esPrivado = turno.tipoTurno.includes('PERMISO');
                        const texto = esPrivado ? 'DESCANSO' : turno.tipoTurno.replace('_', ' ');
                        contenido = `<div class="estado-peticion p-2"><span class="vista-gerente etiqueta-peticion">${texto}</span><span class="vista-empleado hidden text-[10px] opacity-40 font-bold">DESCANSO</span></div>`;
                    }
                } else { // <--- ASEGÚRATE DE QUE ESTA LLAVE ESTÉ AQUÍ
                    const hIn = turno.inicio.split('T')[1].substring(0, 5);
                    const hOut = turno.fin.split('T')[1].substring(0, 5);
                    const claseT = turno.tipoTurno === 'APERTURA' ? 'turno-apertura' : 'turno-cierre';

                    contenido = `
                    <div class="flex flex-col items-center justify-center h-full">
                        <span class="${claseT}">${turno.tipoTurno}</span>
                        <span class="texto-hora font-medium">${hIn} — ${hOut}</span>
                    </div>
                    `;
                }
            }
            trBody += `<td class="${clases}">${contenido}</td>`;
        });
        trBody += `</tr>`;
        tablaBody.innerHTML += trBody;
    });
}
// ... (Tus funciones de carga de API y formatearFechaBonita se quedan igual)

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
        if (datosGlobales.length > 0) botonProbar.innerText = "Actualizar Datos";
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
    if (novedadesPendientes.length === 0) {
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