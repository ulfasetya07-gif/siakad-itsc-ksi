const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'campus_portal.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDatabase() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      email TEXT,
      role TEXT, -- 'mahasiswa', 'dosen', 'admin'
      identifier TEXT, -- NIM for mahasiswa, NIDN for dosen, NIP for admin
      prodi TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT,
      sks INTEGER,
      semester INTEGER,
      dosen_id INTEGER,
      FOREIGN KEY (dosen_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      course_id INTEGER,
      grade_letter TEXT DEFAULT 'B+',
      grade_number REAL DEFAULT 83.5,
      attendance_percent INTEGER DEFAULT 92,
      semester TEXT DEFAULT '2025/2026 Ganjil',
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER,
      dosen_id INTEGER,
      title TEXT,
      description TEXT,
      deadline DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (dosen_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER,
      student_id INTEGER,
      file_name TEXT,
      file_path TEXT,
      original_name TEXT,
      file_size INTEGER,
      student_notes TEXT,
      score REAL DEFAULT NULL,
      feedback TEXT DEFAULT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      graded_at DATETIME DEFAULT NULL,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS forum_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      content TEXT,
      category TEXT DEFAULT 'Akademik',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER,
      user_id INTEGER,
      reply_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Initialize default security settings
  const checkSetting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('vulnerable_mode');
  if (!checkSetting) {
    db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)').run('vulnerable_mode', 'true');
  }

  // Seed initial synthetic users if table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedSyntheticData();
  }
}

