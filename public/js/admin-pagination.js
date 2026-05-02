// ==================== ESTADO GLOBAL ====================
let estadoPaginacionPedidos = {
    paginaActual: 1,
    itemsPorPagina: 20,
    filtrosActivos: {
        search: '',
        estado: 'todos',
        formaPago: 'todos',
        fecha: 'todos'
    },
    pedidosFiltrados: []
};

let estadoPaginacionUsuarios = {
    paginaActual: 1,
    itemsPorPagina: 20,
    filtrosActivos: {
        search: '',
        rol: 'todos'
    },
    usuariosFiltrados: []
};

// ==================== FUNCIONES AUXILIARES ====================

function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '$0.00';
    const number = parseFloat(num);
    return '$' + number.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

function filterPedidosBySearch(pedidos, searchText) {
    if (!searchText) return pedidos;
    
    const search = searchText.toLowerCase();
    return pedidos.filter(p => {
        const nombre = (p.usuario_nombre || '').toLowerCase();
        const monto = formatNumber(parseFloat(p.total) || 0).toLowerCase();
        const direccion = (p.direccion || '').toLowerCase();
        
        return nombre.includes(search) || monto.includes(search) || direccion.includes(search);
    });
}

function filterPedidosByEstado(pedidos, estado) {
    if (estado === 'todos') return pedidos;
    return pedidos.filter(p => p.estado === estado);
}

function filterPedidosByFormaPago(pedidos, formaPago) {
    if (formaPago === 'todos') return pedidos;
    return pedidos.filter(p => (p.forma_pago || '').toLowerCase() === formaPago.toLowerCase());
}

function filterPedidosByDate(pedidos, fechaFiltro) {
    if (fechaFiltro === 'todos') return pedidos;
    
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    
    let desde = new Date();
    
    switch(fechaFiltro) {
        case 'hoy':
            desde.setHours(0, 0, 0, 0);
            break;
        case '1_semana':
            desde.setDate(desde.getDate() - 7);
            desde.setHours(0, 0, 0, 0);
            break;
        case '6_meses':
            desde.setMonth(desde.getMonth() - 6);
            desde.setHours(0, 0, 0, 0);
            break;
        case '1_año':
            desde.setFullYear(desde.getFullYear() - 1);
            desde.setHours(0, 0, 0, 0);
            break;
        default:
            return pedidos;
    }
    
    return pedidos.filter(p => {
        const fecha = new Date(p.fecha);
        return fecha >= desde && fecha <= hoy;
    });
}

function filterUsuariosBySearch(usuarios, searchText) {
    if (!searchText) return usuarios;
    const search = searchText.toLowerCase();
    return usuarios.filter(u => (u.nombre || '').toLowerCase().includes(search));
}

function filterUsuariosByRol(usuarios, rol) {
    if (rol === 'todos') return usuarios;
    return usuarios.filter(u => u.rol === rol);
}

// ==================== FUNCIONES DE PAGINACIÓN PARA PEDIDOS ====================

function aplicarFiltrosPedidos(pedidosData) {
    let resultado = [...pedidosData];
    
    // Aplicar filtros en orden
    resultado = filterPedidosBySearch(resultado, estadoPaginacionPedidos.filtrosActivos.search);
    resultado = filterPedidosByEstado(resultado, estadoPaginacionPedidos.filtrosActivos.estado);
    resultado = filterPedidosByFormaPago(resultado, estadoPaginacionPedidos.filtrosActivos.formaPago);
    resultado = filterPedidosByDate(resultado, estadoPaginacionPedidos.filtrosActivos.fecha);
    
    return resultado;
}

// Función para filtrar y paginar PEDIDOS
function filtrarPedidos() {
    // Obtener los datos originales
    const pedidosData = typeof todosLosPedidos !== 'undefined' ? todosLosPedidos : [];
    
    // Obtener valores de los filtros
    estadoPaginacionPedidos.filtrosActivos.search = document.getElementById('searchPedidos')?.value || '';
    estadoPaginacionPedidos.filtrosActivos.estado = document.getElementById('estadoFiltro')?.value || 'todos';
    estadoPaginacionPedidos.filtrosActivos.formaPago = document.getElementById('formaPageFiltro')?.value || 'todos';
    estadoPaginacionPedidos.filtrosActivos.fecha = document.getElementById('fechaFiltro')?.value || 'todos';
    
    // Reiniciar a página 1 cuando se aplican filtros
    estadoPaginacionPedidos.paginaActual = 1;
    
    // Aplicar todos los filtros
    estadoPaginacionPedidos.pedidosFiltrados = aplicarFiltrosPedidos(pedidosData);
    
    // Actualizar el contador de resultados
    const countEl = document.getElementById('pedidosCount');
    if (countEl) {
        countEl.textContent = estadoPaginacionPedidos.pedidosFiltrados.length;
    }
    
    // Mostrar/ocultar paginación si es necesario
    actualizarPaginacionPedidos();
}

