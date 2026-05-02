const express = require("express");  
const app = express();  
const http = require('http');  
const session = require('express-session');  
const path = require('path');  
const fs = require('fs');  
const server = http.createServer(app);  
const port = 3000;  

// Evita que el proceso se cierre por excepciones no controladas
process.on('uncaughtException', (error) => {
    console.error('❌ uncaughtException:', error);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ unhandledRejection:', reason);
});

const fallbackConfig = {
    tipo: 'comida',
    nombre: 'Tienda Elegante',
    logoHeader: { type: 'text', text: 'Tienda Elegante', image: '', size: 150 },
    logoFooter: { type: 'text', text: 'Tienda Elegante', image: '', size: 120 },
    colores: {}
};

// Función para cargar la configuración dinámicamente
function loadConfig() {
    try {
        delete require.cache[require.resolve("./config/negocio")];
        return require("./config/negocio");
    } catch (error) {
        console.error('❌ Error cargando config de negocio, usando fallback:', error.message);
        return fallbackConfig;
    }
}

let configNegocio = loadConfig();

// ============ MIDDLEWARE IMPORTANTE - ORDEN CORRECTO ============
// 1. Parsear JSON (debe ir antes de urlencoded)
app.use(express.json());

// 2. Parsear datos de formularios URL-encoded
app.use(express.urlencoded({ extended: true }));

// 3. Configuración de sesiones
const sessionMiddleware = session({  
    secret: 'una_clave_muy_segura_y_larga_para_la_sesion_2024',  
    saveUninitialized: false,  
    resave: false,  
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }
});  
app.use(sessionMiddleware);

// ==================== HELPERS GLOBALES PARA VISTAS ====================
// Helper para formatear números grandes con separadores de miles y formato de moneda
app.locals.formatNumber = function(num) {
    if (num === undefined || num === null || isNaN(num)) return '$0.00';
    const number = parseFloat(num);
    if (number >= 1000000) {
        // Para millones: mostrar como 1.5M
        const millones = (number / 1000000).toFixed(1).replace(/\.0$/, '');
        return '$' + millones + 'M';
    }
    if (number >= 1000) {
        // Para miles: usar separadores de miles
        return '$' + number.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    // Para números pequeños: formato estándar
    return '$' + number.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Helper para formatear números sin símbolo de moneda (para otras funciones)
app.locals.formatNumberPlain = function(num) {
    if (num === undefined || num === null || isNaN(num)) return '0';
    const number = parseFloat(num);
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    return number.toLocaleString('es-AR');
};

// Helper para truncar texto
app.locals.truncate = function(str, length = 100) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
};

// Helper para obtener la clase de stock
app.locals.getStockClass = function(stock) {
    if (stock > 20) return 'stock-high';
    if (stock > 5) return 'stock-medium';
    return 'stock-low';
};

// Helper para obtener el texto de stock
app.locals.getStockText = function(stock) {
    if (stock > 20) return 'Stock Alto';
    if (stock > 5) return 'Stock Medio';
    return 'Stock Bajo';
};

// Helper para obtener la clase de estado del pedido
app.locals.getPedidoEstadoClass = function(estado) {
    if (estado === 'pendiente') return 'status-pendiente';
    if (estado === 'en preparacion') return 'status-preparacion';
    if (estado === 'entregado') return 'status-entregado';
    return 'status-pendiente';
};

// Helper para obtener el texto del estado del pedido
app.locals.getPedidoEstadoTexto = function(estado) {
    if (estado === 'pendiente') return 'Pendiente';
    if (estado === 'en preparacion') return 'En Preparación';
    if (estado === 'entregado') return 'Entregado';
    return estado;
};

// Helper para obtener el ícono del estado del pedido
app.locals.getPedidoEstadoIcono = function(estado) {
    if (estado === 'pendiente') return 'fa-clock';
    if (estado === 'en preparacion') return 'fa-cog fa-spin';
    if (estado === 'entregado') return 'fa-check-circle';
    return 'fa-question-circle';
};

// ==================== FIN HELPERS ====================

// Hacer disponible la configuración del negocio en todas las vistas
app.use((req, res, next) => {
    res.locals.negocio = loadConfig();
    res.locals.user = req.session.user;
    // También pasar los helpers como variables locales para acceso directo
    res.locals.formatNumber = app.locals.formatNumber;
    res.locals.formatNumberPlain = app.locals.formatNumberPlain;
    res.locals.truncate = app.locals.truncate;
    res.locals.getStockClass = app.locals.getStockClass;
    res.locals.getStockText = app.locals.getStockText;
    res.locals.getPedidoEstadoClass = app.locals.getPedidoEstadoClass;
    res.locals.getPedidoEstadoTexto = app.locals.getPedidoEstadoTexto;
    res.locals.getPedidoEstadoIcono = app.locals.getPedidoEstadoIcono;
    next();
});

// Configuración del motor de vistas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Archivos estáticos
app.use('/public', express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, 'public')));

// Crear directorio para uploads si no existe
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Directorio de uploads creado:', uploadsDir);
}

const uploadsPerfilDir = path.join(__dirname, 'public/uploads/perfil');
if (!fs.existsSync(uploadsPerfilDir)) {
    fs.mkdirSync(uploadsPerfilDir, { recursive: true });
    console.log('📁 Directorio de fotos de perfil creado:', uploadsPerfilDir);
}

const uploadsProductosDir = path.join(__dirname, 'public/uploads/productos');
if (!fs.existsSync(uploadsProductosDir)) {
    fs.mkdirSync(uploadsProductosDir, { recursive: true });
    console.log('📁 Directorio de productos creado:', uploadsProductosDir);
}

const uploadsLogosDir = path.join(__dirname, 'public/uploads/logos');
if (!fs.existsSync(uploadsLogosDir)) {
    fs.mkdirSync(uploadsLogosDir, { recursive: true });
    console.log('📁 Directorio de logos creado:', uploadsLogosDir);
}

// Rutas
const routerusuario = require("./routers/usuarios");
app.use("/", routerusuario);

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render("404", { user: req.session.user });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).render("500", { 
        error: err.message,
        user: req.session.user 
    });
});

// Iniciar servidor
server.listen(port, () => {  
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);  
    console.log(`📊 Panel Admin: http://localhost:${port}/admin`);  
    console.log(`🛍️ Tienda: http://localhost:${port}/productos`);
    console.log(`🏪 Tipo de negocio: ${configNegocio.tipo}`);
    console.log(`💱 Helper formatNumber disponible en todas las vistas`);
});