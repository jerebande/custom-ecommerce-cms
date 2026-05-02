const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que el directorio de uploads existe
const uploadDir = path.join(__dirname, '../public/uploads/perfil');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'perfil-' + req.session.user.id + '-' + uniqueSuffix + ext);
    }
});

// Filtrar tipos de archivo
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'];
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/x-icon'
    ];
    
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = (file.mimetype || '').toLowerCase().trim();
    
    // Verificar si la extensión es permitida
    const hasValidExtension = allowedExtensions.includes(extname);
    
    // Verificar si el MIME type es válido (o está vacío, en cuyo caso confiamos en la extensión)
    const hasValidMimeType = !mimetype || mimetype.startsWith('image/') || allowedMimeTypes.includes(mimetype);
    
    if (hasValidExtension && hasValidMimeType) {
        return cb(null, true);
    } else {
        console.warn(`Archivo rechazado - ext: ${extname}, mime: ${mimetype}`);
        cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
    fileFilter: fileFilter
});

module.exports = upload;