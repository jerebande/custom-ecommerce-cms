const conx = require("../database/db");
const bcrypt = require('bcryptjs');

class Usuariomodel {
    async register(nombre, email, password, telefono, direccion) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const sql = 'INSERT INTO usuarios (nombre, email, password, telefono, direccion, rol) VALUES (?, ?, ?, ?, ?, "cliente")';
        return conx.promise().execute(sql, [nombre, email, hashedPassword, telefono, direccion]);
    }

    async login(email) {
        const sql = 'SELECT * FROM usuarios WHERE email = ?';
        const [rows] = await conx.promise().execute(sql, [email]);
        return rows[0];
    }

    async getUserById(id) {
        const sql = 'SELECT id, nombre, email, telefono, direccion, rol, foto_perfil, fecha_registro FROM usuarios WHERE id = ?';
        const [rows] = await conx.promise().execute(sql, [id]);
        return rows[0];
    }

    async updateProfile(id, nombre, telefono, direccion) {
        const sql = 'UPDATE usuarios SET nombre = ?, telefono = ?, direccion = ? WHERE id = ?';
        return conx.promise().execute(sql, [nombre, telefono, direccion, id]);
    }

    async updateFotoPerfil(id, fotoUrl) {
        const sql = 'UPDATE usuarios SET foto_perfil = ? WHERE id = ?';
        return conx.promise().execute(sql, [fotoUrl, id]);
    }

    async updatePassword(id, newPassword) {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        const sql = 'UPDATE usuarios SET password = ? WHERE id = ?';
        return conx.promise().execute(sql, [hashedPassword, id]);
    }

    async getAll() {
        const sql = 'SELECT id, nombre, email, telefono, direccion, rol, foto_perfil, fecha_registro FROM usuarios ORDER BY id DESC';
        const [rows] = await conx.promise().execute(sql);
        return rows;
    }

    async updateRol(id, rol) {
        const sql = 'UPDATE usuarios SET rol = ? WHERE id = ?';
        return conx.promise().execute(sql, [rol, id]);
    }

    async delete(id) {
        const sql = 'DELETE FROM usuarios WHERE id = ?';
        return conx.promise().execute(sql, [id]);
    }

    async getFiltered(filters = {}, page = 1, limit = 20) {
        let sql = 'SELECT id, nombre, email, telefono, direccion, rol, foto_perfil, fecha_registro FROM usuarios WHERE 1=1';
        const params = [];

        // Filtro por búsqueda en nombre
        if (filters.busqueda) {
            sql += ' AND nombre LIKE ?';
            const searchTerm = `%${filters.busqueda}%`;
            params.push(searchTerm);
        }

        // Filtro por rol
        if (filters.rol && filters.rol !== 'todos') {
            sql += ' AND rol = ?';
            params.push(filters.rol);
        }

        // Contar total
        const countSql = sql.replace(/SELECT id, nombre, email, telefono, direccion, rol, foto_perfil, fecha_registro/, 'SELECT COUNT(*) as total');
        const [[{ total }]] = await conx.promise().execute(countSql, params);

        // Paginación
        const offset = (page - 1) * limit;
        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await conx.promise().execute(sql, params);
        
        return {
            data: rows,
            total: total,
            page: page,
            limit: limit,
            pages: Math.ceil(total / limit)
        };
    }
}

module.exports = Usuariomodel;