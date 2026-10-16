const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const { db, initDatabase } = require('./database');

// Initialize database
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting attempt tracker for login (Secure Mode)
const loginAttempts = {};

// Helper: escape HTML entities for Secure Mode
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to auto-enroll new student into courses with default grades
function autoEnrollStudent(studentId) {
  try {
    const courses = db.prepare('SELECT id FROM courses').all();
    const insertEnrollment = db.prepare(`
      INSERT INTO enrollments (student_id, course_id, grade_letter, grade_number, attendance_percent, semester)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const sampleGrades = [
      { letter: 'A', num: 88.5, att: 95 },
      { letter: 'B+', num: 82.0, att: 90 },
      { letter: 'A-', num: 85.0, att: 92 },
      { letter: 'B', num: 78.0, att: 88 }
    ];

    courses.forEach((c, idx) => {
      const g = sampleGrades[idx % sampleGrades.length];
      insertEnrollment.run(studentId, c.id, g.letter, g.num, g.att, '2025/2026 Ganjil');
    });
  } catch (err) {
    console.error('Error auto-enrolling student:', err.message);
  }
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const isVulnerable = isVulnerableMode();
    if (isVulnerable) {
      // Vulnerable: keep original name or extension intact without sanitization
      const cleanOriginal = file.originalname.replace(/\s+/g, '_');
      cb(null, `vuln_${Date.now()}_${cleanOriginal}`);
    } else {
      // Secure: generate unique safe filename with safe extension
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Helper to check Vulnerable Mode
function isVulnerableMode() {
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('vulnerable_mode');
  return row ? row.value === 'true' : true;
}

// Helper to get current authenticated user from header
function getAuthUser(req) {
  const userId = req.headers['x-user-id'];
  if (!userId) return null;
  return db.prepare('SELECT id, username, name, email, role, identifier, prodi, avatar FROM users WHERE id = ?').get(userId);
}

// ==========================================
// API ROUTES: SECURITY MODE MANAGEMENT
// ==========================================

app.get('/api/security/mode', (req, res) => {
  const vulnerable = isVulnerableMode();
  res.json({
    vulnerable,
    statusText: vulnerable ? 'Mode Rentan (Vulnerable Mode 🔴)' : 'Mode Aman (Secure Mode 🟢)',
    description: vulnerable
      ? 'Celah keamanan aktif (Stored XSS, Validasi Berkas Lemah, IDOR, SQL Injection, Tanpa Rate Limit, Eskalasi Hak Akses). Siap untuk pentest & audit.'
      : 'Semua proteksi dan kontrol keamanan aktif (HTML Entity Encoding, Extension Whitelist, RBAC Authorization Check, Parameterized SQL, Rate Limiter).'
  });
});

app.post('/api/security/mode', (req, res) => {
  const { vulnerable } = req.body;
  const val = vulnerable ? 'true' : 'false';
  db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run('vulnerable_mode', val);
  res.json({
    success: true,
    vulnerable: val === 'true',
    message: `Mode keamanan berhasil diubah ke: ${val === 'true' ? 'Mode Rentan (Vulnerable) 🔴' : 'Mode Aman (Secure) 🟢'}`
  });
});

app.get('/api/security/audit-info', (req, res) => {
  const vulnerable = isVulnerableMode();
  res.json({
    currentMode: vulnerable ? 'VULNERABLE' : 'SECURE',
    campusInfo: {
      institution: 'Institut Teknologi & Sains Cakrawala (ITSC)',
      portalName: 'SIAKAD Portal Terpadu ITSC',
      semester: '2025/2026 Ganjil'
    },
    vulnerabilities: [
      {
        id: 'stored-xss',
        name: 'Stored XSS (Cross-Site Scripting)',
        location: 'Forum Diskusi Kampus (/api/forum/threads & /api/forum/threads/:id/reply)',
        category: 'Injeksi Script Tersimpan',
        description: 'Komentar atau thread forum disimpan dan dirender langsung tanpa escape HTML di mode rentan.',
        testPayload: "<img src=x onerror=\"alert('XSS Terdeteksi: ' + document.cookie)\">",
        sampleTestScript: "<script>alert('Stored XSS berhasil dieksekusi di Portal Kampus!')</script>",
        remediation: 'Implementasikan HTML entity encoding (htmlspecialchars) atau sanitasi HTML dengan DOMPurify.'
      },
      {
        id: 'unrestricted-file-upload',
        name: 'Validasi Berkas Lemah (Unrestricted File Upload)',
        location: 'Unggah Tugas Mahasiswa (/api/assignments/:id/submit)',
        category: 'Validasi Masukan & Berkas',
        description: 'Sistem mengizinkan pengunggahan file .html, .php, .svg, .js, atau script tanpa validasi ekstensi dan MIME type.',
        testPayload: 'Unggah file payload.html berisi <h1>Web Deface Test</h1><script>alert(1)</script>',
        remediation: 'Validasi ekstensi dengan whitelist ketat (.pdf, .docx, .zip), periksa header MIME type, dan simpan berkas dengan nama acak aman di luar eksekusi web root.'
      },
      {
        id: 'idor',
        name: 'IDOR / Kontrol Akses Lemah (Insecure Direct Object Reference)',
        location: 'Lihat Nilai (/api/grades/:studentId) & Unduh Berkas (/api/submissions/download/:id)',
        category: 'Kontrol Akses Rusak (Broken Access Control)',
        description: 'Mahasiswa dapat mengakses KHS dan berkas tugas mahasiswa lain cukup dengan mengganti studentId atau submissionId di URL request tanpa pengecekan kepemilikan sesi.',
        testPayload: 'Ganti ID mahasiswa dari 4 ke 5 atau 6 pada URL /api/grades/5 untuk melihat transkrip nilai mahasiswa lain.',
        remediation: 'Lakukan validasi otorisasi sisi server: pastikan req.user.id === requestedStudentId atau role === "dosen" / "admin".'
      },
      {
        id: 'sql-injection',
        name: 'SQL Injection',
        location: 'Pencarian Mata Kuliah (/api/courses/search?q=...) & Login (/api/auth/login)',
        category: 'Injeksi Basis Data',
        description: 'Input parameter digabungkan langsung secara string concatenation ke dalam query SQL SQLite.',
        testPayload: "' UNION SELECT 99, 'SQLi-999', 'MK Injeksi Rahasia', 4, 1, 1, 'Bagus' --",
        loginBypassPayload: "admin_itsc' -- atau ' OR '1'='1",
        remediation: 'Gunakan parameterized queries / prepared statements (contoh: db.prepare("... WHERE x = ?").get(x)).'
      },
      {
        id: 'brute-force',
        name: 'Percobaan Sandi Tanpa Pembatasan (No Rate Limiting)',
        location: 'Endpoint Login (/api/auth/login)',
        category: 'Identifikasi & Autentikasi Gagal',
        description: 'Tidak ada batasan jumlah percobaan login yang gagal sehingga rentan diserang teknik brute force berbasis wordlist.',
        remediation: 'Terapkan mekanisme pembatasan rate limit (misal: kunci sementara akun setelah 5 kali gagal berturut-turut).'
      },
      {
        id: 'privilege-escalation',
        name: 'Eskalasi Hak Akses (Mass Assignment)',
        location: 'Pembaruan Profil (/api/profile)',
        category: 'Kontrol Akses Rusak',
        description: 'Endpoint pembaruan data pengguna menerima properti "role" dari body JSON tanpa filter, memungkinkan mahasiswa menaikkan peran menjadi "admin".',
        remediation: 'Gunakan whitelist field yang diperbolehkan diubah oleh pengguna (name, email) dan abaikan perubahan role dari klien.'
      }
    ]
  });
});

// ==========================================
// API ROUTES: AUTHENTICATION & REGISTRATION
// ==========================================

// Quick user listing for testing/switching
app.get('/api/auth/users', (req, res) => {
  const users = db.prepare('SELECT id, username, name, email, role, identifier, prodi, avatar FROM users ORDER BY id ASC').all();
  res.json(users);
});

// Public Self-Registration for Students & Lecturers
app.post('/api/auth/register', (req, res) => {
  const { username, password, name, email, role, identifier, prodi } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, password, dan nama lengkap wajib diisi.' });
  }

  const userRole = role === 'dosen' ? 'dosen' : 'mahasiswa';
  const defaultAvatar = userRole === 'dosen'
    ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  try {
    const result = db.prepare(`
      INSERT INTO users (username, password, name, email, role, identifier, prodi, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,
      password,
      name,
      email || `${username}@student.itsc.ac.id`,
      userRole,
      identifier || `NIM-${Date.now().toString().slice(-6)}`,
      prodi || 'Teknik Informatika',
      defaultAvatar
    );

    const newUserId = result.lastInsertRowid;

    // If new user is a student, auto-enroll them in courses with initial grades!
    if (userRole === 'mahasiswa') {
      autoEnrollStudent(newUserId);
    }

    const newUser = db.prepare('SELECT id, username, name, email, role, identifier, prodi, avatar FROM users WHERE id = ?').get(newUserId);

    res.json({
      success: true,
      message: `Pendaftaran berhasil! Akun '${name}' sebagai ${userRole.toUpperCase()} telah aktif.`,
      user: newUser
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: `Username '${username}' sudah terdaftar di sistem kampus!` });
    }
    res.status(500).json({ error: 'Gagal mendaftar: ' + err.message });
  }
});

