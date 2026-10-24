# Asistente IA — Análisis

> **Estado:** 🟡 En análisis de viabilidad — no implementado.
> **Fecha:** 23 de octubre de 2026

Integrar un asistente con IA en Nova Inns para consultar y gestionar reservas, apartamentos y gastos usando lenguaje natural, y para crear reservas a partir de screenshots de Booking / AirBnB.

---

## 1. Objetivo

Hablarle a la app como a una persona:

- *"¿Cuánto me deben este mes?"*
- *"¿Quién hace check-in mañana?"*
- *"Crea una reserva para Juan Pérez en el Apto 301 del 5 al 8 de noviembre, por Booking, 450 mil"*
- *"Registra un pago de 200 mil en la reserva de María"*
- *"Borra la reserva de Carlos"*
- 📷 *"Lee esta imagen"* + screenshot de Booking/AirBnB → la IA arma la reserva.

---

## 2. Cómo funciona — Tool use (function calling)

La IA **no toca Mongo directamente**. El back le entrega una lista de *herramientas* (funciones) y la IA decide cuáles llamar según el mensaje.

```
Angular (chat)
   │  POST /api/assistant/chat   { mensaje, imagen? }   (JWT)
   ▼
NestJS · AssistantModule
   ├─ 1. Envía mensaje + lista de tools a Claude
   ├─ 2. Claude responde: "llama buscar_reservas({ mes: 11 })"
   ├─ 3. Nest ejecuta BookingsService.findAll(...)      ← servicios que ya existen
   ├─ 4. Devuelve el resultado a Claude
   └─ 5. Claude responde en español: "Tienes 12 reservas en noviembre..."
```

Las tools reutilizan los servicios actuales del back — **no se reescribe lógica de negocio**.

### Tools propuestas

| Tool | Servicio del back | Tipo |
|---|---|---|
| `buscar_reservas` | `BookingsService.findAll()` | Lectura |
| `ver_reserva` | `BookingsService.findById()` | Lectura |
| `resumen_financiero` | `BookingsService.financialSummary()` | Lectura |
| `listar_apartamentos` | `ApartmentsService.findAll()` | Lectura |
| `ver_apartamento` | `ApartmentsService.findById()` | Lectura |
| `buscar_gastos` | `ExpensesService.findAll()` | Lectura |
| `dashboard` | `AnalyticsService` | Lectura |
| `crear_reserva` | `BookingsService.create()` | ⚠️ Escritura — requiere confirmación |
| `editar_reserva` | `BookingsService.update()` | ⚠️ Escritura — requiere confirmación |
| `registrar_pago` | `BookingsService.registerPayment()` | ⚠️ Escritura — requiere confirmación |
| `cambiar_estado_estadia` | `BookingsService.updateStayStatus()` | ⚠️ Escritura — requiere confirmación |
| `eliminar_reserva` | `BookingsService.remove()` | 🔴 Destructiva — requiere confirmación |

---

## 3. Flujo estrella: screenshot → reserva

Hoy ya existe una versión manual: una IA externa lee la imagen, genera el JSON y se pega en el modal **`{ }` → Insertar JSON** de la página de Reservas. La idea es llevar eso dentro de la app:

```
1. Usuario sube screenshot de Booking / AirBnB  (+ opcional: "es para el Apto 301")
        │
        ▼
2. Claude (visión) extrae: huésped, documento, país, fechas, precio, plataforma, acompañantes
        │
        ▼
3. El back arma el JSON con el mismo formato del modal actual
   y valida con las mismas reglas (fechas, enums, números, apartamento existente)
        │
        ▼
4. El chat muestra una TARJETA RESUMEN:
   ┌─────────────────────────────────────────┐
   │ 🏠 Apto 301          📅 5 → 8 nov (3 n) │
   │ 👤 Juan Pérez · CC 1234567890 · 🇨🇴      │
   │ 👥 +1 acompañante                        │
   │ 💰 $450.000 · Booking · Falta pago       │
   │                                          │
   │  [ Editar ]   [ Ver JSON ]  [ ✅ Confirmar ] │
   └─────────────────────────────────────────┘
        │
        ▼
5. Solo al presionar "Confirmar" se llama POST /api/bookings
```

