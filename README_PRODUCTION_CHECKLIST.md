# SI-SDMK Production Checklist

Use this before declaring a deployment healthy.

## Server

- Docker data root is on external storage.
- `sisdmk2-app` is running.
- PostgreSQL container from deployment inventory is running.
- If SISDMK owns its database, PostgreSQL container is dedicated or clearly documented.
- `sisdmk-n8n` is running.
- Containers are connected to `sisdmk2-network`.
- `docker system df` has been checked before repeat deploys on low-storage STB.

## Environment

- `APP_ORIGIN=https://dinkes.kepegawaian.media`
- `APP_URL=https://dinkes.kepegawaian.media`
- `COOKIE_SECURE=true`
- `ALLOW_INSECURE_LOCAL_HTTP=false`
- `TRUST_PROXY_HEADERS=true`
- `POSTGRES_HOST` matches the real PostgreSQL container name from `docker ps`.
- `POSTGRES_USER` can log in to `POSTGRES_DATABASE`.
- `POSTGRES_DATABASE` is the intended SISDMK database, not an unrelated app database.
- `AI_ENABLE_N8N=true`

## App

- `/api/health` returns success.
- Login works on public domain.
- Super Admin login uses the database username, for example `superadmin`, not the UI label `SUPER ADMIN`.
- Public QnA shows active categories and published questions; seed with `--seed-qna-defaults` when empty.
- Session persists after refresh.
- Logout clears session.
- Image/cache pages do not produce `/app/.next/cache/images` errors.

## Database

- `docker exec sisdmk2-app npm run check:postgres` passes.
- `si_data` contains imported production tables.
- Super Admin account exists; reset with deploy flags `--migrate-phase1 --seed-super-admin` when login returns 401.
- `qna_category` and `qna_item` exist and contain published rows.
- Backup file exists after restore.

## AI

- n8n webhook URLs are configured.
- n8n sends `x-ai-secret`.
- Internal chat receives JSON response.
- Public chat only answers published QnA.
- AI tool calls are visible in audit logs.

## Security

- Secrets rotated.
- Adminer is not public.
- n8n is protected.
- Cloudflare Tunnel does not expose unintended services.
- Backups are stored off-device.
