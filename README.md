# SIAKAD ITSC - Portal Kampus Fiktif (Praktikum Keamanan Sistem Informasi)

**Institut Teknologi & Sains Cakrawala (ITSC)**  
*Portal Akademik Terpadu untuk Pengujian & Audit Keamanan Perangkat Lunak*

---

## 📌 Ringkasan Proyek
Proyek ini dibangun untuk memenuhi tugas **Keamanan Sistem Informasi (KSI) - Semester 5**:
> *"Bangun portal kampus fiktif untuk latihan: mahasiswa bisa masuk, melihat nilai, mengunggah tugas, dan berdiskusi; dosen bisa memberi nilai; admin mengelola akun. Seluruh akun dan datanya sintetis (*Tidak boleh sama)."*

Sistem dilengkapi dengan **Laboratorium Audit Keamanan Terpadu** yang memiliki sakelar **Mode Rentan (Vulnerable Mode 🔴)** dan **Mode Aman (Secure Mode 🟢)** untuk mendemonstrasikan secara langsung cara kerja celah keamanan dan teknik mitigasinya.

---

## 👥 Akun & Data Sintetis (Tersedia Quick-Switch Demo)

| Peran (Role) | Nama Lengkap | Username / NIM / NIDN | Kata Sandi | Deskripsi |
|---|---|---|---|---|
| **Mahasiswa 1** | Dimas Arya Pratama | `220555101` | `mahasiswa123` | Mahasiswa Teknik Informatika (Semester 5) |
| **Mahasiswa 2** | Adinda Zahra Kirana | `220555102` | `mahasiswa123` | Mahasiswa Sistem Informasi (Semester 5) |
| **Mahasiswa 3** | Reza Aditya Fajar | `220555103` | `mahasiswa123` | Mahasiswa Teknik Informatika (Semester 5) |
| **Dosen 1** | Dr. Ir. Bagus Suhartono, M.Kom. | `dosen_bagus` / `0415088201` | `dosen123` | Dosen Keamanan Sistem & Ethical Hacking |
| **Dosen 2** | Sri Rahayu Ningrum, S.Kom., M.T. | `dosen_siti` / `0422038702` | `dosen123` | Dosen Rekayasa Perangkat Lunak |
| **Admin** | Biro Sistem Informasi & TI ITSC | `admin_itsc` | `admin123` | Administrator Pengelola Akun Kampus |

---

## 🚀 Fitur Utama Sistem

1. **Mahasiswa**:
   - Masuk (Autentikasi akun & Quick Switcher).
   - Melihat Kartu Hasil Studi (KHS) lengkap dengan SKS, nilai huruf, nilai angka, persentase kehadiran, dan IPK kumulatif.
   - Mengunggah berkas penugasan praktikum beserta catatan mahasiswa.
   - Mengikuti forum diskusi akademik (membuat thread dan membalas komentar).
2. **Dosen**:
   - Menerbitkan penugasan kuliah baru lengkap dengan tenggat waktu (*deadline*).
   - Melihat seluruh berkas tugas yang dikumpulkan mahasiswa.
   - Menginput nilai angka (skala 0 - 100) serta umpan balik evaluasi tugas.
   - Mengubah/memperbarui nilai KHS mahasiswa.
3. **Admin**:
   - Mengelola seluruh akun pengguna kampus (CRUD: Tambah akun baru, Edit data/role, Reset kata sandi, dan Hapus akun).
4. **Laboratorium Audit & Pengujian Keamanan**:
   - Modal interaktif panduan audit dengan tombol salin payload PoC otomatis.
   - Sakelar satu klik untuk mengubah sistem antara **Mode Rentan 🔴** dan **Mode Aman 🟢**.

---

## 🛡️ Kerentanan Sengaja yang Diimplementasikan (Untuk Jawaban Soal)

### 1. Stored XSS (Cross-Site Scripting)
- **Lokasi Celah**: Forum Diskusi Kampus (`/api/forum/threads/:id/reply` dan `/api/forum/threads`).
- **Penyebab**: Di Mode Rentan, input komentar disimpan ke database SQLite dan dirender langsung ke DOM tanpa proses *HTML entity encoding*.
- **Bukti Eksploitasi (PoC)**:
  ```html
  <img src="x" onerror="alert('🚨 [STORED XSS] Script Berhasil Dieksekusi di Forum Kampus!')">
  ```
- **Mitigasi di Mode Aman**: Server menerapkan fungsi sanitasi `sanitizeHtml()` yang mengubah karakter `<`, `>`, `&`, `"`, `'` menjadi entitas HTML aman (`&lt;`, `&gt;`).

### 2. Validasi Berkas Lemah (Unrestricted File Upload)
- **Lokasi Celah**: Pengunggahan Tugas Mahasiswa (`/api/assignments/:id/submit`).
- **Penyebab**: Server tidak memvalidasi ekstensi maupun header MIME berkas di Mode Rentan, sehingga file `.html`, `.php`, atau `.svg` berisikan skrip berbahaya dapat diunggah dan diakses langsung melalui peramban.
- **Bukti Eksploitasi (PoC)**: Mengunggah file `payload.html` yang mengeksekusi script saat dibuka dosen.
- **Mitigasi di Mode Aman**: Menerapkan whitelist ekstensi berkas (`.pdf`, `.docx`, `.zip`, `.rar`, `.png`, `.jpg`), validasi MIME type, serta pengubahan nama berkas secara acak (UUID/timestamp hash).

### 3. IDOR / Kontrol Akses Lemah (Insecure Direct Object Reference)
- **Lokasi Celah**: Melihat Nilai KHS (`/api/grades/:studentId`) dan Unduh Tugas (`/api/submissions/download/:id`).
- **Penyebab**: Di Mode Rentan, API mempercayai parameter ID objek di URL tanpa memeriksa apakah pengguna yang sedang login memiliki hak atas data tersebut. Mahasiswa A (ID 4) cukup mengganti ID di URL ke 5 atau 6 untuk mengintip nilai rahasia mahasiswa lain.
- **Bukti Eksploitasi (PoC)**: Mengakses `GET /api/grades/5` saat login sebagai Dimas Arya Pratama (ID 4).
- **Mitigasi di Mode Aman**: Validasi otorisasi kepemilikan di sisi server: memastikan `req.user.id === targetStudentId` atau role adalah `dosen` / `admin`.

### 4. SQL Injection
- **Lokasi Celah**: Pencarian Mata Kuliah (`/api/courses/search?q=...`) & Autentikasi Login (`/api/auth/login`).
- **Penyebab**: Query SQL disusun menggunakan penggabungan string langsung (*raw string concatenation*) tanpa *prepared statement*.
- **Bukti Eksploitasi (PoC)**:
  - Bypass Login: Username `admin_itsc' --` atau Kata sandi `' OR '1'='1`
  - Injeksi Pencarian: `' UNION SELECT 99, 'Hacked', 'SQLi-MK', 4, 1, 1, '2026' --`
- **Mitigasi di Mode Aman**: Seluruh query menggunakan *Parameterized Queries / Prepared Statements* (`db.prepare('... WHERE x = ?')`).

---

## 💻 Cara Menjalankan Proyek Secara Lokal

1. **Pastikan Node.js terpasang** (disarankan v18 ke atas).
2. **Instal dependensi**:
   ```bash
   npm install
   ```
3. **Jalankan server aplikasi**:
   ```bash
   npm start
   ```
4. **Buka di peramban**:
   Akses `http://localhost:3000`
