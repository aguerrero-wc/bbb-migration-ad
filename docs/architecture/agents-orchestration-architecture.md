# Arquitectura de Orquestación de Agentes — BBB Meeting Management System

## Visión General del Sistema

Este documento define la arquitectura de orquestación multi-agente para el desarrollo completo (frontend + backend + infraestructura) del sistema de administración de reuniones BigBlueButton (BBB) integrado con una plataforma de aprendizaje. El enfoque utiliza múltiples sesiones de Claude Code, cada una con un rol especializado, coordinadas por un orquestador central.

### Objetivo Final del MVP

Al finalizar el desarrollo, el sistema debe permitir:

1. **Autenticación** — Login/registro de usuarios con roles (admin, moderator, viewer)
2. **Gestión de salas** — CRUD completo de salas BBB desde la interfaz
3. **Unirse a reuniones** — Join a salas activas con redirect a BBB
4. **Personalización** — Customizar salas (layout, features, grabación, presentaciones)
5. **Reservaciones** — Programar reuniones futuras
6. **Grabaciones** — Ver, gestionar y compartir grabaciones
7. **Integración legacy** — Conectar con el sistema existente en myzonego.com
8. **Deploy** — Todo containerizado con Docker Compose, listo para producción

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18+ / TypeScript / Tailwind CSS |
| **Backend** | NestJS / TypeScript / Node.js 20+ |
| **Database** | PostgreSQL 16 / TypeORM |
| **Auth** | JWT + Refresh Tokens / Passport.js |
| **API BBB** | BigBlueButton 3.0 REST API (XML) |
| **Testing** | Jest (unit) / Playwright (e2e) / Supertest (API) |
| **Infraestructura** | Docker / Docker Compose / Nginx reverse proxy |
| **Legacy** | Integración con myzonego.com (sistema existente) |

---

## Filosofía de Desarrollo

> **"El código generado por agentes es código no revisado manualmente. Los tests son tu única garantía de calidad."**

> **"Cada agente es responsable de su dominio. Ninguno toma decisiones fuera de su alcance."**

> **"Si no hay test, no existe."**

---

## Diagrama de Agentes — Sistema Completo

```
                         ┌──────────────────────────────────────────┐
                         │            🎯 ORQUESTADOR                │
                         │    Arquitecto de Software / Tech Lead    │
                         │    ────────────────────────────────────  │
                         │    • Define specs y contratos            │
                         │    • Coordina flujo entre equipos        │
                         │    • Revisa outputs de cada agente       │
                         │    • Toma decisiones de arquitectura     │
                         │    • Mantiene ADRs                       │
                         │                                          │
                         │    ⚠️  AUDITORÍA: Todo output será       │
                         │    revisado por agentes basados en       │
                         │    OpenAI Codex GPT-5.x                  │
                         └────────────────┬─────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   🖥️  EQUIPO         │    │   ⚙️  EQUIPO         │    │   🚀 EQUIPO          │
│   FRONTEND          │    │   BACKEND           │    │   INFRAESTRUCTURA   │
│   (3 sesiones)      │    │   (3 sesiones)      │    │   (1 sesión)        │
└────────┬────────────┘    └────────┬────────────┘    └────────┬────────────┘
         │                          │                           │
    ┌────┴────┐              ┌──────┴──────┐                    │
    │         │              │             │                    │
    ▼         ▼              ▼             ▼                    ▼
┌───────┐ ┌───────┐    ┌─────────┐ ┌──────────┐        ┌──────────────┐
│🎨 UX/ │ │⚛️ React│    │🔧 NestJS│ │🔐 Auth/  │        │🐳 DevOps/   │
│UI     │ │Dev    │    │+ DB     │ │Security/ │        │Docker       │
│       │ │       │    │(sub-    │ │Legacy    │        │             │
│       │ │       │    │agents)  │ │          │        │             │
└───────┘ └───────┘    └─────────┘ └──────────┘        └──────────────┘
              │              │             │                    │
              ▼              ▼             ▼                    ▼
    ┌──────────────┐  ┌──────────────┐                  ┌──────────────┐
    │🧪 Frontend   │  │🧪 Backend    │                  │ Compose +    │
    │Testing       │  │Testing       │                  │ Nginx +      │
    │(2 sub:       │  │(API + integ) │                  │ CI/CD        │
    │visual+func)  │  │              │                  │              │
    └──────────────┘  └──────────────┘                  └──────────────┘
```

---

## Flujo de Trabajo Global

