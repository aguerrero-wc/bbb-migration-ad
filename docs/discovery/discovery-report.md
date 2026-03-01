# Discovery Report — MyZoneGo Live (BBB Management)

## Metadata
- **URL**: https://www.myzonego.com/live
- **Fecha de análisis**: 2026-03-01
- **Tecnologías detectadas**: Vue.js 2.6.14, jQuery 3.3.1, Bootstrap 4 (via Bootstrap-Vue), Axios, Moment.js, AlertifyJS, Sortable/VueDraggable, DataTables, Select2, Quill, Dropzone, jscroll, Flatpickr (bootstrap-datepicker), Ekko-lightbox, Mixitup, Slick
- **Framework Frontend**: Vue.js 2.6.14 (sin Vuex — estado local en componentes)
- **Backend**: Laravel (XSRF-TOKEN cookie, CSRF meta tag, Blade templates con Vue montado inline)
- **Autenticación requerida**: Sí — sesión Laravel via cookies (XSRF-TOKEN + _ga cookies). Login en `/login`.
- **BBB Client URL**: `https://live.myzonego.com/html5client/join?sessionToken={token}`

---

## 1. Arquitectura Actual

### 1.1 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Laravel (PHP) | desconocida |
| Frontend Framework | Vue.js | 2.6.14 |
| UI Library | Bootstrap-Vue | latest (CDN) |
| CSS Framework | Bootstrap | 4.x |
| HTTP Client | Axios | CDN unpkg |
| DOM Manipulation | jQuery | 3.3.1 |
| Fechas | Moment.js | 2.18.1 (cdnjs) |
| Notificaciones | AlertifyJS | 1.13.1 |
| Tablas | DataTables | 1.13.1 |
| Editor | Quill.js | local |
| Drag & Drop | VueDraggable + Sortable.js | local |
| Upload | Dropzone.js | local |
| Select | Select2 | local |
| Analytics | Google Analytics 4 | G-X0X79E05QY |
| Videoconferencia | BigBlueButton (HTML5 Client) | live.myzonego.com |

**Autenticación**: Cookies de sesión Laravel (`laravel_session` + `XSRF-TOKEN`). El CSRF token también se expone en `<meta name="csrf-token">`.

**Errores detectados en consola**:
- `ReferenceError: tinymce is not defined` (en página login)
- `TypeError: Cannot read properties of undefined` (en live:27303 y reserve/meeting:2263)
- `[Vue warn]: Property or method "randomId" is not defined`
- `GET /libs/jquery-validation/dist/localization/messages_en.js → 404`
- `GET /storage/null → 404` (imagen de meeting sin image_id)
- CDNs externos caídos: `polyfill.io`, `image.flaticon.com`

### 1.2 Estructura de Páginas/Rutas

| Ruta | Descripción | Autenticación |
|------|-------------|---------------|
| `/login` | Login de usuario | No |
| `/register` | Registro de usuario | No |
| `/password/reset` | Recuperar contraseña | No |
| `/home` | Dashboard principal del LMS | Sí |
| `/live` | **Sala de reuniones BBB** | Sí |
| `/reserve/meeting` | Gestión de reservaciones | Sí |
| `/profile` | Perfil del usuario | Sí |
| `/users` | Directorio de usuarios | Sí |
| `/clubs` | Grupos | Sí |
| `/Frequently` | FAQ / Ayuda | Sí |
| `/lang/es` | Cambiar idioma a Español | Sí |
| `/lang/en` | Cambiar idioma a Inglés | Sí |

### 1.3 Patrones de API

**Base URL**: `https://www.myzonego.com`

Patrón REST con recursos:
- `GET /api/meetings/?parent=CUSTOMER` — lista todas las salas del cliente
- `GET /api/meetings/{uuid}/info` — estado en tiempo real de una sala (BBB status)
- `GET /api/meetings/{uuid}/recordings` — grabaciones de una sala
- `POST /api/meetings/{uuid}/join` — unirse a una sala (genera sessionToken)
- `GET /edit/{uuid}/meeting` — datos para editar una sala
- `GET /notificationszone/unread` — notificaciones no leídas (polling frecuente)

---

## 2. Inventario de Componentes

### 2.1 Navbar (Header)

**Tipo**: Navigation Bar
**Ubicación**: Fixed top, full width
**Screenshot**: `01-login-page.png`, `05-responsive-1280px.png`

