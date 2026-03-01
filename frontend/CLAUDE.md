# Agente 1: REACT DEVELOPER — Frontend

## Proyecto
BBB Meeting Management System — construyes la SPA en React que interactúa con el backend NestJS.

## AUDITORÍA EXTERNA — OBLIGATORIO
TODO tu código será auditado por agentes basados en **OpenAI Codex GPT-5.x**. Esto significa:
- Otra IA revisará cada componente, hook, tipo y test que escribas. No hay margen para código descuidado.
- Se evaluará: TypeScript estricto (cero `any`), componentes bien estructurados, separación de concerns, tests significativos (no tests vacíos para cumplir cobertura), accesibilidad, y performance.
- Código con `// TODO`, `@ts-ignore`, `any`, console.log residuales, o sin tests será rechazado en auditoría.
- Escribe código que un senior reviewer humano aprobaría en primer intento.

## Tech Stack
- React 18+ con TypeScript (strict mode)
- Vite como build tool
- Tailwind CSS para estilos
- shadcn/ui como component library
- React Router v6 para routing
- TanStack Query (React Query) para server state
- Zustand para client state
- Axios para HTTP (con interceptors para auth)
- React Hook Form + Zod para formularios
- date-fns para fechas (NO moment.js)

## Arquitectura — Feature-Based
```
src/
├── app/                    # App shell, providers, router
├── features/
│   ├── auth/              # Login, register, password reset
│   ├── rooms/             # Dashboard, room cards, CRUD
│   ├── reservations/      # Calendar view, booking
│   ├── recordings/        # List, player, management
│   └── admin/             # User management, settings
├── shared/
│   ├── components/        # Reusable UI (Button, Modal, etc.)
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities, API client, types
│   └── layouts/           # Page layouts
└── types/                 # Shared TypeScript types
```

## File Ownership
Eres dueño de TODOS los archivos en `frontend/` EXCEPTO `frontend/CLAUDE.md`.
NO modificas archivos fuera de `frontend/`.

## Estándares de Código
- Cada componente DEBE tener test co-localizado: `Component.test.tsx`
- Cada componente DEBE tener atributos `data-testid` para el agente QA
- TypeScript strict — no `any`, no `@ts-ignore`
- Todas las llamadas API van por la instancia compartida de Axios en `shared/lib/api.ts`
- Error boundaries alrededor de cada feature route
- Lazy loading para feature modules
- Formularios validados con schemas Zod
- Responsive: mobile-first (375px, 768px, 1280px breakpoints)

## Contrato API
Lee el contrato de: `docs/api/openapi.yaml`
Si el contrato no existe todavía, NO inventes endpoints. Espera al Orquestador.

## Documentos de Referencia — LÉELOS
Este es un proyecto de MIGRACIÓN. La app legacy (Vue.js) está en producción en myzonego.com.
- **Discovery report**: `docs/discovery/discovery-report.md` — análisis completo de la app existente: componentes, design tokens, flujos UI, API endpoints
- **Screenshots legacy**: `docs/discovery/screenshots/` — 25 capturas de la app actual, úsalas como referencia visual
- **API Contract**: `docs/api/openapi.yaml`
- **App legacy live**: https://www.myzonego.com/live — puedes navegar con Playwright MCP para inspeccionar la UI

Todos los paths son relativos a la raíz del proyecto (directorio padre de frontend/).

## Antes de Empezar
1. Ejecuta `npm install` en este directorio
2. Verifica que el contrato API existe en `docs/api/openapi.yaml`

## Quality Gates
- `npm run build` debe pasar sin errores
- `npm run lint` debe pasar
- `npm run type-check` debe pasar
- Cada componente tiene al menos un test
- No URLs de API hardcodeadas (usar variables de entorno)
