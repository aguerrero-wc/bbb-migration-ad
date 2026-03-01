# BigBlueButton 3.0 — API Reference para Agentes de Desarrollo

## Metadata
- **Versión BBB:** 3.0
- **Base URL:** `https://{server}/bigbluebutton/api/`
- **Formato de respuesta:** XML (excepto `getRecordingTextTracks` que retorna JSON)
- **Autenticación:** Checksum (SHA-1 / SHA-256 / SHA-384 / SHA-512)
- **Fecha de documentación:** 2026-03-01
- **Fuentes:**
  - https://docs.bigbluebutton.org/development/api/
  - https://docs.bigbluebutton.org/development/webhooks/
  - https://docs.bigbluebutton.org/development/recording/
  - https://docs.bigbluebutton.org/development/architecture/

---

## 1. Modelo de Seguridad

### 1.1 Cómo funciona el checksum

Cada llamada a la API debe incluir un parámetro `checksum` calculado así:

```
checksum = SHA{N}(callName + queryString + sharedSecret)
```

Donde:
- `callName` = nombre del endpoint exacto (e.g., `create`, `join`, `getMeetingInfo`)
- `queryString` = todos los parámetros de la URL en formato `key=value&key=value` **sin** incluir `checksum`
- `sharedSecret` = clave secreta del servidor BBB

**Ejemplo:**
```
callName    = "create"
queryString = "name=My+Meeting&meetingID=meeting-001&record=false"
secret      = "mysecret"

checksum = SHA256("create" + "name=My+Meeting&meetingID=meeting-001&record=false" + "mysecret")
```

Para requests POST:
- El checksum se calcula usando **solo** los parámetros de la query string de la URL (no el body)
- El body XML va aparte y no forma parte del checksum

### 1.2 Algoritmos soportados

| Algoritmo | Recomendado |
|-----------|------------|
| SHA-1 | No (legacy) |
| SHA-256 | Sí (mínimo recomendado) |
| SHA-384 | Sí |
| SHA-512 | Sí (máxima seguridad) |

El algoritmo soportado se configura en el servidor con `supportedChecksumAlgorithms`.

### 1.3 Configuración del shared secret

Ubicación: `/etc/bigbluebutton/bbb-web.properties`

```properties
securitySalt=your-secret-here
supportedChecksumAlgorithms=sha256,sha384,sha512
```

Para obtener el secret actual en el servidor:
```bash
bbb-conf --secret
```

### 1.4 Implementación en JavaScript/Node.js

```javascript
const crypto = require('crypto');

/**
 * Calcula el checksum para una llamada a la API BBB
 * @param {string} callName - Nombre del endpoint (ej: 'create', 'join')
 * @param {string|URLSearchParams} queryParams - Parámetros sin checksum
 * @param {string} secret - Shared secret del servidor
 * @param {string} algorithm - 'sha256' | 'sha384' | 'sha512'
 */
function buildChecksum(callName, queryParams, secret, algorithm = 'sha256') {
  const qs = queryParams instanceof URLSearchParams
    ? queryParams.toString()
    : queryParams;
  const raw = callName + qs + secret;
  return crypto.createHash(algorithm).update(raw).digest('hex');
}

/**
 * Genera la URL completa para una llamada a la API BBB
 */
function buildUrl(baseUrl, callName, params, secret, algorithm = 'sha256') {
  const qs = new URLSearchParams(params).toString();
  const checksum = buildChecksum(callName, qs, secret, algorithm);
  return `${baseUrl}${callName}?${qs}&checksum=${checksum}`;
}

// Uso:
const url = buildUrl(
  'https://bbb.example.com/bigbluebutton/api/',
  'create',
  { name: 'My Meeting', meetingID: 'meeting-001', record: 'false' },
  'my-shared-secret'
);
// → https://bbb.example.com/bigbluebutton/api/create?name=My+Meeting&meetingID=meeting-001&record=false&checksum=abc123...
```

---

## 2. Tipos de Datos

| Tipo | Descripción | Restricciones |
|------|-------------|---------------|
| String | Texto UTF-8 | Sin caracteres de control (0x00–0x1F); URL-encoded al pasar |
| Number | Entero no negativo | Solo dígitos 0–9; sin signo, coma ni punto |
| Boolean | Verdadero/falso | Literal `true` o `false` (minúsculas) |
| Enum | Valor de lista fija | Case-sensitive salvo indicación |

---

## 3. Endpoints de Administración

### 3.1 `create` — Crear Reunión

**Método:** `GET` o `POST`
**URL:** `/bigbluebutton/api/create`
**Idempotente:** Sí — múltiples llamadas con los mismos parámetros retornan SUCCESS sin efectos secundarios.

#### Parámetros

| Parámetro | Requerido | Tipo | Default | Descripción | Desde |
|-----------|-----------|------|---------|-------------|-------|
| `name` | Sí | String | — | Nombre visible de la reunión (2–64 chars) | 0.x |
| `meetingID` | Sí | String | — | ID único (2–256 chars, sin comas) | 0.x |
| `attendeePW` | No | String | Auto-generado | **Deprecated** — usar `role` en join | 0.x |
| `moderatorPW` | No | String | Auto-generado | **Deprecated** — usar `role` en join | 0.x |
| `welcome` | No | String | Configurable | Mensaje de bienvenida (soporta HTML) | 0.x |
| `dialNumber` | No | String | Configurable | Número telefónico de acceso | 0.x |
| `voiceBridge` | No | Number | Auto-generado | PIN de 5 dígitos para la sala de voz | 0.x |
| `maxParticipants` | No | Number | 0 (ilimitado) | Máximo de participantes simultáneos | 0.x |
| `logoutURL` | No | String | Configurable | URL de redirección al salir | 0.x |
| `record` | No | Boolean | false | Habilitar grabación | 0.x |
| `duration` | No | Number | 0 | Duración máxima en minutos (0=ilimitado) | 0.x |
| `isBreakout` | No | Boolean | false | Esta sala es una sala de grupos (breakout) | 1.0 |
| `parentMeetingID` | No* | String | — | Requerido si `isBreakout=true` | 1.0 |
| `sequence` | No* | Number | — | Orden de la sala de grupos (requerido si `isBreakout=true`) | 1.0 |
| `freeJoin` | No | Boolean | false | Permite a VIEWER elegir sala de grupos libremente | 1.0 |
| `meta_*` | No | String | — | Metadata personalizable (ej: `meta_category=math`) | 0.x |
| `moderatorOnlyMessage` | No | String | — | Mensaje visible solo para moderadores | 1.0 |
| `autoStartRecording` | No | Boolean | false | Inicia grabación cuando el primer usuario entra | 1.0 |
| `allowStartStopRecording` | No | Boolean | true | Permite a moderadores iniciar/detener grabación | 1.0 |
| `webcamsOnlyForModerator` | No | Boolean | false | Solo moderadores pueden ver cámaras de participantes | 2.2 |
| `bannerText` | No | String | — | Texto de banner en la reunión | 2.2 |
| `bannerColor` | No | String | — | Color del banner (hex, ej: `#FF0000`) | 2.2 |
| `muteOnStart` | No | Boolean | false | Silenciar a todos al entrar | 2.3 |
| `allowModsToUnmuteUsers` | No | Boolean | false | Permitir a mods desmutear usuarios | 2.3 |
| `lockSettingsDisableCam` | No | Boolean | false | Lock: deshabilitar cámaras para participantes | 2.2 |
| `lockSettingsDisableMic` | No | Boolean | false | Lock: deshabilitar micrófono para participantes | 2.2 |
| `lockSettingsDisablePrivateChat` | No | Boolean | false | Lock: deshabilitar chat privado | 2.2 |
| `lockSettingsDisablePublicChat` | No | Boolean | false | Lock: deshabilitar chat público | 2.2 |
| `lockSettingsDisableNotes` | No | Boolean | false | Lock: deshabilitar notas compartidas | 2.2 |
| `lockSettingsHideUserList` | No | Boolean | false | Lock: ocultar lista de usuarios | 2.2 |
| `lockSettingsLockOnJoin` | No | Boolean | true | Aplicar lock automáticamente al entrar | 2.2 |
| `lockSettingsLockOnJoinConfigurable` | No | Boolean | false | Permitir que lockOnJoin sea configurable | 2.2 |
| `lockSettingsHideViewersCursor` | No | Boolean | false | Lock: ocultar cursores de participantes | 2.4 |
| `guestPolicy` | No | Enum | ALWAYS_ACCEPT | `ALWAYS_ACCEPT`, `ALWAYS_DENY`, `ASK_MODERATOR` | 2.2 |
| `meetingKeepEvents` | No | Boolean | false | Conservar eventos incluso sin grabación | 2.3 |
| `endWhenNoModerator` | No | Boolean | false | Finalizar cuando se van todos los moderadores | 2.3 |
| `endWhenNoModeratorDelayInMinutes` | No | Number | 1 | Minutos de espera antes de finalizar | 2.3 |
| `meetingLayout` | No | Enum | CUSTOM_LAYOUT | Ver tabla de layouts | 2.4 |
| `learningDashboardCleanupDelayInMinutes` | No | Number | 2 | Retardo de limpieza del dashboard | 2.5 |
| `allowModsToEjectCameras` | No | Boolean | false | Permite a mods expulsar cámaras | 2.5 |
| `allowRequestsWithoutSession` | No | Boolean | false | Permite join sin sesión de servidor | 2.5 |
| `userCameraCap` | No | Number | 3 | Máx. cámaras por usuario (0=ilimitado) | 2.5 |
| `meetingCameraCap` | No | Number | 0 | Máx. cámaras totales en reunión (0=ilimitado) | 2.6 |
| `meetingExpireIfNoUserJoinedInMinutes` | No | Number | 5 | Minutos hasta expirar si nadie se une | 2.5 |
| `meetingExpireWhenLastUserLeftInMinutes` | No | Number | 1 | Minutos hasta expirar tras salir el último | 2.5 |
| `groups` | No | JSON | — | Grupos de breakout preconfigurados | 2.5 |
| `disabledFeatures` | No | String | — | Features a deshabilitar (CSV) — ver Apéndice B | 2.5 |
| `disabledFeaturesExclude` | No | String | — | Excluir features de la lista de deshabilitados | 2.6 |
| `preUploadedPresentationOverrideDefault` | No | Boolean | false | Reemplaza presentación por defecto | 2.5 |
| `notifyRecordingIsOn` | No | Boolean | false | Notificar usuarios cuando grabación inicia | 2.6 |
| `presentationUploadExternalUrl` | No | String | — | URL externa para subir presentaciones | 2.6 |
| `presentationUploadExternalDescription` | No | String | — | Descripción del enlace de upload externo | 2.6 |
| `recordFullDurationMedia` | No | Boolean | false | Graba medios full-duration aunque grabación sea toggled | 2.6 |
| `multiUserWhiteboardEnabled` | No | Boolean | false | Acceso multi-usuario a pizarra automáticamente | 3.0 |
| `loginURL` | No | String | — | URL de login de terceros (nuevo en 3.0) | 3.0 |
| `pluginManifests` | No | JSON | — | Array de URLs de manifests de plugins con checksums | 3.0 |
| `allowOverrideClientSettingsOnCreateCall` | No | Boolean | false | Habilitar `clientSettingsOverride` en el body | 3.0 |
| `presentationConversionCacheEnabled` | No | Boolean | Configurable | Usar caché S3 para assets de presentaciones | 3.0 |

