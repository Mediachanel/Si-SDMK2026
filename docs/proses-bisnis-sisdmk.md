# Draft Proses Bisnis SISDMK Dinas Kesehatan DKI Jakarta

Tanggal kajian: 28 April 2026

## 1. Ruang Lingkup Sistem

Sistem Informasi SDM Kesehatan DKI Jakarta digunakan untuk mengelola data pegawai, analitik SDM, daftar urut kepangkatan, import data pegawai/DRH, proses usulan mutasi dan putus jabatan fungsional, serta pusat QnA layanan kepegawaian.

Sistem berjalan dengan kontrol akses berbasis role. Data yang tampil selalu mengikuti lingkup pengguna yang sedang login.

## 2. Aktor Bisnis

| Aktor | Peran Bisnis | Hak Akses Utama |
| --- | --- | --- |
| Publik/Pegawai | Membaca informasi layanan kepegawaian | Melihat QnA publik di halaman awal |
| Admin UKPD | Pengelola data dan pengusul dari unit kerja | Melihat data UKPD sendiri, membuat/mengubah data dalam lingkup UKPD, membuat usulan, upload dokumen |
| Admin Wilayah/Sudin | Verifikator wilayah | Melihat data wilayah, memverifikasi usulan wilayah, memberi catatan/status |
| Super Admin/Dinas | Pengelola pusat | Akses seluruh data, import massal, import DRH, kelola QnA, verifikasi tingkat Dinas, cetak dokumen |

## 3. Data Utama

| Data | Sumber/Tabel | Keterangan |
| --- | --- | --- |
| UKPD | `ukpd` | Akun login, role, wilayah, jenis UKPD, referensi unit |
| Pegawai | `pegawai` | Identitas, status pegawai, UKPD, jabatan, pendidikan, kontak |
| Alamat | `alamat` | Alamat KTP dan domisili berbasis referensi wilayah |
| Keluarga | `keluarga` | Pasangan/anak dan informasi tunjangan/kontak |
| Riwayat DRH | `riwayat_*` | Pendidikan, jabatan, pangkat, gaji, SKP, penghargaan, hukuman, prestasi, narasumber, kegiatan strategis, keberhasilan |
| Usulan Mutasi | `usulan_mutasi` | Pengajuan mutasi, ABK/bezetting, checklist, status verifikasi |
| Usulan Putus JF | `usulan_pjf_stop` | Pengajuan putus/pembebasan JF, data surat, angka kredit, checklist |
| Dokumen Usulan | `storage/usulan-documents` dan kolom `dokumen_checklist` | File PDF per item checklist |
| QnA | `qna_category`, `qna_item` | Knowledge base layanan kepegawaian |

## 4. Peta Proses Level 0

1. Publik membuka halaman awal dan membaca QnA layanan.
2. Pengguna internal login memakai akun UKPD/role.
3. Sistem memvalidasi kredensial, membuat sesi, dan menentukan lingkup data.
4. Pengguna melihat dashboard SDM sesuai role.
5. Pengguna mengelola master pegawai atau melengkapi data melalui import.
6. Pengguna melihat DUK dan profil pegawai.
7. UKPD membuat usulan mutasi atau putus JF.
8. Sudin/Admin Wilayah memverifikasi kelengkapan dan status usulan.
9. Dinas/Super Admin melakukan verifikasi lanjutan dan mencetak dokumen jika memenuhi status.
10. Super Admin mengelola QnA dan data referensi/import.

## 5. Proses Login dan Akses

Trigger: pengguna membuka sistem dan mengisi username/password.

Alur:
1. Pengguna memasukkan nama UKPD, ID UKPD, atau kode UKPD dan password.
2. Sistem mencari akun pada tabel `ukpd`.
3. Sistem memverifikasi password hash.
4. Jika valid, sistem membuat sesi JWT melalui cookie HttpOnly selama 8 jam.
5. Sistem mengarahkan pengguna ke dashboard.
6. Middleware dan API membatasi halaman/data sesuai role.

