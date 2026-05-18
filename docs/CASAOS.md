# CasaOS STB Armbian Deployment

Deployment SI Kepegawaian memakai standar disk `Local Disk`:

```text
/media/devmon/Local Disk/projects
```

Semua source, env, upload, backup, PostgreSQL data, n8n data, AI agent, dan Docker bind mount wajib berada di bawah path tersebut.

## Layout

```text
/media/devmon/Local Disk/projects/
├── si-kepegawaian
├── postgres
├── n8n
├── ai-agent
├── backup
├── uploads
└── docker
```

Container utama:

```text
App        : sisdmk2-app
PostgreSQL : sisdmk-postgres
n8n        : sisdmk-n8n
Network    : sisdmk2-network
Port app   : 8091
```

## Deploy Dari GitHub

Copy paste penuh di terminal CasaOS/STB:

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

mkdir -p "$PROJECTS_ROOT/si-kepegawaian"
mkdir -p "$PROJECTS_ROOT/postgres/data"
mkdir -p "$PROJECTS_ROOT/n8n/data"
mkdir -p "$PROJECTS_ROOT/ai-agent"
mkdir -p "$PROJECTS_ROOT/backup"
mkdir -p "$PROJECTS_ROOT/uploads/si-kepegawaian"
mkdir -p "$PROJECTS_ROOT/docker"

cd "$PROJECTS_ROOT/si-kepegawaian"
curl -fsSL https://raw.githubusercontent.com/Mediachanel/Si-SDMK2026/main/scripts/deploy-casaos-github.sh -o deploy-casaos-github.sh
chmod +x deploy-casaos-github.sh

./deploy-casaos-github.sh \
  --install-deps \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data
```

## Verifikasi

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

cd "$PROJECTS_ROOT/si-kepegawaian/source"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs --tail 80 sisdmk2-app
docker exec sisdmk2-app npm run check:postgres
docker exec -it sisdmk-postgres psql -U sisdmk_admin -d si_data -c "\dt"
curl -fsS http://127.0.0.1:8091/api/health
```

## Restore `si_data`

Upload dump PostgreSQL ke:

```text
/media/devmon/Local Disk/projects/backup
```

Restore:

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

cd "$PROJECTS_ROOT/si-kepegawaian"
./deploy-casaos-github.sh \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data \
  --restore-dump "$PROJECTS_ROOT/backup/si_data.pg16.sql.tgz"
```

## Update Kode

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

cd "$PROJECTS_ROOT/si-kepegawaian"
./deploy-casaos-github.sh \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data
```

## Manual Compose

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

cd "$PROJECTS_ROOT/si-kepegawaian/source"
git pull --ff-only origin main
cp "$PROJECTS_ROOT/si-kepegawaian/.env.casaos" .env.casaos
cp "$PROJECTS_ROOT/si-kepegawaian/.env.casaos" .env
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d --build
docker logs --tail 50 sisdmk2-app
```

## Cloudflare Tunnel

```yaml
ingress:
  - hostname: dinkes.kepegawaian.media
    service: http://127.0.0.1:8091
  - hostname: n8n.kepegawaian.media
    service: http://127.0.0.1:5678
  - service: http_status:404
```

## Recovery

Jika container app gagal atau port konflik:

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs --tail 160 sisdmk2-app || true
docker rm -f sisdmk2-app || true

cd "$PROJECTS_ROOT/si-kepegawaian"
BUILD_PULL=0 BUILD_NO_CACHE=0 ./deploy-casaos-github.sh \
  --force-env \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data
```

Jika PostgreSQL gagal:

```bash
docker logs --tail 160 sisdmk-postgres
docker exec -it sisdmk-postgres psql -U sisdmk_admin -d si_data -c "SELECT 1;"
docker network inspect sisdmk2-network
```
