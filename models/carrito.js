const conx = require("../database/db");

class CarritoModel {
    // Obtener todos los items del carrito de un usuario
    async getByUsuario(usuario_id) {
        const sql = `
            SELECT c.*, p.nombre,
                CASE
                    WHEN p.precio_oferta IS NOT NULL
                      AND p.precio_oferta > 0
                      AND p.precio_oferta < p.precio
                    THEN p.precio_oferta
                    ELSE p.precio
                END AS precio,
                p.imagen,
                p.stock
            FROM carrito c
            JOIN productos p ON c.producto_id = p.id
            WHERE c.usuario_id = ? AND p.activo = 1
        `;
        const [rows] = await conx.promise().execute(sql, [usuario_id]);
        return rows;
    }

    // Agregar o actualizar item en el carrito
    async addItem(usuario_id, producto_id, cantidad = 1) {
        const sql = `
            INSERT INTO carrito (usuario_id, producto_id, cantidad)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)
        `;
        return conx.promise().execute(sql, [usuario_id, producto_id, cantidad]);
    }

    // Actualizar cantidad de un item
    async updateCantidad(usuario_id, producto_id, cantidad) {
        const cant = parseInt(cantidad) || 1;
        if (cant <= 0) {
            return this.removeItem(usuario_id, producto_id);
        }
        const sql = 'UPDATE carrito SET cantidad = ? WHERE usuario_id = ? AND producto_id = ?';
        return conx.promise().execute(sql, [cant, usuario_id, producto_id]);
    }

    // Remover item del carrito
    async removeItem(usuario_id, producto_id) {
        const sql = 'DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ?';
        return conx.promise().execute(sql, [usuario_id, producto_id]);
    }

    // Limpiar todo el carrito de un usuario
    async clearByUsuario(usuario_id) {
        const sql = 'DELETE FROM carrito WHERE usuario_id = ?';
        return conx.promise().execute(sql, [usuario_id]);
    }

    // Obtener el total de items en el carrito
    async getTotalItems(usuario_id) {
        const sql = 'SELECT SUM(cantidad) as total FROM carrito WHERE usuario_id = ?';
        const [rows] = await conx.promise().execute(sql, [usuario_id]);
        return rows[0].total || 0;
    }
}

module.exports = CarritoModel;