Output: sesi login aktif dan akses menu sesuai role.

Aturan bisnis:
- Super Admin dapat melihat seluruh data.
- Admin Wilayah hanya melihat data pada wilayahnya.
- Admin UKPD hanya melihat data UKPD sendiri.
- Login production menolak password umum/lemah tertentu.

## 6. Proses Dashboard dan Analitik

Trigger: pengguna berhasil login atau membuka menu Dashboard.

Alur:
1. Sistem mengambil data pegawai sesuai role.
2. Sistem menghitung KPI total pegawai, PNS/CPNS, PPPK, PPPK Paruh Waktu, NON PNS, dan PJLP.
3. Sistem menampilkan chart berdasarkan status pegawai, jenis kelamin, dan status pernikahan.
4. Sistem menampilkan pivot/drilldown berdasarkan UKPD, rumpun jabatan, jabatan, pendidikan-jurusan, dan masa kerja.
5. Pengguna dapat mencari, membuka rincian sampai level pegawai, dan export CSV.

Output: ringkasan kondisi SDM dan daftar pegawai terbaru.

## 7. Proses Pengelolaan Data Pegawai

Trigger: pengguna membuka menu Data Pegawai.

Alur:
1. Sistem menampilkan daftar pegawai sesuai role.
2. Pengguna mencari/filter berdasarkan status, wilayah, dan UKPD.
3. Pengguna dapat export Excel sesuai filter dan lingkup akses.
4. Pengguna dapat menambah pegawai baru melalui form bertahap.
5. Pengguna dapat melihat profil pegawai.
6. Pengguna dapat mengedit atau menghapus data pegawai yang masih dalam lingkup aksesnya.

Form tambah/edit terdiri dari:
1. Identitas pribadi.
2. Data kepegawaian.
3. Jabatan dan pangkat.
4. Pendidikan dan kontak.
5. Alamat domisili dan KTP.
6. Riwayat opsional.

Output: data pegawai tersimpan/terbarui, termasuk alamat, keluarga, dan riwayat bila diisi.

Aturan bisnis:
- `nama`, `nama_ukpd`, dan `jenis_pegawai` wajib.
- Referensi UKPD, jabatan standar, agama, kontrak, pangkat/golongan, dan alamat divalidasi.
- Pengguna tidak boleh membuat atau memindahkan pegawai ke luar lingkup role.
- Draft form disimpan di browser untuk mencegah kehilangan input.

## 8. Proses Import Excel Pegawai

Trigger: Super Admin membuka menu Import Excel Pegawai.

Alur:
1. Super Admin mengunduh template Excel.
2. Super Admin mengisi sheet Pegawai sesuai aturan kolom.
3. Super Admin mengunggah file `.xlsx` atau `.csv`.
4. Sistem membaca dan memvalidasi seluruh baris.
5. Jika ada error, import dibatalkan dan sistem menampilkan baris yang perlu diperbaiki.
6. Jika valid, sistem mencari pegawai berdasarkan `id_pegawai`, NIP, NRK, atau NIK.
7. Jika data ditemukan, sistem memperbarui data.
8. Jika data tidak ditemukan, sistem membuat pegawai baru.

Output: laporan jumlah baris diproses, dibuat, dan diperbarui.

Aturan bisnis:
- Hanya Super Admin.
- Ukuran file maksimal 8 MB.
- Kolom wajib: `nama`, `nama_ukpd`, `jenis_pegawai`.
- Nama UKPD harus sesuai referensi sistem.
- Kolom kosong saat update tidak menghapus data lama.

## 9. Proses Import PDF DRH

Trigger: Super Admin membuka menu Import DRH.

Alur:
1. Super Admin memilih PDF DRH dari sumber resmi.
2. Sistem memvalidasi file PDF.
3. Sistem menjalankan parser PDF.
4. Sistem memetakan hasil parser ke pegawai dan tabel riwayat.
5. Sistem menjalankan transaksi database.
6. Jika berhasil, sistem menampilkan ringkasan data diri dan jumlah riwayat yang tersimpan.
7. Jika gagal, transaksi dibatalkan.

