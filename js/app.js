// ==========================================
// GUARD — protege la página
// ==========================================
 Auth.checkGuard([
    Auth.LEVELS.SUB_GERENTE,
    Auth.LEVELS.GERENTE, 
    Auth.LEVELS.ADMIN_EMPRESA, 
    Auth.LEVELS.SUPER_ADMIN]);

// ==========================================
// 1. REFERENCIAS AL DOM Y ESTADO
// ==========================================
const _usuario = Auth.getUser();
const getEl = (id) => document.getElementById(id);

const refs = {
    btnTema: getEl('btn-tema'),
    html: document.documentElement,
    iconoTema: getEl('icono-tema'),
    botonProbar: getEl('btn-probar'),
    botonGenerar: getEl('btn-generar'),
    botonDescargar: getEl('btn-descargar'),
    botonRecalcular: getEl('btn-recalcular'),
    selectorSemana: getEl('selector-semana'),
    zonaCaptura: getEl('zona-captura'),
    tablaHead: getEl('tabla-head'),
    tablaBody: getEl('tabla-body'),
    tituloSemana: getEl('titulo-semana'),
    // Modal Empleados
    btnGestionarEmpleados: getEl('btn-gestionar-empleados'),
    modalEmpleados: getEl('modal-empleados'),
    btnCerrarEmpleados: getEl('btn-cerrar-empleados'),
    tablaEmpleadosBody: getEl('tabla-empleados-body'),
    formEmpleado: getEl('form-nuevo-empleado'),
    // Modal Novedades
    btnNovedades: getEl('btn-novedades'),
    modalNovedades: getEl('modal-novedades'),
    btnCerrarModal: getEl('btn-cerrar-modal'),
    btnCerrarModalFooter: getEl('btn-cerrar-modal-footer'),
    tablaNovedadesBody: getEl('tabla-novedades-body'),
    badgeNovedades: getEl('badge-novedades'),
    // Pase de lista
    btnPaseLista: getEl('btn-pase-lista'),
    modalPaseLista: getEl('modal-pase-lista'),
    btnCerrarLista: getEl('btn-cerrar-lista'),
    contenedorListaHoy: getEl('lista-empleados-hoy'),
    formConfirmarAsistencia: getEl('form-confirmar-asistencia'),
};

// Variables de Estado — declaradas UNA sola vez
let datosGlobales = [];
let listaEmpleados = [];
let fechasUnicasMes = [];
let empleadosUnicos = [];
let novedadesPendientes = [];
let mesPrincipal = "";
let asistenciaPendiente = null;

const DEPARTAMENTO_ID = _usuario?.departamentoId ?? 1;



// ==========================================
// 2. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Listener del formulario de validación
    if (refs.formConfirmarAsistencia) {
        refs.formConfirmarAsistencia.addEventListener('submit', ejecutarValidacionYRegistro);
    }

    if (refs.botonProbar) {
        // Le damos medio segundo a la interfaz para "respirar" y simulamos el clic
        setTimeout(() => {
            refs.botonProbar.click();
        }, 500); 
    }
    cargarNovedadesDesdeAPI();
});



// ==========================================
// 3. TEMA (DARK / LIGHT)
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
// 4. MODALES — ABRIR / CERRAR
// ==========================================

