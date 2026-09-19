/**
 * Sincroniza la lista de resorts del juego desde Airtable.
 *
 * Fuente de verdad: base LEADS > tabla PROPIEDADES > vista de resorts marcados
 * como "choosen" en el campo choosen2025/2026.
 *
 * Se ejecuta antes de cada `vite build`. Genera resorts.ts.
 * Si no hay token (desarrollo local) deja el resorts.ts actual intacto.
 */
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE  = process.env.AIRTABLE_BASE  || 'appAds5tsKg17wTAl';
const TABLE = process.env.AIRTABLE_TABLE || 'tblCTeZt7YUBS51Rp';
const OUT   = path.join(process.cwd(), 'resorts.ts');

// Si quedan menos resorts válidos que esto, algo se ha roto de verdad: abortamos
// el build y Netlify mantiene online la versión anterior.
const MIN_RESORTS = 10;

const F = {
  name:      'fldURcMiFq7jCGoe9', // Name
  choosen:   'fldRjm9qD1o8hJ2ky', // choosen2025/2026
  fotoQwilr: 'fldnsRKXy9BU4pjr9', // foto portada (respaldo)
  rfNombre:  'fldw580VAi7JR9k96', // RF NOMBRE: solo para excepciones
  rfFoto:    'fldWAFiJVHSwkHaDg',
};

// Campo de Airtable -> clave en resorts.ts. Los 8 primeros son obligatorios.
const CRITERIOS = [
  ['fld926d1lwDWX4Iqf', 'nivel_despreocupacion', true],
  ['fldjdHM9x6O4oQs7G', 'perfil_foodie',         true],
  ['fldEuwwtFdIj4Kamv', 'atmosfera_isla',        true],
  ['fldhU81uKNzHpxasE', 'experiencia_snorkel',   true],
  ['fld7Gbf1xmW8TiTmg', 'avistamiento_fauna',    true],
  ['fldLj9vfbE3g5BlM7', 'logistica_fauna',       true],
  ['fldLXZDrQrXM6w2Wn', 'tipo_animal',           false], // vacío = no es zona de fauna grande
  ['fldiZZ8RmPfAaxMR3', 'diseno_habitacion',     true],
  ['fldRO74vlS7yJqdJ1', 'tipo_traslado',         true],
];

if (!TOKEN) {
  console.warn('\n[resorts] AIRTABLE_TOKEN no definido: se usa el resorts.ts que ya está en el repo.\n');
  process.exit(0);
}

async function traerTodo() {
  const registros = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${TABLE}`);
    url.searchParams.set('returnFieldsByFieldId', 'true');
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
    const json = await res.json();
    registros.push(...json.records);
    offset = json.offset;
  } while (offset);
  return registros;
}

// "B · Todo Incluido" -> "B"
const letras = (valor) =>
  (Array.isArray(valor) ? valor : [])
    .map((v) => String(v && typeof v === 'object' ? v.name ?? '' : v).trim().charAt(0).toUpperCase())
    .filter((c) => /[A-D]/.test(c))
    .sort();

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

let registros;
try {
  registros = await traerTodo();
} catch (err) {
  console.warn(`\n[resorts] No se ha podido leer Airtable (${err.message}).`);
  console.warn('[resorts] Se construye con el resorts.ts que ya está en el repo.\n');
  process.exit(0);
}
const choosen = registros.filter((r) => r.fields[F.choosen]?.name === 'choosen'
                                     || r.fields[F.choosen] === 'choosen');

const resorts = [];
const incompletos = [];

for (const r of choosen) {
  const nombreFicha = (r.fields[F.name] || '').trim();
  if (!nombreFicha) { incompletos.push({ nombre: r.id, faltan: ['Name'] }); continue; }
  const faltan = [];

  const criterios = {};
  for (const [fieldId, clave, obligatorio] of CRITERIOS) {
    const vals = letras(r.fields[fieldId]);
    if (obligatorio && vals.length === 0) faltan.push(clave);
    criterios[clave] = vals;
  }

  const foto = r.fields[F.rfFoto] || r.fields[F.fotoQwilr] || '';
  if (!foto) faltan.push('foto');

  if (faltan.length) {
    incompletos.push({ nombre: nombreFicha, faltan });
    continue;
  }

  resorts.push({
    id: r.id,
    // Por defecto manda Name (es el campo que se mantiene al dia).
    // RF NOMBRE solo se usa si esta relleno, para los casos en que el
    // nombre interno no sirve para ensenarselo a un cliente.
    name: (r.fields[F.rfNombre] || '').trim() || nombreFicha,
    imageUrl: foto,
    ...criterios,
  });
}

if (incompletos.length) {
  console.warn('\n[resorts] Estos resorts están en "choosen" pero NO entran en el juego porque les falta información:');
  for (const i of incompletos) console.warn(`   · ${i.nombre} → falta: ${i.faltan.join(', ')}`);
  console.warn('   Rellena esos campos en PROPIEDADES y entrarán solos en el siguiente guardado.\n');
}

if (resorts.length < MIN_RESORTS) {
  console.error(`\n[resorts] Solo ${resorts.length} resorts válidos (mínimo ${MIN_RESORTS}). Se aborta el build para no publicar un juego roto.\n`);
  process.exit(1);
}

const cuerpo = resorts.map((r) => `  {
    id: '${r.id}',
    name: "${esc(r.name)}",
    imageUrl: "${esc(r.imageUrl)}",
    nivel_despreocupacion: ${JSON.stringify(r.nivel_despreocupacion)},
    perfil_foodie: ${JSON.stringify(r.perfil_foodie)},
    atmosfera_isla: ${JSON.stringify(r.atmosfera_isla)},
    experiencia_snorkel: ${JSON.stringify(r.experiencia_snorkel)},
    avistamiento_fauna: ${JSON.stringify(r.avistamiento_fauna)},
    logistica_fauna: ${JSON.stringify(r.logistica_fauna)},
    tipo_animal: ${JSON.stringify(r.tipo_animal)},
    diseno_habitacion: ${JSON.stringify(r.diseno_habitacion)},
    tipo_traslado: ${JSON.stringify(r.tipo_traslado)},
  }`).join(',\n');

fs.writeFileSync(OUT, `import { Resort } from './types';

// ⚠️ ARCHIVO GENERADO AUTOMÁTICAMENTE — NO EDITAR A MANO.
// Se regenera en cada build desde Airtable: base LEADS > PROPIEDADES > choosen2025/2026.
// Para cambiar un resort, edítalo en Airtable. Generado el ${new Date().toISOString()}.

export const RESORTS: Resort[] = [
${cuerpo},
];
`, 'utf8');

console.log(`\n[resorts] ${resorts.length} resorts sincronizados desde Airtable${incompletos.length ? ` (${incompletos.length} fuera por datos incompletos)` : ''}.\n`);
