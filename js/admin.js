// ==========================================
// VARIABLES GLOBALES
// ==========================================
let chartPuntualidad, chartFatiga; // Evita duplicados al re-renderizar gráficos

// ==========================================
// 1. INICIALIZACIÓN Y PERMISOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getUser();
    if (!user) { Auth.logout(); return; }

    const welcomeTitle = document.querySelector('h2');
    if (welcomeTitle) welcomeTitle.textContent = `Bienvenido(a), ${user.nombre || user.username}`;

    // 1. HERRAMIENTAS EXCLUSIVAS (Super Admin)
    const herramientasAdicionales = document.getElementById('herramientas-super-admin');
    if (user.rol === 'SUPER_ADMIN') {
        cargarSucursales();
        cargarEmpresasParaAdmin(); 
        // 👇 Le quitamos el hidden porque SÍ es el Super Admin
        if (herramientasAdicionales) herramientasAdicionales.classList.remove('hidden');
    }

    // 2. PANEL DE REPORTES (Todos los jefes)
    if (['SUPER_ADMIN', 'ADMIN_EMPRESA', 'GERENTE'].includes(user.rol)) {
        const rhDash = document.getElementById('rh-dashboard');
        if (rhDash) rhDash.classList.remove('hidden');

        const hoy = new Date();
        document.getElementById('fechaFin').value   = hoy.toISOString().split('T')[0];
        document.getElementById('fechaInicio').value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];

        // Candado visual para Gerente: No puede ver el filtro de sucursales
        if (user.rol === 'GERENTE') {
            const filtroSucursalDiv = document.getElementById('filtro-sucursal-rh')?.parentElement;
            if (filtroSucursalDiv) filtroSucursalDiv.classList.add('hidden');
        } else {
            cargarFiltroSucursalesRH(); 
        }
    }
});

// Función para limpiar nombres (Convierte "nohemi.ramirez.rodriguez" en "Nohemi Ramirez Rodriguez")
const formatearNombreUsuario = (username) => {
    if (!username) return '';
    return username.split('.')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
        .join(' ');
};



// ==========================================
// 2. REPORTES Y GRÁFICOS (ADMIN_EMPRESA)
// ==========================================

async function cargarReportesRH() {
    const inicioStr = document.getElementById('fechaInicio').value;
    const finStr = document.getElementById('fechaFin').value;
    
    // 🛑 EL SEGURO ANTI-CRASH: Verificamos si el filtro existe antes de leer su valor
    const filtroEl = document.getElementById('filtro-sucursal-rh');
    const sucursalId = filtroEl ? filtroEl.value : null; 

    if (!inicioStr || !finStr) return;

    // ✅ Validación de rango — máximo 1 año
    const diferenciaDias = (new Date(finStr) - new Date(inicioStr)) / (1000 * 60 * 60 * 24);
    if (diferenciaDias > 365) {
        Swal.fire({ icon: 'error', title: 'Rango excedido', text: 'El reporte no puede superar 1 año.' });
        return;
    }

    // Ejecutamos ambas cargas en paralelo
    await actualizarTarjetasResumen(inicioStr, finStr, sucursalId);
    await cargarTablaDetalladaRH(inicioStr, finStr, sucursalId);
}

