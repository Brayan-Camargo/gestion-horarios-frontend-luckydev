// ==========================================
// 1. EL CANDADO PROTECTOR (Se ejecuta de inmediato)
// ==========================================
/*Auth.checkGuard([
        Auth.LEVELS.EMPLEADO,  
        Auth.LEVELS.ENCARGADO, 
        Auth.LEVELS.SUB_GERENTE, 
        Auth.LEVELS.GERENTE, 
        Auth.LEVELS.ADMIN_EMPRESA,
        Auth.LEVELS.SUPER_ADMIN]);
*/

// ==========================================
// 2. CARGA DE LA INTERFAZ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const usuario = Auth.getUser();
    
    // A. Saludo Dinámico
    if (usuario && usuario.nombre) {
        const h2Saludo = document.querySelector('h2.text-indigo-400');
        if (h2Saludo) h2Saludo.innerText = `¡Hola, ${usuario.nombre}!`;
    }

    // B. Conectar Botones
    const btnVerHorario = document.getElementById('btn-ver-horario');
    const btnSolicitar = document.getElementById('btn-solicitar');

    if (btnVerHorario) btnVerHorario.addEventListener('click', verMiHorario);
    if (btnSolicitar) btnSolicitar.addEventListener('click', abrirFormularioPermiso);
});


// ==========================================
// 3. LÓGICA DE NEGOCIO (FUNCIONES)
// ==========================================