**Elementos internos**:
- Logo KALM: `<img>` dentro de `<a href="/home">` — izquierda
- Nav items (solo visibles en desktop ≥lg): "Users" dropdown, "Groups" link → `/clubs`
- Help icon: link → `/Frequently` (icono `?`)
- Language dropdown: "ESP" → `/lang/es`, "ENG" → `/lang/en`
- Notifications bell: badge con contador no leído → `/notificationszone/unread`
- User avatar button: dropdown con "Profile" → `/profile` y "Log out" (Vue handler)
- Toggle hamburger: solo en mobile

**Estilos**:
- `nav.navbar.navbar-expand-lg.navbar-dark.styleNadvar`
- Background: `rgb(72, 72, 72)` (gris oscuro)
- Texto: blanco

**Selectores clave**:
- Contenedor: `nav.navbar.navbar-expand-lg.navbar-dark.styleNadvar`
- Logo: `nav .navbar-brand img`
- Hamburger: `button.navbar-toggler`
- Users dropdown: `button[aria-haspopup="true"]:first-child`
- Bell: `button.btn.btn-sm.btn-danger.rounded-pill` (mobile) / badge en desktop
- User avatar: `button` con `img[alt="user"]`

**Comportamiento responsive**:
- **375px**: Solo logo centrado + hamburger izquierda + bell notification (pill rojo) + avatar
- **768px**: Logo centrado + hamburger + bell + avatar
- **1280px**: Logo izquierda + nav items (Users, Groups) + iconos derechos visibles

---

### 2.2 Hero Section / Toolbar

**Tipo**: Action Bar sobre imagen de fondo
**Ubicación**: Debajo del navbar, encima del grid de cards
**Screenshot**: `02-live-initial.png`

**Elementos internos**:
- Imagen de fondo full-width (foto de mujer de espaldas + imagen técnica)
- Botón **BACK** → `btn btn-outline-primary mb-3` — color azul claro `rgb(21, 140, 186)` — vuelve a la página anterior
- Botón **CREATE ROOM** → `btn btn-success` — verde `rgb(40, 182, 44)`
- Botón **RELOAD** → `btn btn-info` — celeste `rgb(117, 202, 235)`
- Botón **RESERVATIONS** → `btn btn-danger` (link) → `/reserve/meeting` — rojo `rgb(255, 65, 54)`

**Comportamiento RELOAD**: Llama de nuevo a `GET /api/meetings/?parent=CUSTOMER` + `GET /api/meetings/{uuid}/info` por cada sala. **No recarga la página**. Actualiza el estado de los badges (ej: muestra "Running" si hay sesión activa).

---

### 2.3 Meeting Card (Componente Principal)

**Tipo**: Card
**Ubicación**: Grid de 3 columnas (desktop), 2 columnas (tablet), 1 columna (mobile)
**Grid CSS**: Bootstrap `card-columns` (masonry layout)
**Screenshot**: `02-live-initial.png`, `05-responsive-1280px.png`

**Elementos internos**:
- `img.card-img-top` — imagen de portada de la sala (opcional)
- `h4.card-title` — nombre de la sala
- `p.card-text` — descripción (opcional)
- `p` — fecha/hora con ícono reloj (opcional — solo si `datetime` está definido)
- `a[href="#"].btn.btn-success` — botón **JOIN** — Vue handler
- `img[alt="avatar"]` o `img` genérico — avatar del propietario
- Texto — nombre del propietario
- Badge de estado:
  - **"Shared with me"** (`img[alt="people"]`) — sala compartida con el usuario actual
  - **"Running"** (`img[alt="broadcast"]`) — sala activa (sesión BBB en curso)
  - Sin badge — sala propia sin compartir
- `button[title="three dots vertical"]` — menú contextual ⋮

**CSS clase del card**: `.card.shadow-sm.border-default`

**Estados observados**:
- **Default**: card blanca, sin borde destacado
- **Running**: borde izquierdo rojo/coloreado en la card
- **Sin imagen**: card sin `img.card-img-top` (el card body ocupa todo el espacio)

**Menú ⋮ — Opciones según rol**:

| Opción | Propietario | Usuario compartido |
|--------|-------------|-------------------|
| Recordings | ✅ | ✅ |
| History | ✅ | ✅ |
| Edit | ✅ | ❌ |
| Delete | ✅ | ❌ |