function seedSyntheticData() {
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, name, email, role, identifier, prodi, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Admin
  insertUser.run(
    'admin_itsc',
    'admin123',
    'Biro Sistem Informasi & TI (Admin Pusat)',
    'admin@itsc.ac.id',
    'admin',
    'ADM-2023-001',
    'Biro Akademik & Kemahasiswaan',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );

  // Dosen 1: Keamanan Sistem
  insertUser.run(
    'dosen_bagus',
    'dosen123',
    'Dr. Ir. Bagus Suhartono, M.Kom.',
    'bagus.suhartono@itsc.ac.id',
    'dosen',
    '0415088201',
    'Teknik Informatika & Keamanan Siber',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  );

  // Dosen 2: Rekayasa Perangkat Lunak
  insertUser.run(
    'dosen_siti',
    'dosen123',
    'Sri Rahayu Ningrum, S.Kom., M.T.',
    'sri.rahayu@itsc.ac.id',
    'dosen',
    '0422038702',
    'Sistem Informasi Enterprise',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  );

  // Mahasiswa 1
  insertUser.run(
    '220555101',
    'mahasiswa123',
    'Dimas Arya Pratama',
    'dimas.arya@student.itsc.ac.id',
    'mahasiswa',
    '220555101',
    'Teknik Informatika',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  );

  // Mahasiswa 2
  insertUser.run(
    '220555102',
    'mahasiswa123',
    'Adinda Zahra Kirana',
    'adinda.zahra@student.itsc.ac.id',
    'mahasiswa',
    '220555102',
    'Sistem Informasi',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  );

  // Mahasiswa 3
  insertUser.run(
    '220555103',
    'mahasiswa123',
    'Reza Aditya Fajar',
    'reza.aditya@student.itsc.ac.id',
    'mahasiswa',
    '220555103',
    'Teknik Informatika',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  );

  // Courses
  const insertCourse = db.prepare(`
    INSERT INTO courses (code, name, sks, semester, dosen_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertCourse.run('KSI-301', 'Keamanan Sistem Informasi & Ethical Hacking', 3, 5, 2);
  insertCourse.run('JARKOM-302', 'Keamanan Jaringan Komputer & Audit Forensik', 3, 5, 2);
  insertCourse.run('RPL-303', 'Rekayasa Perangkat Lunak Lanjut & Secure Coding', 4, 5, 3);
  insertCourse.run('BD-304', 'Basis Data Terdistribusi & Kriptografi Data', 3, 5, 3);

  // Enrollments
  const insertEnrollment = db.prepare(`
    INSERT INTO enrollments (student_id, course_id, grade_letter, grade_number, attendance_percent, semester)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Dimas Arya Pratama (ID 4)
  insertEnrollment.run(4, 1, 'A', 89.5, 96, '2025/2026 Ganjil');
  insertEnrollment.run(4, 2, 'A-', 84.0, 93, '2025/2026 Ganjil');
  insertEnrollment.run(4, 3, 'B+', 81.5, 88, '2025/2026 Ganjil');
  insertEnrollment.run(4, 4, 'A', 91.0, 100, '2025/2026 Ganjil');

  // Adinda Zahra Kirana (ID 5)
  insertEnrollment.run(5, 1, 'B+', 82.0, 90, '2025/2026 Ganjil');
  insertEnrollment.run(5, 2, 'B', 76.5, 85, '2025/2026 Ganjil');
  insertEnrollment.run(5, 3, 'A', 92.0, 97, '2025/2026 Ganjil');
  insertEnrollment.run(5, 4, 'A-', 85.0, 94, '2025/2026 Ganjil');

  // Reza Aditya Fajar (ID 6)
  insertEnrollment.run(6, 1, 'B', 75.0, 82, '2025/2026 Ganjil');
  insertEnrollment.run(6, 2, 'C+', 68.0, 78, '2025/2026 Ganjil');
  insertEnrollment.run(6, 3, 'B+', 80.0, 89, '2025/2026 Ganjil');
  insertEnrollment.run(6, 4, 'B', 77.0, 85, '2025/2026 Ganjil');

  // Assignments
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (course_id, dosen_id, title, description, deadline)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertAssignment.run(
    1,
    2,
    'Tugas Praktikum 07: Analisis Celah Keamanan & Web Pentesting',
    'Mahasiswa diminta mengunggah laporan ringkas format PDF atau arsip kode mengenai eksploitasi celah autentikasi dan validasi input. Sertakan screenshot PoC temuan!',
    '2026-10-30 23:59:00'
  );

  insertAssignment.run(
    3,
    3,
    'Tugas Proyek 02: Desain Arsitektur Microservices & Autorisasi RBAC',
    'Rancang diagram komponen dan skema Role-Based Access Control (RBAC) untuk portal akademik modern. Berkas unggahan dapat berupa berkas dokumentasi tugas.',
    '2026-11-05 23:59:00'
  );

  // Submissions initial seed
  const insertSubmission = db.prepare(`
    INSERT INTO submissions (assignment_id, student_id, file_name, file_path, original_name, file_size, student_notes, score, feedback, submitted_at, graded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSubmission.run(
    1,
    4,
    'sample_tugas_dimas.pdf',
    'uploads/sample_tugas_dimas.pdf',
    'Laporan_KSI_DimasArya_220555101.pdf',
    1048576,
    'Berikut adalah laporan hasil audit keamanan aplikasi portal kampus, lengkap dengan bukti pengujian.',
    92,
    'Analisis sangat komprehensif, teknik eksploitasi dan langkah mitigasi dijelaskan dengan sangat baik.',
    '2026-10-15 14:20:00',
    '2026-10-16 09:15:00'
  );

  insertSubmission.run(
    1,
    5,
    'sample_tugas_adinda.pdf',
    'uploads/sample_tugas_adinda.pdf',
    'Laporan_Audit_AdindaZahra_220555102.pdf',
    786432,
    'Tugas audit keamanan sistem selesai dikerjakan sesuai petunjuk modul.',
    88,
    'Bagus, penulisan sistematis dan bukti PoC jelas.',
    '2026-10-15 16:45:00',
    '2026-10-16 10:30:00'
  );

  // Forum Threads
  const insertThread = db.prepare(`
    INSERT INTO forum_threads (user_id, title, content, category)
    VALUES (?, ?, ?, ?)
  `);

  insertThread.run(
    2,
    'Pengumuman: Jadwal Pelaksanaan Ujian Praktikum Keamanan Siber 2026',
    'Diberitahukan kepada seluruh mahasiswa semester 5 peserta mata kuliah Keamanan Sistem Informasi, ujian laboratorium akan diselenggarakan secara mandiri. Pastikan menguji skenario celah web yang telah dipelajari.',
    'Pengumuman Akademik'
  );

  insertThread.run(
    4,
    'Tanya: Referensi Implementasi Kontrol Akses IDOR dan Stored XSS',
    'Selamat siang rekan-rekan dan bapak/ibu dosen. Apakah ada referensi rekomendasi terkait sanitasi input kontekstual untuk mencegah Stored XSS di form komentar?',
    'Diskusi Teknis'
  );

  // Forum Replies
  const insertReply = db.prepare(`
    INSERT INTO forum_replies (thread_id, user_id, reply_content)
    VALUES (?, ?, ?)
  `);

  insertReply.run(
    2,
    2,
    'Untuk mencegah XSS, selalu gunakan contextual output encoding seperti HTML entities encoding (misal &lt;, &gt;, &quot;) atau DOMPurify di frontend.',
  );

  insertReply.run(
    2,
    5,
    'Terima kasih penjelasannya Pak Bagus! Sangat membantu dalam pengerjaan praktikum.',
  );
}

module.exports = {
  db,
  initDatabase
};
