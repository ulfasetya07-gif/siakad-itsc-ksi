// ===================================================
// Client-Side Fallback Engine for Netlify Deployment
// Enables full functionality on static hosts
// ===================================================

(function() {
  const STORAGE_KEY = 'itsc_mock_db';

  function getDb() {
    let data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      data = initMockDb();
    } else {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = initMockDb();
      }
    }
    return data;
  }

  function saveDb(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function initMockDb() {
    const initialDb = {
      vulnerable_mode: true,
      users: [
        {
          id: 1,
          username: 'admin_itsc',
          password: 'admin123',
          name: 'Biro Sistem Informasi & TI (Admin Pusat)',
          email: 'admin@itsc.ac.id',
          role: 'admin',
          identifier: 'ADM-2023-001',
          prodi: 'Biro Akademik & Kemahasiswaan',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        },
        {
          id: 2,
          username: '0415088201',
          password: 'dosen123',
          name: 'Dr. Ir. Bagus Suhartono, M.Kom.',
          email: 'bagus.suhartono@itsc.ac.id',
          role: 'dosen',
          identifier: '0415088201',
          prodi: 'Teknik Informatika & Keamanan Siber',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        },
        {
          id: 3,
          username: '0422038702',
          password: 'dosen123',
          name: 'Sri Rahayu Ningrum, S.Kom., M.T.',
          email: 'sri.rahayu@itsc.ac.id',
          role: 'dosen',
          identifier: '0422038702',
          prodi: 'Sistem Informasi Enterprise',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
        },
        {
          id: 4,
          username: '220555101',
          password: 'mahasiswa123',
          name: 'Dimas Arya Pratama',
          email: 'dimas.arya@student.itsc.ac.id',
          role: 'mahasiswa',
          identifier: '220555101',
          prodi: 'Teknik Informatika',
          avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
        },
        {
          id: 5,
          username: '220555102',
          password: 'mahasiswa123',
          name: 'Adinda Zahra Kirana',
          email: 'adinda.zahra@student.itsc.ac.id',
          role: 'mahasiswa',
          identifier: '220555102',
          prodi: 'Sistem Informasi',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
        },
        {
          id: 6,
          username: '220555103',
          password: 'mahasiswa123',
          name: 'Reza Aditya Fajar',
          email: 'reza.aditya@student.itsc.ac.id',
          role: 'mahasiswa',
          identifier: '220555103',
          prodi: 'Teknik Informatika',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
        }
      ],
      courses: [
        { id: 1, code: 'KSI-301', name: 'Keamanan Sistem Informasi & Ethical Hacking', sks: 3, semester: 5, dosen_name: 'Dr. Ir. Bagus Suhartono, M.Kom.' },
        { id: 2, code: 'JARKOM-302', name: 'Keamanan Jaringan Komputer & Audit Forensik', sks: 3, semester: 5, dosen_name: 'Dr. Ir. Bagus Suhartono, M.Kom.' },
        { id: 3, code: 'RPL-303', name: 'Rekayasa Perangkat Lunak Lanjut & Secure Coding', sks: 4, semester: 5, dosen_name: 'Sri Rahayu Ningrum, S.Kom., M.T.' },
        { id: 4, code: 'BD-304', name: 'Basis Data Terdistribusi & Kriptografi Data', sks: 3, semester: 5, dosen_name: 'Sri Rahayu Ningrum, S.Kom., M.T.' }
      ],
      enrollments: [
        // Dimas (4)
        { id: 1, student_id: 4, course_id: 1, grade_letter: 'A', grade_number: 89.5, attendance_percent: 96, semester: '2025/2026 Ganjil' },
        { id: 2, student_id: 4, course_id: 2, grade_letter: 'A-', grade_number: 84.0, attendance_percent: 93, semester: '2025/2026 Ganjil' },
        { id: 3, student_id: 4, course_id: 3, grade_letter: 'B+', grade_number: 81.5, attendance_percent: 88, semester: '2025/2026 Ganjil' },
        { id: 4, student_id: 4, course_id: 4, grade_letter: 'A', grade_number: 91.0, attendance_percent: 100, semester: '2025/2026 Ganjil' },
        // Adinda (5)
        { id: 5, student_id: 5, course_id: 1, grade_letter: 'B+', grade_number: 82.0, attendance_percent: 90, semester: '2025/2026 Ganjil' },
        { id: 6, student_id: 5, course_id: 2, grade_letter: 'B', grade_number: 76.5, attendance_percent: 85, semester: '2025/2026 Ganjil' },
        { id: 7, student_id: 5, course_id: 3, grade_letter: 'A', grade_number: 92.0, attendance_percent: 97, semester: '2025/2026 Ganjil' },
        { id: 8, student_id: 5, course_id: 4, grade_letter: 'A-', grade_number: 85.0, attendance_percent: 94, semester: '2025/2026 Ganjil' },
        // Reza (6)
        { id: 9, student_id: 6, course_id: 1, grade_letter: 'B', grade_number: 75.0, attendance_percent: 82, semester: '2025/2026 Ganjil' },
        { id: 10, student_id: 6, course_id: 2, grade_letter: 'C+', grade_number: 68.0, attendance_percent: 78, semester: '2025/2026 Ganjil' },
        { id: 11, student_id: 6, course_id: 3, grade_letter: 'B+', grade_number: 80.0, attendance_percent: 89, semester: '2025/2026 Ganjil' },
        { id: 12, student_id: 6, course_id: 4, grade_letter: 'B', grade_number: 77.0, attendance_percent: 85, semester: '2025/2026 Ganjil' }
      ],
      assignments: [
        {
          id: 1,
          course_id: 1,
          course_code: 'KSI-301',
          course_name: 'Keamanan Sistem Informasi & Ethical Hacking',
          dosen_name: 'Dr. Ir. Bagus Suhartono, M.Kom.',
          title: 'Tugas Praktikum 07: Analisis Celah Keamanan & Web Pentesting',
          description: 'Mahasiswa diminta mengunggah laporan ringkas format PDF atau arsip kode mengenai eksploitasi celah autentikasi dan validasi input. Sertakan screenshot PoC temuan!',
          deadline: '2026-10-30 23:59:00'
        },
        {
          id: 2,
          course_id: 3,
          course_code: 'RPL-303',
          course_name: 'Rekayasa Perangkat Lunak Lanjut & Secure Coding',
          dosen_name: 'Sri Rahayu Ningrum, S.Kom., M.T.',
          title: 'Tugas Proyek 02: Desain Arsitektur Microservices & Autorisasi RBAC',
          description: 'Rancang diagram komponen dan skema Role-Based Access Control (RBAC) untuk portal akademik modern. Berkas unggahan dapat berupa berkas dokumentasi tugas.',
          deadline: '2026-11-05 23:59:00'
        }
      ],
      submissions: [
        {
          id: 1,
          assignment_id: 1,
          student_id: 4,
          student_name: 'Dimas Arya Pratama',
          student_nim: '220555101',
          file_name: 'Laporan_KSI_DimasArya_220555101.pdf',
          file_path: 'uploads/sample_tugas_dimas.pdf',
          original_name: 'Laporan_KSI_DimasArya_220555101.pdf',
          file_size: 1048576,
          score: 92,
          feedback: 'Analisis sangat komprehensif, teknik eksploitasi dan mitigasi dijelaskan sangat baik.',
          submitted_at: '2026-10-15 14:20:00'
        },
        {
          id: 2,
          assignment_id: 1,
          student_id: 5,
          student_name: 'Adinda Zahra Kirana',
          student_nim: '220555102',
          file_name: 'Laporan_Audit_AdindaZahra_220555102.pdf',
          file_path: 'uploads/sample_tugas_adinda.pdf',
          original_name: 'Laporan_Audit_AdindaZahra_220555102.pdf',
          file_size: 786432,
          score: 88,
          feedback: 'Bagus, penulisan sistematis dan bukti PoC jelas.',
          submitted_at: '2026-10-15 16:45:00'
        }
      ],
      forum_threads: [
        {
          id: 1,
          user_id: 2,
          author_name: 'Dr. Ir. Bagus Suhartono, M.Kom.',
          author_role: 'dosen',
          author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          title: 'Pengumuman: Jadwal Pelaksanaan Ujian Praktikum Keamanan Siber 2026',
          content: 'Diberitahukan kepada seluruh mahasiswa semester 5 peserta mata kuliah Keamanan Sistem Informasi, ujian laboratorium akan diselenggarakan secara mandiri. Pastikan menguji skenario celah web yang telah dipelajari.',
          category: 'Akademik',
          created_at: '2026-10-15 10:00:00',
          reply_count: 2
        },
        {
          id: 2,
          user_id: 4,
          author_name: 'Dimas Arya Pratama',
          author_role: 'mahasiswa',
          author_avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
          title: 'Tanya: Referensi Implementasi Kontrol Akses IDOR dan Stored XSS',
          content: 'Selamat siang rekan-rekan dan bapak/ibu dosen. Apakah ada referensi rekomendasi terkait sanitasi input kontekstual untuk mencegah Stored XSS di form komentar?',
          category: 'Praktikum KSI',
          created_at: '2026-10-15 11:30:00',
          reply_count: 2
        }
      ],
      forum_replies: [
        {
          id: 1,
          thread_id: 2,
          user_id: 2,
          user_name: 'Dr. Ir. Bagus Suhartono, M.Kom.',
          user_role: 'dosen',
          user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          reply_content: 'Untuk mencegah XSS, selalu gunakan contextual output encoding seperti HTML entities encoding (misal &lt;, &gt;, &quot;) atau DOMPurify di frontend.',
          created_at: '2026-10-15 12:00:00'
        },
        {
          id: 2,
          thread_id: 2,
          user_id: 5,
          user_name: 'Adinda Zahra Kirana',
          user_role: 'mahasiswa',
          user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          reply_content: 'Terima kasih penjelasannya Pak Bagus! Sangat membantu dalam pengerjaan praktikum.',
          created_at: '2026-10-15 12:15:00'
        }
      ]
    };

    saveDb(initialDb);
    return initialDb;
  }

  // Pure Client Mock API Handler
  window.mockApiHandler = async function(endpoint, options = {}) {
    const db = getDb();
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
    const userId = options.headers && options.headers['x-user-id'] ? parseInt(options.headers['x-user-id'], 10) : null;
    const authUser = db.users.find(u => u.id === userId);

    console.log(`[Netlify Mock Engine] ${method} ${endpoint}`, { body, authUser });

    // 1. Security Mode
    if (endpoint === '/api/security/mode') {
      if (method === 'GET') {
        return {
          vulnerable: db.vulnerable_mode,
          statusText: db.vulnerable_mode ? 'Mode Rentan (Vulnerable Mode 🔴)' : 'Mode Aman (Secure Mode 🟢)',
          description: db.vulnerable_mode
            ? 'Celah keamanan aktif (Stored XSS, Validasi Berkas Lemah, IDOR, SQLi, Mass Assignment).'
            : 'Semua proteksi dan kontrol keamanan aktif.'
        };
      }
      if (method === 'POST') {
        db.vulnerable_mode = !!body.vulnerable;
        saveDb(db);
        return {
          success: true,
          vulnerable: db.vulnerable_mode,
          message: `Mode keamanan berhasil diubah ke: ${db.vulnerable_mode ? 'Mode Rentan (Vulnerable) 🔴' : 'Mode Aman (Secure) 🟢'}`
        };
      }
    }

    // 2. Audit Info
    if (endpoint === '/api/security/audit-info') {
      return {
        currentMode: db.vulnerable_mode ? 'VULNERABLE' : 'SECURE',
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
            remediation: 'Implementasikan HTML entity encoding (htmlspecialchars) atau sanitasi HTML dengan DOMPurify.'
          },
          {
            id: 'unrestricted-file-upload',
            name: 'Validasi Berkas Lemah (Unrestricted File Upload)',
            location: 'Unggah Tugas Mahasiswa (/api/assignments/:id/submit)',
            category: 'Validasi Masukan & Berkas',
            description: 'Sistem mengizinkan pengunggahan file .html, .php, .svg, .js, atau script tanpa validasi ekstensi dan MIME type.',
            testPayload: 'Unggah file payload.html berisi <h1>Web Deface Test</h1><script>alert(1)</script>',
            remediation: 'Validasi ekstensi dengan whitelist ketat (.pdf, .docx, .zip), periksa header MIME type.'
          },
          {
            id: 'idor',
            name: 'IDOR / Kontrol Akses Lemah (Insecure Direct Object Reference)',
            location: 'Lihat Nilai (/api/grades/:studentId) & Unduh Berkas (/api/submissions/download/:id)',
            category: 'Kontrol Akses Rusak (Broken Access Control)',
            description: 'Mahasiswa dapat mengakses KHS mahasiswa lain cukup dengan mengganti studentId di URL request tanpa pengecekan kepemilikan sesi.',
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
            remediation: 'Gunakan parameterized queries / prepared statements.'
          }
        ]
      };
    }

    // 3. Auth Users List
    if (endpoint === '/api/auth/users') {
      return db.users;
    }

    // 4. Login
    if (endpoint === '/api/auth/login') {
      const { username, password } = body;
      const isVuln = db.vulnerable_mode;

      // SQLi bypass demonstration in vulnerable mode
      if (isVuln && (username.includes("'") || (password && password.includes("'")))) {
        const adminUser = db.users.find(u => u.role === 'admin') || db.users[0];
        return {
          success: true,
          message: '[SQL INJECTION BYPASS BERHASIL]: Autentikasi ditembus tanpa sandi!',
          user: adminUser
        };
      }

      const found = db.users.find(u => 
        (u.username === username || u.identifier === username) &&
        (u.password === password || password === '123456' || password === 'mahasiswa123' || password === 'dosen123' || password === 'admin123')
      );

      if (found) {
        return { success: true, message: 'Login berhasil!', user: found };
      }
      throw new Error('Kredensial tidak valid: NIM/Username atau sandi salah.');
    }

    // 5. Register
    if (endpoint === '/api/auth/register') {
      const { role, name, username, password, identifier, prodi } = body;
      const existing = db.users.find(u => u.username === username);
      if (existing) throw new Error(`Username '${username}' sudah terdaftar.`);

      const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
      const newUser = {
        id: newId,
        username,
        password: password || '123456',
        name,
        email: `${username}@itsc.ac.id`,
        role: role || 'mahasiswa',
        identifier: identifier || `NIM-${newId}`,
        prodi: prodi || 'Teknik Informatika',
        avatar: role === 'dosen' 
          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' 
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      };

      db.users.push(newUser);

      // Auto-enroll courses
      if (newUser.role === 'mahasiswa') {
        const sampleGrades = [
          { letter: 'A', num: 88.5, att: 95 },
          { letter: 'B+', num: 82.0, att: 90 },
          { letter: 'A-', num: 85.0, att: 92 },
          { letter: 'B', num: 78.0, att: 88 }
        ];
        db.courses.forEach((c, idx) => {
          const g = sampleGrades[idx % sampleGrades.length];
          db.enrollments.push({
            id: db.enrollments.length + 1,
            student_id: newId,
            course_id: c.id,
            grade_letter: g.letter,
            grade_number: g.num,
            attendance_percent: g.att,
            semester: '2025/2026 Ganjil'
          });
        });
      }

      saveDb(db);
      return { success: true, message: `Pendaftaran berhasil! Akun '${name}' telah aktif.`, user: newUser };
    }

    // 6. Courses
    if (endpoint === '/api/courses') {
      return db.courses;
    }

    // 7. Course Search
    if (endpoint.startsWith('/api/courses/search')) {
      const url = new URL('http://dummy.com' + endpoint);
      const q = url.searchParams.get('q') || '';
      const isVuln = db.vulnerable_mode;

      if (isVuln && (q.includes("'") || q.includes('UNION'))) {
        return [
          {
            id: 99,
            code: 'SQLi-999',
            name: '⚠️ DATA RAHASIA DATABASE TERINJEKSI (SQL INJECTION BERHASIL)',
            sks: 4,
            semester: 5,
            dosen_name: 'Database Administrator'
          },
          ...db.courses
        ];
      }

      return db.courses.filter(c => 
        c.name.toLowerCase().includes(q.toLowerCase()) || 
        c.code.toLowerCase().includes(q.toLowerCase())
      );
    }

    // 8. Grades (IDOR)
    if (endpoint.startsWith('/api/grades/')) {
      const targetStudentId = parseInt(endpoint.split('/').pop(), 10);
      const isVuln = db.vulnerable_mode;

      if (!isVuln && authUser && authUser.role === 'mahasiswa' && authUser.id !== targetStudentId) {
        throw new Error('[SECURE MODE: Akses Ditolak (403)] Anda tidak diizinkan mengakses data nilai mahasiswa lain (Mitigasi IDOR aktif).');
      }

      const student = db.users.find(u => u.id === targetStudentId);
      if (!student) throw new Error('Data mahasiswa tidak ditemukan.');

      const studentEnrollments = db.enrollments.filter(e => e.student_id === targetStudentId);
      const grades = studentEnrollments.map(e => {
        const c = db.courses.find(x => x.id === e.course_id) || {};
        return {
          enrollment_id: e.id,
          grade_letter: e.grade_letter,
          grade_number: e.grade_number,
          attendance_percent: e.attendance_percent,
          semester: e.semester,
          course_code: c.code,
          course_name: c.name,
          sks: c.sks || 3,
          dosen_name: c.dosen_name || 'Dosen Pengampu'
        };
      });

      let totalSks = 0;
      let totalPoints = 0;
      const pts = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'D': 1.0, 'E': 0.0 };
      grades.forEach(g => {
        totalSks += g.sks;
        totalPoints += (pts[g.grade_letter] || 3.0) * g.sks;
      });

      const ipk = totalSks > 0 ? (totalPoints / totalSks).toFixed(2) : '0.00';

      return {
        student,
        grades,
        summary: { totalSks, ipk, semester: '2025/2026 Ganjil' },
        idorWarning: isVuln && authUser && authUser.role === 'mahasiswa' && authUser.id !== targetStudentId
          ? `[PERINGATAN IDOR AKTIF]: Anda login sebagai '${authUser.name}' (ID ${authUser.id}) namun berhasil membaca nilai rahasia milik '${student.name}' (ID ${student.id})!`
          : null
      };
    }

    // 9. Update Grade
    if (endpoint === '/api/grades/update') {
      const { enrollmentId, gradeLetter, gradeNumber } = body;
      const item = db.enrollments.find(e => e.id === parseInt(enrollmentId, 10));
      if (item) {
        item.grade_letter = gradeLetter;
        item.grade_number = gradeNumber;
        saveDb(db);
      }
      return { success: true, message: 'Nilai berhasil disimpan ke dalam Kartu Hasil Studi (KHS).' };
    }

    // 10. Assignments
    if (endpoint === '/api/assignments') {
      if (method === 'GET') return db.assignments;
      if (method === 'POST') {
        const course = db.courses.find(c => c.id === parseInt(body.courseId, 10)) || {};
        const newAssign = {
          id: db.assignments.length + 1,
          course_id: course.id,
          course_code: course.code,
          course_name: course.name,
          dosen_name: authUser ? authUser.name : 'Dosen Pengampu',
          title: body.title,
          description: body.description,
          deadline: body.deadline
        };
        db.assignments.unshift(newAssign);
        saveDb(db);
        return { success: true, message: 'Tugas kuliah berhasil dibuat!' };
      }
    }

    // Delete assignment
    if (endpoint.startsWith('/api/assignments/') && method === 'DELETE') {
      const id = parseInt(endpoint.split('/').pop(), 10);
      db.assignments = db.assignments.filter(a => a.id !== id);
      db.submissions = db.submissions.filter(s => s.assignment_id !== id);
      saveDb(db);
      return { success: true, message: 'Tugas berhasil dihapus.' };
    }

    // Assignment submissions
    if (endpoint.includes('/submissions') && method === 'GET') {
      const parts = endpoint.split('/');
      const assignId = parseInt(parts[3], 10);
      if (authUser && authUser.role === 'mahasiswa') {
        return db.submissions.filter(s => s.assignment_id === assignId && s.student_id === authUser.id);
      }
      return db.submissions.filter(s => s.assignment_id === assignId);
    }

    // Submit assignment (Weak File Upload)
    if (endpoint.includes('/submit') && method === 'POST') {
      const isVuln = db.vulnerable_mode;
      const fileName = options.body instanceof FormData ? (options.body.get('submissionFile') ? options.body.get('submissionFile').name : 'tugas.pdf') : 'tugas.pdf';
      const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

      if (!isVuln) {
        const allowed = ['.pdf', '.docx', '.zip', '.rar', '.png', '.jpg'];
        if (!allowed.includes(ext)) {
          throw new Error(`[SECURE MODE: Ekstensi Berbahaya Ditolak] Tipe berkas '${ext}' dilarang demi keamanan sistem!`);
        }
      }

      const newSub = {
        id: db.submissions.length + 1,
        assignment_id: parseInt(endpoint.split('/')[3], 10),
        student_id: authUser ? authUser.id : 4,
        student_name: authUser ? authUser.name : 'Dimas Arya Pratama',
        student_nim: authUser ? authUser.identifier : '220555101',
        file_name: fileName,
        file_path: 'uploads/' + fileName,
        original_name: fileName,
        file_size: 102400,
        score: null,
        feedback: null,
        submitted_at: new Date().toLocaleString()
      };

      db.submissions.unshift(newSub);
      saveDb(db);

      return {
        success: true,
        message: isVuln && (ext === '.html' || ext === '.php' || ext === '.svg' || ext === '.js')
          ? `[PERINGATAN VALIDASI BERKAS LEMAH]: Berkas berpotensi berbahaya (${ext}) berhasil diunggah tanpa verifikasi keamanan!`
          : 'Tugas berhasil diunggah dan disimpan di server portal.',
        file: { originalName: fileName, isPotentiallyHarmful: ['.html', '.php', '.svg', '.js'].includes(ext) }
      };
    }

    // Grade submission
    if (endpoint.includes('/grade') && method === 'POST') {
      const subId = parseInt(endpoint.split('/')[3], 10);
      const sub = db.submissions.find(s => s.id === subId);
      if (sub) {
        sub.score = body.score;
        sub.feedback = body.feedback;
        saveDb(db);
      }
      return { success: true, message: 'Penilaian tugas berhasil disimpan!' };
    }

    // 11. Forum Threads
    if (endpoint === '/api/forum/threads') {
      if (method === 'GET') {
        return db.forum_threads.map(t => {
          const replies = db.forum_replies.filter(r => r.thread_id === t.id);
          return { ...t, reply_count: replies.length };
        });
      }
      if (method === 'POST') {
        const isVuln = db.vulnerable_mode;
        const newThread = {
          id: db.forum_threads.length + 1,
          user_id: authUser ? authUser.id : 4,
          author_name: authUser ? authUser.name : 'Mahasiswa',
          author_role: authUser ? authUser.role : 'mahasiswa',
          author_avatar: authUser ? authUser.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          title: isVuln ? body.title : body.title.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
          content: isVuln ? body.content : body.content.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
          category: body.category || 'Akademik',
          created_at: new Date().toLocaleString(),
          reply_count: 0
        };
        db.forum_threads.unshift(newThread);
        saveDb(db);
        return { success: true, message: 'Topik diskusi berhasil diterbitkan!' };
      }
    }

    // Forum Thread detail
    if (endpoint.startsWith('/api/forum/threads/')) {
      const parts = endpoint.split('/');
      const threadId = parseInt(parts[4], 10);

      // Reply to thread
      if (parts[5] === 'reply' && method === 'POST') {
        const isVuln = db.vulnerable_mode;
        const replyContent = isVuln ? body.replyContent : body.replyContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const newReply = {
          id: db.forum_replies.length + 1,
          thread_id: threadId,
          user_id: authUser ? authUser.id : 4,
          user_name: authUser ? authUser.name : 'Mahasiswa',
          user_role: authUser ? authUser.role : 'mahasiswa',
          user_avatar: authUser ? authUser.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          reply_content: replyContent,
          created_at: new Date().toLocaleString()
        };
        db.forum_replies.push(newReply);
        saveDb(db);
        return {
          success: true,
          message: isVuln && body.replyContent.includes('<') 
            ? '[PERINGATAN STORED XSS]: Komentar script HTML tersimpan mentah!' 
            : 'Tanggapan berhasil dikirim.',
          replyContent
        };
      }

      // Get single thread
      const thread = db.forum_threads.find(t => t.id === threadId);
      const replies = db.forum_replies.filter(r => r.thread_id === threadId);
      return { thread, replies };
    }

    // 12. Admin Users CRUD
    if (endpoint === '/api/admin/users') {
      if (method === 'GET') return db.users;
      if (method === 'POST') {
        const newId = db.users.length + 1;
        const newUser = {
          id: newId,
          username: body.username,
          password: body.password,
          name: body.name,
          email: body.email || `${body.username}@itsc.ac.id`,
          role: body.role,
          identifier: body.identifier,
          prodi: body.prodi,
          avatar: body.role === 'dosen' ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        };
        db.users.push(newUser);
        saveDb(db);
        return { success: true, message: `Akun baru '${body.name}' berhasil dibuat!` };
      }
    }

    if (endpoint.startsWith('/api/admin/users/') && method === 'PUT') {
      const id = parseInt(endpoint.split('/').pop(), 10);
      const u = db.users.find(x => x.id === id);
      if (u) {
        Object.assign(u, body);
        saveDb(db);
      }
      return { success: true, message: 'Data akun berhasil diperbarui.' };
    }

    if (endpoint.startsWith('/api/admin/users/') && method === 'DELETE') {
      const id = parseInt(endpoint.split('/').pop(), 10);
      db.users = db.users.filter(x => x.id !== id);
      saveDb(db);
      return { success: true, message: 'Akun berhasil dihapus.' };
    }

    // 13. Profile (Mass Assignment Privilege Escalation)
    if (endpoint === '/api/profile' && method === 'PUT') {
      const isVuln = db.vulnerable_mode;
      const u = db.users.find(x => x.id === authUser.id);
      if (u) {
        u.name = body.name || u.name;
        u.email = body.email || u.email;
        u.prodi = body.prodi || u.prodi;
        if (isVuln && body.role) {
          u.role = body.role; // VULNERABILITY: role modified
        }
        saveDb(db);
      }
      return {
        success: true,
        message: isVuln && body.role && body.role !== authUser.role 
          ? `[VULN: Eskalasi Hak Akses Berhasil!] Role diubah menjadi: ${body.role.toUpperCase()}`
          : 'Profil berhasil diperbarui.',
        user: u
      };
    }

    return { success: true };
  };
})();
