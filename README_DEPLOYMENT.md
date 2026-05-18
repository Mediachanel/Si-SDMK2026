# SI-SDMK Deployment Guide

Standar workspace production untuk STB Armbian/CasaOS:

```text
/media/devmon/Local Disk/projects
```

Struktur wajib:

```text
projects/
├── si-kepegawaian
├── postgres
├── n8n
├── ai-agent
├── backup
├── uploads
└── docker
```

Docker Root Dir berada di:

```text
/media/devmon/Local Disk/docker-data
```

## 1. Deploy Full Copy Paste

Jalankan di terminal server STB Armbian/CasaOS:

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

Ganti `PASSWORD_POSTGRES_SISDMK` dengan password PostgreSQL server.

## 2. Verifikasi

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

cd "$PROJECTS_ROOT/si-kepegawaian/source"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs --tail 100 sisdmk2-app
docker exec sisdmk2-app npm run check:postgres
curl -fsS http://127.0.0.1:8091/api/health
```

## 3. Update Dari GitHub

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

## 4. Restore Database

Taruh dump PostgreSQL di:

```text
/media/devmon/Local Disk/projects/backup
```

Restore `.sql` atau `.tgz`:

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

## 5. Backup Database

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

mkdir -p "$PROJECTS_ROOT/backup"
docker exec sisdmk-postgres pg_dump -U sisdmk_admin -d si_data -Fc -f /tmp/si_data.backup
docker cp sisdmk-postgres:/tmp/si_data.backup "$PROJECTS_ROOT/backup/si_data-$(date +%F-%H%M).backup"
docker exec sisdmk-postgres rm -f /tmp/si_data.backup
```

## 6. Cloudflare Tunnel

Ingress:

```yaml
ingress:
  - hostname: dinkes.kepegawaian.media
    service: http://127.0.0.1:8091
  - hostname: n8n.kepegawaian.media
    service: http://127.0.0.1:5678
  - service: http_status:404
```

Restart app setelah perubahan tunnel/env:

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

cd "$PROJECTS_ROOT/si-kepegawaian/source"
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d
```

## 7. Recovery

Jika container app gagal dibuat atau stuck:

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

docker logs --tail 160 sisdmk2-app || true
docker rm -f sisdmk2-app || true

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

Jika build terlalu berat di STB RAM 2GB, jalankan ulang tanpa pull base image dan tanpa no-cache:

```bash
PROJECTS_ROOT='/media/devmon/Local Disk/projects'

cd "$PROJECTS_ROOT/si-kepegawaian"
BUILD_PULL=0 BUILD_NO_CACHE=0 ./deploy-casaos-github.sh \
  --app-port 8091 \
  --app-origin https://dinkes.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-password 'PASSWORD_POSTGRES_SISDMK' \
  --postgres-database si_data
```