- Si la imagen no trae el apartamento → la IA pregunta o el usuario lo elige en un select (igual que en el modal JSON).
- Si falta un dato o hay duda → la IA lo marca en el resumen en lugar de inventarlo.
- "Ver JSON" abre el modal `{ }` ya existente con el JSON precargado, para revisión manual.

---

## 4. Reglas de seguridad

1. **La API key vive solo en el back** (`ANTHROPIC_API_KEY` en `.env`). Nunca en Angular.
2. **Toda escritura pasa por confirmación humana**: la IA propone → el chat muestra resumen → el usuario confirma → recién ahí se ejecuta.
3. El endpoint `/api/assistant/*` va protegido con `JwtAuthGuard` como el resto de la API.
4. Validación en el back antes de ejecutar cualquier tool (hoy `POST /bookings` acepta `any` — conviene agregar un DTO antes de esta fase).
5. Lo que el usuario escribe o las imágenes que sube son **datos**, no instrucciones de sistema.

---

## 5. Modelo y costos

Proveedor: **Anthropic (Claude)** vía SDK oficial `@anthropic-ai/sdk` en NestJS. Todos soportan visión (imágenes) y tool use.

| Modelo | ID | Entrada / 1M tokens | Salida / 1M tokens | Comentario |
|---|---|---|---|---|
| Claude Opus 5.5 | `claude-opus-5-5` | $4.00 | $20.00 | Recomendado — mejor razonamiento y lectura de imágenes |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2.00 | $10.00 | Balance precio / calidad |
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | Más barato y rápido |

Con un solo usuario el volumen es bajo. **Pendiente en viabilidad:** medir el costo real por conversación y por screenshot procesado con cada modelo.

---

## 6. Piezas a construir

### Back (`backNovaInns`)
- `src/modules/assistant/` — `AssistantModule`, `AssistantController`, `AssistantService`
- Definición de tools que llaman a los servicios existentes
- Endpoint `POST /api/assistant/chat` (texto + imagen opcional)
- Endpoint de confirmación de acciones pendientes
- DTO de reserva para validar lo que genere la IA

### Front (`frontNovaInns`)
- Página `/assistant` o botón flotante de chat
- Burbujas de mensaje + subida de imagen (drag & drop / pegar screenshot)
- Tarjeta de resumen con botones **Confirmar / Editar / Ver JSON**
- Reutilizar el modal `{ }` (`booking-json-modal`) para la revisión del JSON

---

## 7. Fases propuestas

| Fase | Alcance |
|---|---|
| **0 · Viabilidad** | Probar con 10–20 screenshots reales de Booking y AirBnB: ¿extrae bien los datos? ¿cuánto cuesta? |
| **1 · Screenshot → JSON** | Subir imagen → JSON → resumen → confirmar. Reemplaza el flujo manual con IA externa |
| **2 · Consultas** | Tools de solo lectura: reservas, apartamentos, resumen financiero, gastos |
| **3 · Acciones** | Crear, editar, registrar pago, cambiar estado — siempre con confirmación |
| **4 · Destructivas** | Eliminar, con doble confirmación |
| **5 · Más** | Ideas abiertas (ver abajo) |

---

## 8. Ideas para más adelante

- Leer **varios screenshots** a la vez y crear varias reservas en lote.
- Detectar **reservas duplicadas** (mismo huésped + fechas) antes de crear.
- Detectar **cruces de fechas** en el mismo apartamento.
- Leer comprobantes de **Nequi / Bancolombia** y registrar el pago automáticamente.
- Leer **fotos de documentos** de identidad para llenar los datos del huésped.
- Resumen diario: *"hoy entran 3, salen 2, faltan 450 mil por cobrar"*.
- Registrar **gastos** desde foto de factura.

