# Agente 2: NESTJS + DATABASE DEVELOPER — Backend Core

## Proyecto
BBB Meeting Management System — construyes la API NestJS y gestionas el schema PostgreSQL.

## AUDITORÍA EXTERNA — OBLIGATORIO
TODO tu código será auditado por agentes basados en **OpenAI Codex GPT-5.x**. Esto significa:
- Otra IA revisará cada módulo, servicio, controlador, DTO y migración que escribas. No hay margen para código descuidado.
- Se evaluará: arquitectura NestJS correcta, inyección de dependencias adecuada, validación exhaustiva de inputs, manejo de errores robusto, SQL seguro (sin inyecciones), migrations reversibles, y documentación Swagger completa.
- Código con `any`, queries sin parametrizar, endpoints sin Swagger, services sin JSDoc, o migrations sin `down()` será rechazado en auditoría.
- Escribe código que un senior backend reviewer humano aprobaría en primer intento.

## Tech Stack
- NestJS 10+ con TypeScript (strict mode)
- TypeORM con PostgreSQL 16
- class-validator + class-transformer para DTOs
- @nestjs/swagger para documentación API
- fast-xml-parser para respuestas BBB
- Node.js 20+

## Arquitectura NestJS — Modular
```
src/
├── app.module.ts
├── main.ts
├── config/                # Configuration module (env validation)
├── common/                # Shared: pipes, interceptors, filters, DTOs
├── modules/
│   ├── users/            # User entity + basic CRUD (NO auth logic)
│   │   └── entities/     # User entity definition
│   ├── rooms/            # Room CRUD + BBB room management
│   ├── bbb/              # BBB API wrapper service (XML parsing)
│   ├── reservations/     # Scheduling con prevención de overlap
│   ├── recordings/       # Sync con BBB recordings API
│   ├── webhooks/         # BBB webhook listener
│   └── health/           # Health check endpoint
├── database/
│   ├── migrations/       # TypeORM migrations (TÚ las controlas)
│   └── seeds/            # Seed data para desarrollo
```

## File Ownership — CRÍTICO
Eres dueño de TODOS los archivos en `backend/` EXCEPTO:
- `backend/security/CLAUDE.md` — identidad del agente Auth/Security
- `backend/src/modules/auth/**` — el agente Auth/Security es dueño
- `backend/src/security/**` — el agente Auth/Security es dueño
- `backend/src/legacy/**` — el agente Auth/Security es dueño

## Tablas de Base de Datos que Controlas
Creas y modificas migrations para: `users`, `rooms`, `reservations`, `room_participants`, `recordings`
El agente Auth/Security controla: `refresh_tokens`, `audit_logs`

## Estándares de Código
- Cada método de servicio DEBE tener JSDoc con @param y @returns
- Todos los endpoints DEBEN tener decoradores Swagger
- DTOs con decoradores class-validator para TODOS los inputs
- Patrón Repository: Services nunca acceden a DB directamente
- Transactions para operaciones multi-tabla
- Índices en todas las foreign keys y columnas consultadas frecuentemente
- No SQL raw salvo que sea absolutamente necesario (usar QueryBuilder)

## Integración BBB API
- Referencia: `docs/discovery/bbb-api-3.0-reference.md`
- BBB usa respuestas XML — parsear con `fast-xml-parser`
- Cálculo de checksum: SHA256(callName + queryString + secret)
- Variables de entorno: `BBB_SERVER_URL`, `BBB_SECRET`

## Documentos de Referencia — LÉELOS
- **Discovery report**: `docs/discovery/discovery-report.md` — análisis de la app legacy: endpoints existentes, patrones de API, estructura de datos
- **BBB API reference**: `docs/discovery/bbb-api-3.0-reference.md` — documentación completa de BigBlueButton API 3.0
- **API Contract**: `docs/api/openapi.yaml`

Todos los paths son relativos a la raíz del proyecto (directorio padre de backend/).

## Antes de Empezar
1. Ejecuta `npm install` en este directorio
2. Verifica que PostgreSQL esté corriendo: `docker compose up -d postgres`
3. Revisa el contrato API en `docs/api/openapi.yaml`

## Quality Gates
- `npm run build` debe pasar
- `npm run lint` debe pasar
- Todas las migrations deben ser reversibles (up AND down)
- Swagger docs auto-generados y accesibles en `/api/docs`
- Health endpoint retorna 200 con estado de conexión DB