**Datos que muestra**:
- `name`: string (título h4)
- `description`: string o null (párrafo opcional)
- `datetime`: datetime o null (párrafo con ícono reloj)
- `image_id`: UUID → imagen en `/storage/...` (opcional)
- `user.name`: nombre del propietario
- `user.avatar`: imagen del propietario
- `shared_with`: array de user IDs (determina badge "Shared with me")
- `isRunning`: boolean desde `/info` endpoint (determina badge "Running")

**Selectores clave**:
- Card contenedor: `.card.shadow-sm.border-default`
- Título: `.card-title` (h4)
- Descripción: `.card-body p:first-of-type`
- Botón Join: `.card-body a.btn.btn-success`
- Botón menú: `button[id*="BV_toggle_"]`
- Avatar propietario: `.card-footer img`
- Badge "Shared": `[title="Shared with me"]`
- Badge "Running": `[title="Running"]`

---

### 2.4 Modal — Create Room / Edit Room

**Tipo**: Modal (dialog) de accordión expandible
**Trigger**: Click en "CREATE ROOM" (nuevo) o "Edit" en menú ⋮ (editar)
**Screenshot**: `09-modal-create-room.png` a `14-modal-create-customize.png`, `19-modal-edit-room.png`

**Diferencias Create vs Edit**:
- Create: solo botón "SUBMIT"
- Edit: botones "SUBMIT" + "CLOSE", campo Name pre-poblado con datos existentes

**Campo Name**: Siempre visible arriba (textbox libre)

**Secciones (accordion)**:

#### Tab Information
- `Description`: textarea libre
- `Date Time`: `<input type="datetime-local">` — formato `mm/dd/yyyy, --:-- --`

#### Tab Record
- `Activate recording`: toggle (switch on/off) — mapea a `config.record`

#### Tab Security
- `Generate password`: textbox + botón dado (generar random) + botón basura (borrar)
- `Max participants`: spinbutton numérico — mapea a `config.maxParticipants`
- `Requires moderator approval to enter the meeting`: toggle — mapea a `config.guestPolicy`
- `Allow users to start this meeting`: toggle — mapea a `allow_user_start`
- `Show invitation link`: toggle — mapea a `show_invitation_link`

#### Tab Share
- `Search for users...`: textbox de búsqueda
- Lista scrollable de todos los usuarios del sistema (ordenada alfabéticamente)
- Click en usuario lo agrega a `shared_with`
- Panel derecho (verde border) muestra usuarios seleccionados

#### Tab Customize
- `Background image of the session`: file input (Browse) — imagen de fondo en BBB
- `Session access image`: file input (Browse) — imagen de portada de la card

**Botones de acción**:
- `SUBMIT` — `btn btn-success` — verde
- `CLOSE` — `btn btn-secondary` — gris (solo en Edit)

---

### 2.5 Panel Lateral — Recordings

**Tipo**: Sidebar / Offcanvas (panel lateral izquierdo)
**Trigger**: "Recordings" en menú ⋮
**Screenshot**: `17-modal-recordings-empty.png`

**Contenido**: Lista de grabaciones de la sala.
**Estado vacío**: Solo header "Recordings" + separador (sin mensaje de "empty state" explícito).
**Cierre**: Botón X en el header.

---

### 2.6 Panel Lateral — History

**Tipo**: Sidebar / Offcanvas (panel lateral izquierdo)
**Trigger**: "History" en menú ⋮
**Screenshot**: `18-modal-history.png`

**Contenido**: Lista de timestamps (fechas y horas) de sesiones pasadas en la sala. Sin paginación visible. Scrollable.
**Formato de fecha**: `DayOfWeek, Month Day, Year H:MM AM/PM`
**Cierre**: Botón X en el header.

---

### 2.7 Página Reservaciones (`/reserve/meeting`)

**Tipo**: Página completa con tabs + calendario
**Screenshot**: `23-reservations-all.png`, `24-reservations-make.png`, `25-reservations-mine.png`

**Tabs**:
1. **All reservations**: Calendario semanal de todas las reservas del sistema
2. **Make reservation**: Formulario de creación + calendario preview
3. **My reservations**: Calendario solo con mis reservas

**Calendario**:
- Vista semana y vista día (toggle Week/Day)
- Navegación: `< Previous Week`, `> Next Week`, `Today` (deshabilitado si es la semana actual)
- Indicador de hora actual (línea roja con triángulo)

