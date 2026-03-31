// seed-products.js
// Ejecutar desde la raíz del backend:
//   node seed-products.js

const fs   = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

const API      = 'https://cimeiras-production.up.railway.app/api';
const UPLOADS  = path.join(__dirname, 'uploads');
const EMAIL    = 'admin@cimeiras.com';
const PASSWORD = 'Preta2014!';

// ── Talles por tipo ──────────────────────────────────────
const T = ["XS","S","M","L","XL"];

// ── Productos ────────────────────────────────────────────
// { name, desc, price, category, sizes, images: [archivo1, archivo2, ...] }
// El primer archivo de images[] es la imagen principal
const PRODUCTS = [

  // ══ FALDA TENIS ══════════════════════════════════════
  {
    name:     'Falda Pantalón Tenis',
    desc:     'Falda pantalón deportiva con lycra interior integrada. Diseño elegante y funcional, ideal para tenis, pádel y actividades al aire libre.',
    price:    48000,
    category: 'faldas',
    sizes:    T,
    images:   ['falda-pantalon-tenis'],
  },

  // ══ CALZAS BIKER / CORTAS ($30.000) ══════════════════
  {
    name:     'Calza Biker Cimeiras',
    desc:     'Calza biker de alto rendimiento con tejido compresivo. Tiro alto con ajuste perfecto y total libertad de movimiento.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-biker1.webp','calza-biker2.webp','calza-biker3.webp','calza-biker4.webp'],
  },
  {
    name:     'Calza Biker Púrpura',
    desc:     'Calza biker en tono púrpura con tejido compresivo de alta calidad. Diseño que combina funcionalidad y estilo.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-purpura.jpeg'],
  },
  {
    name:     'Calza Biker Oliva',
    desc:     'Calza biker en color oliva con tejido técnico de secado rápido. Corte ergonómico que acompaña cada movimiento.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-oliva.png'],
  },
  {
    name:     'Calza Biker Lavanda',
    desc:     'Calza biker en tono lavanda con tejido suave y resistente. Perfecta para yoga, pilates o entrenamientos de baja intensidad.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-lavanda.png'],
  },
  {
    name:     'Calza Biker Rosa Cálido',
    desc:     'Calza biker en rosa cálido con tejido de alta compresión. Diseño femenino que no compromete el rendimiento.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-rosa-calido.jpeg'],
  },
  {
    name:     'Calza Biker Pink',
    desc:     'Calza biker en rosa vibrante con tejido técnico de alta durabilidad. Para quienes entrenan con actitud.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-pink.png'],
  },
  {
    name:     'Calza Biker Amarillo Pastel',
    desc:     'Calza biker en amarillo pastel con tejido compresivo y costuras planas. Comodidad y estilo en cada movimiento.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-amarillo-pastel1.png','calza-amarillo-pastel2.png'],
  },
  {
    name:     'Calza Biker Magenta',
    desc:     'Calza biker en magenta intenso con tecnología anti-transparencia. Rendimiento máximo con un look inconfundible.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-magenta1.png','calza-magenta2.png'],
  },
  {
    name:     'Calza Biker Aqua',
    desc:     'Calza biker en tono aqua refrescante. Tejido ligero y de secado ultrarrápido para los días más intensos.',
    price:    30000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-aqua.webp'],
  },

  // ══ CALZAS 7/8 LARGAS ($42.000) ══════════════════════
  {
    name:     'Calza Abstracto Azul',
    desc:     'Calza 7/8 con print abstracto en tonos azules. Tejido compresivo con estampado exclusivo Cimeiras.',
    price:    42000,
    category: 'calzas',
    sizes:    T,
    images:   ['top-abstracto-azul-1.png','top-abstracto-azul-2.png'],
  },
  {
    name:     'Calza Abstracto Celeste',
    desc:     'Calza 7/8 con diseño abstracto en celeste. Combiná con el top a juego para un look coordinado.',
    price:    42000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-abstracto-celeste.png'],
  },
  {
    name:     'Calza Ecuador',
    desc:     'Calza 7/8 con print Ecuador exclusivo. Diseño geométrico que fusiona arte y deporte.',
    price:    42000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-ecuador-1.png','calza-ecuador-2.png'],
  },
  {
    name:     'Calza Malba',
    desc:     'Calza 7/8 inspirada en el arte del MALBA. Estampado artístico exclusivo sobre tejido técnico de alta compresión.',
    price:    42000,
    category: 'calzas',
    sizes:    T,
    images:   ['calza-malba.jpeg'],
  },
  {
    name:     'Calza Las Vegas',
    desc:     'Calza 7/8 con print Las Vegas de edición limitada. Para quienes no pasan desapercibidas.',
    price:    42000,
    category: 'calzas',
    sizes:    T,
    images:   ['crop-top-lasvegas-1.webp','crop-top-lasvegas-2.webp'],
  },
  {
    name:     'Calza Los Ángeles',
    desc:     'Calza 7/8 con estampado Los Ángeles exclusivo. Inspirada en la cultura deportiva de la costa oeste.',
    price:    42000,
    category: 'calzas',
    sizes:    T,
    images:   ['top-losangeles-1.webp','top-losangeles-2.webp','top-losangeles-3.webp'],
  },
  {
    name:     'Calza Print Coral',
    desc:     'Calza 7/8 con print coral vibrante. Tejido técnico de alta performance con estampado tropical exclusivo.',
    price:    42000,
    category: 'calzas',
    sizes:    T,
    images:   ['top-print-coral-1.webp','top-print-coral-2.webp'],
  },

  // ══ TOPS ELÁSTICOS / CRUZADOS ($30.000) ══════════════
  {
    name:     'Top Oliva',
    desc:     'Top deportivo en color oliva con tiras cruzadas en la espalda. Soporte medio ideal para yoga, pilates y cardio.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-oliva.jpeg'],
  },
  {
    name:     'Top Oliva II',
    desc:     'Top elástico en oliva intenso con tiras ajustables. Tejido suave con soporte firme para todo tipo de entrenamiento.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-oliva2.jpeg'],
  },
  {
    name:     'Top Lavanda',
    desc:     'Top deportivo en lavanda con corte moderno y tiras cruzadas. Soporte perfecto para entrenamientos de media intensidad.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-lavanda.png'],
  },
  {
    name:     'Top Abstracto Azul',
    desc:     'Top con print abstracto en tonos azules. Diseño exclusivo Cimeiras con soporte medio y espalda cruzada.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-abstracto-azul-1.png','top-abstracto-azul-2.png'],
  },
  {
    name:     'Top Abstracto Celeste',
    desc:     'Top con diseño abstracto en celeste. Combinalo con la calza a juego para un look completo.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-abstracto-celeste.png'],
  },
  {
    name:     'Top Malba',
    desc:     'Top inspirado en el arte del MALBA. Estampado artístico exclusivo con soporte medio y tejido técnico.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-malba.jpeg'],
  },
  {
    name:     'Top White',
    desc:     'Top blanco clásico de corte minimalista. Versátil y elegante, perfecto para cualquier entrenamiento.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-white.webp'],
  },
  {
    name:     'Top Tierra',
    desc:     'Top en tono tierra con corte cruzado en la espalda. Estilo natural que combina con todo tu guardarropa deportivo.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-tierra.png'],
  },
  {
    name:     'Top Black',
    desc:     'Top negro esencial con tiras cruzadas. El básico que no puede faltar en tu rutina de entrenamiento.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-black1.webp','top-black2.webp'],
  },
  {
    name:     'Top Gray',
    desc:     'Top gris con soporte medio y tejido compresivo. Elegante y funcional para cualquier actividad deportiva.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-gray1.webp','top-gray2.webp','top-gray3.webp'],
  },
  {
    name:     'Top Liso',
    desc:     'Top deportivo liso de corte clásico. Tejido técnico de alta durabilidad con soporte firme.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-liso-1.webp','top-liso-2.webp','top-liso-3.webp','top-liso-4.webp'],
  },
  {
    name:     'Top Las Vegas',
    desc:     'Top con print Las Vegas de edición limitada. Diseño audaz con soporte firme para entrenamientos de alta intensidad.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['crop-top-lasvegas-1.webp','crop-top-lasvegas-2.webp'],
  },
  {
    name:     'Top Los Ángeles',
    desc:     'Top con estampado Los Ángeles exclusivo. Tejido de alta performance con corte que estiliza la figura.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-losangeles-1.webp','top-losangeles-2.webp','top-losangeles-3.webp'],
  },
  {
    name:     'Top Print Coral',
    desc:     'Top con print coral tropical. Diseño vibrante con soporte medio ideal para clases grupales.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['top-print-coral-1.webp','top-print-coral-2.webp'],
  },

  // ══ CROP TOPS ($33.000) ═══════════════════════════════
  {
    name:     'Crop Top Las Vegas',
    desc:     'Crop top con print Las Vegas de edición limitada. Diseño audaz con soporte firme para entrenamientos de alta intensidad.',
    price:    33000,
    category: 'tops',
    sizes:    T,
    images:   ['crop-top-lasvegas-1.webp','crop-top-lasvegas-2.webp'],
  },
  {
    name:     'Crop Top Los Ángeles',
    desc:     'Crop top con estampado Los Ángeles exclusivo. Tejido de alta performance con corte que estiliza la figura.',
    price:    33000,
    category: 'tops',
    sizes:    T,
    images:   ['top-losangeles-1.webp','top-losangeles-2.webp','top-losangeles-3.webp'],
  },
  {
    name:     'Crop Top Print Coral',
    desc:     'Crop top con print coral tropical. Soporte medio ideal para clases grupales y cardio.',
    price:    33000,
    category: 'tops',
    sizes:    T,
    images:   ['top-print-coral-1.webp','top-print-coral-2.webp'],
  },
  {
    name:     'Crop Top Liso',
    desc:     'Crop top liso de corte moderno. La base perfecta para armar tus outfits deportivos con estilo.',
    price:    33000,
    category: 'tops',
    sizes:    T,
    images:   ['crop-top-liso1.webp','crop-top-liso2.webp','crop-top-liso3.webp'],
  },
  {
    name:     'Crop Top Amarillo Pastel',
    desc:     'Crop top en amarillo pastel con tejido suave y elástico. Fresco y cómodo para los entrenamientos más exigentes.',
    price:    33000,
    category: 'tops',
    sizes:    T,
    images:   ['crop-top-amarillo-pastel1.webp','crop-top-amarillo-pastel2.webp'],
  },

  // ══ MUSCULOSAS ($30.000) ══════════════════════════════
  {
    name:     'Musculosa Deportiva Cimeiras',
    desc:     'Musculosa deportiva de tejido liviano y transpirable. Corte holgado que permite total libertad de movimiento.',
    price:    30000,
    category: 'tops',
    sizes:    T,
    images:   ['musculosa1.webp','musculosa2.webp','musculosa3.webp','musculosa4.webp','musculosa5.webp','musculosa6.webp'],
  },

  // ══ REMERAS MANGA CORTA ($26.000) ═════════════════════
  {
    name:     'Remera Deportiva',
    desc:     'Remera manga corta de tejido técnico liviano. Corte moderno con costuras planas para máxima comodidad.',
    price:    26000,
    category: 'remeras',
    sizes:    T,
    images:   ['reme1.webp','reme2.webp'],
  },
  {
    name:     'Remera Austria',
    desc:     'Remera manga corta con diseño Austria de edición especial. Tejido técnico de alta calidad con estampado exclusivo.',
    price:    26000,
    category: 'remeras',
    sizes:    T,
    images:   ['reme-austria.webp','remera-austria.webp'],
  },
];