Output: pegawai dibuat/diperbarui dan riwayat DRH tersimpan.

Aturan bisnis:
- Hanya Super Admin.
- Format wajib PDF.
- Ukuran file maksimal 10 MB.
- Import DRH bersifat transaksional.

## 10. Proses Daftar Urut Kepangkatan (DUK)

Trigger: pengguna membuka menu DUK.

Alur:
1. Sistem mengambil pegawai PNS sesuai role.
2. Sistem mengambil pangkat terakhir dari riwayat pangkat bila tersedia.
3. Sistem mengambil pendidikan formal terbaru bila tersedia.
4. Sistem mengurutkan berdasarkan pangkat tertinggi, TMT pangkat terlama, pendidikan tertinggi, lalu nama.
5. Pengguna dapat mencari/filter dan export CSV.

Output: daftar DUK sesuai lingkup akses.

## 11. Proses Usulan Mutasi

Swimlane utama: Admin UKPD -> Admin Wilayah/Sudin -> Super Admin/Dinas -> Sistem.

Status proses:
- Diusulkan
- Verifikasi Sudin
- Diterima Dinas
- Verifikasi Dinas
- Dikembalikan
- Ditolak
- Diproses
- Selesai

Alur:
1. Admin UKPD/Sudin/Dinas membuka menu Usulan Mutasi.
2. Pengusul memasukkan NRK.
3. Sistem mencari data pegawai dari master dan mengisi NIP, nama, pangkat, UKPD asal, dan jabatan lama.
4. Pengusul mengisi UKPD tujuan, jabatan baru, jenis mutasi, alasan, dan data ABK/bezetting.
5. Pengusul mengunggah dokumen checklist PDF.
6. Sistem menyimpan usulan dengan status awal `Diusulkan`.
7. Admin Wilayah/Sudin memeriksa kelengkapan dokumen dan memberi checklist/catatan.
8. Jika lengkap, status dinaikkan ke `Diterima Dinas` atau `Verifikasi Dinas`.
9. Jika belum lengkap, status dapat menjadi `Dikembalikan` atau `Ditolak`.
10. Super Admin/Dinas melakukan verifikasi lanjutan.
11. Jika status memenuhi, Super Admin dapat mencetak Form Pertimbangan Mutasi DOCX.
12. Proses ditutup dengan status `Selesai` atau tindak lanjut ke Putus JF bila relevan.

Output: usulan mutasi terdokumentasi, status verifikasi, checklist dokumen, dan dokumen pertimbangan bila dicetak.

Aturan bisnis:
- Admin UKPD hanya dapat membuat usulan dari UKPD sendiri.
- Admin UKPD tidak dapat mengubah status/checklist verifikasi.
- Dokumen checklist wajib PDF, maksimal 2 MB per file.
- Super Admin dapat mencetak pertimbangan pada status Diterima Dinas, Verifikasi Dinas, Diproses, atau Selesai.

## 12. Proses Usulan Putus Jabatan Fungsional

Swimlane utama: Admin UKPD -> Admin Wilayah/Sudin -> Super Admin/Dinas -> Sistem.

Status proses sama dengan usulan mutasi.

Alur:
1. Pengusul membuka menu Usulan Putus JF.
2. Pengusul memasukkan NRK.
3. Sistem mengambil data pegawai dari master.
4. Pengusul mengisi jabatan baru/tujuan, angka kredit, data surat, asal surat, pimpinan, dan alasan putus/pembebasan JF.
5. Pengusul mengunggah dokumen checklist PDF.
6. Sistem menyimpan usulan dengan status awal `Diusulkan`.
7. Admin Wilayah/Sudin memverifikasi dasar usulan dan kelengkapan surat.
8. Jika lengkap, usulan diteruskan ke Dinas.
9. Super Admin/Dinas memverifikasi kecocokan dasar hukum, jabatan tujuan, dan data surat.
10. Jika status memenuhi, Super Admin dapat mencetak dokumen Usulan Putus JF DOCX.
11. Proses ditutup dengan status `Selesai` atau dikembalikan/ditolak bila belum sesuai.