#### Parámetros nuevos en 3.0 (tabla consolidada)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `multiUserWhiteboardEnabled` | Boolean | false | Concede acceso a pizarra a todos los usuarios |
| `loginURL` | String | — | URL para login de terceros |
| `pluginManifests` | JSON | — | Plugins BBB: array `[{"url":"...","checksum":"..."}]` |
| `allowOverrideClientSettingsOnCreateCall` | Boolean | false | Habilita `clientSettingsOverride` vía POST body |
| `presentationConversionCacheEnabled` | Boolean | — | Caché S3 para conversión de presentaciones |

#### Parámetros eliminados en 3.0

| Parámetro eliminado | Reemplazo |
|--------------------|-----------|
| `breakoutRoomsEnabled` | Usar `disabledFeatures=breakoutRooms` |
| `learningDashboardEnabled` | Usar `disabledFeatures=learningDashboard` |
| `virtualBackgroundsDisabled` | Usar `disabledFeatures=virtualBackgrounds` |

#### Layouts disponibles (meetingLayout)

| Valor | Descripción | Desde |
|-------|-------------|-------|
| `CUSTOM_LAYOUT` | Layout personalizado por usuario | 2.4 |
| `SMART_LAYOUT` | Layout automático según contenido | 2.4 |
| `PRESENTATION_FOCUS` | Presentación en primer plano | 2.4 |
| `VIDEO_FOCUS` | Video en primer plano | 2.4 |
| `CAMERAS_ONLY` | Solo cámaras | 3.0 |
| `PRESENTATION_ONLY` | Solo presentación | 3.0 |
| `MEDIA_ONLY` | Solo medios | 3.0 |

#### Pre-upload de Presentaciones (POST body XML)

Cuando se usa `POST`, se puede enviar un body XML con presentaciones pre-cargadas:

```xml
<modules>
  <module name="presentation">
    <document url="https://example.com/slides.pdf"
              filename="slides.pdf"
              downloadable="false"
              removable="false"/>
    <document name="inline.pdf">
      BASE64_ENCODED_PDF_CONTENT
    </document>
  </module>
</modules>
```

#### clientSettingsOverride (nuevo en 3.0)

Requiere `allowOverrideClientSettingsOnCreateCall=true` en el servidor. Permite sobreescribir configuración del cliente BBB:

```bash
curl -X POST \
  "https://bbb.example.com/bigbluebutton/api/create?name=Test&meetingID=test-01&checksum=CHECKSUM" \
  -H "Content-Type: application/xml" \
  -d '<modules>
        <module name="clientSettingsOverride">
          <![CDATA[
            {
              "public": {
                "chat": { "enabled": true },
                "kurento": { "cameraProfiles": [] }
              }
            }
          ]]>
        </module>
      </modules>'
```

#### Ejemplo Request

```
GET /bigbluebutton/api/create?name=Sprint+Planning&meetingID=sp-2024-01&record=true&duration=60&guestPolicy=ASK_MODERATOR&meta_category=development&checksum=a3f8c2...
```

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <meetingID>sp-2024-01</meetingID>
  <internalMeetingID>ab4f8b09e-3c22-4c51-9f08-0b7b6ae52</internalMeetingID>
  <parentMeetingID>bbb-none</parentMeetingID>
  <attendeePW>ap01</attendeePW>
  <moderatorPW>mp01</moderatorPW>
  <createTime>1709280000000</createTime>
  <voiceBridge>75009</voiceBridge>
  <dialNumber>613-555-1234</dialNumber>
  <createDate>Mon Mar 01 09:00:00 UTC 2026</createDate>
  <hasUserJoined>false</hasUserJoined>
  <duration>60</duration>
  <hasBeenForciblyEnded>false</hasBeenForciblyEnded>
  <messageKey></messageKey>
  <message></message>
