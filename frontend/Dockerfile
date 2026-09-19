FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# La imagen oficial corre todo script ejecutable de aqui al ARRANCAR el
# contenedor. 40-runtime-config.sh genera config.js con la env var API_URL
# (ver frontend/lib/api.ts) -- asi la URL del backend se puede cambiar sin
# reconstruir la imagen, util porque Render puede agregarle un sufijo
# random al nombre del servicio si ya esta tomado.
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost/ || exit 1
