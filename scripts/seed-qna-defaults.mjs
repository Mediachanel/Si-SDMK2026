import pg from "pg";
import { loadDefaultEnv } from "./env.mjs";

const { Pool } = pg;

loadDefaultEnv(process.env.SEED_ENV_FILE);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} wajib diset.`);
  return value;
}

function databaseConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  return {
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "postgres",
    password: required("POSTGRES_PASSWORD"),
    database: process.env.POSTGRES_DATABASE || "si_data"
  };
}

const categories = [
  {
    name: "Mutasi",
    description: "Syarat, alur, dan verifikasi usulan mutasi pegawai.",
    sort_order: 10,
    items: [
      {
        question: "Apa saja syarat pengajuan mutasi pegawai?",
        answer: "Pengajuan mutasi umumnya membutuhkan surat permohonan, persetujuan unit asal dan tujuan, data pegawai yang valid, serta dokumen pendukung sesuai ketentuan kepegawaian yang berlaku.",
        status: "published"
      },
      {
        question: "Bagaimana cara memantau status usulan mutasi?",
        answer: "Status usulan dapat dipantau melalui akun SI-SDMK sesuai kewenangan UKPD. Jika data belum muncul, hubungi admin kepegawaian UKPD untuk verifikasi berkas.",
        status: "published"
      }
    ]
  },
  {
    name: "Cuti",
    description: "Persyaratan cuti dan dokumen yang harus disiapkan.",
    sort_order: 20,
    items: [
      {
        question: "Dokumen apa yang dibutuhkan untuk pengajuan cuti?",
        answer: "Dokumen cuti mengikuti jenis cuti yang diajukan. Siapkan formulir pengajuan, persetujuan atasan, dan dokumen pendukung seperti surat keterangan bila diperlukan.",
        status: "published"
      },
      {
        question: "Siapa yang memverifikasi pengajuan cuti?",
        answer: "Pengajuan cuti diverifikasi oleh pengelola kepegawaian sesuai unit kerja dan kewenangan administrasi masing-masing.",
        status: "published"
      }
    ]
  },
  {
    name: "Kenaikan Pangkat",
    description: "Tahapan dan dokumen kenaikan pangkat pegawai.",
    sort_order: 30,
    items: [
      {
        question: "Apa saja dokumen awal untuk kenaikan pangkat?",
        answer: "Dokumen awal biasanya mencakup data pegawai terbaru, SK pangkat terakhir, penilaian kinerja, dan dokumen pendukung lain sesuai jenis kenaikan pangkat.",
        status: "published"
      }
    ]
  },
  {
    name: "Disiplin Pegawai",
    description: "Informasi umum terkait aturan dan tindak lanjut disiplin pegawai.",
    sort_order: 40,
    items: [
      {
        question: "Ke mana harus berkonsultasi terkait disiplin pegawai?",
        answer: "Konsultasi awal dapat dilakukan melalui pengelola kepegawaian UKPD. Untuk kasus tertentu, koordinasikan dengan unit pembina kepegawaian sesuai kewenangan.",
        status: "published"
      }
    ]
  }
];

const pool = new Pool(databaseConfig());

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qna_category (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(160) NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS qna_item (
      id BIGSERIAL PRIMARY KEY,
      category_id BIGINT NOT NULL REFERENCES qna_category(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT qna_item_status_check CHECK (status IN ('draft', 'published'))
    )
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS qna_category_active_sort_idx ON qna_category(is_active, sort_order, name)");
  await pool.query("CREATE INDEX IF NOT EXISTS qna_item_category_status_idx ON qna_item(category_id, status)");

  for (const category of categories) {
    const result = await pool.query(
      `INSERT INTO qna_category (name, description, sort_order, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (name) DO UPDATE
       SET description = EXCLUDED.description,
           sort_order = EXCLUDED.sort_order,
           is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [category.name, category.description, category.sort_order]
    );

    const categoryId = result.rows[0].id;
    for (const item of category.items) {
      await pool.query(
        `INSERT INTO qna_item (category_id, question, answer, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [categoryId, item.question, item.answer, item.status]
      );
    }
  }

  console.log("Seed QnA default selesai.");
} finally {
  await pool.end();
}
