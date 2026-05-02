const path = require('path');
const fs = require('fs');

// Configuración base
const baseConfig = {
    // Tipo de negocio: 'electrodomesticos', 'veterinaria', 'comida', 'restaurante', 'kiosco', 'gimnasio'
    tipo: 'comida', // <--- CAMBIA AQUÍ EL TIPO DE NEGOCIO
    
    // Configuración general
    nombre: 'Tienda Elegante',
    logo: '🛒',
    telefono: '5491123456789', // Número de WhatsApp
    email: 'info@tiendaelegante.com',
    direccion: 'Calle Principal 123',
    descripcion: 'Tu tienda online de confianza con los mejores productos al mejor precio.',
    logoHeader: {
        type: 'text',
        text: 'Tienda Elegante',
        image: '',
        size: 150
    },
    logoFooter: {
        type: 'text',
        text: 'Tienda Elegante',
        image: '',
        size: 120
    },
    
    // Redes sociales
    redesSociales: {
        facebook: '',
        instagram: '',
        whatsapp: '',
        twitter: '',
        youtube: '',
        linkedin: '',
        tiktok: ''
    },
    
    // Configuración del HOME (página principal)
    home: {
        hero: {
            titulo: 'Bienvenido a Tienda Elegante',
            descripcion: 'Descubre productos de alta calidad con los mejores precios',
            boton_texto: 'Explorar Productos',
            boton_url: '/productos'
        },
        features: [
            {
                icono: 'fas fa-gem',
                titulo: 'Productos Premium',
                descripcion: 'Los mejores productos seleccionados para ti'
            },
            {
                icono: 'fas fa-rocket',
                titulo: 'Envío Rápido',
                descripcion: 'Entregas en tiempo récord'
            },
            {
                icono: 'fas fa-shield-alt',
                titulo: 'Pago Seguro',
                descripcion: 'Múltiples métodos de pago'
            }
        ]
    },
    
    // Colores personalizados por tipo de negocio
    colores: {
        electrodomesticos: { primary: '#007bff', secondary: '#6c757d', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        veterinaria: { primary: '#28a745', secondary: '#20c997', gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
        comida: { primary: '#dc3545', secondary: '#ffc107', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        restaurante: { primary: '#fd7e14', secondary: '#ffc107', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
        kiosco: { primary: '#20c997', secondary: '#17a2b8', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
        gimnasio: { primary: '#e83e8c', secondary: '#6f42c1', gradient: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' }
    },
    
    // Categorías por tipo de negocio
    categorias: {
        electrodomesticos: ['Lavarropas', 'Heladeras', 'Televisores', 'Microondas', 'Cocinas', 'Aires Acondicionados'],
        veterinaria: ['Alimentos', 'Medicamentos', 'Juguetes', 'Accesorios', 'Higiene', 'Camas'],
        comida: ['Bebidas', 'Comida Rápida', 'Postres', 'Ensaladas', 'Pizzas', 'Hamburguesas'],
        restaurante: ['Entradas', 'Platos Principales', 'Postres', 'Bebidas', 'Vinos', 'Cócteles'],
        kiosco: ['Golosinas', 'Bebidas', 'Snacks', 'Cigarrillos', 'Revistas', 'Lácteos'],
        gimnasio: ['Suplementos', 'Ropa Deportiva', 'Accesorios', 'Máquinas', 'Proteínas', 'Vitaminas']
    },
    
    // Obtener colores actuales
    getColores() {
        return this.colores[this.tipo] || this.colores.comida;
    },
    
    // Obtener categorías actuales
    getCategorias() {
        return this.categorias[this.tipo] || this.categorias.comida;
    }
};

// Normalizar tipos de logo según los valores guardados
function normalizeLogoConfig(config) {
    if (!config.logoHeader) {
        config.logoHeader = { type: 'text', text: 'Tienda Elegante', image: '', size: 150 };
    } else {
        if ((!config.logoHeader.type || config.logoHeader.type === '') && config.logoHeader.image) {
            config.logoHeader.type = 'image';
        }
        if (!config.logoHeader.type) {
            config.logoHeader.type = 'text';
        }
        config.logoHeader.text = config.logoHeader.text || 'Tienda Elegante';
        config.logoHeader.image = config.logoHeader.image || '';
        config.logoHeader.size = Number.isNaN(Number(config.logoHeader.size)) ? 150 : Number(config.logoHeader.size);
    }

    if (!config.logoFooter) {
        config.logoFooter = { type: 'text', text: 'Tienda Elegante', image: '', size: 120 };
    } else {
        if ((!config.logoFooter.type || config.logoFooter.type === '') && config.logoFooter.image) {
            config.logoFooter.type = 'image';
        }
        if (!config.logoFooter.type) {
            config.logoFooter.type = 'text';
        }
        config.logoFooter.text = config.logoFooter.text || 'Tienda Elegante';
        config.logoFooter.image = config.logoFooter.image || '';
        config.logoFooter.size = Number.isNaN(Number(config.logoFooter.size)) ? 120 : Number(config.logoFooter.size);
    }
    
    // Asegurar que existe la sección home
    if (!config.home) {
        config.home = baseConfig.home;
    }
    
    // Asegurar que home tiene la estructura correcta
    if (!config.home.hero) {
        config.home.hero = baseConfig.home.hero;
    }
    if (!config.home.features || config.home.features.length === 0) {
        config.home.features = baseConfig.home.features;
    }

    return config;
}

// Cargar configuración dinámica desde JSON si existe
function loadDynamicConfig() {
    try {
        const configPath = path.join(__dirname, 'negocio-config.json');
        if (fs.existsSync(configPath)) {
            const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            // Combinar la configuración del archivo con la base
            const merged = { ...baseConfig, ...fileConfig };
            // Deep merge redesSociales para no perder campos nuevos (ej: tiktok)
            merged.redesSociales = {
                ...baseConfig.redesSociales,
                ...(fileConfig.redesSociales || {})
            };
            // Asegurar que home se combina correctamente
            if (fileConfig.home) {
                merged.home = {
                    hero: { ...baseConfig.home.hero, ...fileConfig.home.hero },
                    features: fileConfig.home.features || baseConfig.home.features
                };
            }
            return normalizeLogoConfig(merged);
        }
    } catch (error) {
        console.error("Error cargando config dinámica:", error);
    }
    return normalizeLogoConfig({ ...baseConfig });
}

const configNegocio = loadDynamicConfig();

module.exports = configNegocio;