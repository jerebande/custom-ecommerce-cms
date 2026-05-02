// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect("/login");
}

// Middleware para verificar si el usuario es administrador
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.rol === 'admin') {
        return next();
    }
    res.redirect("/");
}

module.exports = { isAuthenticated, isAdmin };