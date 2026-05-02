const conx = require("../database/db");

class ProductoModel {
    async getAll(categoria = null, search = null, soloActivos = true) {
        let sql = 'SELECT * FROM productos WHERE 1=1';
        let params = [];
        
        if (soloActivos) {
            sql += ' AND activo = 1';
        }
        
        if (categoria && categoria !== 'todos') {
            sql += ' AND categoria = ?';
            params.push(categoria);
        }
        
        if (search) {
            sql += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        sql += ' ORDER BY id DESC';
        const [rows] = await conx.promise().execute(sql, params);
        return rows;
    }

    async getById(id) {
        const sql = 'SELECT * FROM productos WHERE id = ?';
        const [rows] = await conx.promise().execute(sql, [id]);
        return rows[0];
    }

    async create(nombre, descripcion, precio, precio_oferta, imagen, categoria, stock) {
        const sql = 'INSERT INTO productos (nombre, descripcion, precio, precio_oferta, imagen, categoria, stock, activo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)';
        return conx.promise().execute(sql, [nombre, descripcion, precio, precio_oferta, imagen, categoria, stock]);
    }

    async update(id, nombre, descripcion, precio, precio_oferta, imagen, categoria, stock) {
        let sql, params;
        if (imagen) {
            sql = 'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, precio_oferta = ?, imagen = ?, categoria = ?, stock = ? WHERE id = ?';
            params = [nombre, descripcion, precio, precio_oferta, imagen, categoria, stock, id];
        } else {
            sql = 'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, precio_oferta = ?, categoria = ?, stock = ? WHERE id = ?';
            params = [nombre, descripcion, precio, precio_oferta, categoria, stock, id];
        }
        return conx.promise().execute(sql, params);
    }

    // Borrado lógico - solo desactiva el producto
    async delete(id) {
        const sql = 'UPDATE productos SET activo = 0 WHERE id = ?';
        return conx.promise().execute(sql, [id]);
    }

    // Borrado físico (opcional, solo para admin)
    async deletePermanently(id) {
        const sql = 'DELETE FROM productos WHERE id = ?';
        return conx.promise().execute(sql, [id]);
    }

    // Restaurar producto
    async restore(id) {
        const sql = 'UPDATE productos SET activo = 1 WHERE id = ?';
        return conx.promise().execute(sql, [id]);
    }

    // Para el admin: obtener todos los productos activos (excluyendo inactivos)
    async getAllForAdmin(categoria = null, search = null) {
        let sql = 'SELECT * FROM productos WHERE activo = 1';
        let params = [];
        
        if (categoria && categoria !== 'todos') {
            sql += ' AND categoria = ?';
            params.push(categoria);
        }
        
        if (search) {
            sql += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        sql += ' ORDER BY id DESC';
        const [rows] = await conx.promise().execute(sql, params);
        return rows;
    }

    // Obtener productos inactivos (papelera)
    async getInactivos() {
        const sql = 'SELECT * FROM productos WHERE activo = 0 ORDER BY id DESC';
        const [rows] = await conx.promise().execute(sql);
        return rows;
    }

    async updateDescripcion(id, descripcion) {
        const sql = 'UPDATE productos SET descripcion = ? WHERE id = ?';
        return conx.promise().execute(sql, [descripcion, id]);
    }

    async getCategorias() {
        const sql = 'SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != "" AND activo = 1 ORDER BY categoria';
        const [rows] = await conx.promise().execute(sql);
        return rows;
    }

    async reduceStock(id, cantidad) {
        const sql = 'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?';
        return conx.promise().execute(sql, [cantidad, id, cantidad]);
    }
}

module.exports = ProductoModel;