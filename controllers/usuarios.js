const UsuarioModel = require("../models/usuarios");
const usuarioModel = new UsuarioModel();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

function normalizePublicImagePath(imagePath = '') {
    if (!imagePath || typeof imagePath !== 'string') return '';
    return imagePath.replace(/^\/public\/uploads\//, '/uploads/');
}

// Helper para cargar config del negocio
function getNegocioConfig() {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { /* ignorar */ }
    return { nombre: 'Tienda Elegante', email: '', telefono: '', direccion: '', descripcion: '', whatsappAdmin: '5492346533182' };
}

function isAjax(req) {
    return req.headers['x-requested-with'] === 'XMLHttpRequest' ||
           (req.headers['accept'] && req.headers['accept'].includes('application/json'));
}

class UsuarioController {
    async home(req, res) {
        const negocio = getNegocioConfig();
        res.render("index", { user: req.session.user, negocio });
    }

    async showLogin(req, res) {
        if (req.session.user) return res.redirect("/");
        const negocio = getNegocioConfig();
        res.render("login", { error: null, user: null, negocio });
    }

    async login(req, res) {
        const { email, password } = req.body;
        const negocio = getNegocioConfig();
        try {
            const user = await usuarioModel.login(email);
            if (!user || !bcrypt.compareSync(password, user.password)) {
                return res.render("login", { error: "Email o contraseña incorrectos", user: null, negocio });
            }
            req.session.user = {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                telefono: user.telefono,
                direccion: user.direccion,
                foto_perfil: user.foto_perfil
            };
            res.redirect("/");
        } catch (error) {
            console.error(error);
            res.render("login", { error: "Error al iniciar sesión", user: null, negocio });
        }
    }

    async showRegister(req, res) {
        if (req.session.user) return res.redirect("/");
        const negocio = getNegocioConfig();
        res.render("register", { error: null, user: null, negocio });
    }

    async register(req, res) {
        const { nombre, email, password, telefono, direccion } = req.body;
        const negocio = getNegocioConfig();
        try {
            await usuarioModel.register(nombre, email, password, telefono, direccion);
            res.redirect("/login");
        } catch (error) {
            console.error(error);
            const errorMsg = error.code === 'ER_DUP_ENTRY'
                ? "El email ya está registrado"
                : "Error al registrarse";
            res.render("register", { error: errorMsg, user: null, negocio });
        }
    }

    async showRecover(req, res) {
        const negocio = getNegocioConfig();
        res.render("recover", { error: null, success: null, user: null, negocio });
    }

    async recoverPassword(req, res) {
        const negocio = getNegocioConfig();
        res.render("recover", { error: null, success: "Si el email existe, recibirás instrucciones.", user: null, negocio });
    }

    async logout(req, res) {
        req.session.destroy();
        res.redirect("/");
    }

    async perfil(req, res) {
        try {
            const negocio = getNegocioConfig();
            const user = await usuarioModel.getUserById(req.session.user.id);
            if (!user) return res.redirect("/logout");
            req.session.user = { ...req.session.user, ...user };
            res.render("perfil", { user, negocio });
        } catch (error) {
            console.error(error);
            res.redirect("/");
        }
    }

    async updatePerfil(req, res) {
        console.log("=== updatePerfil ===");
        console.log("Content-Type:", req.headers['content-type']);
        console.log("req.body:", req.body);
        
        const ajax = isAjax(req);
        
        let nombre, telefono, direccion;
        
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            nombre = req.body.nombre;
            telefono = req.body.telefono;
            direccion = req.body.direccion;
        } else {
            nombre = req.body.nombre;
            telefono = req.body.telefono;
            direccion = req.body.direccion;
        }
        
        console.log("Datos extraídos:", { nombre, telefono, direccion });
        
        if (!nombre || nombre.trim() === '') {
            console.log("Nombre vacío o faltante");
            if (ajax) return res.json({ success: false, error: 'El nombre es obligatorio' });
            return res.redirect('/perfil?error=El+nombre+es+obligatorio');
        }

        try {
            await usuarioModel.updateProfile(req.session.user.id, nombre.trim(), telefono || '', direccion || '');

            req.session.user.nombre    = nombre.trim();
            req.session.user.telefono  = telefono  || '';
            req.session.user.direccion = direccion || '';

            if (ajax) {
                return res.json({ success: true, nombre: nombre.trim() });
            }
            res.redirect('/perfil?success=Perfil+actualizado+correctamente');
        } catch (error) {
            console.error(error);
            if (ajax) return res.json({ success: false, error: error.message });
            res.redirect('/perfil?error=Error+al+actualizar+el+perfil');
        }
    }

    async cambiarPassword(req, res) {
        console.log("=== cambiarPassword ===");
        console.log("Content-Type:", req.headers['content-type']);
        
        const ajax = isAjax(req);
        
        let current_password, new_password, confirm_password;
        
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            current_password = req.body.current_password;
            new_password = req.body.new_password;
            confirm_password = req.body.confirm_password;
        } else {
            current_password = req.body.current_password;
            new_password = req.body.new_password;
            confirm_password = req.body.confirm_password;
        }
        
        console.log("Datos recibidos:", { 
            current_password: current_password ? '***' : 'missing',
            new_password: new_password ? '***' : 'missing',
            confirm_password: confirm_password ? '***' : 'missing'
        });
        
        if (!current_password || !new_password) {
            console.log("Faltan campos requeridos");
            if (ajax) {
                return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
            }
            return res.redirect('/perfil?error=Todos+los+campos+son+requeridos');
        }

        if (new_password.length < 6) {
            if (ajax) {
                return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
            }
            return res.redirect('/perfil?error=Contraseña+muy+corta');
        }

        if (new_password !== confirm_password) {
            if (ajax) {
                return res.status(400).json({ success: false, error: 'Las contraseñas no coinciden' });
            }
            return res.redirect('/perfil?error=Las+contraseñas+no+coinciden');
        }

        try {
            const user = await usuarioModel.login(req.session.user.email);
            if (!user || !bcrypt.compareSync(current_password, user.password)) {
                if (ajax) {
                    return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta' });
                }
                return res.redirect('/perfil?error=Contraseña+actual+incorrecta');
            }

            await usuarioModel.updatePassword(req.session.user.id, new_password);
            console.log("Contraseña actualizada exitosamente");

            if (ajax) {
                return res.json({ success: true, message: 'Contraseña cambiada correctamente' });
            }
            res.redirect('/perfil?success=Contraseña+cambiada+correctamente');
        } catch (error) {
            console.error("Error en cambiarPassword:", error);
            if (ajax) {
                return res.status(500).json({ success: false, error: error.message || 'Error al cambiar la contraseña' });
            }
            res.redirect('/perfil?error=Error+al+cambiar+contraseña');
        }
    }

    async updateFotoPerfil(req, res) {
        console.log("=== updateFotoPerfil ===");
        console.log("File recibido:", req.file);
        
        try {
            if (!req.file) {
                console.log("No se recibió archivo");
                return res.status(400).json({ success: false, error: 'No se subió ningún archivo' });
            }

            const fotoUrl = '/public/uploads/perfil/' + req.file.filename;
            console.log("Foto URL generada:", fotoUrl);

            if (req.session.user.foto_perfil && req.session.user.foto_perfil.startsWith('/public/')) {
                const oldPath = path.join(__dirname, '../public', req.session.user.foto_perfil.replace('/public', ''));
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                    console.log("Foto anterior eliminada:", oldPath);
                }
            }

            await usuarioModel.updateFotoPerfil(req.session.user.id, fotoUrl);
            req.session.user.foto_perfil = fotoUrl;
            
            console.log("Foto de perfil actualizada correctamente");
            res.json({ success: true, fotoUrl: fotoUrl + '?t=' + Date.now() });
        } catch (error) {
            console.error("Error en updateFotoPerfil:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async saveConfig(req, res) {
        try {
            const configPath = path.join(__dirname, '../config/negocio-config.json');
            const existing = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

            const headerUpload = req.files?.logoHeaderFile?.[0];
            const footerUpload = req.files?.logoFooterFile?.[0];

            let logoHeaderImage = normalizePublicImagePath(req.body.logoHeaderImage || existing.logoHeader?.image || '');
            let logoFooterImage = normalizePublicImagePath(req.body.logoFooterImage || existing.logoFooter?.image || '');

            if (headerUpload) {
                logoHeaderImage = '/uploads/logos/' + headerUpload.filename;
            }
            if (footerUpload) {
                logoFooterImage = '/uploads/logos/' + footerUpload.filename;
            }

            const requestedHeaderType = req.body.logoHeaderType;
            const requestedFooterType = req.body.logoFooterType;

            const logoHeaderType = requestedHeaderType
                || (headerUpload || logoHeaderImage ? 'image' : (existing.logoHeader?.type || 'text'));
            const logoFooterType = requestedFooterType
                || (footerUpload || logoFooterImage ? 'image' : (existing.logoFooter?.type || 'text'));

            const config = {
                ...existing,
                nombre:       req.body.nombreNegocio  || existing.nombre  || 'Tienda Elegante',
                email:        req.body.emailNegocio   || existing.email   || '',
                telefono:     req.body.telefonoNegocio|| existing.telefono|| '',
                direccion:    req.body.direccionNegocio||existing.direccion|| '',
                descripcion:  req.body.descripcion    || existing.descripcion || '',
                whatsappAdmin:req.body.whatsappAdmin  || existing.whatsappAdmin || '5492346533182',
                logoHeader: {
                    type:  logoHeaderType,
                    text:  req.body.logoHeaderText  || existing.logoHeader?.text  || 'Tienda Elegante',
                    image: logoHeaderImage,
                    size:  parseInt(req.body.logoHeaderSize) || existing.logoHeader?.size || 150,
                },
                logoFooter: {
                    type:  logoFooterType,
                    text:  req.body.logoFooterText  || existing.logoFooter?.text  || 'Tienda Elegante',
                    image: logoFooterImage,
                    size:  parseInt(req.body.logoFooterSize) || existing.logoFooter?.size || 120,
                },
                redesSociales: {
                    facebook:  req.body.facebook  || '',
                    instagram: req.body.instagram || '',
                    whatsapp:  req.body.whatsapp  || '',
                    twitter:   req.body.twitter   || '',
                    youtube:   req.body.youtube   || '',
                    linkedin:  req.body.linkedin  || '',
                    tiktok:    req.body.tiktok    || '',
                },
            };

            if (!fs.existsSync(path.dirname(configPath))) {
                fs.mkdirSync(path.dirname(configPath), { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            res.json({ success: true, negocio: config });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ==================== CONFIGURACIÓN DEL HOME ====================
    
    async getHomeConfig(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado" });
        }
        
        try {
            const configPath = path.join(__dirname, '../config/negocio-config.json');
            let config = { home: {}, titulos_paginas: {}, icono_pagina: {} };
            
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            
            if (!config.home) {
                config.home = {
                    hero: {
                        titulo: "Bienvenido a Tienda Elegante",
                        descripcion: "Descubre productos de alta calidad con los mejores precios",
                        boton_texto: "Explorar Productos",
                        boton_url: "/productos"
                    },
                    features: [
                        {
                            icono: "fas fa-gem",
                            titulo: "Productos Premium",
                            descripcion: "Los mejores productos seleccionados para ti"
                        },
                        {
                            icono: "fas fa-rocket",
                            titulo: "Envío Rápido",
                            descripcion: "Entregas en tiempo récord"
                        },
                        {
                            icono: "fas fa-shield-alt",
                            titulo: "Pago Seguro",
                            descripcion: "Múltiples métodos de pago"
                        }
                    ]
                };
            }
            
            if (!config.titulos_paginas) {
                config.titulos_paginas = {
                    indice: "Tienda Elegante",
                    carrito: "Mi Carrito - Tienda Elegante",
                    login: "Iniciar Sesión",
                    registro: "Registro",
                    producto_detalle: "Producto",
                    pedido_confirmado: "Pedido Confirmado",
                    recuperar: "Recuperar Contraseña",
                    mis_pedidos: "Mis Pedidos"
                };
            }
            
            res.json({ success: true, home: config.home, titulos_paginas: config.titulos_paginas, icono_pagina: config.icono_pagina || {} });
        } catch (error) {
            console.error("Error al obtener configuración del home:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async saveHomeConfig(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado" });
        }
        
        try {
            const configPath = path.join(__dirname, '../config/negocio-config.json');
            let config = {};
            
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            
            // Parsear el JSON del config enviado
            const configData = JSON.parse(req.body.config || '{}');
            
            config.home = configData.hero && configData.features ? configData : config.home;
            
            if (configData.titulos_paginas) {
                config.titulos_paginas = configData.titulos_paginas;
            }
            
            // Manejar subida de icono
            if (req.file) {
                const iconoDir = './public/uploads/logos';
                if (!fs.existsSync(iconoDir)) {
                    fs.mkdirSync(iconoDir, { recursive: true });
                }
                
                config.icono_pagina = {
                    imagen: '/uploads/logos/' + req.file.filename,
                    tipo: 'image'
                };
            }
            
            if (!config.home.features) {
                config.home.features = [];
            }
            
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            res.json({ success: true, message: "Configuración guardada correctamente", icono_pagina: config.icono_pagina });
        } catch (error) {
            console.error("Error al guardar configuración del home:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    
    async deleteIcono(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado" });
        }
        
        try {
            const configPath = path.join(__dirname, '../config/negocio-config.json');
            let config = {};
            
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            
            // Eliminar archivo físico si existe
            if (config.icono_pagina && config.icono_pagina.imagen) {
                const filePath = path.join(__dirname, '../public', config.icono_pagina.imagen);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            
            config.icono_pagina = {};
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            res.json({ success: true, message: "Icono eliminado" });
        } catch (error) {
            console.error("Error al eliminar icono:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ==================== MÉTODOS PARA TEXTOS EDITABLES ====================

    async getTextosConfig(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado" });
        }
        
        try {
            const configPath = path.join(__dirname, '../config/textos-config.json');
            let config = {};
            
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } else {
                // Configuración por defecto
                config = {
                    productos: {
                        titulo_seccion: "Nuestros Productos",
                        subtitulo_seccion: "Descubre nuestra selección de productos de alta calidad",
                        boton_agregar: "Agregar",
                        mensaje_sin_stock: "Sin stock",
                        mensaje_sin_productos: "No hay productos disponibles",
                        card_descripcion_limit: 80
                    },
                    carrito: {
                        titulo_seccion: "Mi Carrito",
                        subtitulo_seccion: "Revisa tus productos antes de finalizar la compra",
                        mensaje_vacio: "Tu carrito está vacío",
                        mensaje_vacio_desc: "¡Explora nuestros productos y encuentra lo que te gusta!",
                        boton_vaciar: "Vaciar Carrito",
                        boton_ver_productos: "Ver Productos",
                        boton_comprar: "Proceder al pago",
                        resumen_titulo: "Resumen del Pedido",
                        subtotal_label: "Subtotal:",
                        envio_label: "Envío:",
                        envio_texto: "Gratis",
                        total_label: "Total:"
                    },
                    mis_pedidos: {
                        titulo_seccion: "Mis Pedidos",
                        subtitulo_seccion: "Consulta el historial y estado de tus compras",
                        mensaje_vacio: "Sin pedidos aún",
                        mensaje_vacio_desc: "No tienes pedidos registrados. ¡Comienza a explorar nuestros productos!",
                        estado_entregado: "Entregado",
                        estado_preparacion: "En Preparación",
                        estado_pendiente: "Pendiente",
                        info_direccion: "Dirección de Entrega",
                        info_pago: "Método de Pago",
                        productos_titulo: "Productos del Pedido",
                        total_label: "Total del Pedido:"
                    }
                };
            }
            
            res.json({ success: true, textos: config });
        } catch (error) {
            console.error("Error al obtener configuración de textos:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async saveTextosConfig(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado" });
        }
        
        try {
            const configPath = path.join(__dirname, '../config/textos-config.json');
            const config = req.body;
            
            // Asegurar que el directorio existe
            const dir = path.dirname(configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            res.json({ success: true, message: "Textos guardados correctamente" });
        } catch (error) {
            console.error("Error al guardar configuración de textos:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Middleware para pasar textos a todas las vistas
    async injectTextosConfig(req, res, next) {
        try {
            const configPath = path.join(__dirname, '../config/textos-config.json');
            let textos = {};
            
            if (fs.existsSync(configPath)) {
                textos = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } else {
                textos = {
                    productos: {
                        titulo_seccion: "Nuestros Productos",
                        subtitulo_seccion: "Descubre nuestra selección de productos de alta calidad",
                        boton_agregar: "Agregar",
                        mensaje_sin_stock: "Sin stock",
                        mensaje_sin_productos: "No hay productos disponibles"
                    },
                    carrito: {
                        titulo_seccion: "Mi Carrito",
                        subtitulo_seccion: "Revisa tus productos antes de finalizar la compra",
                        mensaje_vacio: "Tu carrito está vacío",
                        boton_vaciar: "Vaciar Carrito",
                        boton_comprar: "Proceder al pago",
                        resumen_titulo: "Resumen del Pedido"
                    },
                    mis_pedidos: {
                        titulo_seccion: "Mis Pedidos",
                        subtitulo_seccion: "Consulta el historial y estado de tus compras",
                        mensaje_vacio: "Sin pedidos aún",
                        estado_entregado: "Entregado",
                        estado_preparacion: "En Preparación",
                        estado_pendiente: "Pendiente"
                    }
                };
            }
            
            res.locals.textos = textos;
            next();
        } catch (error) {
            console.error("Error al cargar textos:", error);
            res.locals.textos = {};
            next();
        }
    }
}

module.exports = UsuarioController;