```
                    ORQUESTADOR define feature spec
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
            FRONTEND     BACKEND      DEVOPS
            pipeline     pipeline     (paralelo)
                 │            │            │
                 │     ┌──────┴──────┐     │
                 │     ▼             ▼     │
                 │  NestJS+DB    Auth/Sec  │
                 │     │          /Legacy  │
                 │     │             │     │
                 │     └──────┬──────┘     │
                 │            ▼            │
                 │     Backend Tests       │
                 │            │            │
                 ▼            ▼            ▼
            Frontend     API ready     Docker ready
            Tests        for frontend  for deploy
                 │            │            │
                 └────────────┼────────────┘
                              ▼
                    INTEGRACIÓN + E2E TESTS
                              │
                              ▼
                    ORQUESTADOR review final
                              │
                              ▼
                         ✅ DEPLOY
```

**Regla:** Frontend y Backend pueden trabajar en paralelo usando contratos de API definidos por el orquestador. DevOps trabaja en paralelo desde el día 1.

---

## Definición Detallada de Cada Agente

(Nota: El contenido completo de cada CLAUDE.md está en las secciones subsiguientes del documento original entregado. Este archivo es una versión completa — consulta el archivo descargado para los prompts completos de cada agente.)

---

## Agente 1: 🎯 ORQUESTADOR

**Sesión:** Principal
**Responsabilidades:** Specs técnicas, contratos OpenAPI, priorización, code review, ADRs, integración entre equipos, estándares de código, aprobación de schema de DB.

**Auditoría Codex:** Inyectada en su prompt. Todo output del equipo pasa por auditoría.

---

## Agente 2: 🎨 UX/UI Designer

**Sesión:** Frontend — Diseño
**Pantallas:** Login, Register, Dashboard, CRUD Salas, Pre-join, Reservaciones (calendario), Grabaciones, Admin.
**Deliverables:** Wireframes, specs de componentes, estados UI, flujos, design tokens, breakpoints responsive, mapping data-testid.

---

## Agente 3: ⚛️ React Developer

**Sesión:** Frontend — Implementación
**Stack:** React 18+ / TypeScript / Tailwind / shadcn/ui / React Router v6 / TanStack Query / Zustand / Axios / React Hook Form + Zod
**Estructura:** Feature-based (auth, rooms, reservations, recordings, admin)
**Reglas:** Cada componente con test, TypeScript strict, data-testid en todo, error boundaries, lazy loading.

---

## Agente 4: 🧪 Frontend Testing

**Sesión:** Frontend — Testing (2 sub-agentes)
**Sub 1 — Visual:** Playwright screenshots, cross-browser, responsive, axe-core accessibility.
**Sub 2 — Functional:** E2E flows (auth, CRUD salas, join, reservaciones, grabaciones), MSW mocking, edge cases.

---

## Agente 5: 🔧 NestJS + Database (Sub-agentes)

**Sesión:** Backend — Core
**Stack:** NestJS 10+ / TypeORM / PostgreSQL 16 / class-validator / Swagger
**Arquitectura NestJS:** Modules → Controllers → Services → Repositories
**Módulos:** auth, users, rooms, bbb (wrapper API), reservations, recordings, webhooks, health

### Esquema PostgreSQL

