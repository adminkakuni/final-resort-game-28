# Guía — Qué configurar fuera de la app (Make + Airtable)

Cambios hechos en la app (12/06/2026): tarjetas de resorts bloqueados 🔒 dentro del CTA de WhatsApp, copy de precio por stage, link discreto al itinerario en COLD, y **tracking de clics en CTAs**. El tracking envía un evento al **mismo webhook de Make que ya usáis** (`VITE_WEBHOOK_URL_RESULTS`), así que no hay que crear webhooks nuevos. Pero sin los pasos de abajo, los eventos llegarán a Make y se perderán.

---

## 1. Airtable — campos nuevos en la tabla de leads

| Campo | Tipo | Notas |
|---|---|---|
| `session_id` | Single line text | Ya llega en el payload final del Resort Finder — si no lo estabais guardando, mapearlo ahora (imprescindible para el paso 2) |
| `clic_itinerario` | Checkbox | Clicó el CTA del itinerario |
| `clic_whatsapp` | Checkbox | Clicó el CTA de WhatsApp |
| `clic_web` | Checkbox | Clicó algún link a la web (combinados en WARM, tarjetas en COLD) |
| `fecha_cta` | Date (con hora) | Último clic |

> Tres checkboxes en vez de un single select: si clican varios CTAs no se pierde información. Vista útil en Airtable: "Leads serios" = `clic_itinerario` ✅ o (`clic_whatsapp` ✅ y `clic_web` ✅).
| `resorts_50` | Long text | Lista completa de resorts con afinidad ≥ 50% y su porcentaje (sin límite de 5) |
| `whatsapp` | Phone number | Opcional — llega en `contact.phone` (vacío si no lo rellenan). Mapearlo en el upsert de la Ruta A |

**Mapeo de `resorts_50` en Make:** el payload final ahora incluye dos campos nuevos: `all_resorts_50` (array con `name` y `match_percentage`) y `all_resorts_50_text` (texto plano, un resort por línea: "Nombre — 92%"). Lo más rápido: mapear `all_resorts_50_text` directamente al campo `resorts_50` en el módulo *Create Record* de la Ruta A. El array queda disponible por si más adelante queréis una tabla relacionada de matches. `recommended_resorts` (top 5) sigue enviándose igual — ManyChat no se ve afectado.

---

## 2. Make — Router en el escenario del webhook actual

El webhook ahora recibe **dos tipos de payload**:

- El de siempre: `is_final: true` (formulario completado)
- El nuevo: `event: "cta_click"`, `is_final: false`, con `session_id`, `cta` (itinerario/whatsapp), `email`, `name`, `timestamp`

Pasos en el escenario que recibe el webhook:

1. Justo después del módulo **Webhook**, añadir un **Router**.
2. **Ruta A — filtro:** `is_final` = `true` → ahora es un **upsert** (rescribe si ejecutan el finder dos veces):
   - **Airtable → Search Records** por `{email}`
   - **Si existe** → *Update Record*: sobreescribir respuestas, stage, `resorts_50`, `session_id` (el nuevo) y `fecha_resultado`, y **resetear** los tres checkboxes de clic y `fecha_cta` (nueva partida, nueva medición)
   - **Si no existe** → *Create Record* como hasta ahora (incluyendo `session_id` y `resorts_50`)
   - Después del upsert: **Sleep 5 min → email de resultados** (ver sección 3)
3. **Ruta B — filtro:** `event` = `cta_click` →
   - **Sleep 30 segundos** (por si el clic llega antes de que la Ruta A haya creado el registro)
   - **Airtable → Search Records** — fórmula: `{session_id} = "{{session_id del webhook}}"`. Si no devuelve nada, segunda búsqueda por `{email}`.
   - Un **Router con tres filtros** según el valor de `cta`, cada uno con su *Update Record*:
     - `cta = itinerario` → `clic_itinerario` ✅ + `fecha_cta`
     - `cta = whatsapp` → `clic_whatsapp` ✅ + `fecha_cta`
     - `cta = web` → `clic_web` ✅ + `fecha_cta`

> ⚠️ Importante: redeterminar la estructura de datos del webhook en Make (botón "Redetermine data structure") y completar el Resort Finder + clicar un CTA una vez en pruebas, para que Make aprenda los campos nuevos (`event`, `cta`).

---

## 3. Email de resultados a los 5 minutos — SIEMPRE, dentro de la Ruta A

Decisión: el email se envía a todos a los 5 minutos, clicen o no. Esto **elimina** la Airtable Automation de GAME DONE (retirarla si estaba montada) — todo vive en el mismo escenario de Make, a continuación del upsert:

1. **Sleep 300 segundos** (máximo del módulo Sleep de Make = justo 5 min).
2. Módulo **ManyChat** (Make detecta, ManyChat envía):
   - *Create/Find Subscriber* por email (con nombre y custom fields: stage, resort match) — el find evita duplicados si ejecutan el finder dos veces
   - Asignar tag `EMAIL_RESULTADOS`
   - Disparar el flow de email de resultados según STAGE (el copy vive en ManyChat, editable sin tocar Make)

**Contenido del email — importante:** el lead de publicidad no sabe quiénes sois (solo ha visto el Resort Finder). Estructura:
1. Su resort top (recordatorio del match)
2. Una línea de presentación: +300 parejas, visitáis los resorts cada año
3. 1-2 links de la web según stage (HOT: por qué reservar con vosotros · WARM: combinados y mejor época · COLD: inspiración y precios orientativos) — el email es el sitio de la web, no la pantalla de resultado
4. Los dos CTAs: itinerario y WhatsApp

