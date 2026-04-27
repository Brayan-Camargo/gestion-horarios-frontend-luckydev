// ==========================================
// 1. REFERENCIAS AL DOM PROTEGIDAS
// ==========================================
const getEl = (id) => document.getElementById(id);

const refs = {
    btnTema:             getEl('btn-tema'),
    html:                document.documentElement,
    iconoTema:           getEl('icono-tema'),
    botonProbar:         getEl('btn-probar'),
    botonGenerar:        getEl('btn-generar'),
    botonDescargar:      getEl('btn-descargar'),
    selectorSemana:      getEl('selector-semana'),
    zonaCaptura:         getEl('zona-captura'),
    tablaHead:           getEl('tabla-head'),
    tablaBody:           getEl('tabla-body'),
    tituloSemana:        getEl('titulo-semana'),
    // Modal Empleados
    btnGestionarEmpleados: getEl('btn-gestionar-empleados'),
    modalEmpleados:        getEl('modal-empleados'),
    btnCerrarEmpleados:    getEl('btn-cerrar-empleados'),
    tablaEmpleadosBody:    getEl('tabla-empleados-body'),
    formEmpleado:          getEl('form-nuevo-empleado'),
    // Modal Novedades
    btnNovedades:          getEl('btn-novedades'),
    modalNovedades:        getEl('modal-novedades'),
    btnCerrarModal:        getEl('btn-cerrar-modal'),
    btnCerrarModalFooter:  getEl('btn-cerrar-modal-footer'),
    tablaNovedadesBody:    getEl('tabla-novedades-body'),
    badgeNovedades:        getEl('badge-novedades'),
};

// Variables de Estado
let datosGlobales       = [];
let listaEmpleados      = [];
let fechasUnicasMes     = [];
let empleadosUnicos     = [];
let novedadesPendientes = [];
let mesPrincipal        = "";
const DEPARTAMENTO_ID   = 1;



// ==========================================
// 2. TEMA (DARK / LIGHT)
// ==========================================
if (refs.btnTema) {
    refs.btnTema.addEventListener('click', () => {
        refs.html.classList.toggle('dark');
        if (refs.iconoTema) {
            refs.iconoTema.innerText = refs.html.classList.contains('dark') ? '☀️' : '🌙';
        }
    });
}



// ==========================================
// 3. MODAL EMPLEADOS — ABRIR / CERRAR
// ==========================================
if (refs.btnGestionarEmpleados) {
    refs.btnGestionarEmpleados.addEventListener('click', () => {
        refs.modalEmpleados.classList.remove('hidden');
        setTimeout(() => {
            refs.modalEmpleados.classList.replace('opacity-0', 'opacity-100');
            refs.modalEmpleados.querySelector('div').classList.replace('scale-95', 'scale-100');
        }, 10);
        cargarEmpleados();
    });
}

if (refs.btnCerrarEmpleados) {
    refs.btnCerrarEmpleados.addEventListener('click', () => {
        refs.modalEmpleados.classList.replace('opacity-100', 'opacity-0');
        refs.modalEmpleados.querySelector('div').classList.replace('scale-100', 'scale-95');
        setTimeout(() => refs.modalEmpleados.classList.add('hidden'), 300);
    });
}



// ==========================================
// 4. GESTIÓN DE EMPLEADOS
// ==========================================

// Cargar lista desde la API
async function cargarEmpleados() {
    try {
        const res = await fetch(`http://localhost:8080/api/empleados/departamento/${DEPARTAMENTO_ID}`);
        if (!res.ok) throw new Error('Error al obtener empleados');
        listaEmpleados = await res.json();
        renderizarTablaEmpleados();
        if (refs.botonGenerar) refs.botonGenerar.disabled = listaEmpleados.length === 0;
    } catch (error) {
        console.error("Error al cargar equipo:", error);
    }
}