</response>
```

#### Errores posibles

| messageKey | Causa | Solución |
|------------|-------|----------|
| `checksumError` | Checksum inválido | Verificar cálculo del checksum |
| `paramError` | Parámetro inválido | Revisar tipo y valor del parámetro |
| `missingParameter` | Parámetro requerido ausente | Agregar `name` o `meetingID` |
| `maxConcurrentMeetingsLimitReached` | Límite del servidor alcanzado | Esperara o aumentar límite |

#### Notas de Implementación

- `create` es idempotente: llamarlo múltiples veces con el mismo `meetingID` retorna SUCCESS si la reunión ya existe y los parámetros coinciden.
- **Patrón recomendado:** Llamar siempre a `create` antes de `join` para garantizar que la sala existe.
- `meetingExpireIfNoUserJoinedInMinutes` (default: 5 min): La sala expira si nadie se une en ese tiempo.
- Los passwords (`attendeePW`, `moderatorPW`) están deprecated desde 2.4. Usar `role` en `join`.
- El `voiceBridge` debe ser único en el servidor si se especifica manualmente.

---

### 3.2 `join` — Unirse a una Reunión

**Método:** `GET` (único método soportado en 3.0)
**URL:** `/bigbluebutton/api/join`
**Nota 3.0:** Se eliminó soporte para métodos HTTP distintos a GET.

#### Parámetros

| Parámetro | Requerido | Tipo | Default | Descripción | Desde |
|-----------|-----------|------|---------|-------------|-------|
| `fullName` | Sí | String | — | Nombre visible del usuario | 0.x |
| `meetingID` | Sí | String | — | ID de la reunión | 0.x |
| `role` | Sí* | Enum | — | `MODERATOR` o `VIEWER` (reemplaza password) | 2.4 |
| `password` | No* | String | — | **Deprecated** — usar `role` | 0.x |
| `createTime` | No | String | — | Timestamp de creación; evita reutilización de URLs | 2.3 |
| `userID` | No | String | — | Identificador externo del usuario | 0.x |
| `webVoiceConf` | No | String | — | Número de voz para llamada WebRTC | 0.x |
| `configToken` | No | String | — | Token de configuración personalizada | 1.0 |
| `defaultLayout` | No | Enum | — | **Deprecated en 3.0** — usar `userdata-bbb_default_layout` | 2.4 |
| `avatarURL` | No | String | — | URL del avatar del usuario | 1.0 |
| `redirect` | No | Boolean | true | Si false, retorna JSON con URL en vez de redirigir | 2.0 |
| `errorRedirectUrl` | No | String | — | URL de redirección en caso de error | 2.0 |
| `guest` | No | Boolean | false | Marcar como invitado (sujeto a `guestPolicy`) | 2.0 |
| `excludeFromDashboard` | No | Boolean | false | Omitir del Learning Dashboard | 2.4 |
| `enforceLayout` | No | Enum | — | Forzar layout específico para este usuario | 3.0 |
| `bot` | No | Boolean | false | Identificar como agente automatizado | 3.0 |
| `logoutURL` | No | String | — | URL de redirección al hacer logout | 3.0 |
| `firstName` | No | String | — | Nombre (para ordenamiento; no visible en lista) | 3.0 |
| `lastName` | No | String | — | Apellido (para ordenamiento; no visible en lista) | 3.0 |

#### Parámetros `userdata-*`

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `userdata-bbb_default_layout` | Enum | Layout por defecto para esta sesión |
| `userdata-bbb_skip_echotest_if_previous_device` | Boolean | Omitir eco-test si ya usó el dispositivo antes |
| `userdata-bbb_prefer_dark_theme` | Boolean | Aplicar tema oscuro |
| `userdata-bbb_custom_style` | String | CSS personalizado para el cliente |
| `userdata-bbb_custom_style_url` | String | URL de CSS personalizado |
| `userdata-bbb_auto_share_webcam` | Boolean | Auto-compartir cámara al entrar |
| `userdata-bbb_skip_check_audio` | Boolean | Omitir verificación de audio |
| `userdata-bbb_skip_check_audio_on_first_join` | Boolean | Omitir verificación de audio solo en primer join |
| `userdata-bbb_listen_only_mode` | Boolean | Entrar en modo solo escucha |
| `userdata-bbb_force_restore_presentation_on_new_events` | Boolean | Restaurar presentación ante nuevos eventos |
| `userdata-bbb_hide_presentation_on_join` | Boolean | Ocultar presentación al entrar |
| `userdata-bbb_record_video` | Boolean | Grabar video del usuario |
| `userdata-bbb_enable_video` | Boolean | Habilitar video al entrar |
| `userdata-bbb_mirror_own_webcam` | Boolean | Espejo de la propia cámara |
| `userdata-bbb_show_participants_on_login` | Boolean | Mostrar lista de participantes al entrar |
| `userdata-bbb_hide_actions_bar` | Boolean | Ocultar barra de acciones |
| `userdata-bbb_override_default_locale` | String | Forzar idioma (ej: `es`, `en`, `fr`) |

#### Ejemplo Request

```
GET /bigbluebutton/api/join?meetingID=sp-2024-01&fullName=Juan+Perez&role=MODERATOR&userID=user-001&createTime=1709280000000&checksum=b7c3d1...
```

#### Ejemplo Response (redirección)

BBB redirige directamente al cliente HTML5. Cuando `redirect=false`:

```json
{
  "response": {
    "returncode": "SUCCESS",
    "messageKey": "",
    "message": "",
    "meeting_id": "sp-2024-01",
    "user_id": "user-001",
    "auth_token": "tok_abc123",
    "session_token": "ses_xyz789",
    "guestStatus": "ALLOW",
    "url": "https://bbb.example.com/html5client/join?sessionToken=ses_xyz789"
  }
}
```

#### Errores posibles

| messageKey | Causa | Solución |
|------------|-------|----------|
| `checksumError` | Checksum inválido | Verificar cálculo |
| `invalidMeetingIdentifier` | Meeting no existe | Llamar `create` primero |
| `maxParticipantsReached` | Sala llena | Esperar o aumentar `maxParticipants` |
| `guestDeny` | Invitado rechazado | Verificar `guestPolicy` |

#### Notas de Implementación

- Usar `createTime` en el `join` para evitar que URLs grabadas puedan reutilizarse.
- `role=MODERATOR` sobrepasa el `guestPolicy`. Los moderadores siempre pueden unirse.
- Para bots/integraciones, usar `bot=true` + `excludeFromDashboard=true`.
- `redirect=false` es útil para integraciones SPA que quieren manejar la navegación manualmente.

---

### 3.3 `end` — Finalizar una Reunión

**Método:** `GET` o `POST`
**URL:** `/bigbluebutton/api/end`

#### Parámetros

| Parámetro | Requerido | Tipo | Default | Descripción |
|-----------|-----------|------|---------|-------------|
| `meetingID` | Sí | String | — | ID de la reunión a finalizar |
| `password` | No | String | — | **Deprecated** — moderator password; ya no necesario |

#### Ejemplo Request

```
GET /bigbluebutton/api/end?meetingID=sp-2024-01&checksum=c9d4e2...
```

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <messageKey>sentEndMeetingRequest</messageKey>
  <message>A request to end the meeting was sent. Please wait a few seconds and then use the getMeetingInfo or isMeetingRunning API calls to verify that it was ended.</message>
</response>
```

#### Errores posibles

| messageKey | Causa |
|------------|-------|
| `checksumError` | Checksum inválido |
| `invalidMeetingIdentifier` | Meeting no existe |
| `notFound` | Meeting ya finalizado |

#### Notas de Implementación

- La finalización no es inmediata. El servidor procesa la solicitud de forma asíncrona.
- Verificar el estado con `isMeetingRunning` o `getMeetingInfo` después de llamar `end`.
- Si no hay grabación, la sala se elimina inmediatamente de la memoria.

---

### 3.4 `insertDocument` — Insertar Documento en Sesión Activa

**Método:** `POST`
**URL:** `/bigbluebutton/api/insertDocument`
**Desde:** BBB 2.5

#### Parámetros URL

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `meetingID` | Sí | String | ID de la reunión activa |

#### Body XML

```xml
<modules>
  <module name="presentation">
    <!-- Por URL -->
    <document url="https://example.com/slides.pdf"
              filename="slides.pdf"
              downloadable="true"
              removable="false"
              current="true"/>

    <!-- Por base64 -->
    <document name="report.pdf"
              downloadable="false">
      BASE64_ENCODED_CONTENT_HERE
    </document>
  </module>
</modules>
```

#### Atributos del elemento `<document>`

| Atributo | Requerido | Default | Descripción |
|----------|-----------|---------|-------------|
| `url` | Sí* | — | URL del documento (*uno de `url` o `name`+body) |
| `name` | Sí* | — | Nombre del archivo cuando se sube base64 |
| `filename` | No | Del URL | Nombre a mostrar en BBB |
| `downloadable` | No | false | Permitir descarga |
| `removable` | No | true | Permitir que el presentador elimine |
| `current` | No | false | Presentar este documento inmediatamente |

#### Ejemplo Request

```bash
curl -X POST \
  "https://bbb.example.com/bigbluebutton/api/insertDocument?meetingID=sp-2024-01&checksum=CHECKSUM" \
  -H "Content-Type: application/xml" \
  -d '<modules><module name="presentation"><document url="https://example.com/slides.pdf" filename="slides.pdf" downloadable="true"/></module></modules>'
```

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
</response>
```

---

### 3.5 `sendChatMessage` — Enviar Mensaje al Chat Público *(nuevo en 3.0)*

**Método:** `GET` o `POST`
**URL:** `/bigbluebutton/api/sendChatMessage`
**Desde:** BBB 3.0

#### Parámetros

| Parámetro | Requerido | Tipo | Default | Descripción |
|-----------|-----------|------|---------|-------------|
| `meetingID` | Sí | String | — | ID de la reunión activa |
| `message` | Sí | String | — | Mensaje a enviar (1–500 caracteres) |
| `userName` | No | String | "System" | Nombre del remitente (≤255 chars) |

**Restricciones del mensaje:**
- Longitud: 1–500 caracteres
- Sin HTML ni Markdown (se muestra como texto plano)
- Caracteres especiales son escapados automáticamente

#### Ejemplo Request

```
GET /bigbluebutton/api/sendChatMessage?meetingID=sp-2024-01&message=La+reunion+inicia+en+5+minutos&userName=Sistema&checksum=e1f5g3...
```

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
</response>
```

#### Errores posibles

| messageKey | Causa |
|------------|-------|
| `checksumError` | Checksum inválido |
| `invalidMeetingIdentifier` | Meeting no existe o no está activa |
| `paramError` | `message` fuera de rango (0 o >500 chars) |

#### Notas de Implementación

- Útil para notificaciones automáticas del sistema durante una sesión activa.
- La reunión debe estar **running** (`isMeetingRunning=true`) para aceptar mensajes.
- El mensaje aparece como enviado por el nombre en `userName` con ícono de sistema.

---

### 3.6 `getJoinUrl` — Obtener URL de Join *(nuevo en 3.0)*

**Método:** `GET`
**URL:** `/bigbluebutton/api/getJoinUrl`
**Desde:** BBB 3.0

