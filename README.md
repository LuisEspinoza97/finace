# Radiografía Financiera

App privada de un solo usuario: subes el PDF del estado de cuenta de tu
banco y te devuelve un diagnóstico visual de tus finanzas. El servidor no
guarda nada — el PDF se procesa en memoria, se responde el análisis y se
descarta. No hay base de datos de transacciones ni de usuarios.

Backend en Python + FastAPI (`backend/`), frontend en React + Vite +
TypeScript (`frontend/`). El parsing de PDF y todo el análisis viven en
Python; el frontend solo pinta lo que el backend calcula.

## Requisitos

- Para levantarlo con Docker: [Docker](https://docs.docker.com/get-docker/)
  y Docker Compose (incluido en Docker Desktop y en el paquete
  `docker-compose-plugin` de Linux).
- Para desarrollo local sin Docker: Python 3.11+, Node.js 20+, y
  `poppler-utils` instalado en el sistema (trae el comando `pdftotext`).

## Configuración

Copia el archivo de ejemplo y complétalo — **nunca** lo subas al repo (ya
está en `.gitignore`):

```bash
cp .env.example .env
```

Necesitas tres valores:

**`APP_USUARIO`** — el nombre de usuario que vas a usar para entrar. Cualquier
texto.

**`APP_PASSWORD_HASH`** — el hash bcrypt de tu contraseña, nunca la
contraseña en claro. Se genera con el comando que trae `auth.py`:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m app.auth hash
```

Te pide la contraseña dos veces (para confirmarla) y te imprime el hash.
Pégalo en `APP_PASSWORD_HASH` dentro de `.env`.

⚠️ **Si vas a usar Docker Compose**, escapa cada `$` del hash como `$$`
antes de pegarlo (Docker Compose interpola `$` en los `.env` y se come lo
que sigue creyéndolo una variable — lo comprobé: sin escapar, el hash
queda truncado y el login falla sin ningún error visible). Por ejemplo:

```
$2b$12$IfbPVGgYfbHqGZ64h5a9me...   →   $$2b$$12$$IfbPVGgYfbHqGZ64h5a9me...
```

Si vas a correr el backend sin Docker (`export APP_PASSWORD_HASH=...`),
**no** lo escapes: usa el hash tal cual te lo imprimió el comando.

**`JWT_SECRET`** — el secreto para firmar las sesiones. Si falta, el
servidor se niega a arrancar (a propósito: generarlo solo al vuelo
invalidaría tu sesión en cada reinicio y escondería el error de
configuración). Generas uno así:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Levantarlo con Docker Compose

Con el `.env` ya completo en la raíz del proyecto:

```bash
docker compose up --build -d
```

Esto levanta dos servicios:

- **`api`** — el backend FastAPI. No publica ningún puerto al host: solo
  es alcanzable desde el contenedor `web` a través de la red interna de
  Docker Compose. Si quieres pegarle directo con `curl` para depurar,
  agrégale `ports: ["8000:8000"]` en `docker-compose.yml`.
- **`web`** — el frontend ya compilado, servido por nginx. Nginx reenvía
  internamente todo lo que empiece con `/api/` al contenedor `api`. Esto
  es deliberado: así el navegador solo habla con un dominio (el de
  `web`), sin peticiones cross-origin — no hace falta configurar CORS, y
  la cookie de sesión (`SameSite=Strict`) viaja sin fricción.

Abre `http://localhost:8080` (o el puerto que hayas mapeado). Ambos
servicios tienen healthcheck (`docker compose ps` te dice si están
`healthy`).

Para bajarlo: `docker compose down`. Para ver logs: `docker compose logs -f`.

## Probarlo gratis en Render (sin instalar nada)

Si solo quieres un link para probar la app sin montar servidor propio,
`render.yaml` en la raíz define un Blueprint que crea los dos servicios
automáticamente:

1. Crea una cuenta gratis en [render.com](https://render.com) (con tu
   GitHub, un clic).
2. En el dashboard: **New → Blueprint** → conecta el repo `finace`.
3. Render lee `render.yaml` y te pide 3 valores (los mismos de siempre):
   `APP_USUARIO`, `APP_PASSWORD_HASH` y deja que genere `JWT_SECRET` solo.

   ⚠️ Aquí **NO** escapes el `$` del hash bcrypt — esa interpolación es
   una particularidad de Docker Compose leyendo archivos `.env`. El campo
   de Render es un campo de texto normal, pega el hash tal cual te lo dio
   `python -m app.auth hash`.

4. Espera a que ambos servicios (`finace-api`, `finace-web`) terminen de
   compilar (unos minutos, el plan free es lento para arrancar).

5. **Importante**: los nombres de servicio son globales en Render — si
   `finace-api` ya está tomado por otra cuenta, Render le agrega un sufijo
   random (ej. `finace-api-pzr5.onrender.com`). Entra a la página de
   `finace-api` en el dashboard y copia su URL real. Pégala en la env var
   **`API_URL`** del servicio `finace-web` (Environment → Edit) y dale
   **Restart** — no hace falta reconstruir nada, se lee al arrancar el
   contenedor. Si `finace-web` también salió con sufijo, actualiza además
   `CORS_ORIGINS` en `finace-api` con esa URL real.

6. Abre la URL de `finace-web`.

Esta variante despliega frontend y backend como dos servicios públicos
separados (cada uno con su propio dominio `*.onrender.com`), a diferencia
de Docker Compose que los pone detrás de un solo dominio. Por eso
`render.yaml` fija `COOKIE_SAMESITE=none` y `CORS_ORIGINS` con la URL del
frontend — sin esto, el navegador trata `finace-web.onrender.com` y
`finace-api.onrender.com` como sitios distintos y bloquea la cookie de
sesión.

El plan free de Render duerme el servicio tras un rato sin uso: la
primera petición después de eso tarda ~30-60s en despertar.

## Desarrollo local sin Docker

**Backend:**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export APP_USUARIO=... APP_PASSWORD_HASH='...' JWT_SECRET=...
uvicorn app.main:app --reload --port 8000
```

**Frontend** (en otra terminal):

```bash
cd frontend
cp .env.example .env   # ya trae VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

Abre `http://localhost:5173`. En este modo, backend y frontend corren en
puertos distintos, así que el backend sí necesita CORS — ya está
configurado en `backend/app/main.py` para `http://localhost:5173`.

## Tests

```bash
cd backend && .venv/bin/python -m pytest -q
cd frontend && npx tsc -b --noEmit
```

Ningún test usa un PDF ni un dato real: el estado de cuenta de prueba se
genera como texto sintético dentro de `backend/tests/fixtures.py`.

## Bancos soportados

Por ahora solo **Banco Pichincha**. Si tu banco no coincide, el endpoint
devuelve un 415 con la lista de bancos soportados en vez de inventar un
análisis incorrecto.

Para agregar otro banco: edita `backend/app/core/parsers.py`, hay una
plantilla comentada al final del archivo con instrucciones. Un extracto
que no cuadra (`saldo_inicial + entradas − salidas ≠ saldo_final`) se
rechaza con 422 en vez de analizarse — es la única defensa real contra un
parser que se comió una línea.

## Desplegarlo en tu propia infraestructura, detrás de HTTPS

`docker-compose.yml` no incluye TLS a propósito: eso es trabajo del
proxy inverso que ya tienes corriendo en tu VPS (nginx, Caddy, Traefik —
lo que uses). Lo único que necesita saber tu proxy es a qué puerto local
reenviar: el puerto que hayas publicado del servicio `web` (por defecto,
`8080`).

Ejemplo con nginx, asumiendo que ya tienes certificados (Let's Encrypt o
los tuyos) y que Docker Compose corre en la misma máquina:

```nginx
server {
    listen 443 ssl;
    server_name radiografia.tudominio.com;

    ssl_certificate     /ruta/a/tu/fullchain.pem;
    ssl_certificate_key /ruta/a/tu/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 80;
    server_name radiografia.tudominio.com;
    return 301 https://$host$request_uri;
}
```

Con Caddy es más corto — te da HTTPS automático sin pelear con
certificados:

```
radiografia.tudominio.com {
    reverse_proxy 127.0.0.1:8080
}
```

Con esto, todo el tráfico (frontend y `/api/*`) entra por un solo
dominio HTTPS, y dentro de la red de Docker Compose nginx sigue
reenviando `/api/` al backend como en desarrollo. La cookie de sesión se
marca `Secure`, así que **solo funciona sobre HTTPS** — si pruebas en
`http://` sin proxy, el login no persistirá la sesión más allá de esa
respuesta.

## Seguridad y privacidad

- El servidor no escribe el PDF a disco en ningún momento: vive en un
  archivo temporal que se borra en un `finally`, pase lo que pase.
- Los logs solo registran banco, número de movimientos y duración —
  nunca montos, descripciones, saldos ni el nombre del archivo.
- El histórico de meses y las reglas de categorización que edites viven
  únicamente en tu navegador (IndexedDB y localStorage). El servidor
  nunca los ve ni los guarda. Exporta el histórico regularmente — es tu
  única copia de seguridad.
- Ningún PDF, extracto real ni dato financiero tuyo debe entrar nunca al
  repositorio (ver `.gitignore`). Asume que el repo puede volverse
  público algún día.