**Formulario "Make Reservation"** (campos):
- `Room:` — `<select>` con todas las salas disponibles ("Seleccione..." por defecto)
- `Day of the meeting:` — `<input type="date">` — formato `mm/dd/yyyy`
- `Start time:` — `<input type="time">`
- `End time:` — `<input type="time">`
- `Ajustar notificacion`: toggle (switch)
- `Is it recurrent?`: checkbox
- Botón **RESERVE** — azul — `btn btn-primary`
- Botón **ADD GUESTS** — azul con ícono personas — deshabilitado hasta seleccionar sala

**API de reservaciones**: `/api/reservations/` → 404 (no implementada o ruta diferente). La página parece obtener datos directamente desde el HTML/Blade o un endpoint no documentado.

---

## 3. Flujos de Usuario

### 3.1 Flujo: Crear Sala

1. **Estado inicial**: `/live` — grid de cards visible
2. Click en **CREATE ROOM** → Abre modal dialog centrado
3. Ingresar **Name** (obligatorio — no tiene validación visible pero es el campo principal)
4. (Opcional) Abrir **Information** → agregar Description y/o DateTime
5. (Opcional) Abrir **Record** → activar grabación
6. (Opcional) Abrir **Security** → contraseña, max participantes, política de acceso
7. (Opcional) Abrir **Share** → buscar y seleccionar usuarios
8. (Opcional) Abrir **Customize** → subir imágenes
9. Click **SUBMIT** → se crea la sala (request POST al backend)
10. La sala aparece en el grid (se actualiza via Vue reactivity)

**Notas**: No se observó validación de formulario en tiempo real ni mensajes de error específicos. El campo Name no tiene atributo `required` visible en el snapshot.

---

### 3.2 Flujo: Unirse a Sala (JOIN)

1. **Estado inicial**: `/live` — card de la sala visible con botón JOIN
2. Click en **JOIN** → se dispara handler Vue
3. Se muestra toast/alert `"Validating information"` (AlertifyJS o Bootstrap-Vue `b-alert`)
4. Request: `POST /api/meetings/{uuid}/join` → responde con BBB sessionToken
5. Se abre **nuevo tab** con URL: `https://live.myzonego.com/html5client/join?sessionToken={token}`
6. El cliente BBB HTML5 carga en el nuevo tab
7. Muestra modal de audio: **Microphone** o **Listen only**
8. Tras elegir audio, el usuario entra a la sala

**URL BBB Pattern**: `https://live.myzonego.com/html5client/join?sessionToken={8-char-token}`
**Subdomain BBB**: `live.myzonego.com` (diferente de `www.myzonego.com`)

**Estado post-join en la card**:
- La sala aparece con badge **"Running"** (ícono broadcast rojo)
- El card obtiene borde de color
- Un avatar del usuario actual aparece en la card

---

### 3.3 Flujo: Reservaciones

1. Click en **RESERVATIONS** → navega a `/reserve/meeting`
2. Vista default: tab **All reservations** con calendario semanal de la semana actual
3. Para crear reservación: click en tab **Make reservation**
4. Seleccionar sala en dropdown (carga todas las salas disponibles)
5. Ingresar día, hora inicio, hora fin
6. (Opcional) Toggle "Ajustar notificacion" y/o "Is it recurrent?"
7. (Opcional) Click **ADD GUESTS** (se habilita al seleccionar sala)
8. Click **RESERVE** → guarda la reservación
9. La reservación aparece en el calendario de **All reservations** y **My reservations**

---

### 3.4 Flujo: Administrar Sala (menú ⋮)

**Usuario propietario**:
1. Click en **⋮** de la card propia
2. Menú desplegable muestra: Recordings | History | --- | Edit | --- | Delete

**Opción Recordings**:
- Abre panel lateral izquierdo "Recordings"
- Llama a `GET /api/meetings/{uuid}/recordings`
- Lista grabaciones (o vacío si no hay)

**Opción History**:
- Abre panel lateral izquierdo "History"
- Lista de fechas de sesiones pasadas (timestamps)
- No muestra duración ni participantes en esta vista

**Opción Edit**:
- Abre mismo modal que "Create Room" pero pre-poblado
- Llama a `GET /edit/{uuid}/meeting` para obtener datos
- Tiene botón "CLOSE" adicional
- Submit → actualiza la sala

**Opción Delete**:
- Visible en el snapshot pero no fue ejecutada (regla: no modificar datos)

**Usuario compartido**:
1. Click en **⋮** de sala compartida
2. Solo muestra: Recordings | History (sin Edit ni Delete)

---

### 3.5 Flujo: Reload