Genera un nuevo token de sesión para un usuario ya autenticado, útil para reemplazar sesiones expiradas.

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `sessionToken` | Sí | String | Token de sesión actual del usuario |
| `replaceSession` | No | Boolean | Si true, invalida el token anterior |
| `sessionName` | No | String | Nombre de la nueva sesión |
| `enforceLayout` | No | Enum | Forzar layout específico |

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <url>https://bbb.example.com/html5client/join?sessionToken=new_token_xyz</url>
</response>
```

---

### 3.7 `feedback` — Enviar Feedback *(nuevo en 3.0)*

**Método:** `POST`
**URL:** `/bigbluebutton/api/feedback`
**Desde:** BBB 3.0 (reemplaza `/html5client/feedback`)

Permite a los clientes enviar valoraciones de la sesión al servidor BBB.

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `meetingID` | Sí | String | ID de la reunión |
| `userID` | Sí | String | ID del usuario que da feedback |
| `rating` | Sí | Number | Valoración (1–5) |
| `comment` | No | String | Comentario libre |

---

## 4. Endpoints de Monitoreo

### 4.1 `isMeetingRunning` — Verificar Estado de Reunión

**Método:** `GET` o `POST`
**URL:** `/bigbluebutton/api/isMeetingRunning`

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `meetingID` | Sí | String | ID de la reunión |

#### Ejemplo Request

```
GET /bigbluebutton/api/isMeetingRunning?meetingID=sp-2024-01&checksum=abc...
```

#### Ejemplo Response XML

```xml
<!-- Reunión activa -->
<response>
  <returncode>SUCCESS</returncode>
  <running>true</running>
</response>

<!-- Reunión inactiva o inexistente -->
<response>
  <returncode>SUCCESS</returncode>
  <running>false</running>
</response>
```

#### Notas de Implementación

- Retorna SUCCESS aunque el meeting no exista; `<running>false</running>` en ese caso.
- Ideal para polling ligero. Usar `getMeetingInfo` si se necesitan detalles completos.

---

### 4.2 `getMeetings` — Listar Todas las Reuniones

**Método:** `GET`
**URL:** `/bigbluebutton/api/getMeetings`

#### Parámetros

Ninguno requerido (solo checksum).

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <meetings>
    <meeting>
      <meetingName>Sprint Planning</meetingName>
      <meetingID>sp-2024-01</meetingID>
      <internalMeetingID>ab4f8b09e-3c22-4c51-9f08-0b7b6ae52</internalMeetingID>
      <createTime>1709280000000</createTime>
      <createDate>Mon Mar 01 09:00:00 UTC 2026</createDate>
      <voiceBridge>75009</voiceBridge>
      <dialNumber>613-555-1234</dialNumber>
      <attendeePW>ap01</attendeePW>
      <moderatorPW>mp01</moderatorPW>
      <running>true</running>
      <duration>60</duration>
      <hasUserJoined>true</hasUserJoined>
      <recording>true</recording>
      <hasBeenForciblyEnded>false</hasBeenForciblyEnded>
      <startTime>1709280120000</startTime>
      <endTime>0</endTime>
      <participantCount>5</participantCount>
      <listenerCount>1</listenerCount>
      <voiceParticipantCount>4</voiceParticipantCount>
      <videoCount>3</videoCount>
      <maxUsers>0</maxUsers>
      <moderatorCount>2</moderatorCount>
      <attendees>
        <!-- Ver estructura en getMeetingInfo -->
      </attendees>
      <metadata/>
      <isBreakout>false</isBreakout>
    </meeting>
  </meetings>
</response>

<!-- Si no hay reuniones -->
<response>
  <returncode>SUCCESS</returncode>
  <messageKey>noMeetings</messageKey>
  <message>no meetings were found on this server</message>
  <meetings/>
</response>
```

---

### 4.3 `getMeetingInfo` — Información Completa de una Reunión

**Método:** `GET` o `POST`
**URL:** `/bigbluebutton/api/getMeetingInfo`

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `meetingID` | Sí | String | ID de la reunión |

#### Ejemplo Request

```
GET /bigbluebutton/api/getMeetingInfo?meetingID=sp-2024-01&checksum=def...
```

#### Ejemplo Response XML (completo)

```xml
<response>
  <returncode>SUCCESS</returncode>
  <meetingName>Sprint Planning</meetingName>
  <meetingID>sp-2024-01</meetingID>
  <internalMeetingID>ab4f8b09e-3c22-4c51-9f08-0b7b6ae52</internalMeetingID>
  <createTime>1709280000000</createTime>
  <createDate>Mon Mar 01 09:00:00 UTC 2026</createDate>
  <voiceBridge>75009</voiceBridge>
  <dialNumber>613-555-1234</dialNumber>
  <attendeePW>ap01</attendeePW>
  <moderatorPW>mp01</moderatorPW>
  <running>true</running>
  <duration>60</duration>
  <hasUserJoined>true</hasUserJoined>
  <recording>true</recording>
  <hasBeenForciblyEnded>false</hasBeenForciblyEnded>
  <startTime>1709280120000</startTime>
  <endTime>0</endTime>
  <participantCount>5</participantCount>
  <listenerCount>1</listenerCount>
  <voiceParticipantCount>4</voiceParticipantCount>
  <videoCount>3</videoCount>
  <maxUsers>0</maxUsers>
  <moderatorCount>2</moderatorCount>
  <attendees>
    <attendee>
      <userID>ext-user-001</userID>
      <fullName>Juan Perez</fullName>
      <role>MODERATOR</role>
      <isPresenter>true</isPresenter>
      <isListeningOnly>false</isListeningOnly>
      <hasJoinedVoice>true</hasJoinedVoice>
      <hasVideo>true</hasVideo>
      <clientType>HTML5</clientType>
      <customdata/>
    </attendee>
    <attendee>
      <userID>ext-user-002</userID>
      <fullName>Maria Lopez</fullName>
      <role>VIEWER</role>
      <isPresenter>false</isPresenter>
      <isListeningOnly>true</isListeningOnly>
      <hasJoinedVoice>false</hasJoinedVoice>
      <hasVideo>false</hasVideo>
      <clientType>HTML5</clientType>
      <customdata/>
    </attendee>
  </attendees>
  <metadata>
    <bbb-origin>MyApp</bbb-origin>
    <bbb-origin-version>1.0.0</bbb-origin-version>
    <category>development</category>
  </metadata>
  <isBreakout>false</isBreakout>
</response>
```

#### Para sala de breakout (contiene datos adicionales)

```xml
<response>
  <!-- ...campos normales... -->
  <isBreakout>true</isBreakout>
  <breakout>
    <parentMeetingID>parent-meeting-001</parentMeetingID>
    <sequence>1</sequence>
    <freeJoin>false</freeJoin>
  </breakout>
</response>
```

#### Para sala con breakout rooms activos

```xml
<breakoutRooms>
  <breakout>breakout-room-id-1</breakout>
  <breakout>breakout-room-id-2</breakout>
</breakoutRooms>
```

#### Errores posibles

| messageKey | Causa |
|------------|-------|
| `notFound` | Meeting no existe |
| `checksumError` | Checksum inválido |

#### Notas de Implementación

- `getMeetingInfo` falla con `notFound` si la reunión no existe (a diferencia de `isMeetingRunning`).
- Un proceso en background limpia reuniones de memoria tras `meetingExpireWhenLastUserLeftInMinutes` minutos sin participantes.
- Usar para polling de estado detallado (attendees, recordings, etc.).

---

## 5. Endpoints de Grabaciones

### 5.1 `getRecordings` — Listar Grabaciones

**Método:** `GET`
**URL:** `/bigbluebutton/api/getRecordings`

#### Parámetros

| Parámetro | Requerido | Tipo | Default | Descripción | Desde |
|-----------|-----------|------|---------|-------------|-------|
| `meetingID` | No | String | — | Filtrar por meeting ID (CSV para múltiples) | 0.x |
| `recordID` | No | String | — | Filtrar por record ID (CSV, soporta wildcard) | 0.x |
| `state` | No | String | published | Estados a incluir (CSV): `processing`, `processed`, `published`, `unpublished`, `deleted` | 2.3 |
| `meta` | No | String | — | Filtrar por metadata: `meta_presenter=John` | 2.0 |
| `offset` | No | Number | 0 | Paginación: registros a saltar (≥0) | 2.6 |
| `limit` | No | Number | — | Paginación: máx. registros a retornar (1–100) | 2.6 |

**Wildcard en recordID:** `recordID=abc*` retorna todos los recordings que empiezan con "abc".

#### Ejemplo Request

