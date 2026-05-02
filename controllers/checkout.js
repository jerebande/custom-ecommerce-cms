const PedidoModel = require("../models/pedidos");
const CarritoModel = require("../models/carrito");
const ProductoModel = require("../models/productos");
const pedidoModel = new PedidoModel();
const carritoModel = new CarritoModel();
const productoModel = new ProductoModel();
const fs = require('fs');
const path = require('path');

// Función para cargar el número de WhatsApp del admin
function getWhatsappAdmin() {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config.whatsappAdmin || '5492346533182';
        }
    } catch (error) {
        console.error("Error cargando whatsappAdmin:", error);
    }
    return '5492346533182';
}

// Función para cargar la configuración de negocio
function getNegocioConfig() {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { }
    return { nombre: 'Tienda Elegante' };
}

// Función para cargar la configuración de pedidos
function getPedidosConfig() {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return raw.pedidosConfig || {};
        }
    } catch(e) {
        console.error("Error cargando pedidosConfig:", e);
    }
    return {};
}

// Función para calcular total con tarifas
function calcularTotalConTarifas(subtotal, modo_entrega, config) {
    let totalFinal = subtotal;
    const tarifas = config.tarifas || {};

    // Aplicar tarifa de envío
    if (tarifas.envio?.activo && modo_entrega !== 'retiro') {
        const tipo = tarifas.envio.tipo || 'fijo';
        
        if (tipo === 'fijo') {
            totalFinal += tarifas.envio.valor || 0;
        } 
        else if (tipo === 'porcentaje') {
            totalFinal += subtotal * (tarifas.envio.valor || 0) / 100;
        } 
        else if (tipo === 'gratis_desde') {
            const gratisDesde = tarifas.envio.gratisDesde || 0;
            if (subtotal < gratisDesde) {
                totalFinal += tarifas.envio.valor || 0;
            }
        }
    }

    // Aplicar impuesto (si no está incluido)
    if (tarifas.impuesto?.activo && !tarifas.impuesto.incluido) {
        totalFinal += subtotal * (tarifas.impuesto.porcentaje || 0) / 100;
    }

    // Aplicar cargos extra
    if (tarifas.extra?.activo) {
        if (tarifas.extra.tipo === 'porcentaje') {
            totalFinal += subtotal * (tarifas.extra.valor || 0) / 100;
        } else {
            totalFinal += tarifas.extra.valor || 0;
        }
    }

    return totalFinal;
}

class CheckoutController {
    constructor() {
        this.showCheckout = this.showCheckout.bind(this);
        this.processCheckout = this.processCheckout.bind(this);
        this.misPedidos = this.misPedidos.bind(this);
        this.enviarWhatsApp = this.enviarWhatsApp.bind(this);
    }

    async showCheckout(req, res) {
        if (!req.session.user) return res.redirect("/login");
        
        let carrito = [];
        if (req.session.user) {
            carrito = await carritoModel.getByUsuario(req.session.user.id);
        } else {
            carrito = req.session.carrito || [];
        }
        
        if (carrito.length === 0) return res.redirect("/carrito");
        
        const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        
        // Cargar configuración de pedidos para mostrar tarifas en el checkout
        const pedidosConfig = getPedidosConfig();
        
        res.render("checkout", { 
            carrito, 
            subtotal,
            user: req.session.user, 
            error: null,
            pedidosConfig
        });
    }