Output: usulan putus/pembebasan JF, checklist dokumen, catatan verifikasi, dan surat usulan DOCX.

Aturan bisnis:
- Admin UKPD hanya dapat mengusulkan pegawai dari UKPD sendiri.
- Admin UKPD tidak dapat mengubah status/checklist verifikasi.
- Dokumen checklist wajib PDF, maksimal 2 MB per file.
- Super Admin dapat mencetak usulan pada status Diterima Dinas, Verifikasi Dinas, Diproses, atau Selesai.

## 13. Proses QnA Layanan Kepegawaian

Trigger publik: pengguna membuka halaman awal dan membuka bantuan kepegawaian.

Alur publik:
1. Publik membuka pusat QnA.
2. Sistem menampilkan kategori aktif dan item berstatus `published`.
3. Publik dapat mencari topik layanan dan membuka jawaban.

Trigger admin: Super Admin membuka menu QnA Admin.

Alur admin:
1. Super Admin membuat/mengubah/menghapus kategori.
2. Super Admin membuat/mengubah/menghapus item QnA.
3. Super Admin menentukan status item: `published` atau `draft`.
4. Item published otomatis tampil pada halaman publik.

Output: knowledge base layanan kepegawaian yang dapat dibaca publik.

## 14. Catatan Untuk Penyusunan BPMN/SOP

Rekomendasi diagram utama:
1. Proses Login dan Otorisasi.
2. Proses Pengelolaan Master Pegawai.
3. Proses Import Excel Pegawai.
4. Proses Import DRH.
5. Proses Usulan Mutasi.
6. Proses Usulan Putus JF.
7. Proses QnA Publik dan Admin.

Catatan validasi sebelum final:
- Menu dan API mengenal Admin UKPD pada modul usulan, tetapi middleware halaman `/usulan` saat ini membatasi akses halaman ke Super Admin dan Admin Wilayah. Perlu diputuskan apakah Admin UKPD memang boleh membuka halaman usulan atau hanya API-nya yang masih disiapkan.
- Dashboard masih menampilkan ringkasan usulan sebagai nilai `0`, walaupun modul usulan sudah ada. Jika proses bisnis membutuhkan monitoring usulan di dashboard, hitungan usulan perlu disambungkan ke database.
- Tabel QnA belum tercantum pada `database/schema.sql`; bila dokumen proses bisnis dijadikan dokumen implementasi, skema QnA perlu ditambahkan ke skema resmi.

## 15. Kamus Data Tabel

Bagian ini merangkum data/kolom yang disimpan pada tabel sistem. Kolom inti diambil dari `database/schema.sql`. Untuk kolom aktif yang dipakai aplikasi tetapi belum sepenuhnya tertulis pada skema dasar, rujukannya diambil dari SQL export dan route/API aplikasi.

### 15.1 Tabel Akun dan Unit Kerja

| Tabel | Data/Kolom | Fungsi Bisnis |
| --- | --- | --- |
| `ukpd` | `id_ukpd`, `ukpd_id`, `nama_ukpd`, `password`, `jenis_ukpd`, `role`, `wilayah`, `created_at` | Menyimpan master UKPD sekaligus akun login pengguna. Dipakai untuk autentikasi, role, filter wilayah, dan label unit kerja. |

Catatan:
- `id_ukpd` adalah identitas utama UKPD.
- `ukpd_id` dipakai pada data hasil import/export dan login alternatif.
- `role` berisi `SUPER_ADMIN`, `ADMIN_WILAYAH`, atau `ADMIN_UKPD`.
- `password` berisi hash, bukan password terbuka.

### 15.2 Tabel Master Pegawai

