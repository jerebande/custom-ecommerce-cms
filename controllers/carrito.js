const CarritoModel = require("../models/carrito");
const ProductoModel = require("../models/productos");
const carritoModel = new CarritoModel();
const productoModel = new ProductoModel();
const fs = require('fs');
const path = require('path');

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

function getNegocioConfig() {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { }
    return { nombre: 'Tienda Elegante' };
}

class CarritoController {
    async getCarrito(req, res) {
        let carrito = [];
        let total = 0;

        if (req.session.user) {
            carrito = await carritoModel.getByUsuario(req.session.user.id);
            total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        } else {
            carrito = req.session.carrito || [];
            total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        }

        const pedidosConfig = getPedidosConfig();
        const negocio = getNegocioConfig();

        res.render("carrito", { carrito, total, user: req.session.user, pedidosConfig, negocio });
    }

    async add(req, res) {
        const { id, nombre, precio, imagen, cantidad } = req.body;
        const cant = parseInt(cantidad) || 1;

        const producto = await productoModel.getById(id);
        if (!producto || producto.stock < cant) {
            req.session.error = `Stock insuficiente para ${producto ? producto.nombre : 'producto'}`;
            return res.redirect("/productos");
        }

        if (req.session.user) {
            await carritoModel.addItem(req.session.user.id, id, cant);
        } else {
            let carrito = req.session.carrito || [];
            const existing = carrito.find(item => item.id == id);
            if (existing) {
                if (existing.cantidad + cant > producto.stock) {
                    req.session.error = `Stock insuficiente para ${producto.nombre}`;
                    return res.redirect("/productos");
                }
                existing.cantidad += cant;
            } else {
                carrito.push({ id, nombre, precio, imagen, cantidad: cant });
            }
            req.session.carrito = carrito;
        }

        res.redirect("/carrito");
    }

    async update(req, res) {
        const { id, cantidad } = req.body;
        const cant = parseInt(cantidad) || 1;

        if (req.session.user) {
            await carritoModel.updateCantidad(req.session.user.id, id, cant);
        } else {
            let carrito = req.session.carrito || [];
            if (cant <= 0) {
                carrito = carrito.filter(item => item.id != id);
            } else {
                const item = carrito.find(item => item.id == id);
                if (item) item.cantidad = cant;
            }
            req.session.carrito = carrito;
        }

        res.redirect("/carrito");
    }

    async remove(req, res) {
        const { id } = req.params;

        if (req.session.user) {
            await carritoModel.removeItem(req.session.user.id, id);
        } else {
            let carrito = req.session.carrito || [];
            carrito = carrito.filter(item => item.id != id);
            req.session.carrito = carrito;
        }

        res.redirect("/carrito");
    }

    async clear(req, res) {
        if (req.session.user) {
            await carritoModel.clearByUsuario(req.session.user.id);
        } else {
            req.session.carrito = [];
        }

        res.redirect("/carrito");
    }

    // Métodos AJAX para actualizar carrito en checkout
    async actualizarCantidadAJAX(req, res) {
        try {
            const { indice, cantidad } = req.body;
            const cant = parseInt(cantidad) || 1;

            if (cant < 1) {
                return res.json({ success: false, msg: 'Cantidad inválida' });
            }

            if (req.session.user) {
                let carrito = await carritoModel.getByUsuario(req.session.user.id);
                if (indice >= 0 && indice < carrito.length) {
                    carrito[indice].cantidad = cant;
                    await carritoModel.updateCantidad(req.session.user.id, carrito[indice].id, cant);
                    return res.json({ success: true });
                }
            } else {
                let carrito = req.session.carrito || [];
                if (indice >= 0 && indice < carrito.length) {
                    carrito[indice].cantidad = cant;
                    req.session.carrito = carrito;
                    return res.json({ success: true });
                }
            }

            res.json({ success: false, msg: 'Índice inválido' });
        } catch (err) {
            console.error('Error actualizando cantidad:', err);
            res.json({ success: false, msg: 'Error del servidor' });
        }
    }

    async eliminarItemAJAX(req, res) {
        try {
            const { indice } = req.body;

            if (req.session.user) {
                let carrito = await carritoModel.getByUsuario(req.session.user.id);
                if (indice >= 0 && indice < carrito.length) {
                    const itemId = carrito[indice].id;
                    await carritoModel.removeItem(req.session.user.id, itemId);
                    return res.json({ success: true });
                }
            } else {
                let carrito = req.session.carrito || [];
                if (indice >= 0 && indice < carrito.length) {
                    carrito.splice(indice, 1);
                    req.session.carrito = carrito;
                    return res.json({ success: true });
                }
            }

            res.json({ success: false, msg: 'Índice inválido' });
        } catch (err) {
            console.error('Error eliminando item:', err);
            res.json({ success: false, msg: 'Error del servidor' });
        }
    }
}

module.exports = CarritoController;
