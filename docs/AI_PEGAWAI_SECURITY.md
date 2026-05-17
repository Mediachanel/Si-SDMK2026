# AI Pegawai Security

Dokumen ini menjelaskan integrasi AI Pegawai SI-SDMK setelah keputusan terbaru: AI membaca langsung dari tabel `pegawai`, tidak lagi dari `ai_pegawai_basic_view`.

## Arsitektur AI

Alur utama:

1. User login SI-SDMK mengirim pertanyaan ke `POST /api/ai/pegawai-search` atau `/api/ai/chat`.
2. Backend mengambil session user dan membentuk `role_scope`.
3. `src/lib/aiSafePegawaiQuery.js` mendeteksi intent, membersihkan keyword, menerapkan role scope, dan membangun query parameterized.
4. Query dijalankan dengan pool database khusus `ai_readonly`.
5. Semua query AI dicatat ke `ai_query_logs` memakai koneksi aplikasi utama.
6. n8n menerima payload terbatas: `event`, `question`, `role_scope`, `allowed_table`, `allowed_columns`, dan `system_prompt`.

AI tidak boleh membuat query langsung di luar safe query builder.

## Role Scope

Scope diterapkan otomatis oleh `enforceRoleFilter()`:

| Role | Filter wajib |
| --- | --- |
| `SUPER_ADMIN` | Boleh membaca seluruh data dasar pegawai |
| `ADMIN_WILAYAH` | `WHERE wilayah = currentUser.wilayah` |
| `ADMIN_UKPD` | `WHERE ukpd = currentUser.ukpd` atau `currentUser.nama_ukpd` |
| `USER` | `WHERE id = currentUser.pegawai_id` |

Jika user meminta data di luar scope, AI harus menjawab:

```text
Maaf, data tersebut berada di luar kewenangan akses Anda.
```

## Readonly Database

Koneksi AI memakai user PostgreSQL:

```text
ai_readonly
```

Konfigurasi:

```env
AI_POSTGRES_USER=ai_readonly
AI_POSTGRES_PASSWORD=...
AI_MAX_QUERY_ROWS=50
AI_QUERY_TIMEOUT=10000
AI_ALLOWED_TABLES=pegawai
```

Migrasi:

```bash
psql "$DATABASE_URL" -f database/migrations/create_ai_readonly_user.sql
```

User `ai_readonly` hanya diberi `SELECT` column-level pada kolom dasar `pegawai` dan tidak memiliki hak `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, atau `TRIGGER`.

## Allowed Columns

Kolom output AI:

```text
id
nama
nip
nrk
nama_jabatan
ukpd
wilayah
status_pegawai
jenis_kelamin
pendidikan
rumpun
created_at
updated_at
```

Mapping dari tabel `pegawai`:

| Output AI | Source |
| --- | --- |
| `id` | `id_pegawai` |
| `nama_jabatan` | `COALESCE(nama_jabatan_menpan, nama_jabatan_orb)` |
| `ukpd` | `nama_ukpd` |
| `status_pegawai` | `jenis_pegawai` |
| `pendidikan` | `jenjang_pendidikan` |
| `rumpun` | `status_rumpun` |
| `updated_at` | fallback `created_at` untuk kompatibilitas database saat ini |

Kolom terlarang mencakup `nik`, alamat lengkap, nomor HP, data keluarga, password/token, BPJS, dan dokumen pribadi.

## Blocked SQL

`preventDangerousSQL()` memblokir query selain `SELECT`, `SELECT *`, multi-statement, tabel selain `pegawai`, dan keyword:

```text
INSERT
UPDATE
DELETE
DROP
ALTER
TRUNCATE
CREATE
EXEC
UNION
INFORMATION_SCHEMA
PG_CATALOG
```

Jika keyword tersebut muncul di query yang akan dieksekusi, backend melempar `Security violation`.

## Contoh Query Aman

Cari perawat Jakarta Timur:

```sql
SELECT
  p."id_pegawai" AS "id",
  p."nama" AS "nama",
  CAST(p."nip" AS TEXT) AS "nip",
  CAST(p."nrk" AS TEXT) AS "nrk",
  COALESCE(NULLIF(p."nama_jabatan_menpan", ''), p."nama_jabatan_orb", '') AS "nama_jabatan",
  p."nama_ukpd" AS "ukpd",
  p."wilayah" AS "wilayah",
  p."jenis_pegawai" AS "status_pegawai",
  p."jenis_kelamin" AS "jenis_kelamin",
  p."jenjang_pendidikan" AS "pendidikan",
  p."status_rumpun" AS "rumpun",
  p."created_at" AS "created_at",
  p."created_at" AS "updated_at"
FROM "pegawai" p
WHERE LOWER(COALESCE(p."wilayah", '')) = LOWER($1)
  AND COALESCE(NULLIF(p."nama_jabatan_menpan", ''), p."nama_jabatan_orb", '') ILIKE $2 ESCAPE '\'
ORDER BY p."nama" ASC, p."id_pegawai" ASC
LIMIT 50
```

Parameter:

```json
["Jakarta Timur", "%perawat%"]
```

Hitung PPPK di UKPD user:

```sql
SELECT
  COUNT(p."id_pegawai")::int AS "total"
FROM "pegawai" p
WHERE LOWER(COALESCE(p."nama_ukpd", '')) = LOWER($1)
  AND LOWER(COALESCE(p."jenis_pegawai", '')) = LOWER($2)
LIMIT 50
```

## Mitigasi SQL Injection

- Semua input user masuk sebagai parameter `$1`, `$2`, dan seterusnya.
- Keyword pencarian tidak pernah diinterpolasi ke SQL.
- Wildcard `LIKE` di-escape.
- Query divalidasi ulang oleh `preventDangerousSQL()` sebelum eksekusi.
- `LIMIT 50` wajib.
- Query timeout memakai `AI_QUERY_TIMEOUT`.
- User database AI adalah `ai_readonly`.

## Mitigasi Prompt Injection

- Prompt n8n selalu membawa `role_scope`, `allowed_table`, dan `allowed_columns`.
- System prompt menyatakan AI hanya boleh membaca data dasar dari `pegawai`.
- Permintaan user tidak bisa menambah kolom atau mengganti tabel karena backend tidak menerima SQL bebas dari model.
- Jika user meminta data sensitif atau data luar scope, backend tetap menerapkan role filter dan kolom allowlist.

## Audit Log

Setiap query AI dicatat ke:

```text
ai_query_logs
```

Kolom:

```text
id
user_id
role
question
generated_query
query_status
created_at
```

Status umum: `success`, `blocked`, atau `failed`.