| Tabel | Data/Kolom | Fungsi Bisnis |
| --- | --- | --- |
| `pegawai` | `id_pegawai`, `nama`, `jenis_kelamin`, `tempat_lahir`, `tanggal_lahir`, `nik`, `agama`, `nama_ukpd`, `jenis_ukpd`, `wilayah`, `jenis_pegawai`, `status_rumpun`, `jenis_kontrak`, `nrk`, `nip`, `nama_jabatan_orb`, `nama_jabatan_menpan`, `struktur_atasan_langsung`, `pangkat_golongan`, `tmt_pangkat_terakhir`, `jenjang_pendidikan`, `program_studi`, `nama_universitas`, `no_hp_pegawai`, `email`, `no_bpjs`, `kondisi`, `status_perkawinan`, `gelar_depan`, `gelar_belakang`, `tmt_kerja_ukpd`, `created_at`, `id_ukpd`, `ukpd_id`, `jenjang_pendidikan_raw`, `status_rumpun_raw`, `nama_jabatan_menpan_raw`, `jenis_kelamin_raw` | Menyimpan profil utama pegawai untuk dashboard, pencarian, DUK, profil pegawai, export, dan dasar pengisian usulan. |

Kelompok data pada tabel `pegawai`:
- Identitas: `id_pegawai`, `nama`, `gelar_depan`, `gelar_belakang`, `nik`, `jenis_kelamin`, `tempat_lahir`, `tanggal_lahir`, `agama`.
- Unit kerja: `id_ukpd`, `ukpd_id`, `nama_ukpd`, `jenis_ukpd`, `wilayah`.
- Status pegawai: `jenis_pegawai`, `status_rumpun`, `jenis_kontrak`, `kondisi`, `tmt_kerja_ukpd`.
- Nomor administrasi: `nrk`, `nip`, `no_bpjs`.
- Jabatan/pangkat: `nama_jabatan_orb`, `nama_jabatan_menpan`, `struktur_atasan_langsung`, `pangkat_golongan`, `tmt_pangkat_terakhir`.
- Pendidikan: `jenjang_pendidikan`, `program_studi`, `nama_universitas`.
- Kontak: `no_hp_pegawai`, `email`.
- Normalisasi/import: `jenjang_pendidikan_raw`, `status_rumpun_raw`, `nama_jabatan_menpan_raw`, `jenis_kelamin_raw`.

### 15.3 Tabel Alamat dan Keluarga

| Tabel | Data/Kolom | Fungsi Bisnis |
| --- | --- | --- |
| `alamat` | `id`, `id_pegawai`, `tipe`, `jalan`, `kelurahan`, `kecamatan`, `kota_kabupaten`, `provinsi`, `kode_provinsi`, `kode_kota_kab`, `kode_kecamatan`, `kode_kelurahan`, `created_at` | Menyimpan alamat domisili dan KTP pegawai. Kode wilayah dipakai agar alamat konsisten dengan referensi resmi. |
| `keluarga` | `id`, `id_pegawai`, `hubungan`, `hubungan_detail`, `status_punya`, `status_tunjangan`, `urutan`, `nama`, `jenis_kelamin`, `tempat_lahir`, `tanggal_lahir`, `no_tlp`, `email`, `pekerjaan`, `sumber_tabel`, `sumber_id`, `created_at`, `updated_at` | Menyimpan data pasangan dan anak pegawai. Dipakai pada profil pegawai dan import DRH. |

Catatan:
- `alamat.tipe` berisi `domisili` atau `ktp`.
- `keluarga.hubungan` berisi `pasangan` atau `anak`.
- `sumber_tabel` dan `sumber_id` menyimpan asal data saat migrasi/import dari data lama.

### 15.4 Tabel Riwayat Pegawai

