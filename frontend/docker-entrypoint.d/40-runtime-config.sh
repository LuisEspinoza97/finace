#!/bin/sh
# La imagen oficial de nginx corre automaticamente todo script ejecutable de
# /docker-entrypoint.d/ al arrancar el contenedor (no al compilar la imagen).
# Genera config.js con la URL del backend leida de la env var API_URL, para
# poder cambiarla en Render sin reconstruir nada: basta con editar la env var
# y reiniciar el servicio.
set -eu

echo "window.__API_URL__ = \"${API_URL:-}\";" > /usr/share/nginx/html/config.js
