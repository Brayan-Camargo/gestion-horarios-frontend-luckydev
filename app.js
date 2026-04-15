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
let fechasUnicasMes = [];
let empleadosUnicos = [];

btnTema.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
    iconoTema.innerText = htmlElement.classList.contains('dark') ? '☀️' : '🌙';
});

// --- NUEVO: FUNCIÓN PARA GENERAR EL HORARIO EN JAVA ---
botonGenerar.addEventListener('click', async () => {
    botonGenerar.innerText = "Calculando...";
    botonGenerar.disabled = true;

    try {
        // Hacemos el POST al Depto 1 (Ventas), en el mes de Abril (4) de 2026
        const respuesta = await fetch('http://localhost:8080/api/horarios/generar/1?mes=4&anio=2026', {
            method: 'POST'
        });

        if (!respuesta.ok) throw new Error('Error al generar el horario.');
        
        const textoRespuesta = await respuesta.text();
        alert("🎉 " + textoRespuesta); // Mostrará: "✅ Horario generado con éxito..."
        
        // Simular un clic en "Cargar Mes" para que se pinte en pantalla automáticamente
        botonProbar.click(); 

    } catch (error) {
        alert("❌ Error: " + error.message);
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

    const diasFaltantes = 7 - diasDeEstaSemana.length;
    if (diasFaltantes > 0) {
        let ultimaFecha = new Date(diasDeEstaSemana[diasDeEstaSemana.length - 1] + "T00:00:00");
        for (let i = 1; i <= diasFaltantes; i++) {
            ultimaFecha.setDate(ultimaFecha.getDate() + 1);
            const fechaString = ultimaFecha.toISOString().split('T')[0];
            diasDeEstaSemana.push(fechaString);
        }
    }

    let trHead = `<tr><th class="p-3 border border-gray-200 dark:border-gray-700 text-left bg-gray-50 dark:bg-gray-800/50">EMPLEADO</th>`;
    diasDeEstaSemana.forEach(fecha => {
        const esRelleno = !fechasUnicasMes.includes(fecha);
        const estiloCabecera = esRelleno ? "text-gray-400 italic" : "";
        trHead += `<th class="p-3 border border-gray-200 dark:border-gray-700 min-w-[120px] ${estiloCabecera}">${fecha}</th>`;
    });
    trHead += `</tr>`;
    tablaHead.innerHTML = trHead;

    tituloSemana.innerText = `Semana ${indiceSemana + 1} | ${diasDeEstaSemana[0]} al ${diasDeEstaSemana[6]}`;

    tablaBody.innerHTML = '';
    empleadosUnicos.forEach(emp => {
        let trBody = `<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                        <td class="p-3 border border-gray-200 dark:border-gray-700 text-left font-bold bg-gray-50 dark:bg-gray-800/20">${emp}</td>`;
        
        diasDeEstaSemana.forEach(fecha => {
            const esRelleno = !fechasUnicasMes.includes(fecha);
            const turno = datosGlobales.find(d => d.nombreEmpleado === emp && d.inicio.split('T')[0] === fecha);
            
            let contenidoCelda = '';
            let clasesCelda = "p-3 border border-gray-200 dark:border-gray-700 ";

            if (esRelleno) {
                contenidoCelda = 'PRÓXIMO MES';
                clasesCelda += 'bg-gray-100/50 text-gray-400 dark:bg-gray-800/30 dark:text-gray-600 font-semibold text-[10px] tracking-widest';
            } else if (turno) {
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
            } else {
                contenidoCelda = '<span class="text-gray-300 dark:text-gray-600">-</span>';
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