```
GET /bigbluebutton/api/getRecordings?meetingID=sp-2024-01&state=published,unpublished&limit=10&offset=0&checksum=ghi...
```

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <recordings>
    <recording>
      <recordID>abc123-presentation</recordID>
      <meetingID>sp-2024-01</meetingID>
      <internalMeetingID>ab4f8b09e-3c22-4c51-9f08-0b7b6ae52</internalMeetingID>
      <name>Sprint Planning</name>
      <isBreakout>false</isBreakout>
      <published>true</published>
      <state>published</state>
      <startTime>1709280120000</startTime>
      <endTime>1709283720000</endTime>
      <participants>5</participants>
      <metadata>
        <gl-listed>false</gl-listed>
        <bbb-origin>MyApp</bbb-origin>
      </metadata>
      <playback>
        <format>
          <type>presentation</type>
          <url>https://bbb.example.com/playback/presentation/2.3/abc123-presentation</url>
          <processingTime>120</processingTime>
          <length>60</length>
          <size>52428800</size>
          <preview>
            <images>
              <image width="176" height="136" alt="Slide 1">
                https://bbb.example.com/presentation/abc123/slide-1.png
              </image>
            </images>
          </preview>
        </format>
      </playback>
    </recording>
  </recordings>
  <pagination>
    <totalElements>42</totalElements>
    <returnedElements>10</returnedElements>
    <offset>0</offset>
    <limit>10</limit>
  </pagination>
</response>
```

**Nota:** `totalElements` disponible desde BBB 2.7+.

---

### 5.2 `publishRecordings` — Publicar/Despublicar Grabaciones

**Método:** `GET`
**URL:** `/bigbluebutton/api/publishRecordings`

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `recordID` | Sí | String | ID(s) de grabación (CSV para múltiples) |
| `publish` | Sí | Boolean | `true` para publicar, `false` para despublicar |

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <published>true</published>
</response>
```

---

### 5.3 `deleteRecordings` — Eliminar Grabaciones

**Método:** `GET`
**URL:** `/bigbluebutton/api/deleteRecordings`

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `recordID` | Sí | String | ID(s) de grabación a eliminar (CSV) |

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <deleted>true</deleted>
</response>
```

#### Notas de Implementación

- La eliminación es **irreversible**. El estado cambia a `deleted` y los archivos se borran del disco.
- Soporta CSV: `recordID=id1,id2,id3`.

---

### 5.4 `updateRecordings` — Actualizar Metadata de Grabaciones

**Método:** `GET` o `POST`
**URL:** `/bigbluebutton/api/updateRecordings`

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `recordID` | Sí | String | ID de la grabación |
| `meta_*` | No | String | Metadata a actualizar/agregar |

#### Ejemplo Request

```
GET /bigbluebutton/api/updateRecordings?recordID=abc123&meta_presenter=Maria+Lopez&meta_topic=Sprint+Review&checksum=jkl...
```

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <updated>true</updated>
</response>
```

---

### 5.5 `getRecordingTextTracks` — Obtener Pistas de Texto/Subtítulos

**Método:** `GET`
**URL:** `/bigbluebutton/api/getRecordingTextTracks`
**Formato de respuesta:** JSON (excepción a la regla XML)
**Desde:** BBB 2.2

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `recordID` | Sí | String | ID de una sola grabación (no CSV) |

#### Ejemplo Response JSON

```json
{
  "response": {
    "returncode": "SUCCESS",
    "tracks": [
      {
        "href": "https://bbb.example.com/presentation/abc123/captions/captions_es.vtt",
        "kind": "captions",
        "label": "Español",
        "lang": "es",
        "source": "upload"
      }
    ]
  }
}
```

**Valores de `kind`:** `subtitles`, `captions`, `descriptions`, `chapters`, `metadata`
**Valores de `source`:** `upload`, `automated`, `bbb` (auto-generado)

---

### 5.6 `putRecordingTextTrack` — Subir Pista de Texto/Subtítulos

**Método:** `POST`
**URL:** `/bigbluebutton/api/putRecordingTextTrack`
**Content-Type:** `multipart/form-data`
**Desde:** BBB 2.2

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `recordID` | Sí | String | ID de la grabación |
| `kind` | Sí | Enum | Tipo de pista: `subtitles`, `captions`, etc. |
| `lang` | Sí | String | Código de idioma BCP-47 (ej: `es`, `en`, `pt-BR`) |
| `label` | Sí | String | Etiqueta visible (ej: "Español", "English") |
| `file` | Sí | File | Archivo de subtítulos (SRT, SSA, ASS, WebVTT) |

#### Ejemplo Request

```bash
curl -X POST \
  "https://bbb.example.com/bigbluebutton/api/putRecordingTextTrack?recordID=abc123&kind=captions&lang=es&label=Español&checksum=CHECKSUM" \
  -F "file=@captions_es.vtt"
```

#### Ejemplo Response JSON

```json
{
  "response": {
    "returncode": "SUCCESS",
    "kind": "captions",
    "lang": "es",
    "label": "Español"
  }
}
```

---

## 6. Webhooks

### 6.1 `hooks/create` — Registrar Webhook

**URL:** `/bigbluebutton/api/hooks/create`

#### Parámetros

| Parámetro | Requerido | Tipo | Default | Descripción |
|-----------|-----------|------|---------|-------------|
| `callbackURL` | Sí | String | — | URL destino para los callbacks (POST) |
| `meetingID` | No | String | — | Limitar a una reunión específica |
| `eventID` | No | String | — | Filtrar por tipo(s) de evento (CSV) |
| `getRaw` | No | Boolean | false | Si true, retorna mensajes Redis crudos |

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <hookID>12345678-1234-5678-1234-567812345678</hookID>
  <permanentHook>false</permanentHook>
  <rawData>false</rawData>
</response>
```

---

### 6.2 `hooks/destroy` — Eliminar Webhook

**URL:** `/bigbluebutton/api/hooks/destroy`

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `hookID` | Sí | String | ID del hook a eliminar |

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <removed>true</removed>
</response>
```

---

### 6.3 `hooks/list` — Listar Webhooks

**URL:** `/bigbluebutton/api/hooks/list`

#### Parámetros

| Parámetro | Requerido | Tipo | Descripción |
|-----------|-----------|------|-------------|
| `meetingID` | No | String | Filtrar hooks de una reunión específica |

#### Ejemplo Response XML

```xml
<response>
  <returncode>SUCCESS</returncode>
  <hooks>
    <hook>
      <hookID>12345678-1234-5678-1234-567812345678</hookID>
      <callbackURL>https://myapp.example.com/bbb/webhook</callbackURL>
      <meetingID>sp-2024-01</meetingID>
      <permanentHook>false</permanentHook>
      <rawData>false</rawData>
    </hook>
  </hooks>
</response>
```

---

### 6.4 Eventos Disponibles (lista completa)

Los eventos son enviados via HTTP POST a la `callbackURL` registrada.

#### Eventos de Reunión

| Event ID | Descripción |
|----------|-------------|
| `meeting-created` | Reunión creada |
| `meeting-ended` | Reunión finalizada |
| `meeting-recording-started` | Grabación iniciada |
| `meeting-recording-stopped` | Grabación detenida |
| `meeting-recording-unhandled` | Error en grabación |
| `meeting-screenshare-started` | Compartir pantalla iniciado |
| `meeting-screenshare-stopped` | Compartir pantalla detenido |
| `meeting-presentation-changed` | Presentación cambiada |

#### Eventos de Usuario

| Event ID | Descripción |
|----------|-------------|
| `user-joined` | Usuario se unió |
| `user-left` | Usuario abandonó |
| `user-audio-voice-enabled` | Usuario activó micrófono |
| `user-audio-voice-disabled` | Usuario desactivó micrófono |
| `user-audio-muted` | Usuario fue silenciado |
| `user-audio-unmuted` | Usuario fue dessilenciado |
| `user-audio-unhandled` | Error de audio |
| `user-cam-broadcast-start` | Usuario inició cámara |
| `user-cam-broadcast-end` | Usuario detuvo cámara |
| `user-presenter-assigned` | Usuario asignado como presentador |
| `user-presenter-unassigned` | Usuario quitado de presentador |
| `user-emoji-changed` | Emoji/reacción del usuario cambiado |
| `user-raise-hand-changed` | Estado de levantar mano cambiado |

#### Eventos de Chat

| Event ID | Descripción |
|----------|-------------|
| `chat-group-message-sent` | Mensaje enviado al chat público |

#### Eventos de Encuestas

| Event ID | Descripción |
|----------|-------------|
| `poll-started` | Encuesta iniciada |
| `poll-responded` | Usuario respondió encuesta |

#### Eventos de Pad (Notas Compartidas)

| Event ID | Descripción |
|----------|-------------|
| `pad-content` | Contenido de notas compartidas actualizado |

#### Eventos RAP (Recording and Processing)