// Función genérica reutilizable para todos los modales (doc 10)
const toggleModalGenerico = (modal) => {
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.replace('opacity-0', 'opacity-100');
            modal.querySelector('div').classList.replace('scale-95', 'scale-100');
        }, 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        modal.querySelector('div').classList.replace('scale-100', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

// Modal Novedades — toggle propio porque también carga datos
function toggleModalNovedades() {
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

// Listeners de modales
if (refs.btnGestionarEmpleados) refs.btnGestionarEmpleados.addEventListener('click', () => { toggleModalGenerico(refs.modalEmpleados); cargarEmpleados(); });
if (refs.btnCerrarEmpleados) refs.btnCerrarEmpleados.addEventListener('click', () => toggleModalGenerico(refs.modalEmpleados));
if (refs.btnNovedades) refs.btnNovedades.addEventListener('click', toggleModalNovedades);
if (refs.btnCerrarModal) refs.btnCerrarModal.addEventListener('click', toggleModalNovedades);
if (refs.btnCerrarModalFooter) refs.btnCerrarModalFooter.addEventListener('click', toggleModalNovedades);
if (refs.btnPaseLista) refs.btnPaseLista.addEventListener('click', () => { toggleModalGenerico(refs.modalPaseLista); renderizarPaseDeLista(); });
if (refs.btnCerrarLista) refs.btnCerrarLista.addEventListener('click', () => toggleModalGenerico(refs.modalPaseLista));



// ==========================================
// 5. GESTIÓN DE EMPLEADOS
// ==========================================

async function cargarEmpleados() {
    try {
        const res = await Auth.apiFetch(`/api/empleados/departamento/${DEPARTAMENTO_ID}`);
        if (!res.ok) throw new Error('Error al obtener empleados');
        listaEmpleados = await res.json();
        renderizarTablaEmpleados();
        if (refs.botonGenerar) refs.botonGenerar.disabled = listaEmpleados.length === 0;
    } catch (error) {
        console.error("Error al cargar equipo:", error);
    }
}

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

    refs.tablaEmpleadosBody.innerHTML = listaEmpleados.map(emp => {
        const tieneHorarioFijo = emp.horaEntrada && emp.horaSalida;
        const score = emp.scorePuntos || 0;
        const minutos = emp.minutosDeuda || 0;
        const horas = (minutos / 60).toFixed(1);

        let badgeBanco = '';
        if (minutos > 0) {
            badgeBanco = `<span class="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold" title="Horas a favor">⏱️ +${horas} hrs</span>`;
        } else if (minutos < 0) {
            badgeBanco = `<span class="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold" title="Horas que debe">⏱️ Debe ${Math.abs(horas)} hrs</span>`;
        }

        return `
            <tr class="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td class="px-4 py-3 font-bold">
                    ${emp.nombre}
                    <div class="mt-1 flex gap-2">
                        <span class="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">🪙 ${score} pts</span>
                        ${badgeBanco}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">${emp.puesto ?? '—'}</span>
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

// Guardar nuevo empleado
if (refs.formEmpleado) {
    refs.formEmpleado.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = refs.formEmpleado.querySelector('button[type="submit"]');
        const originalContent = btnSubmit ? btnSubmit.innerHTML : '';

        const nombreVal = getEl('nombre-empleado').value.trim();
        const rolVal = getEl('rol-empleado').value;
        const entradaVal = getEl('entrada-fija').value;
        const salidaVal = getEl('salida-fija').value;

        // Validación: si llenan uno, deben llenar el otro
        if ((entradaVal && !salidaVal) || (!entradaVal && salidaVal)) {
            Swal.fire({
                icon: 'warning',
                title: 'Horario incompleto',
                text: 'Si el empleado tiene horario fijo debes asignar Entrada y Salida. Si es rotativo, deja ambos en blanco.',
                background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
                color: refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
            });
            return;
        }

        const tieneHorarioFijo = entradaVal !== '' && salidaVal !== '';

        const nuevoEmpleado = {
            nombre: nombreVal,
            rol: rolVal,
            tieneHorarioFijo: tieneHorarioFijo,
            horaInicioDisponibilidad: entradaVal ? entradaVal + ":00" : null,
            horaFinDisponibilidad: salidaVal ? salidaVal + ":00" : null,
            departamentoId: DEPARTAMENTO_ID
        };

        if (!nuevoEmpleado.nombre) {
            Swal.fire('Campo requerido', 'El nombre no puede estar vacío.', 'warning');
            return;
        }

        try {
            if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = "Guardando..."; }

            const res = await Auth.apiFetch('/api/empleados', {
                method: 'POST',
                body: JSON.stringify(nuevoEmpleado)
            });

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Añadido!',
                    text: `${nuevoEmpleado.nombre} se ha unido al equipo.`,
                    timer: 3500,
                    showConfirmButton: false,
                    background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
                    color: refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
                });
                refs.formEmpleado.reset();
                await cargarEmpleados();
            } else {
                const errorData = await res.json().catch(() => ({}));
                Swal.fire('Error del servidor', errorData.error || errorData.message || 'No se pudo guardar el empleado.', 'error');
            }

        } catch (err) {
            if (err.message !== 'Sesión expirada') {
                Swal.fire('Error de Conexión', 'No puedo comunicarme con el servidor.', 'error');
            }
        } finally {
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = originalContent; }
        }
    });
}

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
        color: refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const res = await Auth.apiFetch(`/api/empleados/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('El servidor no pudo eliminar al empleado');
        await cargarEmpleados();
        Swal.fire({ title: 'Eliminado', text: 'El empleado ha sido removido.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
        if (error.message !== 'Sesión expirada') {
            Swal.fire('Error', error.message || 'No se pudo eliminar al empleado', 'error');
        }
    }
}



// ==========================================
// 6. MOTOR DE GENERACIÓN Y CARGA DE HORARIOS
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
                color: refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
                inputValidator: (value) => {
                    if (value !== 'CONFIRMAR') return 'Debes escribir CONFIRMAR exactamente en mayúsculas.';
                }
            });
            if (!textoConfirmacion) return;
        }

        refs.botonGenerar.innerText = "Calculando...";
        refs.botonGenerar.disabled = true;

        try {
            const ahora = new Date();
            const mesActual = ahora.getMonth() + 1;
            const anioActual = ahora.getFullYear();

            const respuesta = await Auth.apiFetch(`/api/horarios/generar/${DEPARTAMENTO_ID}?mes=${mesActual}&anio=${anioActual}`, { method: 'POST' });
            if (!respuesta.ok) throw new Error('Error al generar el horario.');

            const textoRespuesta = await respuesta.text();
            Swal.fire({
                title: '¡Listo!', text: textoRespuesta, icon: 'success',
                background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
                color: refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
                confirmButtonColor: '#10b981'
            });
            if (refs.botonProbar) refs.botonProbar.click();

        } catch (error) {
            if (error.message !== 'Sesión expirada') Swal.fire('Error', error.message, 'error');
        } finally {
            refs.botonGenerar.innerText = "⚙️ Generar Nuevo Mes";
            refs.botonGenerar.disabled = false;
        }
    });
}

