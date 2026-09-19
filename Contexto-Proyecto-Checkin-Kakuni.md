# Contexto del proyecto — Automatización de check-in de vuelos (Kakuni Travels)

> Pega este documento como **instrucciones / contexto del proyecto** de Claude. Define el objetivo, la arquitectura, los datos y las reglas para que Claude haga los check-in de los clientes de Kakuni con consistencia.

---

## 1. Objetivo

Hacer el **check-in online de los vuelos de los clientes de Kakuni Travels** de forma semiautomática: detectar cuándo se abre la ventana de check-in, ejecutar el check-in en la web de la aerolínea con el navegador, obtener la tarjeta de embarque y registrar el estado. El objetivo es ahorrar trabajo manual y que ningún cliente se quede sin check-in.

## 2. Reparto de responsabilidades (arquitectura)

- **Airtable = fuente de verdad.** Cada vuelo es una fila con todos los datos del pasajero y el estado del check-in. Las filas se crean **manualmente** por el equipo de Kakuni.
- **Tarea programada (Claude) = el disparador real.** Claude se ejecuta de forma recurrente (p. ej. cada mañana y/o cada pocas horas), revisa Airtable y actúa sobre los vuelos cuyo check-in ya está abierto y pendiente.
- **Navegador (Claude en Chrome) = la ejecución.** Claude abre la web de la aerolínea, mete localizador + apellido, completa datos APIS/pasaporte, selecciona asiento si procede y descarga la tarjeta de embarque.

> Nota técnica: un webhook de Make/Airtable **no puede** "despertar" a Claude directamente. Por eso el trigger vive en una **tarea programada de Claude que consulta Airtable**, no en un webhook entrante. El resultado para el negocio es el mismo.

## 3. Estructura de la tabla en Airtable

Tabla sugerida: **`Check-ins`**. Campos:

| Campo | Tipo | Descripción |
|---|---|---|
| `Cliente` | Texto / vínculo | Nombre del cliente o reserva Kakuni |
| `Aerolínea` | Single select | Aerolínea operadora |
| `Localizador` | Texto | Código de reserva (PNR), 6 caracteres |
| `Apellido` | Texto | Apellido tal cual aparece en el billete |
| `Pasajeros` | Texto largo | Nombre completo de cada pasajero (uno por línea) |
| `Nº pasaporte` | Texto | Por pasajero (dato sensible — acceso restringido) |
| `Caducidad pasaporte` | Fecha | Por pasajero |
| `Nacionalidad` | Texto | Por pasajero |
| `Fecha/hora salida` | Fecha-hora | Para calcular la ventana de check-in |
| `Origen` / `Destino` | Texto | Aeropuertos (IATA) |
| `Datos APIS / destino` | Texto largo | Dirección en destino, visado, etc. si la aerolínea lo pide |
| `Preferencia asiento` | Single select | Ventana / Pasillo / Indiferente |
| `Ventana check-in` | Fórmula/Texto | Cuándo abre (24h, 48h… según aerolínea) |
| `Estado check-in` | Single select | `Pendiente` / `Listo para check-in` / `Hecho` / `Requiere intervención` / `Error` |
| `Tarjeta embarque` | Adjunto/URL | PDF descargado |
| `Notas` | Texto largo | Incidencias, CAPTCHAs, lo que tuvo que rematar un humano |

## 4. Flujo que debe seguir Claude

1. **Leer Airtable** y filtrar filas con `Estado = Listo para check-in` (o `Pendiente` cuya ventana ya esté abierta según `Fecha/hora salida` y la política de la aerolínea).
2. Para cada vuelo, **abrir la web de check-in** de la aerolínea con el navegador.
3. Introducir **localizador + apellido**.
4. Completar los datos requeridos: **pasaporte, caducidad, nacionalidad, APIS/destino**.
5. Aplicar **preferencia de asiento** solo si es gratuita.
6. Confirmar el check-in y **descargar la tarjeta de embarque** (PDF).
7. **Actualizar Airtable**: `Estado = Hecho`, adjuntar tarjeta, anotar incidencias.
8. Si algo bloquea (ver reglas), marcar `Estado = Requiere intervención` con nota clara de qué falta.

## 5. Reglas y límites (importante)

- **No pagar extras.** Asientos de pago, maletas adicionales, upgrades: Claude NO los compra ni confirma cobros. Si el check-in obliga a pagar, marcar `Requiere intervención`.
- **CAPTCHA / login con código al móvil:** Claude no puede resolverlos solo. Marcar `Requiere intervención` y avisar para que un humano lo remate.
- **Asiento:** elegir solo opciones **gratuitas** que respeten la preferencia. Si no hay gratis acorde, dejar el que asigne el sistema.
- **Datos sensibles (pasaporte/APIS):** usarlos solo desde Airtable, nunca inventarlos. Mantener la tabla con acceso restringido.
- **No hacer check-in antes de tiempo:** respetar la ventana de cada aerolínea (suele ser 24-48h antes; varía).
- **Verificar identidad del pasajero:** que el apellido/nombre de la web coincida exactamente con el de Airtable antes de confirmar.
- Ante cualquier duda o pantalla inesperada: **parar y marcar para revisión**, no adivinar.

## 6. Datos mínimos para que un vuelo sea procesable

Una fila está "lista" cuando tiene, como mínimo: aerolínea, localizador, apellido, fecha/hora de salida y —para vuelos internacionales— pasaporte, caducidad y nacionalidad de cada pasajero. Sin esto, Claude debe dejarla en `Pendiente` y avisar de qué falta.

## 7. Primer caso de prueba

Antes de automatizar nada, hacer **una prueba manual** con un vuelo real:
1. Crear una fila completa en Airtable.
2. Pedir a Claude que haga ese check-in con el navegador, paso a paso y a la vista.
3. Revisar qué pidió la aerolínea (campos, CAPTCHA, login) y ajustar este contexto.
4. Solo cuando un check-in "limpio" funcione de principio a fin, montar la tarea programada.

---

*Mantén este documento actualizado: cada aerolínea nueva o peculiaridad detectada en la prueba debe anotarse aquí para que el flujo sea fiable.*
