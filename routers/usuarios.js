const express = require("express");
const router = express.Router();
const UsuarioController = require("../controllers/usuarios");
const ProductoController = require("../controllers/productos");
const CarritoController = require("../controllers/carrito");
const CheckoutController = require("../controllers/checkout");
const AdminController = require("../controllers/admin");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para productos
const storageProductos = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads/productos';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadProducto = multer({ 
    storage: storageProductos,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'];
        const extname = path.extname(file.originalname).toLowerCase();
        const hasValidExtension = allowedExtensions.includes(extname);
        
        if (hasValidExtension) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
        }
    }
});

const storageLogos = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads/logos';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadLogos = multer({ 
    storage: storageLogos,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'];
        const extname = path.extname(file.originalname).toLowerCase();
        const hasValidExtension = allowedExtensions.includes(extname);
        
        if (hasValidExtension) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
        }
    }
});

// Configurar multer para comprobantes de pago
const storageComprobantes = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads/comprobantes';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadComprobante = multer({
    storage: storageComprobantes,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

const usuarioController = new UsuarioController();
const productoController = new ProductoController();
const carritoController = new CarritoController();
const checkoutController = new CheckoutController();
const adminController = new AdminController();

// ==================== MIDDLEWARE PARA TEXTOS ====================
router.use(usuarioController.injectTextosConfig.bind(usuarioController));

// ==================== RUTAS PÚBLICAS ====================
router.get("/", usuarioController.home);
router.get("/productos", productoController.list);
router.get("/producto/:id", productoController.detail);

// ==================== RUTAS DE USUARIOS ====================
router.get("/login", usuarioController.showLogin);
router.post("/login", usuarioController.login);
router.get("/register", usuarioController.showRegister);
router.post("/register", usuarioController.register);
router.get("/recover", usuarioController.showRecover);
router.post("/recover", usuarioController.recoverPassword);
router.get("/logout", usuarioController.logout);
router.get("/perfil", isAuthenticated, usuarioController.perfil);
router.post("/perfil", isAuthenticated, usuarioController.updatePerfil);
router.post("/perfil/config", isAdmin, uploadLogos.fields([
    { name: 'logoHeaderFile', maxCount: 1 },
    { name: 'logoFooterFile', maxCount: 1 }
]), usuarioController.saveConfig);
router.post("/cambiar-password", isAuthenticated, usuarioController.cambiarPassword);
router.post("/perfil/foto", isAuthenticated, upload.single('foto_perfil'), usuarioController.updateFotoPerfil);

// ==================== RUTAS DE CARRITO ====================
router.get("/carrito", carritoController.getCarrito);
router.post("/carrito/add", carritoController.add);
router.post("/carrito/update", carritoController.update);
router.get("/carrito/remove/:id", carritoController.remove);
router.get("/carrito/clear", carritoController.clear);
router.post("/carrito/actualizar", carritoController.actualizarCantidadAJAX);
router.post("/carrito/eliminar", carritoController.eliminarItemAJAX);

// ==================== RUTAS DE CHECKOUT Y PEDIDOS ====================
router.get("/checkout", isAuthenticated, checkoutController.showCheckout);
router.post("/checkout", isAuthenticated, uploadComprobante.single('comprobante'), checkoutController.processCheckout);
router.get("/mis-pedidos", isAuthenticated, checkoutController.misPedidos);
router.get("/pedido/:pedidoId/whatsapp", isAuthenticated, checkoutController.enviarWhatsApp);

// ==================== RUTAS DE ADMIN ====================
// Dashboard y estadísticas
router.get("/admin", isAdmin, adminController.dashboard);
router.get("/admin/api/pedidos", isAdmin, adminController.getEstadisticasAPI);
router.get("/admin/api/pedidos-filtered", isAdmin, adminController.getPedidosFiltered);
router.get("/admin/api/usuarios-filtered", isAdmin, adminController.getUsuariosFiltered);
router.get("/admin/pedido/:id", isAdmin, adminController.verPedido);

// Gestión de pedidos
router.post("/admin/pedido/estado", isAdmin, adminController.updatePedidoEstado);
router.post("/admin/pedido/estado/ajax", isAdmin, adminController.updatePedidoEstadoAJAX);

// Gestión de productos
router.get("/admin/productos", isAdmin, productoController.adminList);
router.post("/admin/productos/create", isAdmin, uploadProducto.single('imagenFile'), productoController.adminCreate);
router.post("/admin/productos/update", isAdmin, uploadProducto.single('imagenFile'), productoController.adminUpdate);
router.post("/admin/productos/update-descripcion", isAdmin, adminController.updateProductoDescripcion);
router.get("/admin/productos/delete/:id", isAdmin, productoController.adminDelete);
router.get("/admin/productos/restore/:id", isAdmin, productoController.adminRestore);
router.delete("/admin/productos/delete/:id", isAdmin, productoController.adminDeleteAJAX);