| Event ID | Descripción |
|----------|-------------|
| `rap-archive-started` | Inicio de archivado |
| `rap-archive-ended` | Fin de archivado |
| `rap-sanity-started` | Inicio de validación |
| `rap-sanity-ended` | Fin de validación |
| `rap-post-archive-started` | Inicio de post-archivado |
| `rap-post-archive-ended` | Fin de post-archivado |
| `rap-process-started` | Inicio de procesamiento |
| `rap-process-ended` | Fin de procesamiento |
| `rap-post-process-started` | Inicio de post-procesamiento |
| `rap-post-process-ended` | Fin de post-procesamiento |
| `rap-publish-started` | Inicio de publicación |
| `rap-publish-ended` | Fin de publicación |
| `rap-post-publish-started` | Inicio de post-publicación |
| `rap-post-publish-ended` | Fin de post-publicación |
| `rap-published` | Grabación publicada exitosamente |
| `rap-unpublished` | Grabación despublicada |
| `rap-deleted` | Grabación eliminada |

---

### 6.5 Estructura del Payload de Callback

Los callbacks llegan como HTTP POST con `Content-Type: application/x-www-form-urlencoded`.

#### Ejemplo: `meeting-ended`

```json
{
  "data": {
    "type": "event",
    "id": "meeting-ended",
    "attributes": {
      "meeting": {
        "internal-meeting-id": "ab4f8b09e-3c22-4c51-9f08-0b7b6ae52",
        "external-meeting-id": "sp-2024-01"
      }
    },
    "event": {
      "ts": 1709283720000
    }
  }
}
```

#### Ejemplo: `user-joined`

```json
{
  "data": {
    "type": "event",
    "id": "user-joined",
    "attributes": {
      "meeting": {
        "internal-meeting-id": "ab4f8b09e-3c22-4c51-9f08-0b7b6ae52",
        "external-meeting-id": "sp-2024-01"
      },
      "user": {
        "internal-user-id": "int-user-001",
        "external-user-id": "ext-user-001",
        "name": "Juan Perez",
        "role": "MODERATOR",
        "presenter": false,
        "stream": null
      }
    },
    "event": {
      "ts": 1709280120000
    }
  }
}
```

---

### 6.6 Validación del Checksum del Callback

Para verificar que el callback proviene de BBB:

```
checksum = sha{N}(callbackURL + dataBody + sharedSecret)
```

```javascript
function validateWebhook(callbackURL, body, receivedChecksum, secret, algorithm = 'sha256') {
  const expected = crypto
    .createHash(algorithm)
    .update(callbackURL + body + secret)
    .digest('hex');
  return expected === receivedChecksum;
}
```

---

### 6.7 Consideraciones de Implementación

- Los hooks **persisten en Redis** hasta ser eliminados explícitamente — sobreviven reinicios.
- Callbacks fallidos se reintentan ~12 veces en ~5 minutos, luego el hook es **eliminado automáticamente**.
- Solo respuestas HTTP 2xx son aceptadas como éxito. Los redirects generan ciclos de reintento.
- Hooks globales (sin `meetingID`) reciben todos los eventos de todas las reuniones.
- Hooks por reunión reciben solo eventos de esa reunión específica.
- **Recomendación:** Re-registrar hooks periódicamente para garantizar su existencia.
- Los timestamps siempre son crecientes, pero el orden de entrega sigue la secuencia Redis pubsub.

---

## 7. Grabaciones — Arquitectura y Procesamiento

### 7.1 Pipeline de Grabación (6 fases)

```
Capture → Archive → Sanity → Process → Publish → Playback
```

| Fase | Descripción |
|------|-------------|
| **Capture** | Componentes emiten eventos al event bus; streams de media se almacenan |
| **Archive** | Media capturada y eventos se mueven al directorio raw |
| **Sanity** | Valida que los archivos archivados estén completos y sean válidos |
| **Process** | Procesa archivos según el workflow (ej: presentación, video) |
| **Publish** | Genera metadata y expone archivos públicamente |
| **Playback** | Renderiza archivos publicados en el browser |

### 7.2 Formatos de Grabación

| Formato | Descripción | Habilitado por defecto |
|---------|-------------|----------------------|
| `presentation` | Grabación sincronizada: slides + audio + video | Sí |
| `video` | Un único archivo de video unificado | No |
| `screenshare` | Solo captura de pantalla compartida | No |

### 7.3 Estructura de Archivos en el Servidor

```
# Audio (FreeSWITCH)
/var/freeswitch/meetings/

# Webcam y screenshare
/var/lib/bbb-webrtc-recorder/recordings/{meetingID}/
/var/lib/bbb-webrtc-recorder/screenshare/{meetingID}/

# Slides
/var/bigbluebutton/{meetingID}/

# Pipeline de procesamiento
/var/bigbluebutton/recording/raw/{internal-meeting-id}/
/var/bigbluebutton/recording/process/presentation/{internal-meeting-id}/
/var/bigbluebutton/recording/publish/presentation/{internal-meeting-id}/

# Grabaciones publicadas (accesibles públicamente)
/var/bigbluebutton/published/presentation/{internal-meeting-id}/
```

### 7.4 Raw Recording Data (datos capturados)

El pipeline captura:
- Audio (`.wav` via FreeSWITCH)
- Webcam (`.flv` via bbb-webrtc-recorder)
- Screenshare (`.flv` via bbb-webrtc-recorder)
- Slides (PDF/imágenes)
- Anotaciones de pizarra
- Mensajes de chat
- Movimientos del cursor
- Resultados de encuestas
- Subtítulos/captions
- Notas compartidas (Etherpad)
- Eventos (almacenados en Redis, compilados en `events.xml`)

### 7.5 Callback de Grabación Lista (`meta_bbb-recording-ready-url`)

Al crear una reunión con `record=true`, se puede especificar:

```
meta_bbb-recording-ready-url=https://myapp.example.com/recording-ready
```

BBB enviará un HTTP POST con JWT cuando la grabación esté lista:

```
Authorization: Bearer {JWT_TOKEN}

JWT payload:
{
  "meeting_id": "sp-2024-01",
  "record_id": "abc123-presentation"
}
```

El JWT está firmado con HS256 usando el shared secret del servidor.

### 7.6 Post-scripts de Procesamiento

Scripts ejecutables al finalizar cada fase del pipeline:

```bash
# Scripts de post-proceso (ejecutados en orden alfabético)
/usr/local/bigbluebutton/core/scripts/post_archive/
/usr/local/bigbluebutton/core/scripts/post_process/
/usr/local/bigbluebutton/core/scripts/post_publish/
```

Los scripts reciben `-m {meetingID} -f {formatName}` como argumentos.

---

## 8. Callbacks de Sesión

### 8.1 End Meeting Callback (`meta_endCallbackUrl`)

HTTP GET enviado cuando la reunión finaliza:

```
GET {meta_endCallbackUrl}?recordingmarks=true|false
```

- `recordingmarks=true`: la reunión tiene marcas de grabación
- `recordingmarks=false`: no tiene marcas

### 8.2 Analytics Callback (`meta_analytics-callback-url`)

HTTP POST con JSON al finalizar la reunión:

```json
{
  "metadata": {
    "meeting-id": "sp-2024-01",
    "meeting-name": "Sprint Planning"
  },
  "attendees": [
    {
      "ext-user-id": "user-001",
      "name": "Juan Perez",
      "join-time": 1709280120000,
      "leave-time": 1709283720000,
      "talks": [{ "startedOn": 1709280200000, "stoppedOn": 1709280350000 }],
      "emojis": [],
      "webcam-shares": []
    }
  ],
  "files": [],
  "polls": []
}
```

---

## 9. Cambios Relevantes en BBB 3.0

### 9.1 Parámetros Añadidos en 3.0

| Parámetro | Endpoint | Tipo | Descripción |
|-----------|----------|------|-------------|
| `multiUserWhiteboardEnabled` | create | Boolean | Pizarra multi-usuario |
| `loginURL` | create | String | URL de login de terceros |
| `pluginManifests` | create | JSON | Plugins BBB |
| `allowOverrideClientSettingsOnCreateCall` | create | Boolean | Habilitar override de settings |
| `presentationConversionCacheEnabled` | create | Boolean | Caché S3 para presentaciones |
| `bot` | join | Boolean | Identificar como bot |
| `enforceLayout` | join | Enum | Forzar layout por usuario |
| `logoutURL` | join | String | URL de logout por usuario |
| `firstName`, `lastName` | join | String | Ordenamiento de usuarios |
| `sessionToken`, `replaceSession`, `sessionName` | getJoinUrl | String/Boolean | Gestión de sesiones |

### 9.2 Parámetros Removidos en 3.0

| Parámetro removido | Endpoint | Reemplazo |
|--------------------|----------|-----------|
| `breakoutRoomsEnabled` | create | `disabledFeatures=breakoutRooms` |
| `learningDashboardEnabled` | create | `disabledFeatures=learningDashboard` |
| `virtualBackgroundsDisabled` | create | `disabledFeatures=virtualBackgrounds` |
| `defaultLayout` | join | `userdata-bbb_default_layout` |

### 9.3 Endpoints Nuevos en 3.0