async function actualizarTarjetasResumen(inicio, fin, sucursalId) {
    try {
        // 1. Construimos la URL dinámicamente
        let urlResumen = `http://localhost:8080/api/dashboard/resumen?fechaInicio=${inicio}&fechaFin=${fin}`;
        if (sucursalId && sucursalId !== "TODAS") {
            urlResumen += `&sucursalId=${sucursalId}`;
        }

        const res = await fetch(urlResumen, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("lucky_token")}` }
        });
        const data = await res.json();

        document.getElementById('resumen-empleados').textContent = data.totalEmpleados;
        document.getElementById('resumen-asistencias').textContent = data.asistenciasRegistradas;
        document.getElementById('resumen-incapacidades').textContent = data.totalIncapacidades;
        document.getElementById('resumen-horas-extra').textContent = data.totalHorasExtra?.toFixed(1) ?? '0.0';
    } catch (e) { console.error("Error en resumen:", e); }
}

// ✅ Recibe parámetros de forma consistente con actualizarTarjetasResumen
// ==========================================
// 2. RENDERIZADO DE TABLA MAESTRA CON BAJAS
// ==========================================
async function cargarTablaDetalladaRH(inicio, fin, sucursalId) {
    try {
        let urlDetalle = `http://localhost:8080/api/dashboard/reporte-detallado?fechaInicio=${inicio}&fechaFin=${fin}`;
        if (sucursalId && sucursalId !== "TODAS") {
            urlDetalle += `&sucursalId=${sucursalId}`;
        }

        const res = await fetch(urlDetalle, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("lucky_token")}` }
        });
        const empleados = await res.json();

        // Evita errores si la gráfica no existe
        if(typeof renderizarGraficos === 'function') renderizarGraficos(empleados);

        const cuerpo = document.getElementById('tabla-rh-cuerpo');
        if (!cuerpo) return;

        cuerpo.innerHTML = empleados.map(emp => {
            const colorPunt = emp.porcentajePuntualidad >= 90 ? 'text-emerald-500' :
                              emp.porcentajePuntualidad >= 75 ? 'text-yellow-500'  : 'text-red-500';

            const badgeFatiga = emp.tieneFatiga
                ? `<span class="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-[10px] font-black animate-pulse">⚠️ ALERTA FATIGA</span>`
                : `<span class="text-gray-500 text-xs italic">Normal</span>`;

            // Horas
            const horasBalance = (emp.balanceHoras / 60).toFixed(1);

            // 🔴 ETIQUETA DE BAJA (Verificamos el campo activo)
            const etiquetaBaja = (emp.activo === false) 
                ? `<div class="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wide">🔴 BAJA: ${emp.fechaBaja || 'Sin fecha'}</div>` 
                : '';
            const opacidadFila = (emp.activo === false) ? 'opacity-50' : '';

            return `
                <tr class="border-b border-gray-800 hover:bg-gray-800/30 transition ${opacidadFila}">
                    <td class="p-4">
                        <div class="font-bold text-white">${emp.nombre}</div>
                        <div class="text-[10px] text-gray-500 uppercase">${emp.sucursal}</div>
                        ${etiquetaBaja} 
                    </td>
                    <td class="p-4 text-gray-400 text-sm">${formatearPuesto(emp.puesto)}</td>
                    <td class="p-4 text-center font-black ${colorPunt}">${emp.porcentajePuntualidad.toFixed(1)}%</td>
                    <td class="p-4 text-center">${badgeFatiga}</td>
                    <td class="p-4 text-right font-mono ${emp.balanceHoras >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                        ${emp.balanceHoras > 0 ? '+' : ''}${horasBalance} hrs
                    </td>
                    <td class="p-4 text-center font-black text-emerald-400">${emp.diasTrabajados || 0}</td>
                    <td class="p-4 text-center font-bold text-yellow-500">${emp.vacaciones || 0}</td>
                    <td class="p-4 text-center font-bold text-gray-300">${emp.incapacidades || 0}</td>
                    <td class="p-4 text-center font-bold text-sky-400">${emp.descansosTomados || 0}</td> 
                    <td class="p-4 text-center font-bold text-purple-400">${emp.descansosTrabajados || 0}</td>
                    <td class="p-4 text-center font-black ${emp.faltas > 0 ? 'text-red-500' : 'text-gray-600'}">${emp.faltas || 0}</td>
                </tr>`;
        }).join('');

    } catch (e) { console.error("Error en tabla detallada:", e); }
}

// ✅ Gráficos recuperados del doc 19
function renderizarGraficos(empleados) {
    const canvasPunt = document.getElementById('chartPuntualidad');
    const canvasFatiga = document.getElementById('chartFatiga');

    // Si no existen los canvas en el HTML, no falla
    if (!canvasPunt || !canvasFatiga) return;

    const nombres = empleados.map(e => e.nombre);
    const puntualidad = empleados.map(e => e.porcentajePuntualidad);
    const fatigas = empleados.filter(e => e.tieneFatiga).length;
    const normales = empleados.length - fatigas;

    // Destruimos antes de re-crear para evitar duplicados
    if (chartPuntualidad) chartPuntualidad.destroy();
    chartPuntualidad = new Chart(canvasPunt, {
        type: 'bar',
        data: {
            labels: nombres,
            datasets: [{ label: '% Puntualidad', data: puntualidad, backgroundColor: '#6366f1', borderRadius: 6 }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100 } }
        }
    });

    if (chartFatiga) chartFatiga.destroy();
    chartFatiga = new Chart(canvasFatiga, {
        type: 'doughnut',
        data: {
            labels: ['Con Alerta', 'Normal'],
            datasets: [{ data: [fatigas, normales], backgroundColor: ['#ef4444', '#10b981'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });
}



// ==========================================
// 3. FUNCIONES DE CARGA (GET)
// ==========================================

async function cargarEmpresasParaAdmin() {
    const selectAdmin = document.getElementById('empresaAdminSelect');
    const selectSucursal = document.getElementById('empresaSucursalSelect');

    try {
        const res = await fetch('http://localhost:8080/api/admin/listar-empresas', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("lucky_token")}` }
        });
        const empresas = await res.json();

        const options = '<option value="">Selecciona la Empresa...</option>' +
            empresas.map(emp => `<option value="${emp.id}">${emp.nombreComercial || emp.nombre_comercial}</option>`).join('');

        if (selectAdmin) selectAdmin.innerHTML = options;
        if (selectSucursal) selectSucursal.innerHTML = options;

    } catch (e) { console.error("Error al cargar empresas:", e); }
}