// Renderizar tabla de empleados
function renderizarTablaEmpleados() {
    if (!refs.tablaEmpleadosBody) return;

    if (listaEmpleados.length === 0) {
        refs.tablaEmpleadosBody.innerHTML = `
            <tr>
                <td colspan="4" class="py-10 text-center">
                    <div class="opacity-40 text-5xl mb-2">📥</div>
                    <p class="text-gray-500">No hay empleados registrados.<br>Usa el formulario de arriba para empezar.</p>
                </td>
            </tr>`;
        return;
    }

    // .map().join('') en lugar de += para mejor rendimiento
    refs.tablaEmpleadosBody.innerHTML = listaEmpleados.map(emp => {
        const tieneHorarioFijo = emp.horaEntrada && emp.horaSalida;
        return `
            <tr class="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td class="px-4 py-3 font-bold">${emp.nombre}</td>
                <td class="px-4 py-3">
                    <span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">${emp.rol}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    ${tieneHorarioFijo
                        ? `<span class="text-indigo-500 font-mono text-xs">${emp.horaEntrada} - ${emp.horaSalida}</span>`
                        : '<span class="opacity-30">Rotativo</span>'}
                </td>
                <td class="px-4 py-3 text-right">
                    <button onclick="eliminarEmpleado(${emp.id})" class="text-red-400 hover:text-red-600 p-2 transition">🗑️</button>
                </td>
            </tr>`;
    }).join('');
}

// Guardar nuevo empleado — UN SOLO listener, con todas las mejoras
if (refs.formEmpleado) {
    refs.formEmpleado.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = refs.formEmpleado.querySelector('button[type="submit"]');
        const originalContent = btnSubmit ? btnSubmit.innerHTML : '';

        const nuevoEmpleado = {
            nombre:       getEl('nombre-empleado').value.trim(),
            rol:          getEl('rol-empleado').value,
            horaEntrada:  getEl('entrada-fija').value || null,
            horaSalida:   getEl('salida-fija').value || null,
            departamento: { id: DEPARTAMENTO_ID }
        };

        // Validación antes de tocar el servidor
        if (!nuevoEmpleado.nombre) {
            Swal.fire('Campo requerido', 'El nombre no puede estar vacío.', 'warning');
            return;
        }

        try {
            if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = "Guardando..."; }

            const res = await fetch('http://localhost:8080/api/empleados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoEmpleado)
            });

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Añadido!',
                    text: `${nuevoEmpleado.nombre} se ha unido al equipo.`,
                    timer: 1500,
                    showConfirmButton: false,
                    background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
                    color:      refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
                });
                refs.formEmpleado.reset();
                await cargarEmpleados(); // await para evitar condición de carrera
            } else {
                const errorData = await res.json().catch(() => ({}));
                Swal.fire('Error del servidor', errorData.message || 'No se pudo guardar el empleado.', 'error');
            }

        } catch (err) {
            // Captura errores de red / CORS
            Swal.fire('Error de Conexión', 'No puedo comunicarme con el servidor. ¿Añadiste @CrossOrigin en Java?', 'error');
        } finally {
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = originalContent; }
        }
    });
}

