const mysql = require('mysql2');

const conx = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tienda'
});

conx.connect((err) => {
    if (err) throw err;
    console.log('Conectado a la base de datos');
});

module.exports = conx;