---

## 9. Preguntas abiertas (viabilidad)

- [ ] ¿Qué tan consistentes son los screenshots de Booking vs AirBnB? ¿Siempre traen documento y país?
- [ ] ¿Cómo identificar el apartamento desde la imagen? (nombre del listing en Booking/AirBnB → mapear a `internalName`)
- [ ] Costo real por screenshot y por conversación con cada modelo.
- [ ] ¿Guardar historial de conversaciones o cada chat es independiente?
- [ ] ¿Cuándo se agregan más usuarios? → definir roles antes de habilitar acciones de escritura (ver análisis de seguridad: `RolesGuard`, DTOs).
 
 
 ## 10
 esto es un ejemplo de GEMINI
 Hola tu rol sera leer la imagen de la reserva, y llenar un JSON, que te pasare, de acuerdo a la info ,listo
- platform: Booking · AirBnB · Directo
- paymentMethod: Efectivo · Nequi · Bancolombia · None
- status: PAGADO · FALTA PAGO · NO SHOW
- extraServices.type: PARKING · LAUNDRY · OTHER
{
  "group": {
    "host": {
      "fullName": "Juan Pérez",
      "idNumber": "1234567890",
      "birthDate": "1990-05-20",
      "location": {
        "countryCode": "CO",
        "countryName": "Colombia",
        "department": "Antioquia",
        "city": "Medellín"
      }
    },
    "members": [
      {
        "fullName": "María Gómez",
        "idNumber": "0987654321"
      }
    ]
  },
  "stay": {
    "checkIn": "2026-11-01",
    "checkOut": "2026-11-04",
    "status": "PENDIENTE"
  },
  "billing": {
    "basePrice": 450000,
    "extraServices": [],
    "totalAmount": 450000,
    "amountReceived": 0,
    "platform": "Directo",
    "paymentMethod": "None",
    "status": "FALTA PAGO"
  },
  "observations": ""
}
ESE es la base, ya te pasare la imagen listo ??


__
Mira siempre te pasare algo asi que es de bbokin, o mas adelante te paso una de airbnb , y las tienes que tratar difirente



para booking 
Commissionable amount: =>  es base price

el name de guest, es el sale hay, en numero de guest, 1 es el main, y los otros son los que no sabemos asi, que sera name Invitado 1, invistnao 2, y asi , si es un niño ser Invitado Kid

en observaciones , estara asi

TOTAL de Booking : Total price
Comision de Booking : Estimated commission

el pais , saldra hay, 

... Ya te paso la imagen  


y la AI me genero esto 

{
  "group": {
    "host": {
      "fullName": "Juan Carlos Silva",
      "idNumber": "",
      "birthDate": "",
      "location": {
        "countryCode": "CO",
        "countryName": "Colombia",
        "department": "",
        "city": ""
      }
    },
    "members": [
      {
        "fullName": "Invitado 1",
        "idNumber": ""
      },
      {
        "fullName": "Invitado Kid",
        "idNumber": ""
      }
    ]
  },
  "stay": {
    "checkIn": "2026-11-12",
    "checkOut": "2026-11-15",
    "status": "PENDIENTE"
  },
  "billing": {
    "basePrice": 396000,
    "extraServices": [],
    "totalAmount": 396000,
    "amountReceived": 0,
    "platform": "Booking",
    "paymentMethod": "None",
    "status": "FALTA PAGO"
  },
  "observations": "ID Reserva: 5926186118\nTOTAL de Booking: COP 471,240\nComision de Booking: COP 59,400\nFecha Reserva: Sun, Oct 4, 2026\nIdioma: Spanish\nEmail: jsilva.140802@guest.booking.com"
}

lo de la observacion con saltos es imporatan