// Gestión de categorías
router.post("/admin/categorias/delete", isAdmin, productoController.adminDeleteCategoria);
router.post("/admin/categorias/create", isAdmin, productoController.adminCreateCategoria);
router.post("/admin/categorias/update", isAdmin, productoController.adminUpdateCategoria);

// Gestión de usuarios
const UsuarioModel = require("../models/usuarios");
const usuarioModelDB = new UsuarioModel();

router.post("/admin/usuarios/update-rol", isAdmin, async (req, res) => {
    try {
        const { id, rol } = req.body;
        await usuarioModelDB.updateRol(id, rol);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get("/admin/usuarios/delete/:id", isAdmin, async (req, res) => {
    try {
        const user = await usuarioModelDB.getUserById(req.params.id);
        if (user && user.rol === 'admin') {
            return res.status(400).send("No se puede eliminar un administrador");
        }
        await usuarioModelDB.delete(req.params.id);
        res.redirect("/admin");
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).send("Error al eliminar usuario");
    }
});

// ==================== RUTAS PARA CONFIGURACIÓN DEL HOME ====================
router.get("/admin/home-config", isAdmin, (req, res) => {
    let negocio = {};
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            negocio = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { /* ignorar */ }
    res.render("admin-home-config", { user: req.session.user, negocio });
});

// Multer para icono
const storageIcono = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads/logos';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadIcono = multer({ 
    storage: storageIcono,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg', '.ico'];
        const extname = path.extname(file.originalname).toLowerCase();
        const hasValidExtension = allowedExtensions.includes(extname);
        
        if (hasValidExtension) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP, ICO)'));
        }
    }
});

router.get("/admin/api/home-config", isAdmin, usuarioController.getHomeConfig);
router.post("/admin/api/home-config", isAdmin, uploadIcono.single('icono'), usuarioController.saveHomeConfig);
router.delete("/admin/api/delete-icono", isAdmin, usuarioController.deleteIcono);

// ==================== RUTAS PARA TEXTOS EDITABLES ====================
router.get("/admin/textos-config", isAdmin, (req, res) => {
    let negocio = {};
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            negocio = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { /* ignorar */ }
    res.render("admin-textos-config", { user: req.session.user, negocio });
});
router.get("/admin/api/textos-config", isAdmin, usuarioController.getTextosConfig);
router.post("/admin/api/textos-config", isAdmin, usuarioController.saveTextosConfig);

// ==================== RUTAS COLORES DEL SITIO ====================
router.get("/admin/api/colores-config", isAdmin, (req, res) => {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        let config = {};
        if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.json({ colores: config.colores || {} });
    } catch(e) { res.status(500).json({ error: e.message }); }
});
router.post("/admin/api/colores-config", isAdmin, (req, res) => {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        let config = {};
        if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const incoming = req.body && typeof req.body === 'object' ? req.body.colores : null;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
            return res.status(400).json({ success: false, error: 'Formato de colores inválido' });
        }
        config.colores = { ...(config.colores || {}), ...incoming };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// ==================== RUTAS PARA CONFIGURACIÓN DE PEDIDOS ====================
// Obtener configuración actual de pedidos
router.get("/admin/api/pedidos-config", isAdmin, (req, res) => {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        res.json({ success: true, config: config.pedidosConfig || {} });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Guardar configuración de pedidos
router.post("/admin/api/pedidos-config", isAdmin, (req, res) => {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        
        // Validar estructura básica
        const pedidosConfig = req.body;
        
        // Asegurar que exista la estructura de tarifas
        if (!pedidosConfig.tarifas) {
            pedidosConfig.tarifas = {};
        }
        
        config.pedidosConfig = pedidosConfig;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Ruta para la vista administrativa de configuración de pedidos
router.get("/admin/pedidos-config", isAdmin, (req, res) => {
    let config = {};
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch(e) {
        console.error("Error cargando config:", e);
    }
    res.render("admin-pedidos-config", { 
        user: req.session.user, 
        pedidosConfig: config.pedidosConfig || {} 
    });
});

// Manejador de errores para multer
router.use((err, req, res, next) => {
    if (err.message && err.message.includes('Solo se permiten imágenes')) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({ success: false, error: err.message });
        }
        return res.status(400).send(err.message);
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({ success: false, error: 'El archivo es demasiado grande. Máximo 5MB.' });
        }
        return res.status(400).send('El archivo es demasiado grande. Máximo 5MB.');
    }
    next(err);
});

// Servir archivos estáticos
router.use('/uploads', express.static('public/uploads'));

module.exports = router;