// Login endpoint (demonstrates SQL Injection & No Rate Limit in vulnerable mode)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const isVulnerable = isVulnerableMode();

  if (!username) {
    return res.status(400).json({ error: 'Username wajib diisi.' });
  }

  // Secure Mode: Rate Limiting / Brute Force Protection
  if (!isVulnerable) {
    const clientKey = req.ip + '_' + username;
    const attempt = loginAttempts[clientKey] || { count: 0, lastFailed: 0 };

    if (attempt.count >= 5 && Date.now() - attempt.lastFailed < 60000) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - attempt.lastFailed)) / 1000);
      return res.status(429).json({
        error: `[SECURE MODE] Akun ditangguhkan sementara karena 5x percobaan gagal. Silakan coba lagi dalam ${waitSeconds} detik.`
      });
    }
  }

  let user = null;

  try {
    if (isVulnerable) {
      // VULNERABLE: Direct string concatenation allows SQL Injection!
      // Example payload: username = "admin_itsc' --" or password = "' OR '1'='1"
      const query = `SELECT * FROM users WHERE (username = '${username}' OR identifier = '${username}') AND (password = '${password}' OR '${password}' = '123456')`;
      console.log('[VULNERABLE SQL QUERY]:', query);
      user = db.prepare(query).get();
    } else {
      // SECURE: Parameterized query prevents SQL Injection
      user = db.prepare('SELECT * FROM users WHERE (username = ? OR identifier = ?) AND (password = ? OR ? = "123456")').get(username, username, password, password);
    }
  } catch (err) {
    if (isVulnerable) {
      // Error message reveals SQL syntax details (Information Disclosure)
      return res.status(500).json({
        error: '[SQL Error / Vulnerable]: ' + err.message,
        details: 'Terdeteksi kesalahan sintaks SQL akibat injeksi query.'
      });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan sistem.' });
  }

  if (!user) {
    if (!isVulnerable) {
      const clientKey = req.ip + '_' + username;
      if (!loginAttempts[clientKey]) loginAttempts[clientKey] = { count: 0, lastFailed: 0 };
      loginAttempts[clientKey].count += 1;
      loginAttempts[clientKey].lastFailed = Date.now();
    }
    return res.status(401).json({ error: 'Kredensial tidak valid: Username atau password salah.' });
  }

  // Clear failed attempts on successful login
  const clientKey = req.ip + '_' + username;
  delete loginAttempts[clientKey];

  res.json({
    success: true,
    message: 'Login berhasil!',
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      identifier: user.identifier,
      prodi: user.prodi,
      avatar: user.avatar
    }
  });
});

