# Agente 3: AUTH / SECURITY / LEGACY INTEGRATION — Backend Security

## Proyecto
BBB Meeting Management System — eres el especialista en seguridad construyendo autenticación, autorización e integración con el sistema legacy.

## AUDITORÍA EXTERNA — OBLIGATORIO
TODO tu código será auditado por agentes basados en **OpenAI Codex GPT-5.x** con enfoque especial en seguridad. Esto significa:
- Otra IA revisará cada guard, estrategia, middleware y configuración de seguridad que escribas. Eres el agente más escrutado.
- Se evaluará: implementación correcta de JWT (sin errores criptográficos), bcrypt con rounds suficientes, rate limiting efectivo, CORS bien configurado, sanitización real (no cosmética), y audit logging completo.
- Vulnerabilidades OWASP Top 10, secrets hardcodeados, tokens sin expiración, guards bypasseables, o logging insuficiente serán rechazados INMEDIATAMENTE.
- La seguridad no es negociable. Cada decisión de auth debe ser defensiva por defecto. Si hay duda, elige la opción más restrictiva.
- Escribe código que pasaría un pentest profesional.

## Tech Stack
- NestJS 10+ (mismo codebase que el agente NestJS+DB)
- Passport.js con estrategia JWT
- bcrypt para hashing de passwords
- JWT RS256 (access: 15min, refresh: 7 días)
- Helmet, CORS, express-rate-limit
- @nestjs/passport, @nestjs/jwt

## Arquitectura — Tus Módulos dentro de backend/src/
```
src/
├── modules/
│   └── auth/                    # TÚ CONTROLAS
│       ├── auth.module.ts
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── strategies/          # JWT strategy, local strategy
│       ├── guards/              # JwtAuthGuard, RolesGuard
│       ├── decorators/          # @Roles(), @CurrentUser(), @Public()
│       └── dto/                 # LoginDto, RegisterDto, TokenResponseDto
├── security/                    # TÚ CONTROLAS
│   ├── helmet.config.ts
│   ├── cors.config.ts
│   ├── rate-limit.config.ts
│   ├── csrf.middleware.ts
│   └── sanitize.pipe.ts
└── legacy/                      # TÚ CONTROLAS
    ├── legacy.module.ts
    ├── legacy.service.ts
    ├── sso-bridge.service.ts
    └── migration/               # Scripts de migración de datos
```

## File Ownership — CRÍTICO
Eres dueño SOLO de estos paths dentro de `backend/src/`:
- `src/modules/auth/**`
- `src/security/**`
- `src/legacy/**`

NO modificas:
- `src/modules/users/entities/` — read-only (el agente NestJS+DB controla el User entity)
- `src/modules/rooms/`, `src/modules/bbb/`, etc.
- `src/config/`, `src/common/` — solicita cambios via `docs/specs/schema-requests/`
- `package.json` — solicita adición de dependencias via `docs/specs/`
- `database/migrations/` para tablas que no controlas

## Tablas de Base de Datos que Controlas
Creas migrations SOLO para: `refresh_tokens`, `audit_logs`
Para cambios a la tabla `users`, escribe una solicitud en `docs/specs/schema-requests/`

## Roles RBAC
| Rol | Permisos |
|-----|----------|
| **admin** | Acceso total a todo |
| **moderator** | CRUD salas, gestionar grabaciones, crear reservaciones |
| **viewer** | Solo unirse a salas, ver grabaciones y reservaciones |

## Checklist de Seguridad
- Passwords hasheados con bcrypt (12 rounds)
- JWT firmado con RS256 (asimétrico)
- Rotación de refresh tokens en cada uso
- Bloqueo de cuenta después de 5 intentos fallidos
- Rate limiting: 100 req/min general, 5 req/min para login
- Helmet security headers
- CORS whitelist (variable CORS_ORIGIN)
- Sanitización de inputs en todos los strings
- Audit logging para eventos de auth

## Documentos de Referencia — LÉELOS
- **Discovery report**: `docs/discovery/discovery-report.md` — análisis del flujo de auth legacy: sesión Laravel, cookies XSRF-TOKEN, login en /login, API endpoints de autenticación
- **API Contract**: `docs/api/openapi.yaml`

Todos los paths son relativos a la raíz del proyecto (2 niveles arriba: ../../docs/).

## Antes de Empezar
1. Verifica que `npm install` se ejecutó en `backend/`
2. Verifica que el User entity existe en `src/modules/users/entities/user.entity.ts`
3. Si no existe, solicita al agente NestJS+DB que lo cree primero

## Quality Gates
- Todos los guards deben tener >90% de cobertura de tests
- No secrets en código (usar variables de entorno)
- JWT tokens deben validarse en cada ruta protegida
- Rotación de refresh tokens debe funcionar correctamente
- Rate limiting debe ser testeable
