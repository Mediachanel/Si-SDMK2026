# SI-SDMK Deployment Guide

Panduan ini harus dipakai dengan urutan: inventory server, bersihkan sisa deploy yang aman, lalu deploy. Jangan menebak nama container PostgreSQL.

## 0. Inventory Server

Jalankan ini dulu di terminal server CasaOS/STB:

```bash
pwd
df -h
docker system df
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -i postgres
```

Untuk server CasaOS yang menyimpan project di `Root > DATA > AppData > si-kepegawaian`, gunakan:

```bash
PROJECTS_ROOT="/DATA/AppData"
APP_DIR="/DATA/AppData/si-kepegawaian"
SOURCE_DIR="$APP_DIR/source"
UPLOADS_DIR="$APP_DIR/storage"
```

Jika server memakai storage eksternal lama, gunakan:

```bash
PROJECTS_ROOT="/media/devmon/Local Disk/projects"
APP_DIR="$PROJECTS_ROOT/si-kepegawaian"
SOURCE_DIR="$APP_DIR/source"
UPLOADS_DIR="$PROJECTS_ROOT/uploads/si-kepegawaian"
```

## 1. PostgreSQL

Rekomendasi production adalah container PostgreSQL khusus SISDMK bernama `sisdmk-postgres`. Jika memakai container PostgreSQL yang sudah ada, pastikan dulu:

- nama container benar dari output `docker ps`
- container sedang `Up`
- user yang dipakai bisa login ke database target
- jika script diminta membuat user/database, `--postgres-admin-user` harus punya hak `CREATEROLE` dan `CREATEDB`

Script deploy sekarang akan berhenti sebelum build jika `--postgres-container` salah. Ini sengaja dibuat begitu supaya storage tidak penuh oleh build berulang.

Jika belum ada PostgreSQL khusus SISDMK, script bisa membuatnya dengan menambahkan:

```bash
  --create-postgres-container \
```

Default image untuk opsi itu adalah `pgvector/pgvector:pg16`, data disimpan di `$POSTGRES_DATA_DIR`.

## 2. Cleanup Aman Sebelum Deploy

Cleanup ini aman untuk sisa app SISDMK. Jangan hapus container atau volume PostgreSQL sebelum backup. Jika ingin script melakukan cleanup cache sebelum build, tambahkan `--prune-docker-cache` pada command deploy.

```bash
docker rm -f sisdmk2-app 2>/dev/null || true
docker builder prune -af
docker image prune -f
```

Jangan hapus item ini tanpa backup:

```text
container PostgreSQL
volume/data PostgreSQL
$UPLOADS_DIR
$APP_DIR/storage
$APP_DIR/.env.casaos
```

## 3. Deploy Dari GitHub

Push dulu commit lokal dari laptop:

```bash
git push sisdmk2026 main
```

Lalu di server:

```bash
PROJECTS_ROOT="/DATA/AppData"
APP_DIR="/DATA/AppData/si-kepegawaian"
SOURCE_DIR="$APP_DIR/source"
UPLOADS_DIR="$APP_DIR/storage"
POSTGRES_CONTAINER="NAMA_CONTAINER_POSTGRES_DARI_INVENTORY"

mkdir -p "$APP_DIR" "$UPLOADS_DIR"
cd "$APP_DIR"

curl -fsSL https://raw.githubusercontent.com/Mediachanel/Si-SDMK2026/main/scripts/deploy-casaos-github.sh -o deploy-casaos-github.sh
chmod +x deploy-casaos-github.sh

PROJECTS_ROOT="$PROJECTS_ROOT" \
APP_DIR="$APP_DIR" \
SOURCE_DIR="$SOURCE_DIR" \
UPLOADS_DIR="$UPLOADS_DIR" \
POSTGRES_PASSWORD='PASSWORD_POSTGRES_SISDMK' \
./deploy-casaos-github.sh \
  --force-env \
  --app-port 8091 \
  --app-origin https://info.kepegawaian.media \
  --postgres-container "$POSTGRES_CONTAINER" \
  --postgres-admin-user sisdmk_admin \
  --postgres-user sisdmk_admin \
  --postgres-database si_data
```

Jika deploy pertama butuh membuat/reset akun Super Admin, tambahkan flag ini pada command deploy:

```bash
  --migrate-phase1 \
  --seed-super-admin \
  --super-admin-username superadmin \
  --super-admin-password 'PASSWORD_SUPER_ADMIN_MINIMAL_12' \
  --seed-qna-defaults
```

Gunakan username `superadmin` saat login. Label di UI boleh terlihat sebagai `SUPER ADMIN`, tetapi input login harus sesuai username yang disimpan di database.

Ganti `POSTGRES_CONTAINER` dengan nama container dari hasil inventory. Jika belum ada container khusus SISDMK, buat dulu container PostgreSQL khusus atau gunakan database yang sudah ada dengan sengaja, bukan karena tebak-tebakan.

Contoh deploy yang membuat PostgreSQL khusus SISDMK:

```bash
PROJECTS_ROOT="/DATA/AppData"
APP_DIR="/DATA/AppData/si-kepegawaian"
SOURCE_DIR="$APP_DIR/source"
UPLOADS_DIR="$APP_DIR/storage"
POSTGRES_DATA_DIR="/DATA/AppData/postgres/sisdmk-data"

mkdir -p "$APP_DIR" "$UPLOADS_DIR" "$POSTGRES_DATA_DIR"
cd "$APP_DIR"

PROJECTS_ROOT="$PROJECTS_ROOT" \
APP_DIR="$APP_DIR" \
SOURCE_DIR="$SOURCE_DIR" \
UPLOADS_DIR="$UPLOADS_DIR" \
POSTGRES_DATA_DIR="$POSTGRES_DATA_DIR" \
POSTGRES_PASSWORD='PASSWORD_POSTGRES_SISDMK' \
./deploy-casaos-github.sh \
  --force-env \
  --prune-docker-cache \
  --create-postgres-container \
  --app-port 8091 \
  --app-origin https://info.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-user sisdmk_admin \
  --postgres-admin-user sisdmk_admin \
  --postgres-database si_data \
  --migrate-phase1 \
  --seed-super-admin \
  --super-admin-username superadmin \
  --super-admin-password 'PASSWORD_SUPER_ADMIN_MINIMAL_12' \
  --seed-qna-defaults
```

Untuk cek konfigurasi tanpa build/start app, tambahkan:

```bash
  --preflight-only \
```

Untuk membersihkan Docker build cache sebelum build di STB storage kecil, tambahkan:

```bash
  --prune-docker-cache \
```

Jika database/user sudah dibuat manual dan admin tidak punya hak membuat role/database, pakai:

```bash
  --skip-db-create \
```

tetapi hanya jika `--postgres-user` sudah bisa login ke `--postgres-database`.

## 4. Verifikasi

```bash
curl -fsS http://127.0.0.1:8091/api/health
docker exec sisdmk2-app npm run check:postgres
docker logs --tail 100 sisdmk2-app
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Jika `/api/health` sukses tetapi login menampilkan “Username atau password tidak sesuai”, reset akun Super Admin tanpa rebuild:

```bash
cd /DATA/AppData/si-kepegawaian

read -s -p "Password Super Admin baru: " SEED_SUPER_ADMIN_PASSWORD
echo

SEED_SUPER_ADMIN_PASSWORD="$SEED_SUPER_ADMIN_PASSWORD" \
./deploy-casaos-github.sh \
  --force-env \
  --skip-build \
  --migrate-phase1 \
  --seed-super-admin \
  --super-admin-username superadmin \
  --app-port 8091 \
  --app-origin https://info.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-user sisdmk_admin \
  --postgres-admin-user sisdmk_admin \
  --postgres-database si_data \
  --seed-qna-defaults

unset SEED_SUPER_ADMIN_PASSWORD
```

Jika yang kosong hanya QnA publik, isi QnA default tanpa reset password:

```bash
cd /DATA/AppData/si-kepegawaian

./deploy-casaos-github.sh \
  --force-env \
  --skip-build \
  --seed-qna-defaults \
  --app-port 8091 \
  --app-origin https://info.kepegawaian.media \
  --postgres-container sisdmk-postgres \
  --postgres-user sisdmk_admin \
  --postgres-admin-user sisdmk_admin \
  --postgres-database si_data
```

Checklist web:

- login berhasil di domain public
- session tetap aktif setelah refresh
- logout menghapus session
- upload/file storage tidak error
- AI/n8n hanya dicek setelah webhook dan secret terisi

## 5. Update Berikutnya

Untuk update biasa, ulangi command deploy yang sama. Tetap pakai `--force-env` jika `.env.casaos` lama pernah berisi key `MYSQL_*`.

Script akan menghapus container app lama `sisdmk2-app` sebelum start ulang app, tetapi dilakukan setelah build berhasil supaya downtime tidak dimulai sejak awal build.

## 6. Backup Database

Sesuaikan nama container, user, dan database dengan inventory server.

```bash
BACKUP_DIR="$PROJECTS_ROOT/backup"
mkdir -p "$BACKUP_DIR"

docker exec "$POSTGRES_CONTAINER" pg_dump -U sisdmk_admin -d si_data -Fc -f /tmp/si_data.backup
docker cp "$POSTGRES_CONTAINER:/tmp/si_data.backup" "$BACKUP_DIR/si_data-$(date +%F-%H%M).backup"
docker exec "$POSTGRES_CONTAINER" rm -f /tmp/si_data.backup
```

## 7. Cloudflare Tunnel

Ingress contoh:

```yaml
ingress:
  - hostname: info.kepegawaian.media
    service: http://127.0.0.1:8091
  - hostname: n8n.kepegawaian.media
    service: http://127.0.0.1:5678
  - service: http_status:404
```

Setelah tunnel/env berubah:

```bash
cd "$SOURCE_DIR"
docker compose --env-file .env.casaos -f docker-compose.casaos.yml up -d --force-recreate app
```

Jika server memakai `docker-compose`:

```bash
docker-compose --env-file .env.casaos -f docker-compose.casaos.yml up -d --force-recreate app
```