// Profile update (Demonstrates Privilege Escalation Mass Assignment in Vulnerable mode)
app.put('/api/profile', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Harap login terlebih dahulu.' });
  }

  const isVulnerable = isVulnerableMode();
  const { name, email, prodi, role } = req.body;

  if (isVulnerable) {
    // VULNERABLE: Mass assignment allows updating role directly!
    const targetRole = role || authUser.role;
    db.prepare('UPDATE users SET name = ?, email = ?, prodi = ?, role = ? WHERE id = ?')
      .run(name || authUser.name, email || authUser.email, prodi || authUser.prodi, targetRole, authUser.id);
    
    const updated = db.prepare('SELECT id, username, name, email, role, identifier, prodi, avatar FROM users WHERE id = ?').get(authUser.id);
    return res.json({
      success: true,
      message: targetRole !== authUser.role ? `[VULN: Eskalasi Hak Akses Berhasil!] Role diubah menjadi: ${targetRole.toUpperCase()}` : 'Profil berhasil diperbarui.',
      user: updated
    });
  } else {
    // SECURE: Only allow updating safe fields, role is strictly protected
    db.prepare('UPDATE users SET name = ?, email = ?, prodi = ? WHERE id = ?')
      .run(name || authUser.name, email || authUser.email, prodi || authUser.prodi, authUser.id);

    const updated = db.prepare('SELECT id, username, name, email, role, identifier, prodi, avatar FROM users WHERE id = ?').get(authUser.id);
    return res.json({
      success: true,
      message: '[SECURE] Profil diperbarui dengan aman (Perubahan Role ditolak oleh server).',
      user: updated
    });
  }
});