1. Click en **RELOAD** en la toolbar
2. **No recarga la página** — dispara Vue method
3. Llama a `GET /api/meetings/?parent=CUSTOMER` — refresca lista de salas
4. Llama a `GET /api/meetings/{uuid}/info` por cada sala — refresca estados
5. Las cards se actualizan reactivamente (Vue re-render)
6. Las salas en ejecución muestran badge "Running" actualizado

---

### 3.6 Flujo: Back

- Botón **← BACK** en hero section → vuelve a la página anterior del browser (`history.back()` o link contextual)
- En `/reserve/meeting` → botón **← BACK** mismo comportamiento

---

## 4. Endpoints API

### 4.1 GET /api/meetings/?parent=CUSTOMER
- **Propósito**: Listar todas las salas del cliente
- **Auth**: Cookie de sesión Laravel
- **Response schema** (por sala):
```json
{
  "id": "uuid-string",
  "name": "Nombre de la sala",
  "config": {
    "record": "true|false",
    "guestPolicy": "ALWAYS_ACCEPT|ASK_MODERATOR",
    "maxParticipants": null,
    "autoStartRecording": false,
    "allowStartStopRecording": "true|false"
  },
  "user_id": 12345,
  "club_id": null,
  "created_at": "2023-03-27 15:31:43",
  "updated_at": "2025-07-23 11:19:11",
  "description": "Descripción opcional",
  "datetime": "2023-07-11 12:07:00",
  "allow_user_start": 1,
  "image_id": "uuid-o-null",
  "join_parameters": {
    "userdata-bbb_custom_style": "CSS string con customización de BBB"
  },
  "show_invitation_link": 0,
  "customer_id": 8,
  "shared_with": ["user_id_1", "user_id_2"],
  "public": 1,
  "hasPassword": false,
  "invitation_link": null,
  "parent": { "id": 8, "name": "My Zone Go", ... }
}
```

### 4.2 GET /api/meetings/{uuid}/info
- **Propósito**: Estado real-time de una sala en BBB
- **Response schema**:
```json
{
  "isCreated": false,
  "isRunning": false,
  "isRecording": false,
  "attendees": []
}
```
- `attendees` cuando la sala está activa: array de objetos de participantes

### 4.3 POST /api/meetings/{uuid}/join
- **Propósito**: Crear/unirse a sesión BBB — genera sessionToken
- **Response**: Contiene URL de BBB con `sessionToken`
- **Acción post-response**: Frontend abre nuevo tab con `https://live.myzonego.com/html5client/join?sessionToken={token}`

### 4.4 GET /api/meetings/{uuid}/recordings
- **Propósito**: Listar grabaciones de una sala
- **Response**: Array de grabaciones (vacío si no hay)

### 4.5 GET /edit/{uuid}/meeting
- **Propósito**: Obtener datos de sala para edición
- **Respuesta**: HTML (Blade template) o JSON con datos de la sala

### 4.6 GET /notificationszone/unread
- **Propósito**: Polling de notificaciones no leídas
- **Frecuencia**: Muy frecuente (cada pocos segundos durante el uso)
- **Response**: Contador de notificaciones

### 4.7 Endpoints de Reservaciones (404 en este usuario)
- `GET /api/reservations/` → **404** — no disponible para este rol/contexto
- `GET /api/reservations/my` → **404** — no disponible para este rol/contexto

---

## 5. Design Tokens Actuales

### 5.1 Colores

| Token | Valor | Uso |
|-------|-------|-----|
| Primary | `rgb(21, 140, 186)` / `#158cba` | Botón Back, links, color primario |
| Success | `rgb(40, 182, 44)` / `#28b62c` | Botón JOIN, Create Room, Submit |
| Info | `rgb(117, 202, 235)` / `#75caeb` | Botón Reload |
| Danger | `rgb(255, 65, 54)` / `#ff4136` | Botón Reservations, notificaciones, logout |
| Secondary | `rgb(240, 240, 240)` | Botón Close/Cancel |
| Navbar BG | `rgb(72, 72, 72)` / `#484848` | Fondo del navbar |
| Body BG | `rgb(246, 248, 250)` / `#f6f8fa` | Fondo general (`.bg_gray`) |
| Theme color | `#2d3033` | Meta theme-color |
| Texto oscuro | `rgb(34, 34, 34)` | Texto principal |

### 5.2 Tipografía

| Elemento | Fuente | Tamaño |
|----------|--------|--------|
| Body | `"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...` | 14px |
| H4 (Card title) | `"Source Sans Pro", ...` | 21px |
| Navbar brand | (logo imagen) | — |

