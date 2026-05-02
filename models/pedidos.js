const conx = require("../database/db");

class PedidoModel {
    async create(usuario_id, total, direccion, forma_pago, notas, modo_entrega = 'delivery', comprobante_url = null, momento_pago = 'despues') {
        const sql = 'INSERT INTO pedidos (usuario_id, total, direccion, forma_pago, notas, modo_entrega, comprobante_url, momento_pago, estado, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "pendiente", NOW())';
        const [result] = await conx.promise().execute(sql, [usuario_id, total, direccion, forma_pago, notas, modo_entrega, comprobante_url, momento_pago]);
        return result.insertId;
    }

    async addDetalle(pedido_id, producto_id, cantidad, precio_unitario) {
        const sql = 'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)';
        return conx.promise().execute(sql, [pedido_id, producto_id, cantidad, precio_unitario]);
    }

    async getByUsuario(usuario_id) {
        const sql = 'SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY fecha DESC';
        const [rows] = await conx.promise().execute(sql, [usuario_id]);
        return rows;
    }

    async getDetalle(pedido_id) {
        const sql = `SELECT dp.*, p.nombre, p.imagen, p.descripcion 
                     FROM detalle_pedido dp 
                     JOIN productos p ON dp.producto_id = p.id 
                     WHERE dp.pedido_id = ?`;
        const [rows] = await conx.promise().execute(sql, [pedido_id]);
        return rows;
    }

    async getAll() {
        const sql = 'SELECT p.*, u.nombre as usuario_nombre FROM pedidos p JOIN usuarios u ON p.usuario_id = u.id ORDER BY p.fecha DESC';
        const [rows] = await conx.promise().execute(sql);
        return rows;
    }

    async updateEstado(pedido_id, estado) {
        // Validar estado - debe ser exactamente uno de estos valores
        const estadosValidos = ['pendiente', 'en preparacion', 'entregado'];
        if (!estadosValidos.includes(estado)) {
            throw new Error(`Estado no válido: ${estado}. Debe ser uno de: ${estadosValidos.join(', ')}`);
        }
        
        console.log(`[DB] Actualizando pedido ${pedido_id} a estado: '${estado}'`);
        const sql = 'UPDATE pedidos SET estado = ? WHERE id = ?';
        const [result] = await conx.promise().execute(sql, [estado, pedido_id]);
        console.log(`[DB] Filas afectadas: ${result.affectedRows}`);
        
        if (result.affectedRows === 0) {
            console.log(`[DB] No se encontró el pedido con id ${pedido_id}`);
        }
        
        return result;
    }

    async getVentas() {
        const sql = 'SELECT DATE(fecha) as dia, COUNT(*) as total_pedidos, SUM(total) as ventas FROM pedidos GROUP BY DATE(fecha) ORDER BY dia DESC LIMIT 30';
        const [rows] = await conx.promise().execute(sql);
        return rows;
    }

    async getFiltered(filters = {}, page = 1, limit = 20) {
        let sql = 'SELECT p.*, u.nombre as usuario_nombre FROM pedidos p JOIN usuarios u ON p.usuario_id = u.id WHERE 1=1';
        const params = [];

        // Filtro por búsqueda en nombre, monto y dirección
        if (filters.busqueda) {
            sql += ' AND (u.nombre LIKE ? OR p.total LIKE ? OR p.direccion LIKE ?)';
            const searchTerm = `%${filters.busqueda}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Filtro por estado
        if (filters.estado && filters.estado !== 'todos') {
            sql += ' AND p.estado = ?';
            params.push(filters.estado);
        }

        // Filtro por forma de pago
        if (filters.forma_pago && filters.forma_pago !== 'todos') {
            sql += ' AND p.forma_pago = ?';
            params.push(filters.forma_pago);
        }

        // Filtro por fecha
        if (filters.fecha_filtro && filters.fecha_filtro !== 'todos') {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            let fecha_inicio = new Date(hoy);

            if (filters.fecha_filtro === '1_semana') {
                fecha_inicio.setDate(fecha_inicio.getDate() - 7);
            } else if (filters.fecha_filtro === '6_meses') {
                fecha_inicio.setMonth(fecha_inicio.getMonth() - 6);
            } else if (filters.fecha_filtro === '1_año') {
                fecha_inicio.setFullYear(fecha_inicio.getFullYear() - 1);
            } else if (filters.fecha_filtro === 'hoy') {
                fecha_inicio = new Date(hoy);
            }

            sql += ' AND DATE(p.fecha) >= ?';
            params.push(fecha_inicio.toISOString().split('T')[0]);
        }

        // Contar total
        const countSql = sql.replace(/SELECT p\.\*, u\.nombre as usuario_nombre/, 'SELECT COUNT(*) as total');
        const [[{ total }]] = await conx.promise().execute(countSql, params);

        // Paginación
        const offset = (page - 1) * limit;
        sql += ' ORDER BY p.fecha DESC LIMIT ? OFFSET ?';
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

module.exports = PedidoModel;