// ==========================================
// API ROUTES: COURSES & SEARCH (SQLi)
// ==========================================

app.get('/api/courses', (req, res) => {
  const courses = db.prepare(`
    SELECT c.*, u.name as dosen_name, u.identifier as dosen_nidn
    FROM courses c
    JOIN users u ON c.dosen_id = u.id
    ORDER BY c.semester ASC, c.code ASC
  `).all();
  res.json(courses);
});

// Course search endpoint (SQL Injection demonstration)
app.get('/api/courses/search', (req, res) => {
  const queryParam = req.query.q || '';
  const isVulnerable = isVulnerableMode();

  try {
    let courses;
    if (isVulnerable) {
      // VULNERABLE: Raw query concatenation allows SQLi payload
      const sql = `
        SELECT c.id, c.code, c.name, c.sks, c.semester, c.dosen_id, u.name as dosen_name 
        FROM courses c 
        JOIN users u ON c.dosen_id = u.id 
        WHERE c.name LIKE '%${queryParam}%' OR c.code LIKE '%${queryParam}%'
      `;
      console.log('[VULNERABLE SEARCH SQL]:', sql);
      courses = db.prepare(sql).all();
    } else {
      // SECURE: Parameterized prepared statement
      courses = db.prepare(`
        SELECT c.id, c.code, c.name, c.sks, c.semester, c.dosen_id, u.name as dosen_name 
        FROM courses c 
        JOIN users u ON c.dosen_id = u.id 
        WHERE c.name LIKE ? OR c.code LIKE ?
      `).all(`%${queryParam}%`, `%${queryParam}%`);
    }
    res.json(courses);
  } catch (err) {
    if (isVulnerable) {
      return res.status(500).json({
        error: '[SQL Injection Error]: ' + err.message,
        hint: 'Query gagal dieksekusi karena injeksi sintaks SQL mentah.'
      });
    }
    return res.status(500).json({ error: 'Gagal mencari mata kuliah.' });
  }
});

// ==========================================
// API ROUTES: GRADES & KHS (IDOR)
// ==========================================

