const PedidoModel = require("../models/pedidos");
const pedidoModel = new PedidoModel();
const ProductoModel = require("../models/productos");
const productoModel = new ProductoModel();
const UsuarioModel = require("../models/usuarios");
const usuarioModel = new UsuarioModel();
const fs = require('fs');
const path = require('path');

class AdminController {
    async dashboard(req, res) {
        if (req.session.user?.rol !== 'admin') return res.redirect("/");
        
        try {
            const pedidos = await pedidoModel.getAll();
            const ventas = await pedidoModel.getVentas();
            const productos = await productoModel.getAllForAdmin();
            const categorias = await productoModel.getCategorias();
            const usuarios = await usuarioModel.getAll();
            
            // Cargar negocio
            let negocio = {};
            try {
                const configPath = path.join(__dirname, '../config/negocio-config.json');
                if (fs.existsSync(configPath)) {
                    negocio = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
            } catch (e) { /* ignorar */ }
            
            console.log('📌 Dashboard - negocio.icono_pagina:', negocio.icono_pagina);
            
            // Log para ver los estados actuales
            console.log('Estados de pedidos:', pedidos.map(p => ({ id: p.id, estado: p.estado })));
            
            res.render("admin-dashboard", { 
                pedidos, 
                ventas, 
                productos,
                categorias,
                usuarios,
                user: req.session.user,
                negocio
            });
        } catch (error) {
            console.error("Error en dashboard:", error);
            let negocio = {};
            try {
                const configPath = path.join(__dirname, '../config/negocio-config.json');
                if (fs.existsSync(configPath)) {
                    negocio = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
            } catch (e) { /* ignorar */ }
            res.render("admin-dashboard", { 
                pedidos: [], 
                ventas: [], 
                productos: [],
                categorias: [],
                usuarios: [],
                user: req.session.user,
                error: "Error al cargar datos",
                negocio
            });
        }
    }

    async updatePedidoEstado(req, res) {
        console.log("=== updatePedidoEstado ===");
        console.log("Body recibido:", req.body);
        
        if (req.session.user?.rol !== 'admin') {
            console.log("No es admin");
            return res.redirect("/");
        }
        
        const { id, estado } = req.body;
        
        if (!id || !estado) {
            console.log("Faltan datos:", { id, estado });
            return res.status(400).send("Faltan datos");
        }
        
        try {
            console.log(`Actualizando pedido ${id} a estado: ${estado}`);
            const result = await pedidoModel.updateEstado(id, estado);
            console.log("Actualización exitosa:", result);
            res.redirect("/admin");
        } catch (error) {
            console.error("Error al actualizar:", error);
            res.status(500).send("Error al actualizar el estado: " + error.message);
        }
    }

    async updatePedidoEstadoAJAX(req, res) {
        console.log("=== updatePedidoEstadoAJAX ===");
        console.log("Body recibido:", req.body);
        
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: "No autorizado" 
            });
        }
        
        let { id, estado } = req.body;
        
        if (!id || !estado) {
            return res.status(400).json({ 
                success: false, 
                error: "Faltan datos" 
            });
        }
        
        // Normalizar el estado - CRUCIAL para que funcione correctamente
        let estadoNormalizado = '';
        if (estado === 'pendiente') {
            estadoNormalizado = 'pendiente';
        } else if (estado === 'en preparacion' || estado === 'en_preparacion' || estado === 'preparacion') {
            estadoNormalizado = 'en preparacion';
        } else if (estado === 'entregado') {
            estadoNormalizado = 'entregado';
        } else {
            return res.status(400).json({ 
                success: false, 
                error: `Estado no válido: ${estado}` 
            });
        }
        
        console.log(`Estado original: ${estado}, Estado normalizado: ${estadoNormalizado}`);
        
        try {
            const result = await pedidoModel.updateEstado(id, estadoNormalizado);
            console.log("Resultado de actualización:", result);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: "Pedido no encontrado" 
                });
            }
            
            // Obtener el pedido actualizado para verificar
            const pedidos = await pedidoModel.getAll();
            const pedidoActualizado = pedidos.find(p => p.id == id);
            console.log(`Pedido ${id} actualizado a: ${pedidoActualizado?.estado}`);
            
            // Calcular estadísticas actualizadas
            const totalPedidos = pedidos.length;
            const ventasTotales = pedidos.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
            const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente').length;
            const pedidosPreparacion = pedidos.filter(p => p.estado === 'en preparacion').length;
            const pedidosEntregados = pedidos.filter(p => p.estado === 'entregado').length;
            
            res.json({ 
                success: true, 
                message: "Estado actualizado correctamente",
                pedido: pedidoActualizado,
                stats: {
                    totalPedidos,
                    ventasTotales,
                    pedidosPendientes,
                    pedidosPreparacion,
                    pedidosEntregados
                }
            });
        } catch (error) {
            console.error("Error al actualizar:", error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    async verPedido(req, res) {
        if (req.session.user?.rol !== 'admin') return res.redirect("/");
        
        try {
            const pedidos = await pedidoModel.getAll();
            const pedido = pedidos.find(p => p.id == req.params.id);
            if (!pedido) {
                return res.redirect("/admin");
            }
            const detalles = await pedidoModel.getDetalle(req.params.id);
            res.render("admin-pedido-detalle", { pedido, detalles, user: req.session.user });
        } catch (error) {
            console.error(error);
            res.redirect("/admin");
        }
    }

    async updateProductoDescripcion(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ success: false, error: "No autorizado" });
        }
        
        const { id, descripcion } = req.body;
        
        if (!id || descripcion === undefined) {
            return res.status(400).json({ success: false, error: "Faltan datos" });
        }
        
        try {
            await productoModel.updateDescripcion(id, descripcion);
            res.json({ success: true });
        } catch (error) {
            console.error("Error al actualizar descripción:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getEstadisticasAPI(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado" });
        }
        
        try {
            const pedidos = await pedidoModel.getAll();
            const totalPedidos = pedidos.length;
            const ventasTotales = pedidos.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
            const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente').length;
            const pedidosPreparacion = pedidos.filter(p => p.estado === 'en preparacion').length;
            const pedidosEntregados = pedidos.filter(p => p.estado === 'entregado').length;
            
            res.json({
                totalPedidos,
                ventasTotales,
                pedidosPendientes,
                pedidosPreparacion,
                pedidosEntregados
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async getPedidosFiltered(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado" });
        }

        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            
            const filters = {
                busqueda: req.query.busqueda || '',
                estado: req.query.estado || 'todos',
                forma_pago: req.query.forma_pago || 'todos',
                fecha_filtro: req.query.fecha_filtro || 'todos'
            };

            const resultado = await pedidoModel.getFiltered(filters, page, limit);
            
            res.json({
                success: true,
                data: resultado.data,
                total: resultado.total,
                page: resultado.page,
                pages: resultado.pages,
                limit: resultado.limit
            });
        } catch (error) {
            console.error("Error al filtrar pedidos:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getUsuariosFiltered(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ error: "No autorizado" });
        }

        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            
            const filters = {
                busqueda: req.query.busqueda || '',
                rol: req.query.rol || 'todos'
            };

            const resultado = await usuarioModel.getFiltered(filters, page, limit);
            
            res.json({
                success: true,
                data: resultado.data,
                total: resultado.total,
                page: resultado.page,
                pages: resultado.pages,
                limit: resultado.limit
            });
        } catch (error) {
            console.error("Error al filtrar usuarios:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = AdminController;