async function cargarSucursales() {
    const selectSucursal = document.getElementById('sucursalSelect');
    if (!selectSucursal) return;

    try {
        const res = await fetch('http://localhost:8080/api/admin/listar-sucursales', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("lucky_token")}` }
        });
        const data = await res.json();

        selectSucursal.innerHTML = '<option value="">Selecciona una sucursal...</option>';
        data.forEach(sucursal => {
            const opcion = document.createElement('option');
            opcion.value = sucursal.id;
            opcion.textContent = sucursal.nombre;
            selectSucursal.appendChild(opcion);
        });
    } catch (e) { console.error("Error en cargarSucursales:", e); }
}



// ==========================================
// 4. FUNCIONES DE ACCIÓN (POST) — SIN DUPLICADOS
// ==========================================

// ✅ Una sola definición de registrarEmpresaMadre
async function registrarEmpresaMadre() {
    const nombre = document.getElementById('nombre-empresa-madre').value.trim();
    if (!nombre) {
        Swal.fire('Atención', 'Escribe el nombre de la marca global', 'warning');
        return;
    }

    try {
        const res = await fetch('http://localhost:8080/api/admin/registrar-empresa-real', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('lucky_token')}` },
            body: JSON.stringify({ nombre })
        });

        if (res.ok) {
            Swal.fire('✅ Éxito', 'Marca registrada. Ya puedes asignarle sucursales.', 'success')
                .then(() => location.reload());
        } else {
            const err = await res.json();
            Swal.fire('Error', err.error || 'No se pudo registrar la marca', 'error');
        }
    } catch (e) { console.error(e); }
}

async function registrarSucursal() {
    const nombre = document.getElementById('nombre-sucursal-input').value.trim();
    const empresaId = document.getElementById('empresaSucursalSelect').value;

    if (!nombre || !empresaId) {
        Swal.fire('Atención', 'Nombre de sucursal y Empresa son obligatorios', 'warning');
        return;
    }

    try {
        const res = await fetch('http://localhost:8080/api/admin/registrar-sucursal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('lucky_token')}` },
            body: JSON.stringify({ nombre, empresaId: parseInt(empresaId), descripcion: "Registrada por Super Admin" })
        });

        if (res.ok) {
            Swal.fire('✅ ¡Éxito!', 'Sucursal vinculada correctamente.', 'success').then(() => location.reload());
        } else {
            const err = await res.json();
            Swal.fire('Error', err.error || 'No se pudo crear la sucursal', 'error');
        }
    } catch (e) { console.error(e); }
}

async function vincularGerencia() {
    const deptoId = document.getElementById('sucursalSelect').value;
    const nombre = document.getElementById('admin-nombre').value.trim();
    const paterno = document.getElementById('admin-paterno').value.trim();
    const materno = document.getElementById('admin-materno').value.trim();

    // ✅ Materno opcional (como en México es normal)
    if (!deptoId || !nombre || !paterno) {
        Swal.fire({ icon: 'warning', title: 'Incompleto', text: 'La sucursal, nombre y apellido paterno son obligatorios.', background: '#1a1d23', color: '#fff' });
        return;
    }

    try {
        const res = await fetch('http://localhost:8080/api/admin/vincular-gerente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('lucky_token')}` },
            body: JSON.stringify({ nombre, apellidoPaterno: paterno, apellidoMaterno: materno, departamentoId: parseInt(deptoId) })
        });
        const data = await res.json();

        if (res.ok) {
            Swal.fire({
                title: '✅ Gerente vinculado',
                icon: 'success',
                background: '#1a1d23', color: '#fff',
                html: `
                    <div style="text-align:left; background:#242832; color:white; padding:20px; border-radius:15px; border:1px solid #10b981; margin-top:15px;">
                        <p style="font-size:10px; color:#10b981; text-transform:uppercase; font-weight:bold; margin-bottom:12px;">Credenciales de Acceso</p>
                        <div style="margin-bottom:12px;">
                            <span style="font-size:10px; color:#9ca3af; display:block; margin-bottom:4px;">USUARIO</span>
                            <p style="font-family:monospace; font-size:16px; background:#1a1d23; padding:8px; border-radius:6px; margin:0;">${data.detalles.usuario}</p>
                        </div>
                        <div>
                            <span style="font-size:10px; color:#9ca3af; display:block; margin-bottom:4px;">PASSWORD TEMPORAL</span>
                            <p style="font-family:monospace; font-size:16px; color:#fbbf24; background:#1a1d23; padding:8px; border-radius:6px; margin:0;">${data.detalles.password}</p>
                        </div>
                    </div>
                    <p style="font-size:11px; color:#9ca3af; margin-top:15px;">Copia estos datos y entrégalos al gerente.</p>`,
                confirmButtonText: 'He guardado los datos',
                confirmButtonColor: '#6366f1'
            });

            // Limpiar campos
            ['admin-nombre', 'admin-paterno', 'admin-materno'].forEach(id => {
                document.getElementById(id).value = '';
            });
            document.getElementById('sucursalSelect').value = '';

        } else {
            Swal.fire('Error', data.error || 'No se pudo vincular al gerente', 'error');
        }
    } catch (e) { console.error(e); }
}