### 5.3 Espaciado y Bordes

| Propiedad | Valor |
|-----------|-------|
| Border radius (botones) | 4px (estándar), 800px (pill — notificación mobile) |
| Card shadow | `shadow-sm` (Bootstrap) |
| Card border | `.border-default` |

### 5.4 Clases CSS clave

```css
/* Layout */
.bg_gray                    /* Body background */
.card-columns               /* Grid masonry de cards */
.card.shadow-sm.border-default  /* Card de sala */
.card-img-top               /* Imagen portada */
.card-body                  /* Contenido card */
.card-title                 /* Título h4 */
.styleNadvar                /* Clase custom del navbar */

/* Botones de acción toolbar */
.btn.btn-success            /* CREATE ROOM, JOIN */
.btn.btn-info               /* RELOAD */
.btn.btn-danger             /* RESERVATIONS */
.btn.btn-outline-primary    /* BACK */
```

---

## 6. Reporte de Accesibilidad

**Nota**: Se realizó auditoría manual basada en el snapshot del DOM (axe-core no pudo ejecutarse por falta del paquete).

### Problemas identificados:

| Severidad | Problema | Elemento afectado |
|-----------|---------|-------------------|
| 🔴 Crítico | Botones sin texto accesible (solo íconos) | `button.navbar-toggler`, botón ⋮ (solo imagen sin alt texto en el button wrapper) |
| 🔴 Crítico | `img[alt="three dots vertical"]` — alt descriptivo OK pero el botón wrapper carece de `aria-label` propio | Cards — botón menú |
| 🟠 Serio | Inputs sin autocomplete attribute | Login form (email, password) |
| 🟠 Serio | Campos de formulario Create Room sin `id`/`for` — labels no asociados formalmente | Modal Create Room |
| 🟡 Moderado | Contraste potencialmente bajo: texto gris sobre fondo claro en fechas de card | `.card-body p` (fecha gris) |
| 🟡 Moderado | `[Vue warn]: <meeting-card v-for="..."> component lists rendered with v-for should have explicit keys` | Lista de cards |
| 🟡 Moderado | `randomId` property/method no definida en instancia Vue | Error en consola |
| ℹ️ Info | Idioma del documento: `lang="en"` pero contenido mixto EN/ES | `<html lang="en">` |
| ℹ️ Info | Varios CDNs externos fallando | polyfill.io, image.flaticon.com |

---

## 7. Problemas y Deuda Técnica Identificados

1. **tinymce no definido**: `ReferenceError: tinymce is not defined` en login — posible editor de texto cargado condicionalmente pero referenciado en código global.

2. **storage/null 404**: Salas sin `image_id` generan request fallido a `/storage/null`. Falta validación antes del request.

3. **jQuery validation locale 404**: `/libs/jquery-validation/dist/localization/messages_en.js` → 404. Afecta validaciones de formulario.

4. **CDNs externos caídos**: `polyfill.io` y `image.flaticon.com` no accesibles — íconos del sistema no cargan.

5. **API reservaciones 404**: Endpoints de reservaciones no funcionales para este usuario — posible problema de rol o endpoints no migrados.

6. **Polling excesivo de notificaciones**: `GET /notificationszone/unread` se llama muy frecuentemente (cada pocos segundos) — impacto en performance y servidor.

7. **Vue 2.x (EOL)**: Vue 2 llegó a fin de vida en diciembre 2023. Sin soporte de seguridad oficial.

8. **Sin Vuex**: El estado de la app se gestiona con props/events entre componentes padre-hijo. Puede complicar el mantenimiento en apps grandes.

9. **Scripts duplicados**: `alertifyjs` se carga 3 veces, `axios` 2 veces (local + unpkg CDN), jQuery 2 veces (unpkg + local). Incrementa tiempo de carga.

10. **Sin loading state visible**: No hay spinner o indicador de carga al hacer Reload o Join.

11. **TypeError en reserve/meeting**: `Cannot read properties of undefined (reading '...')` en línea 2263 — componente de reservaciones accede a propiedad undefined.

---

## 8. Recomendaciones para Migración

### 8.1 Componentes a crear (React/Next.js)

