FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vacio = rutas relativas ("/api/..."): nginx (ver nginx.conf) las reenvia
# al backend por la red interna. docker-compose.yml sobreescribe esto
# explicitamente a "" con build.args. El valor por defecto de aqui abajo
# es para Render, que NO soporta pasar build args por render.yaml: apunta
# directo a la URL publica de "finace-api" (ver render.yaml), ya que ahi
# no hay proxy interno y cada servicio queda en su propio subdominio.
ARG VITE_API_URL=https://finace-api.onrender.com
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost/ || exit 1