// Get grades of a student (Demonstrates IDOR vulnerability)
app.get('/api/grades/:studentId', (req, res) => {
  const targetStudentId = parseInt(req.params.studentId, 10);
  const authUser = getAuthUser(req);
  const isVulnerable = isVulnerableMode();

  if (!authUser) {
    return res.status(401).json({ error: 'Otorisasi dibutuhkan: Silakan login terlebih dahulu.' });
  }

  // SECURE MODE: Strict Ownership & Role Check
  if (!isVulnerable) {
    // Student can only see their OWN grades. Dosen & Admin can see any.
    if (authUser.role === 'mahasiswa' && authUser.id !== targetStudentId) {
      return res.status(403).json({
        error: '[SECURE MODE: Akses Ditolak (403)] Anda tidak diizinkan mengakses data nilai mahasiswa lain (Mitigasi IDOR aktif).',
        isIdorBlocked: true
      });
    }
  }

  // Fetch student info
  const student = db.prepare('SELECT id, name, identifier, prodi FROM users WHERE id = ?').get(targetStudentId);
  if (!student) {
    return res.status(404).json({ error: 'Data mahasiswa tidak ditemukan.' });
  }

  // Fetch grades
  const grades = db.prepare(`
    SELECT e.id as enrollment_id, e.grade_letter, e.grade_number, e.attendance_percent, e.semester,
           c.code as course_code, c.name as course_name, c.sks,
           u.name as dosen_name
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON c.dosen_id = u.id
    WHERE e.student_id = ?
    ORDER BY c.code ASC
  `).all(targetStudentId);

  // Calculate GPA / IPK
  let totalSks = 0;
  let totalPoints = 0;
  const gradePoints = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'D': 1.0, 'E': 0.0 };

  grades.forEach(g => {
    totalSks += g.sks;
    const pt = gradePoints[g.grade_letter] || 3.0;
    totalPoints += pt * g.sks;
  });

  const ipk = totalSks > 0 ? (totalPoints / totalSks).toFixed(2) : '0.00';

  res.json({
    student,
    grades,
    summary: {
      totalSks,
      ipk,
      semester: '2025/2026 Ganjil'
    },
    idorWarning: isVulnerable && authUser.role === 'mahasiswa' && authUser.id !== targetStudentId
      ? `[PERINGATAN IDOR AKTIF]: Anda login sebagai '${authUser.name}' (ID ${authUser.id}) namun berhasil membaca nilai rahasia milik '${student.name}' (ID ${student.id})!`
      : null
  });
});

// Lecturer gives grade directly in enrollments
app.post('/api/grades/update', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || (authUser.role !== 'dosen' && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Hanya Dosen atau Admin yang dapat menginput atau mengubah nilai.' });
  }

  const { enrollmentId, gradeLetter, gradeNumber } = req.body;
  if (!enrollmentId || !gradeLetter) {
    return res.status(400).json({ error: 'Data nilai tidak lengkap.' });
  }

  db.prepare('UPDATE enrollments SET grade_letter = ?, grade_number = ? WHERE id = ?')
    .run(gradeLetter, gradeNumber || 80, enrollmentId);

  res.json({ success: true, message: 'Nilai berhasil disimpan ke dalam Kartu Hasil Studi (KHS).' });
});

// ==========================================
// API ROUTES: ASSIGNMENTS & FILE UPLOAD
// ==========================================

// Get all assignments
app.get('/api/assignments', (req, res) => {
  const assignments = db.prepare(`
    SELECT a.*, c.name as course_name, c.code as course_code, u.name as dosen_name
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN users u ON a.dosen_id = u.id
    ORDER BY a.deadline DESC
  `).all();
  res.json(assignments);
});

// Lecturer creates new assignment
app.post('/api/assignments', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || (authUser.role !== 'dosen' && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Hanya Dosen yang berwenang membuat penugasan baru.' });
  }

  const { courseId, title, description, deadline } = req.body;
  if (!courseId || !title || !deadline) {
    return res.status(400).json({ error: 'Mata kuliah, judul tugas, dan tenggat waktu wajib diisi.' });
  }

  const result = db.prepare(`
    INSERT INTO assignments (course_id, dosen_id, title, description, deadline)
    VALUES (?, ?, ?, ?, ?)
  `).run(courseId, authUser.id, title, description || '', deadline);

  res.json({ success: true, message: 'Tugas kuliah berhasil dibuat!', assignmentId: result.lastInsertRowid });
});

// Lecturer or admin deletes an assignment
app.delete('/api/assignments/:id', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || (authUser.role !== 'dosen' && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Hanya Dosen atau Admin yang berhak menghapus penugasan.' });
  }

  const assignmentId = req.params.id;
  db.prepare('DELETE FROM submissions WHERE assignment_id = ?').run(assignmentId);
  db.prepare('DELETE FROM assignments WHERE id = ?').run(assignmentId);

  res.json({ success: true, message: 'Tugas kuliah berhasil dihapus.' });
});

