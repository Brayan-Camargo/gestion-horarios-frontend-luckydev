// --- 1. LÓGICA DEL MODO CLARO / OSCURO ---
const btnTema = document.getElementById('btn-tema');
const iconoTema = document.getElementById('icono-tema');
const htmlElement = document.documentElement; // La etiqueta <html>

btnTema.addEventListener('click', () => {
    // Alternamos la clase 'dark' en el HTML
    htmlElement.classList.toggle('dark');
    
    // Cambiamos el icono según el modo
    if (htmlElement.classList.contains('dark')) {
        iconoTema.innerText = '☀️'; // Sol para cambiar a claro
    } else {
        iconoTema.innerText = '🌙'; // Luna para cambiar a oscuro
    }
});


// --- 2. LÓGICA DE DATOS Y TABLAS ---
const botonProbar = document.getElementById('btn-probar');
const contenedorHorarios = document.getElementById('contenedor-horarios');

botonProbar.addEventListener('click', async () => {
    const textoOriginal = botonProbar.innerText;
    botonProbar.innerText = "Cargando datos...";

    try {
        const respuesta = await fetch('http://localhost:8080/api/horarios/1');
        if (!respuesta.ok) throw new Error('Error en el servidor');
        const datos = await respuesta.json();

        contenedorHorarios.innerHTML = ''; // Limpiamos el lienzo

        // AGRUPACIÓN: Organizamos los turnos por fecha (como los bloques del Excel)
        const turnosAgrupados = agruparPorFecha(datos);

        // Por cada fecha, creamos un bloque de tabla
        for (const [fecha, turnosDelDia] of Object.entries(turnosAgrupados)) {
            
            // Creamos el HTML de la tabla para este día
            let tablaDiaHTML = `
                <div class="bg-white dark:bg-[#1a1d24] rounded-xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div class="bg-gray-50 dark:bg-[#232730] px-6 py-3 border-b border-gray-200 dark:border-gray-800">
                        <h2 class="text-lg font-bold text-orange-500 uppercase tracking-wider">${formatearFechaAgradable(fecha)}</h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 uppercase text-xs">
                                <tr>
                                    <th class="px-6 py-3 font-semibold">Nombre</th>
                                    <th class="px-6 py-3 font-semibold">Turno</th>
                                    <th class="px-6 py-3 font-semibold text-center">Entrada</th>
                                    <th class="px-6 py-3 font-semibold text-center">Salida</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            `;

            // Llenamos las filas de los empleados para ese día
            turnosDelDia.forEach(turno => {
                const horaInicio = turno.inicio.split('T')[1].substring(0, 5);
                const horaFin = turno.fin.split('T')[1].substring(0, 5);
                
                let badgeClass = "";
                let txtInicio = horaInicio;
                let txtFin = horaFin;

                if (turno.esDescanso) {
                    badgeClass = "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
                    txtInicio = "-";
                    txtFin = "-";
                } else if (turno.tipoTurno === "APERTURA") {
                    badgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
                } else if (turno.tipoTurno === "CIERRE") {
                    badgeClass = "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
                }

                tablaDiaHTML += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-[#20242c] transition-colors">
                        <td class="px-6 py-3 font-medium">${turno.nombreEmpleado}</td>
                        <td class="px-6 py-3">
                            <span class="px-2 py-1 rounded text-xs font-bold ${badgeClass}">
                                ${turno.esDescanso ? 'DESCANSO' : turno.tipoTurno}
                            </span>
                        </td>
                        <td class="px-6 py-3 text-center font-mono text-gray-600 dark:text-gray-400">${txtInicio}</td>
                        <td class="px-6 py-3 text-center font-mono text-gray-600 dark:text-gray-400">${txtFin}</td>
                    </tr>
                `;
            });

            // Cerramos la tabla del día
            tablaDiaHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Inyectamos el bloque completo en la pantalla
            contenedorHorarios.innerHTML += tablaDiaHTML;
        }

    } catch (error) {
        console.error(error);
        alert("Error de conexión. Revisa la consola.");
    } finally {
        botonProbar.innerText = textoOriginal;
    }
});

// --- FUNCIONES AUXILIARES DE LIMPIEZA ---

// Función para agrupar el arreglo plano en un objeto por fechas
function agruparPorFecha(turnosArray) {
    return turnosArray.reduce((acumulador, turno) => {
        const fechaSola = turno.inicio.split('T')[0];
        // Si no existe la fecha en nuestro carrito, la creamos
        if (!acumulador[fechaSola]) {
            acumulador[fechaSola] = [];
        }
        // Metemos el turno en la fecha correspondiente
        acumulador[fechaSola].push(turno);
        return acumulador;
    }, {});
}

// Para que en vez de "2026-04-14" diga algo más bonito si lo deseas en el futuro
function formatearFechaAgradable(fechaString) {
    // Por ahora devolvemos la misma cadena, pero aquí podrías usar Date() para que diga "LUNES 14"
    return "FECHA: " + fechaString;
}