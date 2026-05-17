# Prompt PPT Sistem Informasi SDM Kesehatan DKI Jakarta

Gunakan prompt ini untuk membuat PPT di Gamma, Canva, Microsoft Copilot, ChatGPT, atau tool pembuat presentasi lain. Sebelum digunakan, ambil screenshot dari halaman sistem sesuai daftar "Tampilan Sistem" di bawah, lalu lampirkan saat membuat PPT.

## Prompt Utama

Buat presentasi PowerPoint profesional berbahasa Indonesia untuk pimpinan/atasan tentang aplikasi "Sistem Informasi SDM Kesehatan Dinas Kesehatan Provinsi DKI Jakarta" atau "SI-DATA".

Gaya presentasi:
- Format 16:9, formal, ringkas, eksekutif, cocok untuk paparan kepada pimpinan pemerintahan.
- Visual bersih dengan warna utama biru Dinkes, putih, abu muda, dan aksen hijau/oranye secukupnya.
- Jangan terlalu ramai. Gunakan kombinasi ringkasan eksekutif, diagram alur, tabel ringkas, dan screenshot aplikasi.
- Setiap slide maksimal 4-5 poin utama.
- Gunakan istilah yang mudah dipahami pimpinan non-teknis, tetapi tetap sertakan ringkasan teknis pada slide arsitektur.
- Jika ada data pribadi pada screenshot seperti NIP, NIK, alamat, nomor HP, email, atau nama pegawai, samarkan/blur sebelum dimasukkan.

Tujuan presentasi:
Menjelaskan sistem dari A-Z: latar belakang, fungsi utama, aktor pengguna, modul, alur kerja, keamanan akses, manfaat organisasi, kesiapan operasional, dan rekomendasi pengembangan.

Ringkasan sistem:
Sistem Informasi SDM Kesehatan DKI Jakarta adalah aplikasi internal berbasis web untuk pengelolaan data pegawai Dinas Kesehatan Provinsi DKI Jakarta. Sistem ini mengelola master pegawai, dashboard analitik SDM, profil pegawai lengkap, Daftar Urut Kepangkatan, import Excel pegawai, import PDF DRH, proses usulan mutasi, usulan putus/pembebasan jabatan fungsional, serta QnA layanan kepegawaian. Akses sistem berbasis role sehingga data yang tampil mengikuti kewenangan pengguna.

Teknologi dan arsitektur:
- Frontend/backend: Next.js App Router, React, Tailwind CSS.
- Database: PostgreSQL dengan kompatibilitas query untuk struktur tabel yang sebelumnya bergaya MySQL.
- Autentikasi: JWT melalui HttpOnly cookie dengan masa sesi 8 jam.
- Keamanan akses: RBAC pada middleware, menu sidebar, dan API.
- Visualisasi data: Chart.js/react-chartjs-2.
- File dan dokumen: upload PDF checklist usulan ke storage lokal, pembuatan dokumen DOCX untuk form pertimbangan mutasi dan usulan putus JF.
- Deployment: mendukung Docker Compose dan CasaOS.

Data utama:
- UKPD: akun login, role, wilayah, jenis UKPD, referensi unit kerja.
- Pegawai: identitas, status pegawai, UKPD, jabatan, pangkat, pendidikan, kontak.
- Alamat: alamat KTP dan domisili berbasis referensi wilayah.
- Keluarga: pasangan/anak dan informasi pendukung.
- Riwayat DRH: pendidikan, jabatan, pangkat, gaji, SKP, penghargaan, hukuman disiplin, prestasi, narasumber, kegiatan strategis, dan keberhasilan.
- Usulan Mutasi: pengajuan mutasi, ABK/bezetting, status verifikasi, checklist, dan dokumen pendukung.
- Usulan Putus JF: pengajuan putus/pembebasan jabatan fungsional, angka kredit, data surat, checklist, dan dokumen pendukung.
- QnA: kategori dan pertanyaan-jawaban layanan kepegawaian.