```sql
-- Users (auth + perfil)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms (salas BBB con config local)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_id VARCHAR(256) UNIQUE NOT NULL,
    image_url VARCHAR(500),
    welcome_message TEXT,
    max_participants INTEGER,
    record BOOLEAN DEFAULT false,
    auto_start_recording BOOLEAN DEFAULT false,
    mute_on_start BOOLEAN DEFAULT false,
    webcams_only_for_moderator BOOLEAN DEFAULT false,
    lock_settings JSONB DEFAULT '{}',
    disabled_features TEXT[],
    meeting_layout VARCHAR(50) DEFAULT 'CUSTOM_LAYOUT',
    guest_policy VARCHAR(20) DEFAULT 'ALWAYS_ACCEPT',
    meta JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'inactive',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservations (con exclusión de overlap a nivel DB)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    recurrence_rule VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_overlap EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    )
);

-- Room Participants (tracking de sesiones)
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    bbb_internal_user_id VARCHAR(255),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    role VARCHAR(20) NOT NULL,
    is_presenter BOOLEAN DEFAULT false
);

-- Recordings (sync con BBB)
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    bbb_record_id VARCHAR(255) UNIQUE NOT NULL,
    bbb_internal_meeting_id VARCHAR(255),
    name VARCHAR(255),
    state VARCHAR(20) DEFAULT 'processing',
    published BOOLEAN DEFAULT false,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    participants_count INTEGER,
    playback_url VARCHAR(500),
    playback_format VARCHAR(50),
    duration_seconds INTEGER,
    size_bytes BIGINT,
    thumbnails JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Agente 6: 🔐 Auth / Security / Legacy Integration

**Sesión:** Backend — Seguridad e Integración
**Auth:** JWT (RS256, 15min) + Refresh tokens (7 días) + Passport.js + bcrypt
**Roles:** admin (todo), moderator (CRUD salas), viewer (solo join)
**Security:** Helmet, CORS, rate limiting, CSRF, input sanitization, account lockout, audit logging
**Legacy:** SSO bridge con myzonego.com, data migration scripts, API gateway pattern, feature flags, reverse proxy routing

---

## Agente 7: 🧪 Backend Testing

**Sesión:** Backend — Testing
**Stack:** Jest + Supertest + TestContainers (PostgreSQL) + nock/MSW (BBB mock)
**Niveles:** Unit (services), Integration (API e2e), BBB integration (mock XML responses)
**Cobertura mínima:** Services 85%, Controllers 75%, Guards 90%, BBB client 90%

---

## Agente 8: 🐳 DevOps / Docker

**Sesión:** Infraestructura
**Stack:** Docker + Docker Compose + Nginx + PostgreSQL containerizado
**Servicios:** nginx (:80/:443), frontend (:3000), backend (:4000), postgres (:5432)
**Features:** Multi-stage builds, health checks, volumes, network isolation, .env management
**Environments:** docker-compose.yml (prod), docker-compose.dev.yml (dev + hot reload), docker-compose.test.yml (testing)

---

## Orden de Ejecución (Sprints)

### Sprint 0 — Setup (paralelo)
| Agente | Tarea |
|--------|-------|
| DevOps | Docker Compose base + PostgreSQL + Nginx |
| Orquestador | Definir API contracts completos (OpenAPI) |
| UX/UI | Diseñar Login + Dashboard + Room Cards |

### Sprint 1 — Auth + Esqueleto
| Agente | Tarea |
|--------|-------|
| NestJS+DB | Schema + migrations + User entity + health endpoint |
| Auth/Security | Login/Register + JWT + Guards + Roles |
| React Dev | Login page + Auth context + Axios interceptors |
| Frontend Testing | Tests de login flow |
| Backend Testing | Tests de auth endpoints |
| DevOps | Hot reload dev environment |

### Sprint 2 — CRUD Salas
| Agente | Tarea |
|--------|-------|
| NestJS+DB | Room entity + CRUD endpoints + BBB service wrapper |
| React Dev | Dashboard + Room cards + Create room modal |
| Frontend Testing | Tests de flujos de salas |
| Backend Testing | Tests de rooms API + BBB integration |

### Sprint 3 — Join + Customización
| Agente | Tarea |
|--------|-------|
| NestJS+DB | Join endpoint + BBB create/join integration |
| Auth/Security | Permisos por sala + guest policy |
| React Dev | Join flow + Room settings UI |
| Frontend Testing | Tests de join + settings |
| Backend Testing | Tests de BBB integration |

### Sprint 4 — Reservaciones + Grabaciones
| Agente | Tarea |
|--------|-------|
| NestJS+DB | Reservations CRUD + Recordings sync |
| React Dev | Calendar view + Recordings list + Player |
| Frontend Testing | Tests de reservaciones y grabaciones |
| Backend Testing | Tests de scheduling + recordings API |

### Sprint 5 — Legacy + Polish
| Agente | Tarea |
|--------|-------|
| Auth/Security | Integración con myzonego.com + data migration |
| NestJS+DB | Webhooks listener + real-time status |
| React Dev | Polish UI + loading states + error handling |
| Todos los testers | E2E full system tests |
| DevOps | Production Docker config + SSL + deploy docs |

---

## Estructura del Repositorio

```
bbb-management/
├── CLAUDE.md                          ← Prompt del orquestador
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.test.yml
├── .env.example
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
├── frontend/
│   ├── CLAUDE.md                      ← Prompt del React dev
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── tests/
├── backend/
│   ├── CLAUDE.md                      ← Prompt del NestJS dev
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   ├── test/
│   └── database/
│       ├── migrations/
│       └── seeds/
└── docs/
    ├── discovery/
    │   └── task-discovery.md
    ├── api/
    │   └── bbb-api-3.0-reference.md
    ├── architecture/
    │   └── agents-orchestration.md
    └── adrs/
```

---

## Reglas de Oro

> **Nunca mergees código sin tests.**
> **Nunca deploys sin pasar la auditoría Codex.**
> **El orquestador tiene la última palabra.**
> **`docker compose up` debe funcionar SIEMPRE.**
> **Si no hay test, no existe.**