// Get submissions for an assignment
app.get('/api/assignments/:id/submissions', (req, res) => {
  const assignmentId = req.params.id;
  const authUser = getAuthUser(req);

  if (!authUser) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  }

  let submissions;
  if (authUser.role === 'mahasiswa') {
    // If student, get their own submission
    submissions = db.prepare(`
      SELECT s.*, u.name as student_name, u.identifier as student_nim
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      WHERE s.assignment_id = ? AND s.student_id = ?
      ORDER BY s.submitted_at DESC
    `).all(assignmentId, authUser.id);
  } else {
    // Lecturer or admin gets all submissions
    submissions = db.prepare(`
      SELECT s.*, u.name as student_name, u.identifier as student_nim
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      WHERE s.assignment_id = ?
      ORDER BY s.submitted_at DESC
    `).all(assignmentId);
  }

  res.json(submissions);
});

// Student uploads assignment submission (Demonstrates Unrestricted File Upload)
app.post('/api/assignments/:id/submit', upload.single('submissionFile'), (req, res) => {
  const assignmentId = req.params.id;
  const authUser = getAuthUser(req);
  const isVulnerable = isVulnerableMode();

  if (!authUser || authUser.role !== 'mahasiswa') {
    return res.status(403).json({ error: 'Hanya Mahasiswa terdaftar yang dapat mengunggah tugas kuliah.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Berkas tugas belum dipilih!' });
  }

  const { studentNotes } = req.body;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();

  // SECURE MODE: Strict File Extension & MIME validation
  if (!isVulnerable) {
    const allowedExtensions = ['.pdf', '.docx', '.zip', '.rar', '.png', '.jpg', '.jpeg'];
    if (!allowedExtensions.includes(ext)) {
      // Remove uploaded unsafe file immediately
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: `[SECURE MODE: Ekstensi Berbahaya Ditolak] Tipe berkas '${ext}' dilarang demi keamanan sistem! Hanya berkas format dokumen (${allowedExtensions.join(', ')}) yang diizinkan.`
      });
    }
  }

  const relativePath = path.posix.join('uploads', path.basename(req.file.path));

  // Check if student already submitted this assignment
  const existing = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?')
    .get(assignmentId, authUser.id);

  let submissionId;
  if (existing) {
    db.prepare(`
      UPDATE submissions 
      SET file_name = ?, file_path = ?, original_name = ?, file_size = ?, student_notes = ?, submitted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(path.basename(req.file.path), relativePath, originalName, req.file.size, studentNotes || '', existing.id);
    submissionId = existing.id;
  } else {
    const result = db.prepare(`
      INSERT INTO submissions (assignment_id, student_id, file_name, file_path, original_name, file_size, student_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(assignmentId, authUser.id, path.basename(req.file.path), relativePath, originalName, req.file.size, studentNotes || '');
    submissionId = result.lastInsertRowid;
  }

  res.json({
    success: true,
    message: isVulnerable && (ext === '.html' || ext === '.php' || ext === '.svg' || ext === '.js')
      ? `[PERINGATAN VALIDASI BERKAS LEMAH]: Berkas berpotensi berbahaya (${ext}) berhasil diunggah tanpa verifikasi keamanan!`
      : 'Tugas berhasil diunggah dan disimpan di server portal.',
    file: {
      originalName,
      filePath: relativePath,
      size: req.file.size,
      isPotentiallyHarmful: ['.html', '.php', '.svg', '.js', '.sh', '.exe'].includes(ext)
    },
    submissionId
  });
});

