#!/bin/bash
# Lee el JSON de stdin (requerido aunque no lo uses)
cat > /dev/null

# Verifica si existe .env en el directorio del proyecto
if [ ! -f "$CLAUDE_PROJECT_DIR/.env" ]; then
  echo "ERROR: No se encontró el archivo .env en el proyecto." >&2
  exit 2
fi

exit 0