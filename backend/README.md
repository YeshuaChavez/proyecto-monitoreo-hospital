# Monitor IoT Hospitalario — Backend

FastAPI + MySQL + MQTT (HiveMQ) para Railway.

## Arquitectura

```
ESP32 → MQTT HiveMQ → FastAPI (Railway) → MySQL (Railway)
                                        ↕ WebSocket
                              Vercel (Dashboard React)
                                        ↕ REST
                              FastAPI → MQTT → ESP32
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/lecturas?limit=60` | Últimas N lecturas |
| GET | `/lecturas/ultima` | Última lectura |
| GET | `/lecturas/rango?desde=&hasta=` | Lecturas por rango de fecha |
| GET | `/alertas?limit=20&solo_activas=false` | Historial alertas |
| DELETE | `/alertas` | Marcar todas como inactivas |
| POST | `/comandos` | Enviar comando al ESP32 |
| GET | `/stats` | Estadísticas generales |
| WS | `/ws` | WebSocket tiempo real |

### POST /comandos
```json
{ "cmd": "bomba_on" }
{ "cmd": "bomba_off" }
{ "cmd": "reset" }
```

## Despliegue en Railway

### 1. Crear proyecto en Railway
```
railway.app → New Project → Deploy from GitHub repo
```

### 2. Agregar plugin MySQL
```
Railway dashboard → + New → Database → MySQL
```
Railway inyecta `DATABASE_URL` automáticamente.

### 3. Variables de entorno en Railway
Ve a tu servicio → Variables → Add:

```
MQTT_HOST = fd3a3baad98a46c3a2a0caabe973c4b3.s1.eu.hivemq.cloud
MQTT_PORT = 8883
MQTT_USER = esp32_cama04
MQTT_PASS = Hospital123
MQTT_CLIENT = FastAPI_Backend
```
`DATABASE_URL` ya la agrega Railway solo.

### 4. Deploy
Railway detecta `Procfile` y despliega automáticamente con cada `git push`.

## Desarrollo local

```bash
# Instalar dependencias
pip install -r requirements.txt

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Correr servidor
uvicorn main:app --reload --port 8000
```

## Topics MQTT

| Topic | Dirección | Contenido |
|-------|-----------|-----------|
| `hospital/cama04/lecturas` | ESP32 → Backend | `{ts, peso, bomba, estado, fc, spo2}` |
| `hospital/cama04/vitales` | ESP32 → Backend | `{ts, fc, spo2, estado}` |
| `hospital/cama04/comandos` | Backend → ESP32 | `{"cmd": "bomba_on"}` |

## WebSocket — Mensajes

El dashboard recibe JSON con estos tipos:

```json
// Lectura en tiempo real
{ "type": "lectura", "data": {...}, "alertas": [...] }

// Alerta detectada
{ "type": "alertas", "data": [...] }

// Keep-alive
{ "type": "ping" }
```