if (refs.botonRecalcular) {
    refs.botonRecalcular.addEventListener('click', async () => {
        const { isConfirmed } = await Swal.fire({
            title: '🚨 ¿Recalcular desde Hoy?',
            html: `Esto borrará los turnos futuros a partir de hoy y los volverá a calcular.<br><br>
                   <b>Úsalo solo si aprobaste una petición tardía o registraste una incapacidad médica.</b>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#4b5563',
            confirmButtonText: 'Sí, recalcular',
            cancelButtonText: 'Cancelar',
            background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
            color: refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
        });

        if (!isConfirmed) return;

        refs.botonRecalcular.innerHTML = "⏳ Recalculando...";
        refs.botonRecalcular.disabled = true;

        try {
            const respuesta = await Auth.apiFetch(`/api/horarios/regenerar-emergencia/${DEPARTAMENTO_ID}`, { method: 'POST' });
            if (!respuesta.ok) throw new Error('Error al recalcular el horario.');

            Swal.fire({
                title: '¡Operación Exitosa!', text: await respuesta.text(), icon: 'success',
                timer: 2500, showConfirmButton: false,
                background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
                color: refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
            });
            if (refs.botonProbar) refs.botonProbar.click();

        } catch (error) {
            if (error.message !== 'Sesión expirada') Swal.fire('Error', error.message, 'error');
        } finally {
            refs.botonRecalcular.innerHTML = "<span>🚨</span> Recalcular desde Hoy";
            refs.botonRecalcular.disabled = false;
        }
    });
}

if (refs.botonProbar) {
    refs.botonProbar.addEventListener('click', async () => {
        refs.botonProbar.innerText = "Cargando...";

        try {
            const respuesta = await Auth.apiFetch(`/api/horarios/${DEPARTAMENTO_ID}`);
            if (!respuesta.ok) throw new Error('Error en el servidor');
            let todosLosDatos = await respuesta.json();

            if (todosLosDatos.length === 0) {
                alert("⚠️ No hay horarios generados aún. Haz clic en 'Generar Nuevo Mes'.");
                refs.botonProbar.innerText = "Actualizar Datos";
                return;
            }

            // Filtrar solo el mes actual dinámicamente
            const ahora = new Date();
            const mesActual = String(ahora.getMonth() + 1).padStart(2, '0');
            const anioActual = String(ahora.getFullYear());
            mesPrincipal = mesActual;

            const fechasTotales = [...new Set(todosLosDatos.map(d => d.inicio.split('T')[0]))].sort();
            const fechasDelMes = fechasTotales.filter(f => f.startsWith(`${anioActual}-${mesActual}`));

            if (fechasDelMes.length > 0) {
                const indexInicio = fechasTotales.indexOf(fechasDelMes[0]);
                const indexFin = fechasTotales.indexOf(fechasDelMes[fechasDelMes.length - 1]);
                const inicioSemana = indexInicio - (indexInicio % 7);
                const finSemana = indexFin + (6 - (indexFin % 7));

                fechasUnicasMes = fechasTotales.slice(inicioSemana, finSemana + 1);
                datosGlobales = todosLosDatos.filter(d => fechasUnicasMes.includes(d.inicio.split('T')[0]));
            } else {
                datosGlobales = todosLosDatos;
                fechasUnicasMes = fechasTotales;
            }

            empleadosUnicos = [...new Set(datosGlobales.map(d => d.nombreEmpleado))].sort();

            configurarSelectorSemanas();
            if (refs.selectorSemana) refs.selectorSemana.classList.remove('hidden');
            if (refs.zonaCaptura) refs.zonaCaptura.classList.remove('hidden');
            if (refs.botonDescargar) refs.botonDescargar.classList.remove('hidden');

            // Auto-seleccionar la semana de HOY
            const hoyIso = `${anioActual}-${mesActual}-${String(ahora.getDate()).padStart(2, '0')}`;
            const indexHoy = fechasUnicasMes.indexOf(hoyIso);
            const semanaASeleccionar = indexHoy !== -1 ? Math.floor(indexHoy / 7) : 0;

            if (refs.selectorSemana) refs.selectorSemana.value = semanaASeleccionar;
            renderizarMatrizSemanal(semanaASeleccionar);

        } catch (error) {
            if (error.message !== 'Sesión expirada') alert("❌ Error: " + error.message);
        } finally {
            if (datosGlobales && datosGlobales.length > 0) refs.botonProbar.innerText = "Actualizar Datos";
        }
    });
}



// ==========================================
// 7. RENDERIZADO VISUAL DEL HORARIO
// ==========================================

function renderizarMatrizSemanal(indiceSemana) {
    if (!refs.tablaHead || !refs.tablaBody) return;

    const inicio = indiceSemana * 7;
    const diasDeEstaSemana = fechasUnicasMes.slice(inicio, inicio + 7);

    // Fecha local correcta (sin problemas de zona horaria)
    const ahora = new Date();
    const hoy = ahora.getFullYear() + '-' +
        String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
        String(ahora.getDate()).padStart(2, '0');

    // Cabecera
    refs.tablaHead.innerHTML = `<tr>
        <th class="columna-empleado text-left">EMPLEADO</th>
        ${diasDeEstaSemana.map(fecha => {
        const esRelleno = fecha.split('-')[1] !== mesPrincipal;
        const esHoy = fecha === hoy;
        const bonita = formatearFechaBonita(fecha);
        const clases = `${esRelleno ? 'dia-relleno ' : ''}${esHoy ? 'cabecera-hoy ' : ''}text-center`;
        return `<th class="${clases}">
                <div class="opacity-60 mb-1 text-[10px]">${bonita.diaPalabra}</div>
                <div class="text-sm font-bold">${bonita.fechaCorta}</div>
                ${esHoy ? '<div class="etiqueta-hoy">HOY</div>' : ''}
            </th>`;
    }).join('')}
    </tr>`;

    // Título de semana
    if (refs.tituloSemana) {
        const primera = formatearFechaBonita(diasDeEstaSemana[0]);
        const ultima = formatearFechaBonita(diasDeEstaSemana[diasDeEstaSemana.length - 1]);
        refs.tituloSemana.innerText = `Semana ${indiceSemana + 1} | ${primera.fechaCorta} AL ${ultima.fechaCorta}`;
    }

    // Cuerpo
    refs.tablaBody.innerHTML = empleadosUnicos.map(emp => {
        const celdas = diasDeEstaSemana.map(fecha => {
            const esHoy = fecha === hoy;
            const esRelleno = fecha.split('-')[1] !== mesPrincipal;
            const turno = datosGlobales.find(d => d.nombreEmpleado === emp && d.inicio.split('T')[0] === fecha);
            const clases = `text-center transition-all ${esHoy ? 'celda-hoy ' : ''}${esRelleno ? 'dia-relleno ' : ''}`;

            let contenido = '<span class="opacity-10">-</span>';

            if (turno) {
                if (turno.esDescanso) {
                    if (turno.tipoTurno === 'DESCANSO' || turno.tipoTurno === 'DESCANSO_SEMANAL') {
                        contenido = '<div class="estado-descanso p-2">DESCANSO</div>';
                    } else {
                        const esPrivado = turno.tipoTurno.includes('PERMISO');
                        const texto = esPrivado ? 'DESCANSO' : turno.tipoTurno.replace('_', ' ');
                        contenido = `<div class="estado-peticion p-2 truncate" title="${texto}">
                            <span class="vista-gerente etiqueta-peticion">${texto}</span>
                        </div>`;
                    }
                } else {
                    const hIn = turno.inicio.split('T')[1].substring(0, 5);
                    const hOut = turno.fin.split('T')[1].substring(0, 5);
                    const claseT = turno.tipoTurno === 'APERTURA' ? 'turno-apertura' : 'turno-cierre';
                    contenido = `<div class="flex flex-col items-center justify-center h-full gap-1">
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
        opcion.value = i;
        opcion.innerText = `Semana ${i + 1}`;
        refs.selectorSemana.appendChild(opcion);
    }

    refs.selectorSemana.addEventListener('change', (e) => {
        renderizarMatrizSemanal(parseInt(e.target.value));
    });
}

function formatearFechaBonita(fechaIso) {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const fecha = new Date(fechaIso + "T12:00:00");
    return {
        diaPalabra: dias[fecha.getDay()],
        fechaCorta: `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`
    };
}



// ==========================================
// 8. 📸 DESCARGA DE IMAGEN (WhatsApp)
// ==========================================

if (refs.botonDescargar) {
    refs.botonDescargar.addEventListener('click', async () => {
        if (!refs.zonaCaptura) return;

        const btnOriginalHTML = refs.botonDescargar.innerHTML;
        refs.botonDescargar.innerHTML = "⏳ Generando...";
        refs.botonDescargar.disabled = true;
        refs.botonDescargar.style.display = 'none';

        try {
            const canvas = await html2canvas(refs.zonaCaptura, {
                backgroundColor: refs.html.classList.contains('dark') ? '#0f1115' : '#ffffff',
                scale: 2,
                useCORS: true,
                logging: false,
                width: refs.zonaCaptura.scrollWidth,
                windowWidth: refs.zonaCaptura.scrollWidth + 100,
            });

            const indiceSemana = refs.selectorSemana ? parseInt(refs.selectorSemana.value) : 0;
            const titulo = refs.tituloSemana
                ? refs.tituloSemana.innerText.replace(/\s+/g, '_').replace(/\|/g, '-')
                : `Semana_${indiceSemana + 1}`;
            const nombreArchivo = `Horario_${titulo}.png`;

            const link = document.createElement('a');
            link.download = nombreArchivo;
            link.href = canvas.toDataURL('image/png');
            link.click();

            Swal.fire({
                icon: 'success',
                title: '¡Imagen lista!',
                text: `"${nombreArchivo}" descargada. ¡Lista para WhatsApp! 📲`,
                timer: 2500,
                showConfirmButton: false,
                background: refs.html.classList.contains('dark') ? '#1f2937' : '#ffffff',
                color: refs.html.classList.contains('dark') ? '#ffffff' : '#374151',
            });

        } catch (err) {
            console.error("Error al generar imagen:", err);
            Swal.fire('Error', 'No se pudo generar la imagen. Revisa la consola.', 'error');
        } finally {
            refs.botonDescargar.style.display = '';
            refs.botonDescargar.innerHTML = btnOriginalHTML;
            refs.botonDescargar.disabled = false;
        }
    });
}



// ==========================================
// 9. BANDEJA UNIFICADA (NOVEDADES + ASISTENCIAS)
// ==========================================

async function cargarNovedadesDesdeAPI() {
    try {
        const res = await Auth.apiFetch(`/api/gerencia/pendientes/${DEPARTAMENTO_ID}`);
        if (!res.ok) throw new Error('Error al conectar con la bandeja unificada');
        novedadesPendientes = await res.json();
        renderizarNovedades();
    } catch (error) {
        console.error("❌ Fallo al cargar novedades:", error);
    }
}

function renderizarNovedades() {
    if (!refs.tablaNovedadesBody) return;

    if (refs.badgeNovedades) {
        refs.badgeNovedades.innerText = novedadesPendientes.length;
        refs.badgeNovedades.classList.toggle('hidden', novedadesPendientes.length === 0);
    }

    if (novedadesPendientes.length === 0) {
        refs.tablaNovedadesBody.innerHTML = `
            <tr><td colspan="4" class="text-center py-8 text-gray-500">No hay acciones pendientes. ¡Todo en orden! 🎉</td></tr>`;
        return;
    }

    refs.tablaNovedadesBody.innerHTML = novedadesPendientes.map(item => {
        let colorPrioridad, textoPrioridad, botonesAccion, insigniaScore = '';

        if (item.esAsistencia) {
            const esHorasExtra = item.tipo === 'HORAS_EXTRA_PENDIENTES';
            const esRetardo = item.tipo === 'LLEGADA_TARDE_PENDIENTE';

            if (esHorasExtra) {
                colorPrioridad = "bg-emerald-100 text-emerald-700 border-emerald-200";
                textoPrioridad = "⏱️ HORAS EXTRA";
                insigniaScore = `
                    <div class="mt-2 text-[10px] font-bold text-emerald-600">
                        Al aprobar, se sumarán ${item.observacion.split(' ')[0]} al banco a favor.
                    </div>`;
            } else if (esRetardo) {
                colorPrioridad = "bg-amber-100 text-amber-700 border-amber-200";
                textoPrioridad = "⚠️ LLEGADA TARDE";
                insigniaScore = `
                    <div class="mt-2 text-[10px] font-bold text-amber-600">
                        ¿Perdonar retardo? Si rechazas, se aplicará el castigo de -10 pts al score.
                    </div>`;
            } else {
                colorPrioridad = "bg-rose-100 text-rose-700 border-rose-200";
                textoPrioridad = "🚨 SALIDA TEMPRANA";
                insigniaScore = `
                    <div class="mt-2 text-[10px] font-bold text-rose-600">
                        ¿Justificar salida? Si rechazas, se descontarán 10 pts y se restará el tiempo.
                    </div>`;
            }
            botonesAccion = generarBotonesAprobacion(item.id, true);

        } else {
            const esCobroHoras = item.tipo === 'PERMISO_ESPECIAL' && item.observacion?.includes('BANCO_HORAS');

            if (item.prioridad === 5) {
                colorPrioridad = "bg-red-100 text-red-700 border-red-200";
                textoPrioridad = "🚨 EMERGENCIA (Inamovible)";
                botonesAccion = `<button onclick="resolverAccion(${item.id}, true, false)" class="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded font-bold transition">Enterado</button>`;
            } else if (esCobroHoras) {
                const costoMins = 480;
                const horasFavor = (item.minutos / 60).toFixed(1);
                const puedePagar = item.minutos >= costoMins;
                colorPrioridad = "bg-purple-100 text-purple-700 border-purple-200";
                textoPrioridad = "⏱️ COBRO DE HORAS";
                insigniaScore = `
                    <div class="mt-2 text-[10px] font-bold ${puedePagar ? 'text-purple-600' : 'text-red-500'}">
                        ⏱️ Banco: ${horasFavor} hrs a favor (Costo: -8 hrs)
                        <br><span class="${!puedePagar ? 'text-red-600 bg-red-100 px-1 rounded' : 'text-gray-400 font-normal'}">
                            ${!puedePagar ? '¡Alerta! No tiene horas suficientes' : 'Aprobación limpia'}
                        </span>
                    </div>`;
                botonesAccion = generarBotonesAprobacion(item.id, false);
            } else {
                const costo = 50;
                const saldoResultante = item.score - costo;
                const generaDeuda = saldoResultante < 0;
                colorPrioridad = item.prioridad >= 3
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-blue-100 text-blue-700 border-blue-200";
                textoPrioridad = item.prioridad >= 3 ? "⭐ ALTA (Permiso)" : "💡 BAJA (Preferencia)";
                insigniaScore = `
                    <div class="mt-2 text-[10px] font-bold ${generaDeuda ? 'text-red-500' : 'text-emerald-500'}">
                        🪙 Score: ${item.score} pts (Costo: -${costo})
                        <br><span class="${generaDeuda ? 'text-red-600 bg-red-100 px-1 rounded' : 'text-gray-400 font-normal'}">
                            ${generaDeuda ? `¡OJO! Quedará en deuda: ${saldoResultante} pts` : `Quedarán ${saldoResultante} pts`}
                        </span>
                    </div>`;
                botonesAccion = generarBotonesAprobacion(item.id, false);
            }
        }

        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-[#20242c] transition-colors border-b border-gray-50 dark:border-gray-800/50">
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800 dark:text-white">${item.nombreEmpleado}</div>
                    <div class="text-xs text-gray-500 italic mt-1">"${item.observacion}"</div>
                    ${insigniaScore}
                </td>
                <td class="px-6 py-4">
                    <div class="font-bold text-[11px] tracking-wider text-gray-500 dark:text-gray-400 uppercase">${item.tipo.replace(/_/g, ' ')}</div>
                    <div class="font-mono text-sm mt-1">${item.fechaInicio} ${item.fechaFin ? `<span class="text-gray-400">al</span> ${item.fechaFin}` : ''}</div>
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

// Función maestra unificada para aprobar/rechazar
async function resolverAccion(id, aprobado, esAsistencia) {
    if (!aprobado) {
        const { isConfirmed } = await Swal.fire({
            title: '¿Estás seguro?',
            text: esAsistencia
                ? "Se aplicará el castigo en score y tiempo."
                : "La petición será rechazada y eliminada.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, rechazar',
            cancelButtonText: 'Cancelar'
        });
        if (!isConfirmed) return;
    }

    const endpoint = esAsistencia
        ? '/api/gerencia/procesar-asistencia'
        : (aprobado ? `/api/novedades/${id}/aprobar` : `/api/novedades/${id}/rechazar`);
    const method = esAsistencia ? 'POST' : (aprobado ? 'PUT' : 'DELETE');
    const params = esAsistencia ? `?asistenciaId=${id}&aprobado=${aprobado}` : '';

    try {
        const res = await Auth.apiFetch(endpoint + params, { method });
        if (!res.ok) throw new Error('No se pudo procesar la acción');
        Swal.fire({ title: aprobado ? 'Aprobado ✅' : 'Rechazado ❌', icon: 'success', timer: 1500, showConfirmButton: false });
        cargarNovedadesDesdeAPI();
    } catch (error) {
        if (error.message !== 'Sesión expirada') Swal.fire('Error', error.message, 'error');
    }
}

function generarBotonesAprobacion(id, esAsistencia) {
    return `
        <button onclick="resolverAccion(${id}, true, ${esAsistencia})" class="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded font-bold transition flex items-center gap-1">
            <span>✓</span> Aprobar
        </button>
        <button onclick="resolverAccion(${id}, false, ${esAsistencia})" class="text-xs bg-gray-200 hover:bg-red-500 hover:text-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded font-bold transition flex items-center gap-1">
            <span>×</span> Rechazar
        </button>`;
}



// ==========================================
// 10. PASE DE LISTA Y VALIDACIÓN DE ASISTENCIA
// ==========================================

function renderizarPaseDeLista() {
    if (!refs.contenedorListaHoy) return;

    const ahora = new Date();
    const hoyIso = ahora.getFullYear() + '-' +
        String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
        String(ahora.getDate()).padStart(2, '0');

    const turnosHoy = datosGlobales.filter(t => t.inicio.startsWith(hoyIso) && !t.esDescanso);

    if (turnosHoy.length === 0) {
        refs.contenedorListaHoy.innerHTML = `
            <div class="text-center py-10">
                <p class="text-gray-500 italic">No hay turnos para hoy (${hoyIso}).</p>
                <p class="text-[10px] text-gray-600 mt-2 underline cursor-pointer" onclick="location.reload()">¿No ves nada? Haz clic aquí para refrescar</p>
            </div>`;
        return;
    }

    refs.contenedorListaHoy.innerHTML = turnosHoy.map(turno => {
        const hIn = turno.inicio.split('T')[1].substring(0, 5);
        const hOut = turno.fin.split('T')[1].substring(0, 5);
        return `
            <div class="flex justify-between items-center bg-gray-50 dark:bg-[#20242c] p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-2">
                <div>
                    <h4 class="font-bold text-gray-800 dark:text-white text-lg">${turno.nombreEmpleado}</h4>
                    <div class="flex gap-2 items-center mt-1">
                        <span class="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-black uppercase">${turno.tipoTurno}</span>
                        <span class="text-xs text-gray-400 font-mono">${hIn} - ${hOut}</span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="prepararValidacion('${turno.nombreEmpleado}', ${turno.empleadoId}, ${turno.id}, 'check-in')"
                            class="bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 hover:text-white transition text-xs">
                        ENTRADA
                    </button>
                    <button onclick="prepararValidacion('${turno.nombreEmpleado}', ${turno.empleadoId}, ${turno.id}, 'check-out')"
                            class="bg-rose-600/20 text-rose-500 border border-rose-500/20 font-bold py-2 px-4 rounded-lg hover:bg-rose-600 hover:text-white transition text-xs">
                        SALIDA
                    </button>
                </div>
            </div>`;
    }).join('');
}

function prepararValidacion(nombre, empleadoId, turnoId, tipo) {
    asistenciaPendiente = { nombre, empleadoId, turnoId, tipo };
    getEl('validar-nombre-label').innerText = nombre;
    getEl('pass-validacion').value = "";
    const modal = getEl('modal-validar-empleado');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    getEl('pass-validacion').focus();
}

function cerrarValidacion() {
    const modal = getEl('modal-validar-empleado');
    modal.classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

async function ejecutarValidacionYRegistro(e) {
    e.preventDefault();
    const pass = getEl('pass-validacion').value;
    if (!pass) return Swal.fire('Error', 'Ingresa la contraseña', 'error');

    try {
        const loginRes = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: asistenciaPendiente.nombre, password: pass })
        });

        if (loginRes.ok) {
            const dataLogin = await loginRes.json();
            const resAsistencia = await fetch(`http://localhost:8080/api/asistencia/${asistenciaPendiente.tipo}?empleadoId=${asistenciaPendiente.empleadoId}&turnoId=${asistenciaPendiente.turnoId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dataLogin.jwToken}` }
            });

            // Si el registro fue exitoso
            if (resAsistencia.ok) {
                const resultado = await resAsistencia.json();

                let titulo = "¡Registro Exitoso!";
                let icono = "success";
                let mensaje = `Hola ${asistenciaPendiente.nombre}, has registrado tu ${asistenciaPendiente.tipo}.`;

                // ✅ NUEVO: Ajuste para atrapar la nueva lógica de retardos que congela la decisión
                if (resultado.estado === 'TARDE' || resultado.estado === 'LLEGADA_TARDE_PENDIENTE') {
                    titulo = "¡Llegada Tarde!";
                    icono = "warning";
                    mensaje = `Registrado, pero se ha notificado tu demora al gerente.`;
                }

                Swal.fire({
                    icon: icono,
                    title: titulo,
                    text: mensaje,
                    background: '#1a1d23',
                    color: '#fff',
                    confirmButtonColor: '#10b981'
                });

                cerrarValidacion();
                cargarEmpleados(); // ✅ NUEVO: Recarga los puntos en el modal de equipo
                cargarNovedadesDesdeAPI(); // ✅ NUEVO: Prende la campanita de inmediato
                if (refs.botonProbar) refs.botonProbar.click();
                
            } else {
                // ✅ NUEVO: Aquí atrapamos el error 400 (ej. "Ya tienes una SALIDA registrada")
                const errText = await resAsistencia.text();
                let msjError = 'No se pudo registrar la asistencia.';
                try {
                    const errJson = JSON.parse(errText);
                    msjError = errJson.message || errJson.error || msjError;
                } catch (e) { 
                    msjError = errText || msjError; 
                }
                
                Swal.fire('Atención', msjError, 'warning');
                cerrarValidacion(); // Cerramos el modal de contraseña para que no se quede estorbando
            }
        } else {
            Swal.fire('Error', 'Contraseña incorrecta. Inténtalo de nuevo.', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Fallo de conexión con el servidor', 'error');
    }
}