    async processCheckout(req, res) {
        if (!req.session.user) return res.redirect("/login");
        
        const { direccion, forma_pago, notas } = req.body;

        // Respetar la configuración global de modo de operación
        const pedidosConfigPre = getPedidosConfig();
        const modoOpGlobal = pedidosConfigPre.modoOperacion || 'hibrido';
        let modo_entrega = req.body.modo_entrega || 'delivery';
        if (modoOpGlobal === 'retiro') modo_entrega = 'retiro';
        if (modoOpGlobal === 'delivery') modo_entrega = 'delivery';
        
        let carrito = [];
        if (req.session.user) {
            carrito = await carritoModel.getByUsuario(req.session.user.id);
        } else {
            carrito = req.session.carrito || [];
        }
        
        if (carrito.length === 0) return res.redirect("/carrito");
        
        const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        
        // Validar stock antes de procesar
        for (const item of carrito) {
            const producto = await productoModel.getById(item.producto_id || item.id);
            if (!producto) {
                return res.render("checkout", {
                    carrito, subtotal, user: req.session.user,
                    error: `El producto ya no está disponible.`,
                    pedidosConfig: getPedidosConfig()
                });
            }
            if (producto.stock < item.cantidad) {
                const disponible = producto.stock;
                let msgStock;
                if (disponible === 0) {
                    msgStock = `"${producto.nombre}" no tiene stock disponible en este momento.`;
                } else {
                    msgStock = `"${producto.nombre}": solo quedan ${disponible} unidad${disponible === 1 ? '' : 'es'} disponible${disponible === 1 ? '' : 's'} y pediste ${item.cantidad}.`;
                }
                return res.render("checkout", {
                    carrito, subtotal, user: req.session.user,
                    error: msgStock,
                    pedidosConfig: getPedidosConfig()
                });
            }
        }
        
        try {
            // Calcular total con tarifas según configuración
            const pedidosConfig = getPedidosConfig();
            const modoEntrega = modo_entrega;
            const totalFinal = calcularTotalConTarifas(subtotal, modoEntrega, pedidosConfig);

            // Procesar comprobante si se subió
            const momento_pago = req.body.momento_pago || 'despues';
            let comprobante_url = null;
            if (req.file && momento_pago === 'ahora') {
                comprobante_url = '/uploads/comprobantes/' + req.file.filename;
            }
            
            // Crear el pedido con el total calculado
            const pedidoId = await pedidoModel.create(
                req.session.user.id, 
                totalFinal,
                direccion, 
                forma_pago, 
                notas,
                modoEntrega,
                comprobante_url,
                momento_pago
            );
            
            // Agregar detalles del pedido
            for (const item of carrito) {
                await pedidoModel.addDetalle(pedidoId, item.producto_id || item.id, item.cantidad, item.precio);
            }
            
            // Reducir stock después de confirmar el pedido
            for (const item of carrito) {
                await productoModel.reduceStock(item.producto_id || item.id, item.cantidad);
            }
            
            // Generar mensaje WhatsApp
            const mensaje = this.generarMensajeWhatsApp(pedidoId, req.session.user, carrito, subtotal, totalFinal, direccion, forma_pago, notas, modoEntrega, comprobante_url, momento_pago);
            const whatsappAdminNumber = getWhatsappAdmin();
            const whatsappUrl = `https://wa.me/${whatsappAdminNumber}?text=${encodeURIComponent(mensaje)}`;
            
            // Limpiar carrito
            if (req.session.user) {
                await carritoModel.clearByUsuario(req.session.user.id);
            }
            req.session.carrito = [];
            
            const negocio = getNegocioConfig();
            res.render("pedido-confirmado", { pedidoId, whatsappUrl, user: req.session.user, total: totalFinal, comprobante_url, momento_pago, modo_entrega: modoEntrega, negocio });
            
        } catch (error) {
            console.error(error);
            const pedidosConfig = getPedidosConfig();
            res.render("checkout", { 
                carrito, 
                subtotal, 
                user: req.session.user, 
                error: "Error al procesar pedido",
                pedidosConfig
            });
        }
    }

