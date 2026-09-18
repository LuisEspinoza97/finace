FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vacio = rutas relativas ("/api/..."): nginx (ver nginx.conf) las reenvia
# al backend por la red interna. Es el valor correcto para esta imagen;
# solo lo cambiarias si sirves el frontend en un dominio y el backend en
# otro sin proxy de por medio.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost/ || exit 1