// ── Fetch con node nativo (Node 18+) ─────────────────────
async function login() {
  const res  = await fetch(`${API}/users/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Login fallido: ' + JSON.stringify(data));
  console.log('✅ Login exitoso\n');
  return data.token;
}

async function createProduct(token, product) {
  const res  = await fetch(`${API}/products`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify({
      name:        product.name,
      description: product.desc,
      price:       product.price,
      category:    product.category,
      stock:       1,
      sizes:       product.sizes,
      featured:    false,
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error('Error creando producto: ' + JSON.stringify(data));
  return data.id;
}

async function uploadImage(token, productId, filename) {
  const filepath = path.join(UPLOADS, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`   ⚠️  Imagen no encontrada: ${filename}`);
    return;
  }

  const form = new FormData();
  form.append('image', fs.createReadStream(filepath));

  const res = await fetch(`${API}/products/${productId}/image`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
    body:    form,
  });

  if (!res.ok) {
    console.log(`   ⚠️  Error subiendo imagen: ${filename}`);
  } else {
    console.log(`   📸 Imagen principal: ${filename}`);
  }
}

async function main() {
  console.log('🏔️  CIMEIRAS — Carga de productos\n');

  const token = await login();
  let ok = 0, err = 0;

  for (const product of PRODUCTS) {
    try {
      const id = await createProduct(token, product);
      console.log(`✅ ${product.name} — $${product.price.toLocaleString()}`);

      // Subir solo la primera imagen como principal
      if (product.images?.length > 0) {
        await uploadImage(token, id, product.images[0]);
      }

      ok++;
    } catch (e) {
      console.log(`❌ ${product.name}: ${e.message}`);
      err++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Creados: ${ok}  ❌ Errores: ${err}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(console.error);