| Componente | Descripción |
|------------|-------------|
| `<Navbar>` | Header con logo, nav items, language, notifications, user menu |
| `<RoomCard>` | Card de sala con imagen, título, descripción, fecha, JOIN, menú ⋮ |
| `<RoomGrid>` | Grid responsivo de `<RoomCard>` (masonry → CSS Grid o Masonry lib) |
| `<CreateRoomModal>` | Modal wizard con 5 secciones (accordion o stepper) |
| `<EditRoomModal>` | Reutiliza `<CreateRoomModal>` con datos pre-cargados |
| `<RecordingsPanel>` | Sidebar/Drawer con lista de grabaciones |
| `<HistoryPanel>` | Sidebar/Drawer con lista de sesiones pasadas |
| `<ReservationsCalendar>` | Calendario semanal/diario con soporte de reservaciones |
| `<ReservationForm>` | Formulario lateral de creación de reservación |
| `<RunningBadge>` | Badge de estado "Running" |
| `<SharedBadge>` | Badge "Shared with me" |
| `<UserSearch>` | Búsqueda + selección de usuarios (para Share tab) |

### 8.2 Flujos a mantener (sin cambios)

- Flujo de Join → nuevo tab BBB con sessionToken
- Política de acceso (propietario vs. compartido)
- Reload sin recarga de página
- Formulario de reservaciones

### 8.3 Flujos a mejorar

- **Loading states**: Agregar skeleton loaders a las cards mientras cargan
- **Error states**: Mostrar mensaje claro cuando una sala no tiene imagen
- **Join toast**: Mejorar "Validating information" con spinner y feedback de error si falla
- **Polling**: Reemplazar polling de notificaciones con WebSockets o SSE
- **Formulario Create Room**: Agregar validación en tiempo real, mensajes de error claros
- **History panel**: Agregar duración y número de participantes por sesión
- **Recordings**: Agregar controles de reproducción inline

### 8.4 Funcionalidades faltantes sugeridas

- Búsqueda/filtro de salas en el dashboard
- Estado de sala en la card sin necesidad de hacer Reload manual
- Contador de participantes en tiempo real
- Compartir link de invitación directo desde la card
- Vista de lista (alternativa a grid masonry)

---

## 9. Screenshots de Referencia

| Archivo | Descripción |
|---------|-------------|
| `01-login-page.png` | Página de login inicial |
| `02-live-initial.png` | Dashboard /live después de autenticar (full page) |
| `03-responsive-375px.png` | Vista 375px (mobile) |
| `04-responsive-768px.png` | Vista 768px (tablet) |
| `05-responsive-1280px.png` | Vista 1280px (desktop) |
| `06-navbar-users-dropdown.png` | Dropdown "Users" del navbar |
| `07-navbar-user-dropdown.png` | Dropdown del avatar de usuario |
| `08-navbar-language-dropdown.png` | Dropdown de idioma |
| `09-modal-create-room.png` | Modal Create Room — vista inicial |
| `10-modal-create-information.png` | Tab Information expandido |
| `11-modal-create-record.png` | Tab Record expandido |
| `12-modal-create-security.png` | Tab Security expandido |
| `13-modal-create-share.png` | Tab Share expandido (lista de usuarios) |
| `14-modal-create-customize.png` | Tab Customize expandido (file uploads) |
| `15-card-menu-owner.png` | Menú ⋮ en sala propia (Recordings, History, Edit, Delete) |
| `16-card-menu-shared.png` | Menú ⋮ en sala compartida (solo Recordings, History) |
| `17-modal-recordings-empty.png` | Panel Recordings vacío |
| `18-modal-history.png` | Panel History con lista de sesiones |
| `19-modal-edit-room.png` | Modal Edit Room pre-poblado |
| `20-join-new-tab.png` | Toast "Validating information" al hacer Join |
| `21-bbb-client-join.png` | Cliente BBB HTML5 (sala activa) |
| `22-reload-running-state.png` | Dashboard post-Reload con sala "Running" |
| `23-reservations-all.png` | Reservaciones — tab All |
| `24-reservations-make.png` | Reservaciones — tab Make reservation |
| `25-reservations-mine.png` | Reservaciones — tab My reservations |

---

## Apéndice A: Selectores CSS/XPath de Referencia