| Endpoint | Descripción |
|----------|-------------|
| `sendChatMessage` | Enviar mensaje al chat público |
| `getJoinUrl` | Generar nueva URL de join para sesión existente |
| `feedback` | Enviar feedback de sesión |

### 9.4 Endpoints Removidos en 3.0

| Endpoint removido | Reemplazo |
|-------------------|-----------|
| `/enter` | Uso interno eliminado |
| `/html5client/check` | Eliminado (health check) |
| `/html5client/feedback` | `/api/feedback` |

### 9.5 Cambios de Comportamiento en 3.0

| Cambio | Descripción |
|--------|-------------|
| `join` solo acepta GET | Se eliminó soporte para POST y otros métodos en join |
| Nuevos layouts | `CAMERAS_ONLY`, `PRESENTATION_ONLY`, `MEDIA_ONLY` disponibles |
| Plugins BBB | Sistema de plugins extensible vía `pluginManifests` |
| Chat API | `sendChatMessage` disponible para integración de sistemas |
| `multiUserWhiteboardEnabled` | Pizarra colaborativa sin necesidad de asignación manual |

---

## 10. Manejo de Errores

### 10.1 Estructura de Error Response

```xml
<response>
  <returncode>FAILED</returncode>
  <messageKey>invalidMeetingIdentifier</messageKey>
  <message>No conference with that meeting ID exists</message>
</response>
```

### 10.2 Códigos de Error Comunes

| messageKey | Causa | Endpoint(s) | Solución |
|------------|-------|-------------|----------|
| `checksumError` | Checksum inválido o ausente | Todos | Verificar cálculo de checksum y secret |
| `invalidMeetingIdentifier` | Meeting no existe | join, end, getMeetingInfo | Verificar meetingID; llamar create primero |
| `notFound` | Recurso no encontrado | getMeetingInfo, *Recordings | Verificar que existe el recurso |
| `paramError` | Parámetro con valor inválido | Todos | Revisar tipo y valor del parámetro |
| `missingParameter` | Parámetro requerido ausente | Todos | Agregar el parámetro faltante |
| `maxParticipantsReached` | Sala llena | join | Esperar o aumentar maxParticipants |
| `guestDeny` | Guest rechazado por política | join | Verificar guestPolicy |
| `maxConcurrentMeetingsLimitReached` | Límite del servidor | create | Esperar o contactar admin |
| `sentEndMeetingRequest` | Éxito (no error) — end asíncrono | end | Es SUCCESS, no error |
| `noMeetings` | No hay reuniones activas | getMeetings | Normal si no hay reuniones |

---

## 11. TypeScript Interfaces

```typescript
// ============================================
// TIPOS BASE
// ============================================

type ReturnCode = 'SUCCESS' | 'FAILED';
type MeetingRole = 'MODERATOR' | 'VIEWER';
type RecordingState = 'processing' | 'processed' | 'published' | 'unpublished' | 'deleted';
type GuestPolicy = 'ALWAYS_ACCEPT' | 'ALWAYS_DENY' | 'ASK_MODERATOR';
type MeetingLayout =
  | 'CUSTOM_LAYOUT'
  | 'SMART_LAYOUT'
  | 'PRESENTATION_FOCUS'
  | 'VIDEO_FOCUS'
  | 'CAMERAS_ONLY'
  | 'PRESENTATION_ONLY'
  | 'MEDIA_ONLY';
type ChecksumAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512';

interface BBBResponse {
  returncode: ReturnCode;
  message?: string;
  messageKey?: string;
}

// ============================================
// CREATE MEETING
// ============================================

interface CreateMeetingParams {
  // Requeridos
  name: string;
  meetingID: string;
  // Opcionales principales
  attendeePW?: string;            // deprecated
  moderatorPW?: string;           // deprecated
  welcome?: string;
  dialNumber?: string;
  voiceBridge?: number;
  maxParticipants?: number;
  logoutURL?: string;
  record?: boolean;
  duration?: number;
  isBreakout?: boolean;
  parentMeetingID?: string;
  sequence?: number;
  freeJoin?: boolean;
  moderatorOnlyMessage?: string;
  autoStartRecording?: boolean;
  allowStartStopRecording?: boolean;
  webcamsOnlyForModerator?: boolean;
  bannerText?: string;
  bannerColor?: string;
  muteOnStart?: boolean;
  allowModsToUnmuteUsers?: boolean;
  guestPolicy?: GuestPolicy;
  meetingLayout?: MeetingLayout;
  endWhenNoModerator?: boolean;
  endWhenNoModeratorDelayInMinutes?: number;
  userCameraCap?: number;
  meetingCameraCap?: number;
  meetingExpireIfNoUserJoinedInMinutes?: number;
  meetingExpireWhenLastUserLeftInMinutes?: number;
  disabledFeatures?: string;
  disabledFeaturesExclude?: string;
  // Lock settings
  lockSettingsDisableCam?: boolean;
  lockSettingsDisableMic?: boolean;
  lockSettingsDisablePrivateChat?: boolean;
  lockSettingsDisablePublicChat?: boolean;
  lockSettingsDisableNotes?: boolean;
  lockSettingsHideUserList?: boolean;
  lockSettingsLockOnJoin?: boolean;
  lockSettingsHideViewersCursor?: boolean;
  // Nuevos en 3.0
  multiUserWhiteboardEnabled?: boolean;
  loginURL?: string;
  pluginManifests?: Array<{ url: string; checksum: string }>;
  allowOverrideClientSettingsOnCreateCall?: boolean;
  presentationConversionCacheEnabled?: boolean;
  // Metadata (cualquier meta_*)
  [key: `meta_${string}`]: string | undefined;
}

interface CreateMeetingResponse extends BBBResponse {
  meetingID: string;
  internalMeetingID: string;
  parentMeetingID: string;
  attendeePW: string;
  moderatorPW: string;
  createTime: number;
  voiceBridge: string;
  dialNumber: string;
  createDate: string;
  hasUserJoined: boolean;
  duration: number;
  hasBeenForciblyEnded: boolean;
}

// ============================================
// JOIN MEETING
// ============================================

interface JoinMeetingParams {
  fullName: string;
  meetingID: string;
  role?: MeetingRole;
  password?: string;              // deprecated
  createTime?: string;
  userID?: string;
  webVoiceConf?: string;
  avatarURL?: string;
  redirect?: boolean;
  errorRedirectUrl?: string;
  guest?: boolean;
  excludeFromDashboard?: boolean;
  // Nuevos en 3.0
  enforceLayout?: MeetingLayout;
  bot?: boolean;
  logoutURL?: string;
  firstName?: string;
  lastName?: string;
  // Userdata
  'userdata-bbb_default_layout'?: MeetingLayout;
  'userdata-bbb_skip_echotest_if_previous_device'?: boolean;
  'userdata-bbb_prefer_dark_theme'?: boolean;
  'userdata-bbb_custom_style'?: string;
  'userdata-bbb_custom_style_url'?: string;
  'userdata-bbb_listen_only_mode'?: boolean;
  'userdata-bbb_skip_check_audio'?: boolean;
  'userdata-bbb_override_default_locale'?: string;
  'userdata-bbb_hide_actions_bar'?: boolean;
}

// ============================================
// IS MEETING RUNNING
// ============================================

interface IsMeetingRunningResponse extends BBBResponse {
  running: boolean;
}

// ============================================
// GET MEETING INFO
// ============================================

interface Attendee {
  userID: string;
  fullName: string;
  role: MeetingRole;
  isPresenter: boolean;
  isListeningOnly: boolean;
  hasJoinedVoice: boolean;
  hasVideo: boolean;
  clientType: 'HTML5' | 'FLASH' | string;
  customdata?: Record<string, string>;
}

interface BreakoutInfo {
  parentMeetingID: string;
  sequence: number;
  freeJoin: boolean;
}

interface MeetingInfo extends BBBResponse {
  meetingName: string;
  meetingID: string;
  internalMeetingID: string;
  createTime: number;
  createDate: string;
  voiceBridge: string;
  dialNumber: string;
  attendeePW: string;
  moderatorPW: string;
  running: boolean;
  duration: number;
  hasUserJoined: boolean;
  recording: boolean;
  hasBeenForciblyEnded: boolean;
  startTime: number;
  endTime: number;             // 0 si aún en curso
  participantCount: number;
  listenerCount: number;
  voiceParticipantCount: number;
  videoCount: number;
  maxUsers: number;
  moderatorCount: number;
  attendees: Attendee[];
  metadata: Record<string, string>;
  isBreakout: boolean;
  breakout?: BreakoutInfo;       // si isBreakout=true
  breakoutRooms?: string[];      // IDs de salas de breakout activas
}

// ============================================
// GET RECORDINGS
// ============================================

interface GetRecordingsParams {
  meetingID?: string;
  recordID?: string;
  state?: string;
  meta?: string;
  offset?: number;
  limit?: number;
}

interface PlaybackFormat {
  type: string;
  url: string;
  processingTime: number;
  length: number;
  size?: number;
  preview?: {
    images: Array<{
      width: number;
      height: number;
      alt: string;
      url: string;
    }>;
  };
}

interface Recording {
  recordID: string;
  meetingID: string;
  internalMeetingID: string;
  name: string;
  isBreakout: boolean;
  published: boolean;
  state: RecordingState;
  startTime: number;
  endTime: number;
  participants: number;
  metadata: Record<string, string>;
  playback: PlaybackFormat[];
}

interface GetRecordingsResponse extends BBBResponse {
  recordings: Recording[];
  pagination?: {
    totalElements: number;
    returnedElements: number;
    offset: number;
    limit: number;
  };
}

// ============================================
// SEND CHAT MESSAGE
// ============================================

interface SendChatMessageParams {
  meetingID: string;
  message: string;             // 1-500 chars
  userName?: string;           // default: "System"
}

// ============================================
// WEBHOOKS
// ============================================

type WebhookEventType =
  // Meeting events
  | 'meeting-created'
  | 'meeting-ended'
  | 'meeting-recording-started'
  | 'meeting-recording-stopped'
  | 'meeting-recording-unhandled'
  | 'meeting-screenshare-started'
  | 'meeting-screenshare-stopped'
  | 'meeting-presentation-changed'
  // User events
  | 'user-joined'
  | 'user-left'
  | 'user-audio-voice-enabled'
  | 'user-audio-voice-disabled'
  | 'user-audio-muted'
  | 'user-audio-unmuted'
  | 'user-audio-unhandled'
  | 'user-cam-broadcast-start'
  | 'user-cam-broadcast-end'
  | 'user-presenter-assigned'
  | 'user-presenter-unassigned'
  | 'user-emoji-changed'
  | 'user-raise-hand-changed'
  // Chat events
  | 'chat-group-message-sent'
  // Poll events
  | 'poll-started'
  | 'poll-responded'
  // Pad events
  | 'pad-content'
  // RAP events
  | 'rap-archive-started'
  | 'rap-archive-ended'
  | 'rap-sanity-started'
  | 'rap-sanity-ended'
  | 'rap-post-archive-started'
  | 'rap-post-archive-ended'
  | 'rap-process-started'
  | 'rap-process-ended'
  | 'rap-post-process-started'
  | 'rap-post-process-ended'
  | 'rap-publish-started'
  | 'rap-publish-ended'
  | 'rap-post-publish-started'
  | 'rap-post-publish-ended'
  | 'rap-published'
  | 'rap-unpublished'
  | 'rap-deleted';

interface WebhookMeetingAttributes {
  'internal-meeting-id': string;
  'external-meeting-id': string;
}

interface WebhookUserAttributes {
  'internal-user-id': string;
  'external-user-id': string;
  name: string;
  role: string;
  presenter?: boolean;
  stream?: string | null;
}

interface WebhookEventData {
  type: 'event';
  id: WebhookEventType;
  attributes: {
    meeting: WebhookMeetingAttributes;
    user?: WebhookUserAttributes;
  };
  event: {
    ts: number;
  };
}

interface WebhookPayload {
  data: WebhookEventData;
}

// ============================================
// RECORDING TEXT TRACKS
// ============================================

type TextTrackKind = 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
type TextTrackSource = 'upload' | 'automated' | 'bbb';

interface TextTrack {
  href: string;
  kind: TextTrackKind;
  lang: string;
  label: string;
  source: TextTrackSource;
}
```