| Tabel | Data/Kolom | Fungsi Bisnis |
| --- | --- | --- |
| `riwayat_jabatan` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `gelar_depan`, `gelar_belakang`, `jenis_jabatan`, `lokasi`, `nama_jabatan_orb`, `nama_jabatan_menpan`, `struktur_atasan_langsung`, `nama_ukpd`, `wilayah`, `jenis_pegawai`, `status_rumpun`, `pangkat_golongan`, `eselon`, `tmt_jabatan`, `nomor_sk`, `tanggal_sk`, `keterangan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan riwayat jabatan pegawai. Dipakai pada tab Riwayat dan profil karier. |
| `riwayat_pangkat` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `pangkat_golongan`, `tmt_pangkat`, `lokasi`, `nomor_sk`, `tanggal_sk`, `keterangan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan riwayat pangkat. Dipakai untuk profil dan DUK. |
| `riwayat_pendidikan` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `jenis_riwayat`, `jenjang_pendidikan`, `program_studi`, `nama_institusi`, `nama_universitas`, `kota_institusi`, `tahun_lulus`, `nomor_ijazah`, `tanggal_ijazah`, `keterangan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan pendidikan formal dan non formal. Dipakai untuk profil, DUK, dan analitik pendidikan. |
| `riwayat_gaji_pokok` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `tmt_gaji`, `pangkat_golongan`, `gaji_pokok`, `nomor_sk`, `tanggal_sk`, `keterangan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan riwayat gaji pokok pegawai. |
| `riwayat_penghargaan` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `nama_penghargaan`, `asal_penghargaan`, `nomor_sk`, `tanggal_sk`, `keterangan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan penghargaan pegawai. |
| `riwayat_skp` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `tahun`, `nilai_skp`, `nilai_perilaku`, `nilai_prestasi`, `keterangan_prestasi`, `keterangan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan nilai kinerja tahunan/SKP pegawai. |
| `riwayat_hukuman_disiplin` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `tanggal_mulai`, `tanggal_akhir`, `hukuman_disiplin`, `nomor_sk`, `tanggal_sk`, `keterangan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan catatan hukuman disiplin pegawai. |
| `riwayat_prestasi_pendidikan` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `kategori`, `jenjang_pendidikan`, `prestasi`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan prestasi pendidikan formal/non formal. |
| `riwayat_narasumber` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `kegiatan`, `judul_materi`, `lembaga_penyelenggara`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan pengalaman sebagai narasumber. |
| `riwayat_kegiatan_strategis` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `kegiatan`, `tahun_anggaran`, `jumlah_anggaran`, `kedudukan_dalam_kegiatan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan keterlibatan pada kegiatan strategis. |
| `riwayat_keberhasilan` | `id`, `id_pegawai`, `nip`, `nama_pegawai`, `jabatan`, `tahun`, `keberhasilan`, `kendala_yang_dihadapi`, `solusi_yang_dilakukan`, `sumber`, `source_key`, `created_at`, `updated_at` | Menyimpan capaian kerja, kendala, dan solusi. |

Catatan:
- `source_key` dipakai untuk mencegah duplikasi saat import DRH.
- `sumber` menyimpan asal data, misalnya hasil parser/import.
- Sebagian tanggal pada tabel riwayat masih berupa teks karena mengikuti format sumber DRH.

### 15.5 Tabel Usulan Mutasi

| Tabel | Data/Kolom | Fungsi Bisnis |
| --- | --- | --- |
| `usulan_mutasi` | `id`, `nrk`, `nip`, `nama_pegawai`, `gelar_depan`, `gelar_belakang`, `nama_ukpd`, `ukpd_tujuan`, `jabatan`, `jabatan_baru`, `pangkat_golongan`, `abk_j_lama`, `bezetting_j_lama`, `nonasn_bezetting_lama`, `nonasn_abk_lama`, `abk_j_baru`, `bezetting_j_baru`, `nonasn_bezetting_baru`, `nonasn_abk_baru`, `jenis_mutasi`, `alasan`, `berkas_path`, `status`, `verif_checklist`, `dokumen_checklist`, `keterangan`, `tanggal_usulan`, `created_by_ukpd`, `created_at`, `updated_at` | Menyimpan pengajuan mutasi pegawai, kebutuhan/formasi ABK, status proses, catatan verifikasi, dan checklist dokumen. |