function actualizarPaginacionPedidos() {
    const totalPedidos = estadoPaginacionPedidos.pedidosFiltrados.length;
    const totalPages = Math.ceil(totalPedidos / estadoPaginacionPedidos.itemsPorPagina);
    
    const paginacionDiv = document.getElementById('paginacionPedidos');
    if (!paginacionDiv) return;
    
    // Mostrar/ocultar paginación
    if (totalPages > 1) {
        paginacionDiv.style.display = 'flex';
        generarBotonesPaginacionPedidos(totalPages);
    } else {
        paginacionDiv.style.display = 'none';
    }
    
    // Mostrar los pedidos de la página actual
    mostrarPedidosPagina();
}

function generarBotonesPaginacionPedidos(totalPages) {
    const container = document.getElementById('numerosPagesPedidos');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Botones de páginas (mostrar máximo 5 botones)
    const start = Math.max(1, estadoPaginacionPedidos.paginaActual - 2);
    const end = Math.min(totalPages, estadoPaginacionPedidos.paginaActual + 2);
    
    for (let i = start; i <= end; i++) {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${i === estadoPaginacionPedidos.paginaActual ? 'btn-primary' : 'btn-outline-primary'}`;
        btn.textContent = i;
        btn.onclick = () => irAPaginaPedidos(i);
        container.appendChild(btn);
    }
}

function mostrarPedidosPagina() {
    const container = document.getElementById('pedidosCardsContainer');
    if (!container) return;
    
    const inicio = (estadoPaginacionPedidos.paginaActual - 1) * estadoPaginacionPedidos.itemsPorPagina;
    const fin = inicio + estadoPaginacionPedidos.itemsPorPagina;
    const pedidosPagina = estadoPaginacionPedidos.pedidosFiltrados.slice(inicio, fin);
    
    if (pedidosPagina.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h4>No hay pedidos</h4>
                <p>Ningún pedido coincide con los filtros aplicados</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pedidosPagina.map(pedido => {
        const estadoClass = pedido.estado === 'pendiente' ? 'status-pendiente' : 
                          (pedido.estado === 'en preparacion' ? 'status-preparacion' : 'status-entregado');
        const estadoIcono = pedido.estado === 'pendiente' ? 'fa-clock' : 
                           (pedido.estado === 'en preparacion' ? 'fa-cog fa-spin' : 'fa-check-circle');
        const estadoTexto = pedido.estado === 'en preparacion' ? 'En preparación' : 
                           (pedido.estado === 'pendiente' ? 'Pendiente' : 'Entregado');
        
        return `
            <div class="data-card" data-id="${pedido.id}">
                <div class="card-header-custom">
                    <div class="card-id">
                        <i class="fas fa-receipt"></i>
                        <span>Pedido #${pedido.id}</span>
                    </div>
                    <span class="status-badge ${estadoClass}">
                        <i class="fas ${estadoIcono}"></i> ${estadoTexto}
                    </span>
                </div>
                <div class="card-body-custom">
                    <div class="info-row">
                        <span class="info-label"><i class="fas fa-user"></i> Cliente</span>
                        <span class="info-value">${pedido.usuario_nombre || 'Cliente'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label"><i class="fas fa-dollar-sign"></i> MONTO</span>
                        <span class="info-value monto">${formatNumber(parseFloat(pedido.total) || 0)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label"><i class="fas fa-calendar"></i> FECHA</span>
                        <span class="info-value">${formatDate(pedido.fecha)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label"><i class="fas fa-credit-card"></i> Pago</span>
                        <span class="info-value">${pedido.forma_pago || 'No especificado'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label"><i class="fas fa-map-marker-alt"></i> Dirección</span>
                        <span class="info-value">${pedido.direccion ? (pedido.direccion.length > 30 ? pedido.direccion.substring(0, 30) + '...' : pedido.direccion) : 'No especificada'}</span>
                    </div>
                </div>
                <div class="card-footer-custom">
                    <select class="select-status" data-pedido-id="${pedido.id}" data-current-status="${pedido.estado}" onchange="cambiarEstadoAJAX(this)">
                        <option value="pendiente" ${pedido.estado === 'pendiente' ? 'selected' : ''}>📋 Pendiente</option>
                        <option value="en preparacion" ${pedido.estado === 'en preparacion' ? 'selected' : ''}>⚙️ En preparación</option>
                        <option value="entregado" ${pedido.estado === 'entregado' ? 'selected' : ''}>✅ Entregado</option>
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

function irAPaginaPedidos(numeroPagina) {
    estadoPaginacionPedidos.paginaActual = numeroPagina;
    actualizarPaginacionPedidos();
    // Scroll al top de la sección
    document.getElementById('tab-pedidos')?.scrollIntoView({ behavior: 'smooth' });
}

function paginaPedidosAnterior() {
    const totalPages = Math.ceil(estadoPaginacionPedidos.pedidosFiltrados.length / estadoPaginacionPedidos.itemsPorPagina);
    if (estadoPaginacionPedidos.paginaActual > 1) {
        estadoPaginacionPedidos.paginaActual--;
        actualizarPaginacionPedidos();
    }
}

function paginaPedidosSiguiente() {
    const totalPages = Math.ceil(estadoPaginacionPedidos.pedidosFiltrados.length / estadoPaginacionPedidos.itemsPorPagina);
    if (estadoPaginacionPedidos.paginaActual < totalPages) {
        estadoPaginacionPedidos.paginaActual++;
        actualizarPaginacionPedidos();
    }
}

// ==================== FUNCIONES DE PAGINACIÓN PARA USUARIOS ====================

function aplicarFiltrosUsuarios(usuariosData) {
    let resultado = [...usuariosData];
    
    resultado = filterUsuariosBySearch(resultado, estadoPaginacionUsuarios.filtrosActivos.search);
    resultado = filterUsuariosByRol(resultado, estadoPaginacionUsuarios.filtrosActivos.rol);
    
    return resultado;
}

function filtrarUsuarios() {
    // Obtener los datos globales de usuarios
    const datosUsuarios = typeof usuariosData !== 'undefined' ? usuariosData : [];
    
    estadoPaginacionUsuarios.filtrosActivos.search = document.getElementById('searchUsuarios')?.value || '';
    estadoPaginacionUsuarios.filtrosActivos.rol = document.getElementById('rolFiltro')?.value || 'todos';
    
    estadoPaginacionUsuarios.paginaActual = 1;
    estadoPaginacionUsuarios.usuariosFiltrados = aplicarFiltrosUsuarios(datosUsuarios);
    
    const countEl = document.getElementById('usuariosCount');
    if (countEl) {
        countEl.textContent = estadoPaginacionUsuarios.usuariosFiltrados.length;
    }
    
    actualizarPaginacionUsuarios();
}

function actualizarPaginacionUsuarios() {
    const totalUsuarios = estadoPaginacionUsuarios.usuariosFiltrados.length;
    const totalPages = Math.ceil(totalUsuarios / estadoPaginacionUsuarios.itemsPorPagina);
    
    const paginacionDiv = document.getElementById('paginacionUsuarios');
    if (!paginacionDiv) return;
    
    if (totalPages > 1) {
        paginacionDiv.style.display = 'flex';
        generarBotonesPaginacionUsuarios(totalPages);
    } else {
        paginacionDiv.style.display = 'none';
    }
    
    mostrarUsuariosPagina();
}

function generarBotonesPaginacionUsuarios(totalPages) {
    const container = document.getElementById('numerosPagesUsuarios');
    if (!container) return;
    
    container.innerHTML = '';
    
    const start = Math.max(1, estadoPaginacionUsuarios.paginaActual - 2);
    const end = Math.min(totalPages, estadoPaginacionUsuarios.paginaActual + 2);
    
    for (let i = start; i <= end; i++) {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${i === estadoPaginacionUsuarios.paginaActual ? 'btn-primary' : 'btn-outline-primary'}`;
        btn.textContent = i;
        btn.onclick = () => irAPaginaUsuarios(i);
        container.appendChild(btn);
    }
}

function mostrarUsuariosPagina() {
    const container = document.getElementById('usuariosCardsContainer');
    if (!container) return;
    
    const inicio = (estadoPaginacionUsuarios.paginaActual - 1) * estadoPaginacionUsuarios.itemsPorPagina;
    const fin = inicio + estadoPaginacionUsuarios.itemsPorPagina;
    const usuariosPagina = estadoPaginacionUsuarios.usuariosFiltrados.slice(inicio, fin);
    
    if (usuariosPagina.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h4>No hay usuarios</h4>
                <p>Ningún usuario coincide con los filtros aplicados</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = usuariosPagina.map(usuario => `
        <div class="data-card">
            <div class="card-header-custom">
                <div class="card-id">
                    <i class="fas fa-user-circle"></i>
                    <span>${usuario.nombre}</span>
                </div>
                <span class="role-badge ${usuario.rol === 'admin' ? 'role-admin' : 'role-cliente'}">
                    <i class="fas ${usuario.rol === 'admin' ? 'fa-shield-alt' : 'fa-user'}"></i> ${usuario.rol === 'admin' ? 'Administrador' : 'Cliente'}
                </span>
            </div>
            <div class="card-body-custom">
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-envelope"></i> Email</span>
                    <span class="info-value">${usuario.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-phone"></i> Teléfono</span>
                    <span class="info-value">${usuario.telefono || 'No especificado'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label"><i class="fas fa-calendar-alt"></i> Registro</span>
                    <span class="info-value">${usuario.fecha_registro ? formatDate(usuario.fecha_registro) : '-'}</span>
                </div>
            </div>
            <div class="card-footer-custom">
                <button class="btn btn-warning btn-action-card" onclick="editarUsuarioPorId(${usuario.id})" title="Editar rol">
                    <i class="fas fa-user-tag"></i> Editar Rol
                </button>
                ${usuario.rol !== 'admin' ? `
                    <a href="/admin/usuarios/delete/${usuario.id}" class="btn btn-danger btn-action-card" onclick="return confirm('¿Eliminar este usuario?')">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function irAPaginaUsuarios(numeroPagina) {
    estadoPaginacionUsuarios.paginaActual = numeroPagina;
    actualizarPaginacionUsuarios();
    document.getElementById('tab-usuarios')?.scrollIntoView({ behavior: 'smooth' });
}

function paginaUsuariosAnterior() {
    const totalPages = Math.ceil(estadoPaginacionUsuarios.usuariosFiltrados.length / estadoPaginacionUsuarios.itemsPorPagina);
    if (estadoPaginacionUsuarios.paginaActual > 1) {
        estadoPaginacionUsuarios.paginaActual--;
        actualizarPaginacionUsuarios();
    }
}

function paginaUsuariosSiguiente() {
    const totalPages = Math.ceil(estadoPaginacionUsuarios.usuariosFiltrados.length / estadoPaginacionUsuarios.itemsPorPagina);
    if (estadoPaginacionUsuarios.paginaActual < totalPages) {
        estadoPaginacionUsuarios.paginaActual++;
        actualizarPaginacionUsuarios();
    }
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar los datos de pedidos y usuarios
    if (typeof todosLosPedidos !== 'undefined') {
        estadoPaginacionPedidos.pedidosFiltrados = [...todosLosPedidos];
        actualizarPaginacionPedidos();
        
        // Actualizar contador inicial
        const countEl = document.getElementById('pedidosCount');
        if (countEl) {
            countEl.textContent = todosLosPedidos.length;
        }
    }
    
    if (typeof usuariosData !== 'undefined') {
        estadoPaginacionUsuarios.usuariosFiltrados = [...usuariosData];
        actualizarPaginacionUsuarios();
        
        const countEl = document.getElementById('usuariosCount');
        if (countEl) {
            countEl.textContent = usuariosData.length;
        }
    }
    
    // Agregar listeners a los inputs de búsqueda para filtrar al escribir
    const searchPedidos = document.getElementById('searchPedidos');
    if (searchPedidos) {
        searchPedidos.addEventListener('input', filtrarPedidos);
    }
    
    // Agregar listeners a los selectores de filtro para pedidos
    const estadoFiltro = document.getElementById('estadoFiltro');
    if (estadoFiltro) {
        estadoFiltro.addEventListener('change', filtrarPedidos);
    }
    
    const formaPageFiltro = document.getElementById('formaPageFiltro');
    if (formaPageFiltro) {
        formaPageFiltro.addEventListener('change', filtrarPedidos);
    }
    
    const fechaFiltro = document.getElementById('fechaFiltro');
    if (fechaFiltro) {
        fechaFiltro.addEventListener('change', filtrarPedidos);
    }
    
    const searchUsuarios = document.getElementById('searchUsuarios');
    if (searchUsuarios) {
        searchUsuarios.addEventListener('input', filtrarUsuarios);
    }
    
    // Agregar listeners a los selectores de filtro para usuarios
    const rolFiltro = document.getElementById('rolFiltro');
    if (rolFiltro) {
        rolFiltro.addEventListener('change', filtrarUsuarios);
    }
});

