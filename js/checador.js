// ==========================================
// 1. EL CANDADO PROTECTOR (Se ejecuta de inmediato)
// ==========================================
Auth.checkGuard([Auth.LEVELS.EMPLEADO, Auth.LEVELS.SUPER_ADMIN]);


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