Role pengguna:
- Publik/Pegawai: membaca QnA layanan kepegawaian di halaman awal.
- Admin UKPD: mengelola data dalam UKPD sendiri, melihat dashboard sesuai UKPD, mengisi data pegawai, dan mengunggah dokumen sesuai kewenangan.
- Admin Wilayah/Sudin: melihat data wilayah, memverifikasi usulan dari wilayahnya, memberi status dan catatan.
- Super Admin/Dinas: akses seluruh data, import massal, kelola QnA, verifikasi tingkat Dinas, dan cetak dokumen.

Buat susunan slide berikut:

1. Cover
Judul: "Sistem Informasi SDM Kesehatan DKI Jakarta"
Subjudul: "Paparan Sistem Pengelolaan Data Pegawai dan Layanan Kepegawaian"
Tambahkan logo Dinas Kesehatan DKI Jakarta bila tersedia.
Visual: screenshot halaman login/hero SI-DATA.

2. Latar Belakang
Jelaskan kebutuhan pengelolaan data SDM kesehatan yang terpusat, akurat, mudah dipantau, dan dapat dibatasi sesuai kewenangan unit kerja.
Poin utama: data pegawai besar, banyak UKPD, kebutuhan analitik cepat, kebutuhan layanan kepegawaian yang terdokumentasi, dan proses usulan yang perlu transparan.

3. Tujuan Sistem
Tampilkan 5 tujuan:
- Menjadi pusat data pegawai Dinkes DKI Jakarta.
- Mempercepat pencarian dan pembaruan data pegawai.
- Memberikan dashboard analitik SDM untuk pimpinan.
- Mendukung proses usulan mutasi dan putus JF secara terdokumentasi.
- Mengamankan akses data berdasarkan role.

4. Ringkasan Modul Utama
Buat diagram/module map berisi:
Dashboard, Data Pegawai, Profil Pegawai, Import Excel Pegawai, Import DRH, DUK, Usulan Mutasi, Usulan Putus JF, QnA Admin, Profil Akun.
Visual: gunakan screenshot sidebar/menu aplikasi.

5. Aktor dan Hak Akses
Buat tabel 4 baris:
Publik/Pegawai, Admin UKPD, Admin Wilayah/Sudin, Super Admin/Dinas.
Kolom: lingkup data, akses utama, contoh aktivitas.
Tekankan bahwa data yang tampil selalu mengikuti role.

6. Alur Sistem End-to-End
Buat flow diagram:
Publik melihat QnA -> pengguna login -> dashboard sesuai role -> kelola/import data pegawai -> lihat profil/DUK -> buat usulan -> verifikasi Sudin -> verifikasi Dinas -> cetak dokumen/arsip.

7. Dashboard Analitik SDM
Jelaskan fungsi dashboard:
- KPI total pegawai, PNS/CPNS, PPPK, PPPK Paruh Waktu, NON PNS, PJLP.
- Chart status pegawai, jenis kelamin, status pernikahan, pangkat, masa kerja, umur, pendidikan, dan proyeksi pensiun.
- Analitik detail dan drilldown berdasarkan UKPD, rumpun jabatan, jabatan, pendidikan-jurusan, dan masa kerja.
Visual: screenshot dashboard KPI dan grafik.

8. Data Pegawai dan Profil Lengkap
Jelaskan:
- Daftar pegawai dengan pencarian, filter status, wilayah, UKPD, export Excel.
- Aksi lihat profil, edit, hapus sesuai role.
- Profil pegawai terdiri dari ringkasan, kepegawaian, kontak/alamat, keluarga, dan riwayat.
Visual: screenshot halaman Data Pegawai dan Detail Profil Pegawai.

9. Form Tambah/Edit Pegawai
Jelaskan form bertahap:
- Identitas pribadi.
- Data kepegawaian.
- Jabatan dan pangkat.
- Pendidikan dan kontak.
- Alamat domisili dan KTP.
- Riwayat opsional.
Tambahkan catatan: field penting divalidasi, referensi UKPD/jabatan/alamat digunakan agar data konsisten.
Visual: screenshot form tambah/edit pegawai.

