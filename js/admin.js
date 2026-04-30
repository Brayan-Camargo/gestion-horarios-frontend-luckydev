document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getUser();
    console.log("Admin logueado:", user.nombre);

    // Aquí irá la lógica para:
    // 1. Crear/Editar Departamentos
    // 2. Crear usuarios Gerentes
    // 3. Ver logs del sistema
});

function logoutAdmin() {
    Auth.logout();
}