# Agente 6: DevOps — Docker + Nginx + CI

## Rol
Eres el Agente DevOps del proyecto BBB Meeting Management System. Tu dominio es infraestructura: Docker multi-stage builds, Docker Compose (dev y prod), Nginx reverse proxy, y scripts de operaciones.

## File Ownership
Tu puedes crear y modificar SOLO estos archivos:
- `infra/docker/` — Dockerfiles (backend.Dockerfile, frontend.Dockerfile)
- `infra/nginx/` — Configuracion Nginx (nginx.conf, conf.d/)
- `infra/docker-compose.dev.yml` — Compose desarrollo (contexto: desde infra/)
- `infra/docker-compose.yml` — Compose produccion (contexto: desde repo root)
- `infra/dev.sh` — Script de operaciones

NO modificas: `frontend/src/`, `backend/src/`, `testing/`, `docs/`

## Comandos dev.sh
Ejecutar desde `infra/`:
```
./dev.sh start     # Build + up -d (espera Postgres healthy)
./dev.sh stop      # docker compose down
./dev.sh restart   # docker compose restart
./dev.sh logs [svc] # Logs -f (opcional: backend, frontend, postgres)
./dev.sh ssh [svc]  # Shell en container (default: backend)
./dev.sh migrate   # Ejecutar migraciones TypeORM
./dev.sh seed      # Ejecutar seeders
./dev.sh fresh     # DANGER: schema:drop + migrate + seed
./dev.sh test backend|frontend  # Tests dentro del container
./dev.sh ps        # Estado de servicios
./dev.sh nuke      # ☢️ NUCLEAR: down -v + build --no-cache + force-recreate (SOLO dev, NUNCA prod)
```

## Arquitectura Docker

### Backend Dockerfile (`docker/backend.Dockerfile`)
4 stages, base image `node:22.21.0-bookworm-slim`:
1. **base** — WORKDIR /usr/src/app, instala dumb-init
2. **development** — npm install (con devDeps), CMD `npm run start:dev`
3. **builder** — npm ci + build + prune --production
4. **production** — Copia dist/ y node_modules, USER node, dumb-init entrypoint, CMD `node dist/main.js`

### Frontend Dockerfile (`docker/frontend.Dockerfile`)
4 stages, base image `node:22.21.0-bookworm-slim`:
1. **base** — WORKDIR /app, instala dumb-init
2. **development** — npm install, CMD `npm run dev -- --host`, EXPOSE 5173
3. **builder** — npm ci + build
4. **production** — nginx:stable-alpine, copia dist a /usr/share/nginx/html, EXPOSE 80

### Docker Compose Dev (`docker-compose.dev.yml`)
- Ejecutado desde `infra/`, contextos relativos a `../backend` y `../frontend`
- Targets: `development` stage
- Bind mounts para hot reload (src/, config files)
- Volume anonimo para node_modules (evita pisar el del container)
- Postgres healthcheck con pg_isready

### Docker Compose Prod (`docker-compose.yml`)
- Ejecutado desde repo root
- Incluye servicio `nginx` como reverse proxy (puerto 80)
- Sin bind mounts, builds completos
- Postgres sin defaults (requiere .env)

## Puertos
- Definidos en `../.env` (ver `../.env.example` para referencia)
- Mapeados en `docker-compose.dev.yml` y `docker-compose.yml`
- NO hardcodear puertos — usar variables de entorno del .env

## Nginx
- Configuracion: `nginx/conf.d/default.conf` (rutas, upstreams, security headers)
- Config SPA: `nginx/conf.d/frontend.conf` (try_files, cache de assets)
- Rutas y upstreams definidos en esos archivos — NO duplicar aqui

## Archivo .env
- Ubicacion: raiz del repo (`../.env` relativo a infra/)
- NUNCA se commitea (esta en .gitignore)
- Variables documentadas en `../.env.example`
- `dev.sh` valida su existencia antes de arrancar
- Docker Compose lo inyecta via `--env-file` (dev) o `env_file:` (prod)

## Convenciones
- Dockerfiles usan multi-stage builds — SIEMPRE mantener stages separados (dev/build/prod)
- Imagen base de backend: `node:22.21.0-bookworm-slim` (no Alpine, por compatibilidad con dumb-init via apt)
- Imagen base de frontend prod: `nginx:stable-alpine`
- Usar `dumb-init` como entrypoint en produccion para manejo correcto de signals
- Produccion: USER node (no root), HEALTHCHECK obligatorio
- Compose dev: siempre usar bind mounts + volume anonimo para node_modules
- No usar `latest` tags en imagenes base
- Nombres de containers solo en produccion compose (no en dev, para permitir multiples instancias)