// A. Lógica para Ver Horario (Versión Visual Premium + Descarga + ORDENADO)
async function verMiHorario() {
    try {
        const res = await Auth.apiFetch('/api/horarios/1');
        if (!res.ok) throw new Error('No se pudo cargar el horario');
        
        const todosLosTurnos = await res.json();
        const usuario = Auth.getUser();
        
        const nombreUsuarioLimpio = usuario.nombre.toLowerCase().replace(/[0-9]/g, ''); 
        const misTurnos = todosLosTurnos.filter(t => t.nombreEmpleado.toLowerCase().replace(/\s+/g, '') === nombreUsuarioLimpio);

        if (misTurnos.length > 0) {
            const empleadoId = misTurnos[0].empleadoId;
            cargarEstadisticas(empleadoId);
        }

        // LA MAGIA PARA SINCRONIZAR LA SEMANA ACTUAL
        const hoy = new Date();
        const diaSemana = hoy.getDay() || 7; 
        
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - diaSemana + 1);
        lunes.setMinutes(lunes.getMinutes() - lunes.getTimezoneOffset()); 
        const lunesIso = lunes.toISOString().split('T')[0];

        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        const domingoIso = domingo.toISOString().split('T')[0];

        // Filtramos para la semana actual
        const turnosSemanaActual = misTurnos.filter(t => {
            const fechaTurno = t.inicio.split('T')[0];
            return fechaTurno >= lunesIso && fechaTurno <= domingoIso;
        });

        if (turnosSemanaActual.length === 0) {
            Swal.fire({ icon: 'info', title: 'Sin turnos', text: 'El gerente aún no publica tu horario para esta semana.', background: '#1a1d23', color: '#ffffff' });
            return;
        }

        // 👇 LA SOLUCIÓN AL BUG: ORDENAR CRONOLÓGICAMENTE (Lunes a Domingo) 👇
        turnosSemanaActual.sort((a, b) => {
            const fechaA = new Date(a.inicio.split('T')[0]);
            const fechaB = new Date(b.inicio.split('T')[0]);
            return fechaA - fechaB;
        });

        const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        // 🎨 Contenedor principal con Grid
        let tarjetasHTML = `
        <div id="zona-captura-horario" style="background: #1a1d23; padding: 20px; border-radius: 16px;">
            <h3 style="color:#a5b4fc; font-weight:900; margin-bottom:20px; font-size:1.5rem; text-transform:uppercase; letter-spacing:1px;">
                📅 Mi Horario Semanal
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 10px;">`;
        
        turnosSemanaActual.forEach(t => {
            const partesFecha = t.inicio.split('T')[0].split('-'); 
            const diaNumero = partesFecha[2];
            const nombreMes = meses[parseInt(partesFecha[1]) - 1];

            const fechaObj = new Date(t.inicio.split('T')[0] + "T12:00:00");
            const diaNombre = diasSemana[fechaObj.getDay()];

            const hIn = t.inicio.split('T')[1].substring(0, 5);
            const hOut = t.fin.split('T')[1].substring(0, 5);
            
            let colorTexto = t.esDescanso ? '#9ca3af' : (t.tipoTurno === 'APERTURA' ? '#10b981' : '#3b82f6');
            let colorFondoEtiqueta = t.esDescanso ? 'rgba(255,255,255,0.05)' : (t.tipoTurno === 'APERTURA' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)');
            let etiqueta = t.esDescanso ? 'DESCANSO' : t.tipoTurno;
            let horasStr = t.esDescanso ? '--' : `${hIn} — ${hOut}`;

            tarjetasHTML += `
                <div style="background-color: #0f1115; border: 1px solid #1f2937; border-radius: 12px; padding: 15px 8px; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                    <div>
                        <div style="font-size: 0.65rem; color: #6b7280; font-weight: 800; text-transform: uppercase;">${diaNombre}</div>
                        <div style="font-size: 1rem; color: #f8fafc; font-weight: 900; margin-bottom: 12px;">${diaNumero} ${nombreMes}</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <span style="background-color: ${colorFondoEtiqueta}; color: ${colorTexto}; font-size: 0.6rem; font-weight: 800; padding: 4px 6px; border-radius: 6px; border: ${t.esDescanso ? '1px dashed #374151' : 'none'}; display: inline-block;">
                            ${etiqueta}
                        </span>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #e2e8f0;">${horasStr}</div>
                </div>
            `;
        });
        
        tarjetasHTML += `
            </div>
        </div>
        <button id="btn-descargar-mi-horario" style="margin-top: 20px; background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); transition: transform 0.2s; width: 100%;">
            📸 Descargar como Imagen
        </button>`;

        Swal.fire({
            html: tarjetasHTML,
            background: '#1a1d23', 
            width: '950px', 
            showConfirmButton: false, 
            showCloseButton: true,    
            didOpen: () => {
                const btn = document.getElementById('btn-descargar-mi-horario');
                btn.addEventListener('click', async () => {
                    const btnHTML = btn.innerHTML;
                    btn.innerHTML = "⏳ Preparando imagen...";
                    btn.disabled = true;
                    
                    try {
                        const capturaDiv = document.getElementById('zona-captura-horario');
                        const canvas = await html2canvas(capturaDiv, {
                            backgroundColor: '#1a1d23', 
                            scale: 2 
                        });
                        
                        const link = document.createElement('a');
                        link.download = `Horario_${nombreUsuarioLimpio}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        
                        Swal.fire({
                            icon: 'success',
                            title: '¡Descarga Exitosa!',
                            text: 'Revisa tu galería o carpeta de descargas.',
                            background: '#1a1d23', color: '#ffffff', timer: 2000, showConfirmButton: false
                        });
                    } catch(err) {
                        console.error(err);
                        btn.innerHTML = btnHTML;
                        btn.disabled = false;
                    }
                });
            }
        });

    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
}

// B. Lógica para Solicitar Permiso
async function abrirFormularioPermiso() {
    const { value: formValues } = await Swal.fire({
        title: 'Solicitar Novedad',
        html: `
            <select id="swal-tipo" class="w-full bg-[#0f1115] border border-gray-700 p-3 rounded-xl text-white mb-4 outline-none focus:border-indigo-500 transition">
                <option value="VACACIONES">Vacaciones</option>
                <option value="INCAPACIDAD">Incapacidad Médica</option>
                <option value="PERMISO_ESPECIAL">Permiso Especial (Cobra Horas)</option>
                <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
            </select>
            <div class="flex gap-3 mb-4">
                <div class="w-1/2 text-left">
                    <label class="text-xs text-gray-500 uppercase font-bold pl-1">Desde</label>
                    <input type="date" id="swal-inicio" class="w-full bg-[#0f1115] border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500 transition">
                </div>
                <div class="w-1/2 text-left">
                    <label class="text-xs text-gray-500 uppercase font-bold pl-1">Hasta</label>
                    <input type="date" id="swal-fin" class="w-full bg-[#0f1115] border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500 transition">
                </div>
            </div>
            <textarea id="swal-obs" rows="3" class="w-full bg-[#0f1115] border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500 transition resize-none" placeholder="Motivo o justificación breve..."></textarea>
        `,
        focusConfirm: false,
        background: '#1a1d23', color: '#ffffff', confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Enviar Solicitud',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            return {
                tipo: document.getElementById('swal-tipo').value,
                fechaInicio: document.getElementById('swal-inicio').value,
                fechaFin: document.getElementById('swal-fin').value,
                observacion: document.getElementById('swal-obs').value
            }
        }
    });

    if (formValues) {
        if (!formValues.fechaInicio || !formValues.fechaFin) {
            Swal.fire({
                icon: 'warning', title: 'Datos incompletos', text: 'Debes seleccionar la fecha de inicio y fin.',
                background: '#1a1d23', color: '#ffffff'
            });
            return;
        }

        try {
            // Mandamos la petición al backend de Spring Boot
            const payload = {
                tipo: formValues.tipo,
                fechaInicio: formValues.fechaInicio,
                fechaFin: formValues.fechaFin,
                observacion: formValues.observacion,
                nivelPrioridad: formValues.tipo === 'INCAPACIDAD' ? 5 : 2
            };

            const res = await Auth.apiFetch('/api/novedades/solicitar', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                Swal.fire({
                    icon: 'success', title: '¡Enviado!', text: 'Tu solicitud ya está en la bandeja del gerente.',
                    background: '#1a1d23', color: '#ffffff', confirmButtonColor: '#10b981'
                });
            } else {
                Swal.fire('Error', 'No se pudo registrar la solicitud', 'error');
            }
        } catch (error) {
            Swal.fire('Error de conexión', 'Falló la comunicación con el servidor', 'error');
        }
    }
}

// ==========================================
// 4. MÓDULO RELOJ CHECADOR
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    iniciarReloj();
    inicializarDatosEmpleado();
    
    // --- AQUÍ VA EL BLOQUE DE SEGURIDAD VISUAL ---
    const usuario = Auth.getUser();
    const btnEntrada = document.getElementById('btn-checkin');
    const btnSalida = document.getElementById('btn-checkout');

    // Si es un empleado normal o vendedor, le quitamos los botones para que no cheque desde casa
    if (usuario && (usuario.rol === Auth.LEVELS.EMPLEADO || usuario.rol === Auth.LEVELS.VENDEDOR)) {
        if(btnEntrada) btnEntrada.style.display = 'none';
        if(btnSalida) btnSalida.style.display = 'none';
        
        const contenedorHora = document.querySelector('.hora-actual');
        if (contenedorHora) {
            contenedorHora.innerHTML += `<p class="text-[10px] text-amber-500 mt-2 font-bold uppercase tracking-wider">Asistencia controlada por Gerencia</p>`;
        }
    }

    const btnCheckIn = document.getElementById('btn-checkin');
    const btnCheckOut = document.getElementById('btn-checkout');
    if (btnCheckIn) btnCheckIn.addEventListener('click', () => registrarAsistencia('check-in'));
    if (btnCheckOut) btnCheckOut.addEventListener('click', () => registrarAsistencia('check-out'));
});

async function inicializarDatosEmpleado() {
    try {
        const usuario = Auth.getUser();
        const nombreUsuarioLimpio = usuario.nombre.toLowerCase().replace(/[0-9]/g, '');

        const resHorarios = await Auth.apiFetch('/api/horarios/1');
        if (resHorarios.ok) {
            const todosLosTurnos = await resHorarios.json();
            const misTurnos = todosLosTurnos.filter(t => t.nombreEmpleado.toLowerCase().replace(/\s+/g, '') === nombreUsuarioLimpio);

            if (misTurnos.length > 0) {
                // Sacamos su ID y cargamos sus números mágicos
                const empleadoId = misTurnos[0].empleadoId;
                cargarEstadisticas(empleadoId);
            }
        }
    } catch (error) {
        console.error("Error al inicializar datos:", error);
    }
}

// A. Reloj Digital en Tiempo Real
function iniciarReloj() {
    const elementoReloj = document.getElementById('reloj-digital');
    if (!elementoReloj) return;

    setInterval(() => {
        const ahora = new Date();
        // Formato de 24 horas exacto
        elementoReloj.innerText = ahora.toLocaleTimeString('es-MX', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
        });
    }, 1000);
}

// B. Enviar la Checada al Backend
async function registrarAsistencia(tipoEndpoint) {
    const btnCheckIn = document.getElementById('btn-checkin');
    const btnCheckOut = document.getElementById('btn-checkout');
    if (btnCheckIn) btnCheckIn.disabled = true;
    if (btnCheckOut) btnCheckOut.disabled = true;

    try {
        // 1. Necesitamos saber quién es y cuál es su turno de hoy
        const usuario = Auth.getUser();
        const nombreUsuarioLimpio = usuario.nombre.toLowerCase().replace(/[0-9]/g, ''); 

        // Traemos los turnos para buscar el de HOY
        const resHorarios = await Auth.apiFetch('/api/horarios/1');
        if (!resHorarios.ok) throw new Error('No se pudo cargar tu horario para verificar el turno.');
        
        const todosLosTurnos = await resHorarios.json();
        
        const hoyIso = new Date().toISOString().split('T')[0]; // Ej: "2026-05-06"
        
        // Buscamos el turno que le toca HOY a este empleado
        const turnoDeHoy = todosLosTurnos.find(t => 
            t.nombreEmpleado.toLowerCase().replace(/\s+/g, '') === nombreUsuarioLimpio &&
            t.inicio.startsWith(hoyIso)
        );

        if (!turnoDeHoy) {
            Swal.fire('Sin turno hoy', 'No tienes un turno programado para el día de hoy, no puedes checar.', 'warning');
            return;
        }

        // 2. Ejecutamos la petición POST a tu AsistenciaController
        // Nota: Como parche temporal, usamos el ID del turno de hoy, y asumiremos el empleadoId según el turno
        const empleadoId = turnoDeHoy.empleadoId; // Asumiendo que tu backend devuelve el empleadoId en el turno
        const turnoId = turnoDeHoy.id;

        const resAsistencia = await Auth.apiFetch(`/api/asistencia/${tipoEndpoint}?empleadoId=${empleadoId}&turnoId=${turnoId}`, {
            method: 'POST'
        });

        if (resAsistencia.ok) {
            const data = await resAsistencia.json();
            
            // Evaluamos el estado que calculó tu Java
            let icono = 'success';
            let mensaje = 'Registrado exitosamente.';
            
            if (data.estado === 'RETARDO') {
                icono = 'warning';
                mensaje = 'Tu entrada fue registrada con retardo. Se han descontado puntos de tu score.';
            } else if (data.estado === 'TEMPRANO') {
                icono = 'warning';
                mensaje = 'Registraste tu salida antes de tiempo. Se ha notificado al gerente.';
            } else if (data.estado === 'HORAS_EXTRA_PENDIENTES') {
                icono = 'info';
                mensaje = 'Tu salida ha sido registrada. Tus horas extra están pendientes de aprobación.';
            }

            Swal.fire({
                icon: icono,
                title: tipoEndpoint === 'check-in' ? '¡Check-In Exitoso!' : '¡Check-Out Exitoso!',
                text: mensaje,
                background: '#1a1d23', color: '#ffffff', confirmButtonColor: '#10b981'
            });

            cargarEstadisticas(empleadoId);

        } else {
            const errorData = await resAsistencia.json();
            Swal.fire('Error', errorData.error || 'No se pudo registrar la asistencia.', 'error');
        }

    } catch (error) {
        console.error(error);
        Swal.fire('Error de conexión', 'No pudimos comunicarnos con el servidor.', 'error');
    } finally {
        // 2. Volvemos a encender los botones siempre, falle o tenga éxito
        if (btnCheckIn) btnCheckIn.disabled = false;
        if (btnCheckOut) btnCheckOut.disabled = false;
    }
}

// C. Consultar Estadísticas del Empleado (Versión Universal SaaS)
async function cargarEstadisticas(empleadoId) {
    try {
        const res = await Auth.apiFetch(`/api/asistencia/stats/${empleadoId}`);
        if (res.ok) {
            const data = await res.json();
            
            const elementoScore = document.getElementById('stat-score');
            const elementoDeuda = document.getElementById('stat-deuda');
            const textoDeuda = elementoDeuda.nextElementSibling; 

            // Actualizamos el Score
            if (elementoScore) elementoScore.innerText = data.scorePuntos;

            // Actualizamos la Deuda (Universal: Horas y Minutos)
            if (elementoDeuda) {
                const totalMinutos = Math.abs(data.minutosDeuda);
                
                // Matemática simple y universal
                const horas = Math.floor(totalMinutos / 60);
                const minutos = totalMinutos % 60;
                
                let textoFormateado = "";
                if (horas > 0) textoFormateado += `${horas}h `;
                textoFormateado += `${minutos}m`;

                // Si está en ceros
                if (totalMinutos === 0) textoFormateado = "0h 0m";

                elementoDeuda.innerText = textoFormateado;
                
                // Colores dinámicos
                if (data.minutosDeuda < 0) {
                    elementoDeuda.className = "text-4xl font-black text-rose-500";
                    textoDeuda.innerText = "TIEMPO EN CONTRA";
                } else if (data.minutosDeuda > 0) {
                    elementoDeuda.className = "text-4xl font-black text-emerald-400";
                    textoDeuda.innerText = "TIEMPO A FAVOR";
                } else {
                    elementoDeuda.className = "text-4xl font-black text-gray-400";
                    textoDeuda.innerText = "TABLAS";
                }
            }
        }
    } catch (error) {
        console.error("No se pudieron cargar las estadísticas", error);
    }
}