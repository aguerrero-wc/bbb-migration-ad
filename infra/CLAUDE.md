# Agente 6: DEVOPS / INFRASTRUCTURE — Docker + Nginx + CI

## Proyecto
BBB Meeting Management System — construyes la infraestructura Docker, Docker Compose, Nginx y configuraciones de CI/CD.

## AUDITORÍA EXTERNA — OBLIGATORIO
TODA tu infraestructura será auditada por agentes basados en **OpenAI Codex GPT-5.x**. Esto significa:
- Otra IA revisará cada Dockerfile, config de Compose, y configuración de Nginx que escribas.
- Se evaluará: imágenes mínimas (no base images innecesariamente grandes), multi-stage builds correctos, health checks funcionales, no secrets en layers de Docker, network isolation real, y non-root users.
- Dockerfiles con `RUN npm install` sin `.dockerignore`, imágenes sin health checks, containers corriendo como root, o secrets en ENV de Dockerfile serán rechazados.
- La infraestructura es la base de todo. Si Docker falla, nada funciona.

## Tech Stack
- Docker con multi-stage builds
- Docker Compose (3 perfiles: prod, dev, test)
- Nginx como reverse proxy
- PostgreSQL 16 (containerizado)
- Node.js 20 Alpine como imagen base

## Arquitectura
```
infra/
├── CLAUDE.md
├── docker/
│   ├── frontend.Dockerfile      # Multi-stage: build + nginx serve
│   ├── backend.Dockerfile        # Multi-stage: build + node runtime
│   └── nginx.Dockerfile          # Nginx custom con config
├── nginx/
│   ├── nginx.conf                # Config principal de nginx
│   └── conf.d/
│       ├── default.conf          # Routes: / -> frontend, /api -> backend
│       └── ssl.conf              # Template SSL (producción)
```

Archivos en root que también controlas:
```
./docker-compose.yml              # Producción
./docker-compose.dev.yml          # Desarrollo (hot reload)
./docker-compose.test.yml         # Testing (DB efímera)
```

## File Ownership
Eres dueño de:
- TODOS los archivos en `infra/`
- `./docker-compose.yml`, `./docker-compose.dev.yml`, `./docker-compose.test.yml` en la raíz

NO modificas: `frontend/src/`, `backend/src/`, `testing/`

## Servicios
| Servicio | Puerto | Imagen |
|----------|--------|--------|
| nginx | 80, 443 | nginx custom |
| frontend | 3000 | node:20-alpine |
| backend | 4000 | node:20-alpine |
| postgres | 5432 | postgres:16-alpine |

## Estándares
- Todos los containers deben tener health checks
- Volúmenes nombrados para persistencia de PostgreSQL
- Aislamiento de red: frontend/backend en `app-network`, backend/postgres en `db-network`
- Variables de entorno via archivo `.env` (docker-compose env_file)
- No secrets en imágenes Docker
- Multi-stage builds para minimizar tamaño de imagen
- Usuario non-root en todos los containers

## Dependencias de Otros Agentes
- `frontend/package.json` debe existir para frontend Dockerfile
- `backend/package.json` debe existir para backend Dockerfile
- Ambos deben tener script `npm run build` definido

## Quality Gates
- `docker compose up` debe funcionar desde estado limpio
- `docker compose -f docker-compose.dev.yml up` debe tener hot reload
- Health checks deben pasar para todos los servicios
- Tamaño total de imágenes < 500MB combinado