**No incluir la lista completa de resorts** — desmontaría el incentivo del CTA de WhatsApp ("desbloquear los restantes").

**Por qué ManyChat y no email directo desde Make:** el contacto queda creado en ManyChat antes de abrir WhatsApp — cuando lo haga, su historial (email, stage, tags) está en la misma ficha y las secuencias continúan sin duplicados. Puede ser secuencia (5 min → 24h → 72h) con métricas de apertura.

> ⚠️ Requisito: verificar que vuestro plan de ManyChat permite crear contactos por API solo con email y enviarles por el canal Email (add-on de pago en Pro). Si no, fallback: enviar el email directamente desde Make (Gmail/SMTP).

Los checkboxes de clic (Ruta B) ya no deciden ningún envío, pero son vuestra métrica de seriedad: quién clicó qué, por stage declarado. Detecta además al que clicó "Diseñar viaje" pero no completó el itinerario (`clic_itinerario` ✅ sin registro de itinerario) — buen candidato a seguimiento manual.

---

## 3b. Vínculo de pareja (botón "Enviádselo a vuestra pareja")

La tarjeta del resort tiene un botón de compartir. El link compartido lleva `ref=pareja` y `ref_session=<session_id del que comparte>`. Si la pareja completa el test, esos parámetros llegan en el payload final.

**En Airtable:** campo nuevo `pareja_de` (Link to another record, hacia la misma tabla).

**En Make, Ruta A (después del upsert):** filtro — si `ref_session` no está vacío → *Search Records* por `{session_id} = ref_session` → si encuentra registro → *Update Record* del lead nuevo: `pareja_de` = registro encontrado. Opcional pero recomendado: notificación a Slack — **"💍 Los dos miembros de una pareja han completado el test"** — es vuestra señal de intención más fuerte; merece seguimiento prioritario y comparar si les salió el mismo resort.

El clic en compartir también llega a la Ruta B con `cta = "compartir"` — si queréis medirlo, añadid checkbox `clic_compartir` y un cuarto filtro; si no, ese evento simplemente no hará nada (sin romper nada).

---

## 3c. Fotos de resorts — 5 pendientes de subir

La tarjeta del resultado ahora muestra la foto del resort (sacadas de vuestra biblioteca de WordPress). **Faltan 5 que no están en WP:** Emerald Faarufushi, Mövenpick Kuredhivaru, Heritance Aarah, Sun Siyam Olhuveli y Dhigali. Mientras tanto, esos resorts muestran la tarjeta sin foto (sin romper el diseño).

Para completarlas: subid las fotos a WordPress con el nombre del resort en el archivo (ej. `dhigali_800x600.webp`) y añadid la línea `imageUrl` correspondiente en `resorts.ts` (hay un TODO con instrucciones al principio del archivo).

---

## 4. Checklist de pruebas antes de dar por bueno

- [ ] Completar el Resort Finder con email de prueba → registro en Airtable con `session_id` y `resorts_50` rellenos (la lista puede tener más de 5 resorts)
- [ ] Probar el campo WhatsApp: vacío (debe enviarse en blanco, no "+34"), incompleto (debe avisar sin bloquear si se borra) y completo (debe llegar a Airtable)
- [ ] En la pantalla de resultado, clicar "Recibir mi colección en WhatsApp" → en ~1 min, `clic_whatsapp` ✅
- [ ] Repetir con el CTA del itinerario → `clic_itinerario` ✅ (el anterior debe seguir marcado)
- [ ] En WARM/COLD, clicar un link a la web → `clic_web` ✅
- [ ] Probar las tres pantallas (HOT/WARM/COLD) y comprobar que las tarjetas 🔒 aparecen y que el link "Calculadlo aquí" sale en COLD
- [ ] A los 5 min llega el email de resultados (a todos, clicen o no)
- [ ] La tarjeta del resultado muestra la foto del resort (probar con un perfil que dé p. ej. OBLU Lobigili)
- [ ] Botón "Enviádselo a vuestra pareja" → abre el share nativo en móvil / WhatsApp Web en desktop, con el link `ref_session`
- [ ] Completar el test desde un link compartido → el registro nuevo llega con `ref_session` y se vincula en `pareja_de`
- [ ] Repetir el finder con el mismo email → el registro de Airtable se **sobreescribe** (no se duplica) y los tres checkboxes de clic quedan vacíos

---

## 5. Despliegue y marcha atrás

- Antes de desplegar: `npm run dev` en local y revisar las tres pantallas de resultado (podéis forzar el stage completando el formulario con cada opción).
- Compilar: `npm run build` como siempre.
- **Copia de seguridad:** la versión anterior completa está en la carpeta `_backup_2026-06-12/`. Para restaurar, copiad sus archivos de vuelta a la raíz del proyecto (sobrescribiendo) y volved a compilar.

---

## Métricas que esto desbloquea (mirar en 3-4 semanas)

- % de leads que clican algún CTA (objetivo Notion: >70%) — por stage declarado
- itinerario vs whatsapp por stage → quiénes son los "serios" reales
- HOT declarados sin ningún clic → la medida real del problema que originó todo esto
- Con estos datos se decide si pedir el teléfono y dónde (finder vs itinerario)
