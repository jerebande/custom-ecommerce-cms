const ProductoModel = require("../models/productos");
const productoModel = new ProductoModel();
const path = require('path');
const fs = require('fs');

function getNegocioConfig() {
    try {
        const configPath = path.join(__dirname, '../config/negocio-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { }
    return { nombre: 'Tienda Elegante' };
}

class ProductoController {
    async list(req, res) {
        const { categoria, search } = req.query;
        const productos = await productoModel.getAll(categoria, search);
        const categorias = await productoModel.getCategorias();
        const error = req.session.error;
        req.session.error = null;
        const negocio = getNegocioConfig();
        res.render("productos", { productos, categorias, categoriaSeleccionada: categoria || 'todos', search: search || '', user: req.session.user, error, negocio });
    }

    async detail(req, res) {
        const producto = await productoModel.getById(req.params.id);
        const negocio = getNegocioConfig();
        res.render("producto-detalle", { producto, user: req.session.user, negocio });
    }

    // Admin functions
    async adminList(req, res) {
        if (req.session.user?.rol !== 'admin') return res.redirect("/");
        const productos = await productoModel.getAllForAdmin();
        res.render("admin-productos", { productos, user: req.session.user });
    }

    async adminCreate(req, res) {
        if (req.session.user?.rol !== 'admin') return res.redirect("/");
        
        try {
            console.log("=== adminCreate ===");
            console.log("Body recibido:", req.body);
            console.log("File recibido:", req.file);
            
            const { nombre, descripcion, precio, precio_oferta, categoria, stock } = req.body;
            let imagen = null;
            const precioOferta = precio_oferta ? parseFloat(precio_oferta) : null;
            
            if (req.file) {
                imagen = '/uploads/productos/' + req.file.filename;
                console.log("Imagen guardada:", imagen);
            } else if (req.body.imagen) {
                imagen = req.body.imagen;
                console.log("Imagen base64 recibida");
            }
            
            if (!nombre || !precio || !categoria || stock === undefined) {
                console.log("Faltan campos requeridos");
                return res.status(400).send("Faltan campos requeridos");
            }
            
            console.log(`Creando producto: ${nombre}, ${precio}, ${categoria}, ${stock}, oferta=${precioOferta}`);
            await productoModel.create(nombre, descripcion || '', precio, precioOferta, imagen, categoria, stock);
            console.log("Producto creado exitosamente");
            
            // Redirigir según el origen de la petición
            if (req.headers.referer && req.headers.referer.includes('/admin')) {
                res.redirect("/admin");
            } else {
                res.redirect("/productos");
            }
        } catch (error) {
            console.error("Error al crear producto:", error);
            res.status(500).send("Error al crear producto: " + error.message);
        }
    }

    async adminUpdate(req, res) {
        if (req.session.user?.rol !== 'admin') return res.redirect("/");
        
        try {
            console.log("=== adminUpdate ===");
            console.log("Body recibido:", req.body);
            console.log("File recibido:", req.file);
            
            const { id, nombre, descripcion, precio, precio_oferta, categoria, stock } = req.body;
            const precioOferta = precio_oferta ? parseFloat(precio_oferta) : null;
            
            if (!id || !nombre || !precio || !categoria || stock === undefined) {
                console.log("Faltan datos requeridos");
                return res.status(400).send("Faltan datos requeridos");
            }
            
            let imagenUrl = null;
            
            // Si se subió un nuevo archivo
            if (req.file) {
                imagenUrl = '/uploads/productos/' + req.file.filename;
                console.log("Nueva imagen subida:", imagenUrl);
                
                // Eliminar imagen anterior si existe
                const producto = await productoModel.getById(id);
                if (producto && producto.imagen && producto.imagen.startsWith('/uploads/')) {
                    const oldImagePath = path.join(__dirname, '../public', producto.imagen);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log("Imagen anterior eliminada");
                    }
                }
            }
            
            await productoModel.update(id, nombre, descripcion || '', precio, precioOferta, imagenUrl, categoria, stock);
            console.log("Producto actualizado exitosamente");
            
            // Redirigir según el origen de la petición
            if (req.headers.referer && req.headers.referer.includes('/admin')) {
                res.redirect("/admin");
            } else {
                res.redirect("/productos");
            }
        } catch (error) {
            console.error("Error al actualizar producto:", error);
            res.status(500).send("Error al actualizar producto: " + error.message);
        }
    }

    async adminDelete(req, res) {
        if (req.session.user?.rol !== 'admin') return res.redirect("/");
        
        try {
            console.log("=== adminDelete (borrado lógico) ===");
            console.log("ID a desactivar:", req.params.id);
            
            const id = req.params.id;
            if (!id) {
                return res.status(400).send("ID no proporcionado");
            }
            
            await productoModel.delete(id);
            console.log("Producto desactivado exitosamente");
            
            // Redirigir según el origen de la petición
            if (req.headers.referer && req.headers.referer.includes('/admin')) {
                res.redirect("/admin");
            } else {
                res.redirect("/productos");
            }
        } catch (error) {
            console.error("Error al desactivar producto:", error);
            res.status(500).send("Error al desactivar producto: " + error.message);
        }
    }

    // Eliminar producto vía AJAX (borrado lógico)
    async adminDeleteAJAX(req, res) {
        if (req.session.user?.rol !== 'admin') {
            return res.status(403).json({ success: false, error: "No autorizado" });
        }
        
        try {
            const id = req.params.id;
            if (!id) {
                return res.status(400).json({ success: false, error: "ID no proporcionado" });
            }
            
            await productoModel.delete(id);
            console.log(`Producto ${id} desactivado exitosamente via AJAX`);
            
            res.json({ success: true, message: "Producto eliminado correctamente" });
        } catch (error) {
            console.error("Error al eliminar producto:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Restaurar producto (opcional)
    async adminRestore(req, res) {
        if (req.session.user?.rol !== 'admin') return res.redirect("/");
        
        try {
            const id = req.params.id;
            await productoModel.restore(id);
            res.redirect("/admin");
        } catch (error) {
            console.error("Error al restaurar producto:", error);
            res.status(500).send("Error al restaurar producto");
        }
    }

    // Eliminar categoría (mover productos a "Otros")
    async adminDeleteCategoria(req, res) {
        if (req.session.user?.rol !== 'admin') return res.status(403).json({ success: false, error: "No autorizado" });
        
        const { categoria } = req.body;
        console.log("=== adminDeleteCategoria ===");
        console.log("Categoría a eliminar:", categoria);
        
        if (!categoria) {
            return res.status(400).json({ success: false, error: "Categoría no especificada" });
        }
        
        try {
            const db = require("../database/db");
            // Actualizar productos de esta categoría a "Otros"
            await db.promise().execute(
                "UPDATE productos SET categoria = 'Otros' WHERE categoria = ? AND activo = 1",
                [categoria]
            );
            
            console.log(`Categoría ${categoria} eliminada, productos movidos a Otros`);
            res.json({ success: true });
        } catch (error) {
            console.error("Error al eliminar categoría:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Crear nueva categoría
    async adminCreateCategoria(req, res) {
        if (req.session.user?.rol !== 'admin') return res.status(403).json({ success: false, error: "No autorizado" });
        
        const { categoria } = req.body;
        console.log("=== adminCreateCategoria ===");
        console.log("Categoría a crear:", categoria);
        
        if (!categoria) {
            return res.status(400).json({ success: false, error: "Nombre de categoría requerido" });
        }
        
        try {
            const db = require("../database/db");
            // Verificar si ya existe
            const [existing] = await db.promise().execute(
                "SELECT categoria FROM productos WHERE categoria = ? LIMIT 1",
                [categoria]
            );
            
            if (existing.length > 0) {
                return res.json({ success: false, error: "La categoría ya existe" });
            }
            
            res.json({ success: true, message: "Categoría creada exitosamente" });
        } catch (error) {
            console.error("Error al crear categoría:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Actualizar categoría (renombrar)
    async adminUpdateCategoria(req, res) {
        if (req.session.user?.rol !== 'admin') return res.status(403).json({ success: false, error: "No autorizado" });
        
        const { oldName, newName } = req.body;
        console.log("=== adminUpdateCategoria ===");
        console.log(`Renombrando ${oldName} a ${newName}`);
        
        if (!oldName || !newName) {
            return res.status(400).json({ success: false, error: "Datos incompletos" });
        }
        
        try {
            const db = require("../database/db");
            await db.promise().execute(
                "UPDATE productos SET categoria = ? WHERE categoria = ? AND activo = 1",
                [newName, oldName]
            );
            
            res.json({ success: true });
        } catch (error) {
            console.error("Error al actualizar categoría:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = ProductoController;