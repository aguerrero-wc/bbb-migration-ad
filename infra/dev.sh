#!/bin/bash
# Ubicación: infra/dev.sh
# Permisos: chmod +x infra/dev.sh

# 1. Asegurar contexto: El script se ejecuta "desde" la carpeta infra
cd "$(dirname "$0")"

# Configuración
COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE="../.env" # <--- Ruta al .env relativo a infra

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cmd=$1
subcmd=$2

# Función auxiliar para verificar si .env existe
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Error: No se encuentra el archivo .env en la raíz ($ENV_FILE).${NC}"
        echo "   Por favor, duplica .env.example a .env antes de iniciar."
        exit 1
    fi
}

# Wrapper para docker compose que INYECTA el archivo .env para sustitución de variables
docker_compose_cmd() {
    # El flag --env-file debe ir ANTES del comando up/down/exec
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

case $cmd in
  start)
    check_env
    echo -e "${BLUE}🚀 Arrancando entorno de desarrollo (Hot Reload activado)...${NC}"
    
    # Usamos la función wrapper
    docker_compose_cmd up -d --build --remove-orphans
    
    echo -e "${YELLOW}⏳ Esperando a que la base de datos esté lista...${NC}"
    
    # Loop de espera para Postgres
    until docker_compose_cmd exec postgres pg_isready -U "${POSTGRES_USER:-postgres}"; do
        echo -n "."
        sleep 2
    done
    echo ""

    echo -e "${GREEN}✅ Entorno corriendo.${NC}"
    # Nota: Estos echos son informativos, no dinámicos, pero asumimos que docker ya mapeó los puertos del .env
    echo "   - Frontend, Backend y DB iniciados."
    ;;

  stop)
    echo -e "${YELLOW}🛑 Deteniendo servicios...${NC}"
    docker_compose_cmd down
    ;;

  restart)
    echo -e "${BLUE}🔄 Reiniciando contenedores...${NC}"
    docker_compose_cmd restart
    ;;

  logs)
    if [ -z "$subcmd" ]; then
        docker_compose_cmd logs -f
    else
        docker_compose_cmd logs -f "$subcmd"
    fi
    ;;

  ssh)
    SERVICE=${subcmd:-backend}
    echo -e "${BLUE}🔌 Conectando a shell de $SERVICE...${NC}"
    docker_compose_cmd exec "$SERVICE" /bin/sh
    ;;

  migrate)
    echo -e "${BLUE}🗄️  Ejecutando migraciones...${NC}"
    docker_compose_cmd exec backend npm run migration:run
    ;;

  seed)
    echo -e "${BLUE}🌱 Ejecutando Seeds...${NC}"
    docker_compose_cmd exec backend npm run seed
    ;;

  fresh)
    echo -e "${RED}⚠️  DANGER: Reseteando base de datos completa...${NC}"
    docker_compose_cmd exec backend npm run schema:drop
    docker_compose_cmd exec backend npm run migration:run
    docker_compose_cmd exec backend npm run seed
    echo -e "${GREEN}✅ Base de datos reconstruida.${NC}"
    ;;

  test)
    if [ "$subcmd" == "backend" ]; then
        echo -e "${BLUE}🧪 Tests Backend...${NC}"
        docker_compose_cmd exec backend npm run test
    elif [ "$subcmd" == "frontend" ]; then
        echo -e "${BLUE}🧪 Tests Frontend...${NC}"
        docker_compose_cmd exec frontend npm run test
    else
        echo "Uso: ./dev.sh test [backend|frontend]"
    fi
    ;;
    
  ps)
    docker_compose_cmd ps
    ;;

  nuke)
    echo -e "${RED}☢️  NUCLEAR: Destruyendo TODO el entorno Docker (volumes, cache, containers)...${NC}"
    echo -e "${RED}   ⚠️  SOLO para desarrollo. NUNCA usar en producción.${NC}"
    echo -e "${RED}   Uso: cuando variables de .env no se actualizan, imágenes corruptas, o estado inconsistente.${NC}"
    echo -n "¿Continuar? (y/N): "
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Cancelado."
        exit 0
    fi
    check_env
    echo -e "${YELLOW}🔽 Bajando servicios y eliminando volúmenes...${NC}"
    docker_compose_cmd down -v --remove-orphans
    echo -e "${YELLOW}🔨 Rebuild sin cache...${NC}"
    docker_compose_cmd build --no-cache
    echo -e "${YELLOW}🚀 Levantando con force-recreate...${NC}"
    docker_compose_cmd up -d --force-recreate
    echo -e "${GREEN}✅ Entorno reconstruido desde cero.${NC}"
    ;;

  *)
    echo -e "${BLUE}🤖 Comandos Disponibles:${NC}"
    echo "  start, stop, restart, logs, ssh, migrate, seed, fresh, test, ps, nuke"
    ;;
esac