// Eliminar empleado
async function eliminarEmpleado(id) {
    const confirmacion = await Swal.fire({
        title: '¿Eliminar empleado?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color:      refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const res = await fetch(`http://localhost:8080/api/empleados/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('El servidor no pudo eliminar al empleado');
        await cargarEmpleados();
        Swal.fire({ title: 'Eliminado', text: 'El empleado ha sido removido.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
        Swal.fire('Error', error.message || 'No se pudo eliminar al empleado', 'error');
    }
}



// ==========================================
// 5. MOTOR DE GENERACIÓN Y CARGA DE HORARIOS
// ==========================================

if (refs.botonGenerar) {
    refs.botonGenerar.addEventListener('click', async () => {
        if (datosGlobales && datosGlobales.length > 0) {
            const { value: textoConfirmacion } = await Swal.fire({
                title: '⚠️ ¡Cuidado!',
                html: `Ya existe un horario generado para este mes.<br><br>
                       Si continúas, <b>se borrará el horario actual y se generará uno completamente diferente</b>.<br><br>
                       Escribe la palabra <b>CONFIRMAR</b> para proceder:`,
                input: 'text',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#4b5563',
                confirmButtonText: 'Sí, regenerar horario',
                cancelButtonText: 'Cancelar',
                background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
                color:      refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
                inputValidator: (value) => {
                    if (value !== 'CONFIRMAR') return 'Debes escribir CONFIRMAR exactamente en mayúsculas.';
                }
            });
            if (!textoConfirmacion) return;
        }

        refs.botonGenerar.innerText = "Calculando...";
        refs.botonGenerar.disabled = true;

        try {
            const respuesta = await fetch('http://localhost:8080/api/horarios/generar/1?mes=4&anio=2026', { method: 'POST' });
            if (!respuesta.ok) throw new Error('Error al generar el horario.');

            const textoRespuesta = await respuesta.text();
            Swal.fire({
                title: '¡Listo!', text: textoRespuesta, icon: 'success',
                background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
                color:      refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
                confirmButtonColor: '#10b981'
            });
            if (refs.botonProbar) refs.botonProbar.click();

        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            refs.botonGenerar.innerText = "⚙️ Generar Nuevo Mes";
            refs.botonGenerar.disabled = false;
        }
    });
}

if (refs.botonProbar) {
    refs.botonProbar.addEventListener('click', async () => {
        refs.botonProbar.innerText = "Cargando...";

        try {
            const respuesta = await fetch('http://localhost:8080/api/horarios/1');
            if (!respuesta.ok) throw new Error('Error en el servidor');
            datosGlobales = await respuesta.json();

            if (datosGlobales.length === 0) {
                alert("⚠️ No hay horarios generados aún. Haz clic en 'Generar Nuevo Mes'.");
                refs.botonProbar.innerText = "Cargar Mes";
                return;
            }

            fechasUnicasMes = [...new Set(datosGlobales.map(d => d.inicio.split('T')[0]))].sort();
            empleadosUnicos = [...new Set(datosGlobales.map(d => d.nombreEmpleado))].sort();
            mesPrincipal    = fechasUnicasMes[Math.floor(fechasUnicasMes.length / 2)].split('-')[1];

            configurarSelectorSemanas();
            if (refs.selectorSemana) refs.selectorSemana.classList.remove('hidden');
            if (refs.zonaCaptura)    refs.zonaCaptura.classList.remove('hidden');
            if (refs.botonDescargar) refs.botonDescargar.classList.remove('hidden');

            renderizarMatrizSemanal(0);

        } catch (error) {
            alert("❌ Error: " + error.message);
        } finally {
            if (datosGlobales.length > 0) refs.botonProbar.innerText = "Actualizar Datos";
        }
    });
}



// ==========================================
// 6. RENDERIZADO VISUAL DEL HORARIO
// ==========================================

function renderizarMatrizSemanal(indiceSemana) {
    if (!refs.tablaHead || !refs.tablaBody) {
        console.error("No se encontraron 'tabla-head' o 'tabla-body' en el DOM.");
        return;
    }

    const inicio = indiceSemana * 7;
    const diasDeEstaSemana = fechasUnicasMes.slice(inicio, inicio + 7);
    const hoy = new Date().toISOString().split('T')[0];

    // Cabecera — .map().join('') en lugar de concatenación manual
    refs.tablaHead.innerHTML = `<tr>
        <th class="columna-empleado text-left">EMPLEADO</th>
        ${diasDeEstaSemana.map(fecha => {
            const esRelleno = fecha.split('-')[1] !== mesPrincipal;
            const esHoy     = fecha === hoy;
            const bonita    = formatearFechaBonita(fecha);
            const clases    = `${esRelleno ? 'dia-relleno ' : ''}${esHoy ? 'cabecera-hoy ' : ''}text-center`;
            return `<th class="${clases}">
                <div class="opacity-60 mb-1 text-[10px]">${bonita.diaPalabra}</div>
                <div class="text-sm font-bold">${bonita.fechaCorta}</div>
                ${esHoy ? '<div class="text-[9px] font-black text-orange-500 mt-1">HOY</div>' : ''}
            </th>`;
        }).join('')}
    </tr>`;

    // Título de semana
    if (refs.tituloSemana) {
        const primera = formatearFechaBonita(diasDeEstaSemana[0]);
        const ultima  = formatearFechaBonita(diasDeEstaSemana[diasDeEstaSemana.length - 1]);
        refs.tituloSemana.innerText = `Semana ${indiceSemana + 1} | ${primera.fechaCorta} AL ${ultima.fechaCorta}`;
    }

    // Cuerpo — .map().join('') para mejor rendimiento
    refs.tablaBody.innerHTML = empleadosUnicos.map(emp => {
        const celdas = diasDeEstaSemana.map(fecha => {
            const esHoy     = fecha === hoy;
            const esRelleno = fecha.split('-')[1] !== mesPrincipal;
            const turno     = datosGlobales.find(d => d.nombreEmpleado === emp && d.inicio.split('T')[0] === fecha);
            const clases    = `text-center transition-all ${esHoy ? 'celda-hoy ' : ''}${esRelleno ? 'dia-relleno ' : ''}`;

            let contenido = '<span class="opacity-10">-</span>';

            if (turno) {
                if (turno.esDescanso) {
                    if (turno.tipoTurno === 'DESCANSO' || turno.tipoTurno === 'DESCANSO_SEMANAL') {
                        contenido = '<div class="estado-descanso p-2">DESCANSO</div>';
                    } else {
                        const esPrivado = turno.tipoTurno.includes('PERMISO');
                        const texto     = esPrivado ? 'DESCANSO' : turno.tipoTurno.replace('_', ' ');
                        contenido = `<div class="estado-peticion p-2">
                            <span class="vista-gerente etiqueta-peticion">${texto}</span>
                            <span class="vista-empleado hidden text-[10px] opacity-40 font-bold">DESCANSO</span>
                        </div>`;
                    }
                } else {
                    const hIn    = turno.inicio.split('T')[1].substring(0, 5);
                    const hOut   = turno.fin.split('T')[1].substring(0, 5);
                    const claseT = turno.tipoTurno === 'APERTURA' ? 'turno-apertura' : 'turno-cierre';
                    contenido = `<div class="flex flex-col items-center justify-center h-full">
                        <span class="${claseT}">${turno.tipoTurno}</span>
                        <span class="texto-hora font-medium">${hIn} — ${hOut}</span>
                    </div>`;
                }
            }

            return `<td class="${clases}">${contenido}</td>`;
        }).join('');

        return `<tr><td class="columna-empleado">${emp}</td>${celdas}</tr>`;
    }).join('');
}

function configurarSelectorSemanas() {
    if (!refs.selectorSemana) return;
    refs.selectorSemana.innerHTML = '';
    const totalSemanas = Math.ceil(fechasUnicasMes.length / 7);

    for (let i = 0; i < totalSemanas; i++) {
        const opcion = document.createElement('option');
        opcion.value     = i;
        opcion.innerText = `Semana ${i + 1}`;
        refs.selectorSemana.appendChild(opcion);
    }

    refs.selectorSemana.addEventListener('change', (e) => {
        renderizarMatrizSemanal(parseInt(e.target.value));
    });
}

function formatearFechaBonita(fechaIso) {
    const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const dias  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    const fecha = new Date(fechaIso + "T12:00:00");
    return {
        diaPalabra: dias[fecha.getDay()],
        fechaCorta: `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`
    };
}



// ==========================================
// 7. BANDEJA DE NOVEDADES
// ==========================================

async function cargarNovedadesDesdeAPI() {
    try {
        const respuesta = await fetch(`http://localhost:8080/api/novedades/pendientes/${DEPARTAMENTO_ID}`);
        if (!respuesta.ok) throw new Error('Error al conectar con la bandeja de novedades');

        const datos = await respuesta.json();
        novedadesPendientes = datos.map(n => ({
            id:          n.id,
            empleado:    n.empleado.nombre,
            tipo:        n.tipo,
            inicio:      n.fechaInicio,
            fin:         n.fechaFin,
            prioridad:   n.nivelPrioridad,
            observacion: n.observacion || "Sin observaciones"
        }));

        renderizarNovedades();
    } catch (error) {
        console.error("❌ Fallo al cargar novedades:", error);
    }
}

function toggleModal() {
    if (!refs.modalNovedades) return;

    if (refs.modalNovedades.classList.contains('hidden')) {
        refs.modalNovedades.classList.remove('hidden');
        setTimeout(() => {
            refs.modalNovedades.classList.remove('opacity-0');
            refs.modalNovedades.children[0].classList.remove('scale-95');
        }, 10);
        cargarNovedadesDesdeAPI();
    } else {
        refs.modalNovedades.classList.add('opacity-0');
        refs.modalNovedades.children[0].classList.add('scale-95');
        setTimeout(() => refs.modalNovedades.classList.add('hidden'), 300);
    }
}

if (refs.btnNovedades)         refs.btnNovedades.addEventListener('click', toggleModal);
if (refs.btnCerrarModal)       refs.btnCerrarModal.addEventListener('click', toggleModal);
if (refs.btnCerrarModalFooter) refs.btnCerrarModalFooter.addEventListener('click', toggleModal);

function renderizarNovedades() {
    if (!refs.tablaNovedadesBody) return;

    if (refs.badgeNovedades) {
        refs.badgeNovedades.innerText = novedadesPendientes.length;
        refs.badgeNovedades.classList.toggle('hidden', novedadesPendientes.length === 0);
    }

    if (novedadesPendientes.length === 0) {
        refs.tablaNovedadesBody.innerHTML = `
            <tr><td colspan="4" class="text-center py-8 text-gray-500">No hay peticiones pendientes. ¡Todo en orden! 🎉</td></tr>`;
        return;
    }

    refs.tablaNovedadesBody.innerHTML = novedadesPendientes.map(nov => {
        let colorPrioridad, textoPrioridad, botonesAccion;

        if (nov.prioridad === 5) {
            colorPrioridad = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-800";
            textoPrioridad = "🚨 EMERGENCIA (Bloqueo Automático)";
            botonesAccion  = `<button onclick="aprobarNovedad(${nov.id})" class="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 rounded font-bold transition">Enterado</button>`;
        } else if (nov.prioridad >= 3) {
            colorPrioridad = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800";
            textoPrioridad = "⭐ ALTA (Derecho / Permiso)";
            botonesAccion  = generarBotonesAprobacion(nov.id);
        } else {
            colorPrioridad = "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800";
            textoPrioridad = "💡 BAJA (Preferencia)";
            botonesAccion  = generarBotonesAprobacion(nov.id);
        }

        return `
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
                    <span class="px-2 py-1 rounded text-[10px] font-bold border ${colorPrioridad}">${textoPrioridad}</span>
                </td>
                <td class="px-6 py-4 text-center flex justify-center gap-2">
                    ${botonesAccion}
                </td>
            </tr>`;
    }).join('');
}

async function aprobarNovedad(id) {
    try {
        const respuesta = await fetch(`http://localhost:8080/api/novedades/${id}/aprobar`, { method: 'PUT' });
        if (!respuesta.ok) throw new Error('No se pudo procesar la aprobación');
        Swal.fire({ title: 'Aprobada', text: 'La petición ha sido aceptada.', icon: 'success', timer: 2000, showConfirmButton: false });
        cargarNovedadesDesdeAPI();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

async function rechazarNovedad(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "La petición será eliminada permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sí, rechazar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const respuesta = await fetch(`http://localhost:8080/api/novedades/${id}/rechazar`, { method: 'DELETE' });
        if (!respuesta.ok) throw new Error('No se pudo eliminar la petición');
        Swal.fire('Eliminada', 'Petición rechazada con éxito.', 'success');
        cargarNovedadesDesdeAPI();
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

function generarBotonesAprobacion(id) {
    return `
        <button onclick="aprobarNovedad(${id})" class="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded font-bold transition flex items-center gap-1">
            <span>✓</span> Aprobar
        </button>
        <button onclick="rechazarNovedad(${id})" class="text-xs bg-gray-200 hover:bg-red-500 hover:text-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded font-bold transition flex items-center gap-1">
            <span>×</span> Rechazar
        </button>`;
}