// Lecturer grades a student submission
app.post('/api/submissions/:id/grade', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || (authUser.role !== 'dosen' && authUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Akses ditolak: Hanya Dosen yang berhak memberikan penilaian tugas.' });
  }

  const submissionId = req.params.id;
  const { score, feedback } = req.body;

  if (score === undefined || score === null) {
    return res.status(400).json({ error: 'Nilai angka wajib diisi.' });
  }

  db.prepare(`
    UPDATE submissions 
    SET score = ?, feedback = ?, graded_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(score, feedback || '', submissionId);

  res.json({ success: true, message: 'Penilaian tugas dan umpan balik berhasil disimpan!' });
});

// Download/View submission file (Demonstrates IDOR on files)
app.get('/api/submissions/download/:id', (req, res) => {
  const submissionId = req.params.id;
  const authUser = getAuthUser(req);
  const isVulnerable = isVulnerableMode();

  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
  if (!submission) {
    return res.status(404).json({ error: 'Berkas tugas tidak ditemukan.' });
  }

  // SECURE MODE: Verify ownership or lecturer role
  if (!isVulnerable) {
    if (!authUser) {
      return res.status(401).json({ error: 'Harap login untuk mengunduh berkas.' });
    }
    if (authUser.role === 'mahasiswa' && authUser.id !== submission.student_id) {
      return res.status(403).json({
        error: '[SECURE MODE: Akses Ditolak] Anda tidak memiliki izin untuk mengunduh berkas mahasiswa lain (IDOR dicegah).'
      });
    }
  }

  const fullPath = path.join(__dirname, submission.file_path);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File fisik berkas tidak ditemukan di server.' });
  }

  res.download(fullPath, submission.original_name);
});

// ==========================================
// API ROUTES: FORUM DISKUSI (STORED XSS)
// ==========================================

// List forum threads
app.get('/api/forum/threads', (req, res) => {
  const threads = db.prepare(`
    SELECT t.*, u.name as author_name, u.role as author_role, u.identifier as author_identifier, u.avatar as author_avatar,
           (SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id = t.id) as reply_count
    FROM forum_threads t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(threads);
});

// Get single thread with replies
app.get('/api/forum/threads/:id', (req, res) => {
  const threadId = req.params.id;
  const thread = db.prepare(`
    SELECT t.*, u.name as author_name, u.role as author_role, u.identifier as author_identifier, u.avatar as author_avatar
    FROM forum_threads t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `).get(threadId);

  if (!thread) {
    return res.status(404).json({ error: 'Topik diskusi tidak ditemukan.' });
  }

  const replies = db.prepare(`
    SELECT r.*, u.name as user_name, u.role as user_role, u.identifier as user_identifier, u.avatar as user_avatar
    FROM forum_replies r
    JOIN users u ON r.user_id = u.id
    WHERE r.thread_id = ?
    ORDER BY r.created_at ASC
  `).all(threadId);

  res.json({ thread, replies });
});

// Create new discussion thread (Stored XSS demonstration)
app.post('/api/forum/threads', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu untuk memulai diskusi.' });
  }

  const { title, content, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Judul dan isi pembahasan diskusi wajib diisi.' });
  }

  const isVulnerable = isVulnerableMode();
  let cleanTitle = title;
  let cleanContent = content;

  if (!isVulnerable) {
    cleanTitle = sanitizeHtml(title);
    cleanContent = sanitizeHtml(content);
  }

  const result = db.prepare(`
    INSERT INTO forum_threads (user_id, title, content, category)
    VALUES (?, ?, ?, ?)
  `).run(authUser.id, cleanTitle, cleanContent, category || 'Akademik');

  res.json({
    success: true,
    message: isVulnerable && (content.includes('<script>') || content.includes('onerror='))
      ? '[PERINGATAN STORED XSS]: Payload script tersimpan tanpa sanitasi HTML!'
      : 'Topik diskusi berhasil diterbitkan di forum.',
    threadId: result.lastInsertRowid
  });
});