async function crearAdminEmpresa() {
    const empresaId = document.getElementById('empresaAdminSelect').value;
    const nombre = document.getElementById('admin-marca-nombre').value.trim();
    const paterno = document.getElementById('admin-marca-paterno').value.trim();
    const materno = document.getElementById('admin-marca-materno').value.trim();

    if (!empresaId || !nombre || !paterno || !materno) {
        Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Todos los campos son obligatorios.', background: '#1a1d23', color: '#fff' });
        return;
    }

    try {
        const res = await fetch('http://localhost:8080/api/admin/registrar-admin-empresa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('lucky_token')}` },
            body: JSON.stringify({ empresaId: parseInt(empresaId), nombre, apellidoPaterno: paterno, apellidoMaterno: materno })
        });
        const data = await res.json();

        if (res.ok) {
            Swal.fire({
                title: '✅ Acceso Creado',
                icon: 'success',
                background: '#1a1d23', color: '#fff',
                html: `
                    <div style="background:#242832; padding:15px; border-radius:10px; border:1px solid #a855f7;">
                        <p style="color:#a855f7; font-weight:bold;">USUARIO ADMIN:</p>
                        <p style="font-family:monospace; font-size:1.1rem;">${data.usuario}</p>
                        <p style="color:#fbbf24; font-weight:bold; margin-top:10px;">PASSWORD:</p>
                        <p style="font-family:monospace; font-size:1.1rem;">${data.password}</p>
                    </div>`
            });
        } else {
            Swal.fire('Error', data.error || 'No se pudo crear el administrador', 'error');
        }
    } catch (e) { console.error(e); }
}

const formatearPuesto = (puesto) => {
    if (puesto === 'PERSONAL_GENERAL') return 'Vendedor';
    if (puesto === 'ENCARGADO') return 'Encargado';
    if (puesto === 'GERENTE') return 'Gerente';
    return puesto.replace(/_/g, ' '); // Quita los guiones bajos por si acaso
};

async function cargarFiltroSucursalesRH() {
    try {
        const token = localStorage.getItem("lucky_token");
        const res = await fetch('http://localhost:8080/api/admin/listar-sucursales', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const sucursales = await res.json();
        const select = document.getElementById('filtro-sucursal-rh');

        sucursales.forEach(suc => {
            select.innerHTML += `<option value="${suc.id}">${suc.nombre}</option>`;
        });
    } catch (e) { console.error("Error al cargar sucursales:", e); }
}

// ==========================================
// EXPORTACIÓN A EXCEL
// ==========================================
function exportarReporteExcel() {
    const cuerpoTabla = document.getElementById('tabla-rh-cuerpo');

    // Verificamos que haya datos antes de exportar
    if (!cuerpoTabla || cuerpoTabla.children.length === 0) {
        Swal.fire('Atención', 'Primero genera un reporte para poder descargarlo.', 'warning');
        return;
    }

    // Tomamos la tabla HTML completa (incluyendo encabezados)
    const tabla = cuerpoTabla.parentElement;

    // SheetJS convierte la tabla HTML a un libro de Excel automáticamente
    const workbook = XLSX.utils.table_to_book(tabla, { sheet: "Analítica RH" });

    // Nombramos el archivo con la fecha actual
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Reporte_LuckyDev_RH_${fecha}.xlsx`);
}