10. Import Data
Bagi menjadi dua bagian:
- Import Excel Pegawai: template Excel/CSV, validasi kolom wajib, update berdasarkan ID/NIP/NRK/NIK, hasil dibuat/diperbarui.
- Import PDF DRH: membaca PDF DRH, memetakan data diri dan riwayat, menyimpan ke tabel pegawai dan tabel riwayat.
Tambahkan aturan: Excel maksimal 8 MB, DRH PDF maksimal 10 MB.
Visual: screenshot halaman Import Excel dan Import DRH.

11. Daftar Urut Kepangkatan (DUK)
Jelaskan:
- Mengambil pegawai PNS sesuai role.
- Menggunakan pangkat terakhir dari riwayat pangkat bila tersedia.
- Menggunakan pendidikan formal terbaru bila tersedia.
- Urutan berdasarkan pangkat tertinggi, TMT pangkat terlama, pendidikan tertinggi, lalu nama.
- Dapat dicari, difilter, dan diekspor CSV.
Visual: screenshot halaman DUK.

12. Usulan Mutasi
Jelaskan alur:
Admin membuat usulan dengan NRK -> sistem menarik data pegawai -> isi UKPD tujuan, jabatan baru, jenis mutasi, alasan, ABK/bezetting -> upload checklist PDF -> status diverifikasi Sudin/Dinas -> cetak Form Pertimbangan Mutasi DOCX bila memenuhi status.
Status proses: Diusulkan, Verifikasi Sudin, Diterima Dinas, Verifikasi Dinas, Dikembalikan, Ditolak, Diproses, Selesai.
Checklist mutasi: surat pengantar, SK CPNS/PNS, SK pangkat terakhir, SK jabatan, DP3/SKP, ijazah, KTA/Karpeg, surat lolos butuh, surat lolos lepas, lampiran lainnya.
Visual: screenshot halaman Usulan Mutasi, detail checklist, dan panel verifikasi.

13. Usulan Putus/Pembebasan Jabatan Fungsional
Jelaskan alur:
Admin memasukkan NRK -> sistem menarik data pegawai -> isi jabatan baru/tujuan, angka kredit, data surat, asal surat, pimpinan, alasan putus/pembebasan JF -> upload checklist PDF -> verifikasi Sudin/Dinas -> cetak dokumen Usulan Putus JF DOCX bila memenuhi status.
Checklist putus JF: surat pengantar, surat usulan putus/pembebasan JF, SK jabatan fungsional, PAK/angka kredit terakhir, SK pangkat terakhir, SKP terakhir, surat pernyataan/alasan, analisis kebutuhan organisasi, draft surat putus JF, lampiran lainnya.
Visual: screenshot halaman Usulan Putus JF.

14. QnA Layanan Kepegawaian
Jelaskan dua sisi:
- Publik: pegawai dapat membaca informasi layanan kepegawaian tanpa login.
- Admin: Super Admin mengelola kategori dan item QnA, status published/draft.
Manfaat: mengurangi pertanyaan berulang dan membuat informasi layanan lebih mudah ditemukan.
Visual: screenshot QnA publik di halaman login dan QnA Admin.

15. Keamanan, Kontrol Akses, dan Audit Operasional
Tampilkan poin:
- JWT HttpOnly cookie untuk sesi login.
- Role-based access control pada halaman, sidebar, dan API.
- Data difilter berdasarkan Super Admin, Admin Wilayah, dan Admin UKPD.
- Idle logout 15 menit pada AppShell.
- Upload dokumen checklist wajib PDF maksimal 2 MB per item.
- Production wajib memakai JWT secret, password database, dan password akun yang kuat.

16. Manfaat untuk Pimpinan dan Organisasi
Buat 6 manfaat:
- Monitoring SDM lebih cepat dan berbasis data.
- Data pegawai lebih terpusat dan mudah ditelusuri.
- Proses usulan lebih transparan karena status, checklist, dan dokumen tercatat.
- Pengambilan keputusan lebih mudah melalui dashboard analitik dan DUK.
- Akses data lebih aman karena sesuai kewenangan.
- Informasi layanan kepegawaian lebih mudah diakses melalui QnA.