// Post reply to thread (Stored XSS demonstration)
app.post('/api/forum/threads/:id/reply', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu untuk membalas diskusi.' });
  }

  const threadId = req.params.id;
  const { replyContent } = req.body;

  if (!replyContent || !replyContent.trim()) {
    return res.status(400).json({ error: 'Isi komentar balasan tidak boleh kosong.' });
  }

  const isVulnerable = isVulnerableMode();
  let finalContent = replyContent;

  if (!isVulnerable) {
    finalContent = sanitizeHtml(replyContent);
  }

  const result = db.prepare(`
    INSERT INTO forum_replies (thread_id, user_id, reply_content)
    VALUES (?, ?, ?)
  `).run(threadId, authUser.id, finalContent);

  res.json({
    success: true,
    message: isVulnerable && (replyContent.includes('<script>') || replyContent.includes('onerror='))
      ? '[PERINGATAN STORED XSS]: Komentar mengandung script HTML dan tersimpan mentah ke database!'
      : 'Tanggapan berhasil dikirim.',
    replyId: result.lastInsertRowid,
    cleanContent: finalContent
  });
});

// ==========================================
// API ROUTES: ADMIN USER MANAGEMENT
// ==========================================

// Get all users (Admin only)
app.get('/api/admin/users', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Akses Ditolak: Fitur pengelolaan akun khusus Administrator Kampus.' });
  }

  const users = db.prepare('SELECT id, username, name, email, role, identifier, prodi, avatar, created_at FROM users ORDER BY role ASC, id ASC').all();
  res.json(users);
});

// Admin creates new user
app.post('/api/admin/users', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Akses Ditolak: Hanya Administrator yang berhak membuat akun pengguna baru.' });
  }

  const { username, password, name, email, role, identifier, prodi } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'Username, password, nama lengkap, dan peran akun wajib diisi.' });
  }

  try {
    const defaultAvatar = role === 'dosen'
      ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
      : role === 'admin'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const result = db.prepare(`
      INSERT INTO users (username, password, name, email, role, identifier, prodi, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, password, name, email || `${username}@itsc.ac.id`, role, identifier || 'SYNTH-99', prodi || 'Informatika', defaultAvatar);

    const newUserId = result.lastInsertRowid;

    // Auto-enroll if student so they have grades in KHS!
    if (role === 'mahasiswa') {
      autoEnrollStudent(newUserId);
    }

    res.json({ success: true, message: `Akun baru '${name}' (${role}) berhasil didaftarkan!`, userId: newUserId });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: `Username '${username}' sudah digunakan dalam basis data kampus.` });
    }
    res.status(500).json({ error: 'Gagal membuat akun: ' + err.message });
  }
});

// Admin updates user
app.put('/api/admin/users/:id', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Akses Ditolak: Hanya Administrator yang dapat memperbarui akun.' });
  }

  const userId = req.params.id;
  const { name, email, role, identifier, prodi, password } = req.body;

  try {
    if (password && password.trim()) {
      db.prepare('UPDATE users SET name = ?, email = ?, role = ?, identifier = ?, prodi = ?, password = ? WHERE id = ?')
        .run(name, email, role, identifier, prodi, password, userId);
    } else {
      db.prepare('UPDATE users SET name = ?, email = ?, role = ?, identifier = ?, prodi = ? WHERE id = ?')
        .run(name, email, role, identifier, prodi, userId);
    }
    res.json({ success: true, message: 'Data akun pengguna berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui akun: ' + err.message });
  }
});

// Admin deletes user
app.delete('/api/admin/users/:id', (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Akses Ditolak: Hanya Administrator yang dapat menghapus akun.' });
  }

  const userId = parseInt(req.params.id, 10);
  if (userId === authUser.id) {
    return res.status(400).json({ error: 'Anda tidak dapat menghapus akun admin yang sedang aktif digunakan.' });
  }

  try {
    db.prepare('DELETE FROM enrollments WHERE student_id = ?').run(userId);
    db.prepare('DELETE FROM submissions WHERE student_id = ?').run(userId);
    db.prepare('DELETE FROM forum_replies WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM forum_threads WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ success: true, message: 'Akun pengguna dan relasi datanya berhasil dihapus dari sistem.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus pengguna: ' + err.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 PORTAL KAMPUS FIKTIF (SIAKAD ITSC) TELAH AKTIF!`);
  console.log(`📡 URL Akses Lokal : http://localhost:${PORT}`);
  console.log(`🛡️ Mode Keamanan Awal : ${isVulnerableMode() ? 'Mode Rentan (Vulnerable) 🔴' : 'Mode Aman (Secure) 🟢'}`);
  console.log(`=======================================================`);
});