Kelompok data pada `usulan_mutasi`:
- Identitas pegawai: `nrk`, `nip`, `nama_pegawai`, `gelar_depan`, `gelar_belakang`, `pangkat_golongan`.
- Mutasi: `nama_ukpd`, `ukpd_tujuan`, `jabatan`, `jabatan_baru`, `jenis_mutasi`, `alasan`.
- Kebutuhan/formasi: `abk_j_lama`, `bezetting_j_lama`, `nonasn_bezetting_lama`, `nonasn_abk_lama`, `abk_j_baru`, `bezetting_j_baru`, `nonasn_bezetting_baru`, `nonasn_abk_baru`.
- Verifikasi: `status`, `verif_checklist`, `dokumen_checklist`, `keterangan`.
- Audit sederhana: `tanggal_usulan`, `created_by_ukpd`, `created_at`, `updated_at`.

### 15.6 Tabel Usulan Putus Jabatan Fungsional

| Tabel | Data/Kolom | Fungsi Bisnis |
| --- | --- | --- |
| `usulan_pjf_stop` | `id`, `nrk`, `nip`, `nama_pegawai`, `pangkat_golongan`, `nama_ukpd`, `jabatan`, `jabatan_baru`, `angka_kredit`, `nomor_surat`, `tanggal_surat`, `hal`, `pimpinan`, `asal_surat`, `alasan_pemutusan`, `berkas_path`, `status`, `verif_checklist`, `dokumen_checklist`, `keterangan`, `tanggal_usulan`, `created_by_ukpd`, `created_at`, `updated_at` | Menyimpan usulan putus/pembebasan jabatan fungsional, data surat, angka kredit, alasan, status, dan dokumen pendukung. |

Kelompok data pada `usulan_pjf_stop`:
- Identitas pegawai: `nrk`, `nip`, `nama_pegawai`, `pangkat_golongan`, `nama_ukpd`.
- Jabatan: `jabatan`, `jabatan_baru`, `angka_kredit`.
- Surat: `nomor_surat`, `tanggal_surat`, `hal`, `pimpinan`, `asal_surat`.
- Substansi usulan: `alasan_pemutusan`.
- Verifikasi: `status`, `verif_checklist`, `dokumen_checklist`, `keterangan`.
- Audit sederhana: `tanggal_usulan`, `created_by_ukpd`, `created_at`, `updated_at`.

### 15.7 Tabel QnA

| Tabel | Data/Kolom | Fungsi Bisnis |
| --- | --- | --- |
| `qna_category` | `id`, `name`, `description`, `sort_order`, `is_active`, `created_at`, `updated_at` | Menyimpan kategori QnA layanan kepegawaian. |
| `qna_item` | `id`, `category_id`, `question`, `answer`, `status`, `created_at`, `updated_at` | Menyimpan daftar pertanyaan dan jawaban. Item `published` tampil di halaman publik, item `draft` hanya dikelola admin. |

Catatan:
- `qna_item.category_id` terhubung ke `qna_category.id`.
- Jika kategori tidak aktif, itemnya tidak ditampilkan di QnA publik.
- Skema QnA perlu ditambahkan ke dokumen skema resmi bila dokumen proses bisnis ini dipakai sebagai rujukan implementasi.

### 15.8 Data Dokumen Fisik Usulan

Dokumen checklist usulan tidak disimpan sebagai blob di database. File PDF disimpan di folder `storage/usulan-documents`, sedangkan metadata file disimpan di kolom `dokumen_checklist` dalam format JSON.

Metadata dokumen yang disimpan:
- `key`: kode item checklist.
- `label`: nama dokumen checklist.
- `name`: nama file PDF.
- `path`: lokasi file pada storage.
- `size`: ukuran file.
- `content_type`: tipe file, umumnya `application/pdf`.
- `uploaded_at`: waktu upload.
- `uploaded_by`: pengguna/unit pengunggah.