17. Catatan Kesiapan dan Pengembangan Lanjutan
Sampaikan dengan bahasa konstruktif:
- Dashboard usulan dapat dikembangkan agar menghitung real-time jumlah usulan mutasi/putus JF.
- Kebijakan akses halaman usulan untuk Admin UKPD perlu difinalkan karena menu/API menyiapkan akses UKPD, sementara middleware halaman saat ini membatasi /usulan ke Super Admin dan Admin Wilayah.
- Perlu SOP backup database dan storage dokumen.
- Perlu masking data pribadi saat demo/presentasi.
- Dapat ditambahkan audit trail perubahan data dan notifikasi status usulan.

18. Penutup
Pesan utama:
"SI-DATA menjadi fondasi pengelolaan SDM kesehatan yang lebih terpusat, terukur, aman, dan siap mendukung proses layanan kepegawaian Dinas Kesehatan DKI Jakarta."
Tambahkan slide "Terima kasih" dengan screenshot dashboard atau halaman login sebagai latar visual.

## Tampilan Sistem yang Perlu Disisipkan

Ambil screenshot dengan resolusi 16:9 atau crop rapi. Samarkan data pribadi bila ada.

1. `01-login-hero-qna.png`
Halaman: `/login`
Fokus: hero "Sistem Informasi SDM Kesehatan DKI Jakarta", form login, dan bila perlu bagian Pusat QnA.

2. `02-dashboard-kpi-chart.png`
Halaman: `/dashboard`
Fokus: KPI Total Pegawai, PNS/CPNS, PPPK, NON PNS, PJLP, serta grafik dashboard.

3. `03-dashboard-analitik-detail.png`
Halaman: `/dashboard`
Fokus: tab analitik detail seperti Daftar UKPD, Rumpun Jabatan, Jabatan, Pendidikan-Jurusan, atau Masa Kerja.

4. `04-data-pegawai-list.png`
Halaman: `/pegawai`
Fokus: tabel data pegawai, pencarian, filter status/wilayah/UKPD, tombol Export Excel, tombol Tambah Pegawai.

5. `05-form-tambah-pegawai.png`
Halaman: `/pegawai/new`
Fokus: form bertahap pegawai dan bagian identitas/data kepegawaian.

6. `06-detail-profil-pegawai.png`
Halaman: `/pegawai/[id]`
Fokus: ringkasan pegawai, tab Ringkasan, Kepegawaian, Kontak & Alamat, Keluarga, Riwayat.

7. `07-detail-riwayat-pegawai.png`
Halaman: `/pegawai/[id]`, tab Riwayat
Fokus: filter riwayat dan daftar riwayat pendidikan/jabatan/pangkat/SKP.

8. `08-daftar-urut-kepangkatan.png`
Halaman: `/duk`
Fokus: total PNS, filter DUK, tabel urutan pangkat, tombol Export CSV.

9. `09-import-excel-pegawai.png`
Halaman: `/import-pegawai`
Fokus: area upload Excel, tombol Template Excel, aturan import, hasil/baris error bila ada.

10. `10-import-drh.png`
Halaman: `/import-drh`
Fokus: area upload PDF DRH, ringkasan hasil import, data diri terbaca.

11. `11-usulan-mutasi.png`
Halaman: `/usulan/mutasi`
Fokus: kartu summary, flow step, tabel usulan, tombol Tambah/Verifikasi, checklist berkas.

12. `12-usulan-putus-jf.png`
Halaman: `/usulan/putus-jf`
Fokus: kartu summary, flow step, tabel usulan, detail checklist, tombol Cetak Usulan.

13. `13-qna-admin.png`
Halaman: `/qna-admin`
Fokus: ringkasan kategori/total QnA/published/draft, panel kategori, daftar item QnA.

14. `14-profil-akun.png`
Halaman: `/profil`
Fokus: username, role, UKPD, wilayah sebagai bukti akses berbasis role.

## Catatan Saat Demo

- Gunakan akun demo atau data yang sudah disamarkan.
- Jangan tampilkan file `.env`, password, token, atau konfigurasi rahasia.
- Untuk screenshot pegawai, blur NIK, NIP jika dianggap sensitif, alamat lengkap, nomor HP, email, dan nama keluarga.
- Untuk slide pimpinan, prioritaskan manfaat dan alur kerja; detail teknis cukup 1-2 slide.