    generarMensajeWhatsApp(pedidoId, user, carrito, subtotal, total, direccion, forma_pago, notas, modo_entrega, comprobante_url = null, momento_pago = 'despues') {
        let mensaje = `🛍️ *NUEVO PEDIDO #${pedidoId}*\n\n`;
        mensaje += `👤 *Cliente:* ${user.nombre}\n`;
        mensaje += `📞 *Teléfono:* ${user.telefono || 'No especificado'}\n`;
        mensaje += `📍 *Dirección:* ${direccion}\n`;
        mensaje += `🚚 *Modo de entrega:* ${modo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}\n`;
        mensaje += `💳 *Forma de pago:* ${forma_pago}\n`;
        // Estado del pago
        if (momento_pago === 'ahora') {
            mensaje += `✅ *Pago:* Ya abonado (transferencia/efectivo)\n`;
        } else if (modo_entrega === 'retiro') {
            mensaje += `⏳ *Pago:* Paga al retirar en el local\n`;
        } else {
            mensaje += `⏳ *Pago:* Paga cuando llega el delivery\n`;
        }
        mensaje += `\n`;
        mensaje += `📦 *PRODUCTOS:*\n`;
        
        carrito.forEach(item => {
            mensaje += `• ${item.cantidad}x ${item.nombre} - $${item.precio * item.cantidad}\n`;
        });
        
        if (total !== subtotal) {
            mensaje += `\n💰 *Subtotal: $${subtotal}*`;
            if (total > subtotal) {
                mensaje += `\n➕ *Cargos adicionales: $${(total - subtotal).toFixed(2)}*`;
            } else if (total < subtotal) {
                mensaje += `\n➖ *Descuentos: $${(subtotal - total).toFixed(2)}*`;
            }
        }
        
        mensaje += `\n💰 *Total: $${total}*\n`;
        
        if (notas) mensaje += `\n📝 *Notas:* ${notas}\n`;

        // Comprobante de pago — se incluye la URL para que el admin pueda verlo
        if (comprobante_url && momento_pago === 'ahora') {
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            mensaje += `\n🧾 *Comprobante de pago:*\n${baseUrl}${comprobante_url}\n`;
        }
        
        mensaje += `\n⏰ ${new Date().toLocaleString()}`;
        
        return mensaje;
    }

    async misPedidos(req, res) {
        if (!req.session.user) return res.redirect("/login");
        try {
            const pedidos = await pedidoModel.getByUsuario(req.session.user.id);
            
            for (const pedido of pedidos) {
                pedido.detalles = await pedidoModel.getDetalle(pedido.id);
            }
            
            const negocio = getNegocioConfig();
            res.render("mis-pedidos", { pedidos, user: req.session.user, negocio });
        } catch (error) {
            console.error(error);
            res.render("mis-pedidos", { pedidos: [], user: req.session.user });
        }
    }

    // Método para enviar WhatsApp manualmente desde un pedido existente
    async enviarWhatsApp(req, res) {
        if (!req.session.user) return res.redirect("/login");
        
        const { pedidoId } = req.params;
        
        try {
            const pedidos = await pedidoModel.getByUsuario(req.session.user.id);
            const pedido = pedidos.find(p => p.id == pedidoId);
            
            if (!pedido) {
                return res.redirect("/mis-pedidos");
            }
            
            const detalles = await pedidoModel.getDetalle(pedidoId);
            
            let mensaje = `🛍️ *PEDIDO #${pedidoId}*\n\n`;
            mensaje += `👤 *Cliente:* ${req.session.user.nombre}\n`;
            mensaje += `📍 *Dirección:* ${pedido.direccion}\n`;
            mensaje += `🚚 *Modo de entrega:* ${pedido.modo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}\n`;
            mensaje += `💳 *Pago:* ${pedido.forma_pago}\n`;
            mensaje += `📦 *Estado:* ${pedido.estado}\n\n`;
            mensaje += `📦 *PRODUCTOS:*\n`;
            
            detalles.forEach(item => {
                mensaje += `• ${item.cantidad}x ${item.nombre} - $${item.cantidad * item.precio_unitario}\n`;
            });
            
            mensaje += `\n💰 *Total: $${pedido.total}*\n`;
            mensaje += `\n⏰ ${new Date(pedido.fecha).toLocaleString()}`;
            
            const whatsappAdminNumber = getWhatsappAdmin();
            const whatsappUrl = `https://wa.me/${whatsappAdminNumber}?text=${encodeURIComponent(mensaje)}`;
            
            res.redirect(whatsappUrl);
        } catch (error) {
            console.error(error);
            res.redirect("/mis-pedidos");
        }
    }
}

module.exports = CheckoutController;