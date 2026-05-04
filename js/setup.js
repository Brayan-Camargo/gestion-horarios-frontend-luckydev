const paso1 = document.getElementById('paso-1');
const paso2 = document.getElementById('paso-2');
const paso3 = document.getElementById('paso-3');

const ind1 = document.getElementById('indicador-1');
const ind2 = document.getElementById('indicador-2');
const ind3 = document.getElementById('indicador-3');

function irAPaso2() {
    paso1.classList.add('hidden');
    paso2.classList.remove('hidden');
    
    ind1.classList.replace('step-active', 'step-done');
    ind1.innerHTML = '✓';
    ind2.classList.replace('step-inactive', 'step-active');
    ind2.nextElementSibling.classList.replace('text-gray-500', 'text-indigo-500');
}

function volverAPaso1() {
    paso2.classList.add('hidden');
    paso1.classList.remove('hidden');
    
    ind1.classList.replace('step-done', 'step-active');
    ind1.innerHTML = '1';
    ind2.classList.replace('step-active', 'step-inactive');
    ind2.nextElementSibling.classList.replace('text-indigo-500', 'text-gray-500');
}

async function irAPaso3(event) {
    const btnFinalizar = event.target;
    const textoOriginal = btnFinalizar.innerHTML;
    btnFinalizar.innerHTML = "Guardando configuración... ⏳";
    btnFinalizar.disabled = true;

    const payload = {
        departamentoId: 1, // Usaremos el depto 1 por ahora para tus pruebas
        personalMinimo: document.getElementById('personalMinimo').value,
        minutosComida: document.getElementById('minutosComida').value,
        
        aperturaEntrada: document.getElementById('aperturaEntrada').value + ":00",
        aperturaSalida: document.getElementById('aperturaSalida').value + ":00",
        
        intermedioEntrada: document.getElementById('intermedioEntrada').value ? document.getElementById('intermedioEntrada').value + ":00" : null,
        intermedioSalida: document.getElementById('intermedioSalida').value ? document.getElementById('intermedioSalida').value + ":00" : null,
        
        cierreEntrada: document.getElementById('cierreEntrada').value + ":00",
        cierreSalida: document.getElementById('cierreSalida').value + ":00"
    };

    try {
        const token = localStorage.getItem("lucky_token");

        const response = await fetch('http://localhost:8080/api/configuracion/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            paso2.classList.add('hidden');
            paso3.classList.remove('hidden');
            
            ind2.classList.replace('step-active', 'step-done');
            ind2.innerHTML = '✓';
            ind3.classList.replace('step-inactive', 'step-done');
            ind3.nextElementSibling.classList.replace('text-gray-500', 'text-emerald-500');
            ind3.classList.add('border-emerald-500', 'text-emerald-500');
        } else {
            const data = await response.json();
            alert("❌ Error: " + (data.error || "Datos incompletos"));
            btnFinalizar.innerHTML = textoOriginal;
            btnFinalizar.disabled = false;
        }
    } catch (error) {
        console.error("Fallo de red:", error);
        alert("No se pudo conectar con el servidor.");
        btnFinalizar.innerHTML = textoOriginal;
        btnFinalizar.disabled = false;
    }
}