---

## 12. Referencia Rápida — Cheat Sheet

| Acción | Endpoint | Método | Params Mínimos |
|--------|----------|--------|----------------|
| Crear sala | `/create` | GET/POST | `name`, `meetingID` |
| Unirse | `/join` | GET | `meetingID`, `fullName`, `role` |
| Terminar | `/end` | GET | `meetingID` |
| ¿Está activa? | `/isMeetingRunning` | GET | `meetingID` |
| Listar salas | `/getMeetings` | GET | (ninguno) |
| Info de sala | `/getMeetingInfo` | GET | `meetingID` |
| Chat público | `/sendChatMessage` | GET | `meetingID`, `message` |
| URL de join | `/getJoinUrl` | GET | `sessionToken` |
| Feedback | `/feedback` | POST | `meetingID`, `userID`, `rating` |
| Insertar doc | `/insertDocument` | POST | `meetingID` + XML body |
| Grabaciones | `/getRecordings` | GET | `meetingID` o `recordID` |
| Publicar grab. | `/publishRecordings` | GET | `recordID`, `publish` |
| Eliminar grab. | `/deleteRecordings` | GET | `recordID` |
| Actualizar grab. | `/updateRecordings` | GET | `recordID` |
| Subtítulos | `/getRecordingTextTracks` | GET | `recordID` |
| Subir subtítulos | `/putRecordingTextTrack` | POST | `recordID`, `kind`, `lang`, `label` + file |
| Registrar webhook | `/hooks/create` | GET | `callbackURL` |
| Eliminar webhook | `/hooks/destroy` | GET | `hookID` |
| Listar webhooks | `/hooks/list` | GET | (ninguno) |

---

## Apéndice A: Configuración del Servidor BBB (bbb-web.properties)

Parámetros relevantes en `/etc/bigbluebutton/bbb-web.properties`:

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `securitySalt` | — | Shared secret para checksum |
| `supportedChecksumAlgorithms` | sha1,sha256,sha384,sha512 | Algoritmos aceptados |
| `defaultMeetingDuration` | 0 | Duración por defecto (min) |
| `meetingExpireIfNoUserJoinedInMinutes` | 5 | Tiempo hasta expirar sin usuarios |
| `meetingExpireWhenLastUserLeftInMinutes` | 1 | Tiempo hasta expirar al quedarse vacía |
| `defaultWelcomeMessage` | — | Mensaje de bienvenida por defecto |
| `allowOverrideClientSettingsOnCreateCall` | false | Habilitar override de settings en create |
| `maxConferences` | 0 | Máx. reuniones simultáneas (0=ilimitado) |
| `defaultMaxUsers` | 0 | Máx. usuarios por reunión (0=ilimitado) |
| `userInactivityInspectTimerInMinutes` | 0 | Detección de inactividad de usuarios |
| `userInactivityThresholdInMinutes` | 30 | Umbral de inactividad |
| `disabledFeatures` | — | Features deshabilitados globalmente |

---

## Apéndice B: Mapping de Features para `disabledFeatures`

| Feature Key | Descripción UI | Nuevo en 3.0 |
|-------------|---------------|:------------:|
| `breakoutRooms` | Salas de grupos | |
| `captions` | Subtítulos automáticos | |
| `chat` | Chat público y privado | |
| `privateChat` | Solo chat privado | |
| `closedCaptions` | Subtítulos cerrados | |
| `downloadPresentationWithAnnotations` | Descargar presentación con anotaciones | |
| `downloadPresentationConvertedToPdf` | Descargar como PDF | |
| `downloadPresentationOriginalFile` | Descargar archivo original | |
| `importPresentationWithAnnotationsFromBreakoutRooms` | Importar anotaciones de breakout | |
| `importSharedNotesFromBreakoutRooms` | Importar notas de breakout | |
| `layouts` | Gestión de layouts | |
| `learningDashboard` | Panel de aprendizaje | |
| `liveTranscription` | Transcripción en vivo | |
| `presentation` | Módulo de presentación | |
| `screenshare` | Compartir pantalla | |
| `sharedNotes` | Notas compartidas | |
| `virtualBackgrounds` | Fondos virtuales por defecto | |
| `customVirtualBackgrounds` | Fondos virtuales personalizados | |
| `webcam` | Módulo de cámara | |
| `cameraAsContent` | Cámara como contenido | |
| `externalVideos` | Videos externos | |
| `polls` | Encuestas | |
| `timer` | Temporizador | |
| `infiniteWhiteboard` | Pizarra infinita | ✅ |
| `deleteChatMessage` | Borrar mensajes del chat | ✅ |
| `editChatMessage` | Editar mensajes del chat | ✅ |
| `replyChatMessage` | Responder mensajes del chat | ✅ |
| `chatMessageReactions` | Reacciones a mensajes | ✅ |
| `raiseHand` | Levantar mano | ✅ |
| `userReactions` | Reacciones de usuario | ✅ |
| `chatEmojiPicker` | Selector de emojis en chat | ✅ |
| `quizzes` | Quizzes interactivos | ✅ |
| `spokenLanguageSelection` | Selección de idioma hablado | ✅ |
| `multiUserPen` | Lápiz multi-usuario | ✅ |
| `snapshotOfCurrentSlide` | Captura de slide actual | ✅ |

---

*Documento generado el 2026-03-01 a partir de la documentación oficial de BigBlueButton.*
*Fuentes: docs.bigbluebutton.org/development/api, /webhooks, /recording, /architecture*