```css
/* Navbar */
nav.navbar.navbar-expand-lg.navbar-dark.styleNadvar
nav .navbar-brand img                    /* Logo */
button.navbar-toggler                    /* Hamburger */
.navbar .dropdown-menu                   /* Cualquier dropdown */

/* Toolbar de acciones */
button.btn.btn-success:contains("Create room")
button.btn.btn-info:contains("Reload")
a.btn.btn-danger:contains("Reservations")
button.btn.btn-outline-primary:contains("Back")

/* Cards */
.card-columns                            /* Grid contenedor */
.card.shadow-sm.border-default           /* Card individual */
.card-img-top                            /* Imagen de portada */
.card-title                              /* Nombre de sala (h4) */
.card-body a.btn.btn-success             /* Botón JOIN */
button[id*="BV_toggle_"]                 /* Botón menú ⋮ */

/* Modales */
.modal-dialog                            /* Contenedor modal */
input[placeholder="Name"]               /* Campo nombre sala */
textarea[placeholder="Description"]     /* Campo descripción */
input[type="datetime-local"]            /* Campo fecha/hora */
input[placeholder="Generate password"]  /* Campo contraseña */
input[type="number"]                    /* Max participantes */
input[placeholder="Search for users..."] /* Búsqueda en Share */
button.btn.btn-success:contains("Submit") /* Submit modal */

/* Panels laterales */
.b-sidebar                               /* Panel Recordings/History */
.b-sidebar-header                        /* Header del panel */

/* Reservaciones */
.nav-tabs .nav-link                      /* Tabs reservaciones */
#fc-tab-1                                /* Tab All reservations */
select[id*="room"]                       /* Selector de sala */
input[type="date"]                       /* Campo día */
input[type="time"]                       /* Campos hora inicio/fin */
button:contains("Reserve")              /* Botón reservar */
```

---

## Apéndice B: Schema de API Responses

### GET /api/meetings/{uuid}/info
```json
{
  "isCreated": "boolean — si la sala existe en BBB",
  "isRunning": "boolean — si hay sesión activa",
  "isRecording": "boolean — si está grabando",
  "attendees": [
    {
      "userId": "string",
      "fullName": "string",
      "role": "MODERATOR|VIEWER",
      "isPresenter": "boolean",
      "isListeningOnly": "boolean",
      "hasJoinedVoice": "boolean",
      "hasVideo": "boolean"
    }
  ]
}
```

### POST /api/meetings/{uuid}/join — Response
```
Contiene sessionToken que se usa para construir la URL de BBB:
https://live.myzonego.com/html5client/join?sessionToken={8-char-alphanumeric}
```

### GET /api/meetings/{uuid}/recordings — Response
```json
[
  {
    "recordID": "string",
    "meetingID": "uuid",
    "name": "string",
    "published": "boolean",
    "state": "published|unpublished|processing",
    "startTime": "timestamp-ms",
    "endTime": "timestamp-ms",
    "participants": "number",
    "playback": {
      "format": [
        {
          "type": "presentation|podcast|video",
          "url": "https://...",
          "length": "number"
        }
      ]
    }
  }
]
```

---

## Apéndice C: Mapa de Navegación Completo

```
/login
├── → /register
├── → /password/reset
└── [auth] → /live (redirect automático)

/live (Dashboard BBB)
├── Navbar
│   ├── Logo → /home
│   ├── Users → /users (Directory)
│   ├── Groups → /clubs
│   ├── ? → /Frequently
│   ├── Language → /lang/es | /lang/en
│   ├── Notifications (bell)
│   └── Avatar → Profile: /profile | Log out
├── Toolbar
│   ├── ← Back (browser history)
│   ├── CREATE ROOM → modal
│   ├── RELOAD → refresh API data
│   └── RESERVATIONS → /reserve/meeting
└── Cards (por sala)
    ├── JOIN → POST /api/meetings/{uuid}/join → new tab BBB
    └── ⋮ Menu
        ├── Recordings → panel lateral
        ├── History → panel lateral
        ├── Edit → modal (solo propietario)
        └── Delete (solo propietario)

/reserve/meeting (Reservaciones)
├── ← Back
├── Tab: All reservations → calendario semanal
├── Tab: Make reservation → form + calendario
│   ├── Room: select (todas las salas)
│   ├── Day/Start time/End time
│   ├── Ajustar notificacion (toggle)
│   ├── Is it recurrent? (checkbox)
│   ├── RESERVE
│   └── ADD GUESTS (deshabilitado sin sala)
└── Tab: My reservations → calendario personal

BBB HTML5 Client (live.myzonego.com)
└── /html5client/join?sessionToken={token}
    ├── Modal: Join audio (Microphone | Listen only)
    ├── Whiteboard / Presentación
    ├── Toolbar presentación (slides, anotaciones)
    ├── Start recording (si tiene permisos)
    └── Branding: "MyZoneGo" custom
```
