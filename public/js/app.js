// ===================================================
// SIAKAD ITSC - Portal Kampus Fiktif Application Logic
// Keamanan Sistem Informasi & Ethical Hacking
// ===================================================

const state = {
  currentUser: null,
  allUsers: [],
  securityMode: { vulnerable: true },
  currentTab: 'dashboard',
  courses: [],
  assignments: [],
  selectedThread: null,
  activeGradesStudentId: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  await fetchSecurityMode();
  await fetchAllUsers();
  initCurrentUser();
  setupEventListeners();
  renderApp();
});

// ==========================================
// API HELPERS
// ==========================================
function getHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  if (state.currentUser) {
    headers['x-user-id'] = state.currentUser.id;
  }
  return headers;
}

async function apiFetch(endpoint, options = {}) {
  const opts = { ...options };
  opts.headers = getHeaders(opts.headers || {});
  
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body === 'object') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }

  try {
    const res = await fetch(endpoint, opts);
    if (!res.ok && res.status === 404 && window.mockApiHandler) {
      return await window.mockApiHandler(endpoint, opts);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  } catch (err) {
    if (window.mockApiHandler) {
      return await window.mockApiHandler(endpoint, opts);
    }
    console.error('API Error:', err);
    throw err;
  }
}

// ==========================================
// SECURITY MODE MANAGEMENT
// ==========================================
async function fetchSecurityMode() {
  try {
    const data = await apiFetch('/api/security/mode');
    state.securityMode = data;
    updateSecurityBanner();
  } catch (err) {
    console.error('Gagal mengambil status mode keamanan', err);
  }
}

async function toggleSecurityMode() {
  const newMode = !state.securityMode.vulnerable;
  try {
    const res = await apiFetch('/api/security/mode', {
      method: 'POST',
      body: { vulnerable: newMode }
    });
    showToast(res.message, res.vulnerable ? 'warning' : 'success');
    await fetchSecurityMode();
    if (state.currentUser) {
      switchTab(state.currentTab);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateSecurityBanner() {
  const banner = document.getElementById('security-banner');
  const bannerText = document.getElementById('security-banner-text');
  const toggleBtn = document.getElementById('security-toggle-btn');
  if (!banner || !bannerText || !toggleBtn) return;

  if (state.securityMode.vulnerable) {
    banner.className = 'security-banner vuln-active';
    bannerText.innerHTML = `⚠️ <strong>Mode Rentan (Vulnerable Mode 🔴)</strong> — Celah keamanan sengaja dibuka untuk audit & pengujian (Stored XSS, Validasi Berkas Lemah, IDOR, SQLi, Mass Assignment).`;
    toggleBtn.innerHTML = `🛡️ Ubah ke Mode Aman 🟢`;
  } else {
    banner.className = 'security-banner sec-active';
    bannerText.innerHTML = `🔒 <strong>Mode Aman (Secure Mode 🟢)</strong> — Seluruh proteksi keamanan aktif (Sanitasi HTML, Whitelist Berkas, RBAC IDOR, Parameterized SQL).`;
    toggleBtn.innerHTML = `⚠️ Buka Celah Keamanan 🔴`;
  }
}

// ==========================================
// USERS & AUTHENTICATION
// ==========================================
async function fetchAllUsers() {
  try {
    state.allUsers = await apiFetch('/api/auth/users');
    renderQuickSwitcher();
  } catch (err) {
    console.error('Gagal mengambil daftar pengguna', err);
  }
}

function initCurrentUser() {
  const saved = localStorage.getItem('itsc_portal_user');
  if (saved) {
    try {
      state.currentUser = JSON.parse(saved);
    } catch (e) {
      state.currentUser = null;
    }
  } else {
    // If not logged in, remain in auth screen or default to null
    state.currentUser = null;
  }

  if (state.currentUser) {
    state.activeGradesStudentId = state.currentUser.id;
  }
}

function renderAuthOrPortal() {
  const authScreen = document.getElementById('auth-screen-container');
  const portalScreen = document.getElementById('main-portal-container');

  if (!state.currentUser) {
    if (authScreen) authScreen.style.display = 'block';
    if (portalScreen) portalScreen.style.display = 'none';
  } else {
    if (authScreen) authScreen.style.display = 'none';
    if (portalScreen) portalScreen.style.display = 'block';
    updateUserHeader();
    renderQuickSwitcher();
    switchTab(state.currentTab);
  }
}

function loginSuccess(user) {
  state.currentUser = user;
  state.activeGradesStudentId = user.id;
  localStorage.setItem('itsc_portal_user', JSON.stringify(user));
  showToast(`Selamat datang, ${user.name}! Masuk sebagai ${user.role.toUpperCase()}`, 'success');
  renderAuthOrPortal();
}

window.handlePortalLogout = function() {
  state.currentUser = null;
  localStorage.removeItem('itsc_portal_user');
  showToast('Anda telah keluar dari akun.', 'info');
  renderAuthOrPortal();
};

window.switchAuthTab = function(tab) {
  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');
  const loginBtn = document.getElementById('auth-tab-login-btn');
  const regBtn = document.getElementById('auth-tab-register-btn');

  if (tab === 'login') {
    if (loginTab) loginTab.style.display = 'block';
    if (regTab) regTab.style.display = 'none';
    if (loginBtn) loginBtn.classList.add('active');
    if (regBtn) regBtn.classList.remove('active');
  } else {
    if (loginTab) loginTab.style.display = 'none';
    if (regTab) regTab.style.display = 'block';
    if (loginBtn) loginBtn.classList.remove('active');
    if (regBtn) regBtn.classList.add('active');
  }
};

window.quickLoginCredential = function(username, pass) {
  document.getElementById('auth-input-username').value = username;
  document.getElementById('auth-input-password').value = pass;
  handlePortalLogin(new Event('submit'));
};

window.handlePortalLogin = async function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const username = document.getElementById('auth-input-username').value;
  const password = document.getElementById('auth-input-password').value;

  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });

    if (res.user) {
      loginSuccess(res.user);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.fillSqliLoginPayload = function() {
  document.getElementById('auth-input-username').value = "admin_itsc' --";
  document.getElementById('auth-input-password').value = "bebas_apapun";
  showToast('Payload SQL Injection dimasukkan! Klik "Masuk Sekarang" untuk menguji bypass.', 'warning');
};

window.handlePortalRegister = async function(e) {
  e.preventDefault();
  const role = document.getElementById('auth-reg-role').value;
  const name = document.getElementById('auth-reg-name').value;
  const identifier = document.getElementById('auth-reg-identifier').value;
  const username = document.getElementById('auth-reg-username').value;
  const password = document.getElementById('auth-reg-password').value;
  const prodi = document.getElementById('auth-reg-prodi').value;

  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: { role, name, username, password, identifier, prodi }
    });

    showToast(res.message, 'success');
    await fetchAllUsers();
    if (res.user) {
      loginSuccess(res.user);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.openRegisterModal = function() {
  const modal = document.getElementById('modal-register-user');
  if (modal) modal.classList.add('active');
};

window.handleModalRegisterSubmit = async function(e) {
  e.preventDefault();
  const role = document.getElementById('reg-user-role').value;
  const name = document.getElementById('reg-user-name').value;
  const username = document.getElementById('reg-user-username').value;
  const password = document.getElementById('reg-user-password').value;
  const identifier = document.getElementById('reg-user-identifier').value;
  const prodi = document.getElementById('reg-user-prodi').value;

  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: { role, name, username, password, identifier, prodi }
    });

    showToast(res.message, 'success');
    closeModal('modal-register-user');
    await fetchAllUsers();
    if (res.user) {
      switchUser(res.user);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

function switchUser(user) {
  state.currentUser = user;
  state.activeGradesStudentId = user.id;
  localStorage.setItem('itsc_portal_user', JSON.stringify(user));
  updateUserHeader();
  renderQuickSwitcher();
  showToast(`Beralih akun ke: ${user.name} (${user.role.toUpperCase()})`, 'info');
  switchTab(state.currentTab);
}

function updateUserHeader() {
  const avatar = document.getElementById('header-user-avatar');
  const name = document.getElementById('header-user-name');
  const role = document.getElementById('header-user-role');
  const navAdmin = document.getElementById('nav-item-admin');

  if (!state.currentUser) return;

  if (avatar) avatar.src = state.currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
  if (name) name.textContent = state.currentUser.name;
  if (role) {
    role.textContent = state.currentUser.role.toUpperCase() + (state.currentUser.identifier ? ` • ${state.currentUser.identifier}` : '');
    role.className = `user-role-tag role-${state.currentUser.role}`;
  }

  // Show/Hide Admin Tab
  if (navAdmin) {
    navAdmin.style.display = state.currentUser.role === 'admin' ? 'inline-flex' : 'none';
  }
}

function renderQuickSwitcher() {
  const container = document.getElementById('quick-user-pills');
  if (!container) return;

  container.innerHTML = state.allUsers.map(u => {
    const isCurrent = state.currentUser && state.currentUser.id === u.id;
    const roleEmoji = u.role === 'admin' ? '🛡️' : u.role === 'dosen' ? '👨‍🏫' : '🎓';
    return `
      <button class="user-pill-btn ${isCurrent ? 'current' : ''}" onclick="switchUserById(${u.id})">
        <span>${roleEmoji}</span>
        <span>${u.name.split(' ')[0]} (${u.role})</span>
      </button>
    `;
  }).join('');
}

window.switchUserById = function(id) {
  const target = state.allUsers.find(u => u.id === id);
  if (target) switchUser(target);
};

// Open Profile Modal & Privilege Escalation
window.openProfileModal = function() {
  if (!state.currentUser) return;
  const modal = document.getElementById('modal-profile');
  const u = state.currentUser;

  document.getElementById('profile-modal-avatar').src = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
  document.getElementById('profile-modal-name').textContent = u.name;
  document.getElementById('profile-modal-role-badge').textContent = `${u.role.toUpperCase()} • ${u.identifier || ''}`;
  document.getElementById('profile-input-name').value = u.name;
  document.getElementById('profile-input-email').value = u.email;
  document.getElementById('profile-input-prodi').value = u.prodi || '';
  document.getElementById('profile-input-role').value = u.role;

  if (modal) modal.classList.add('active');
};

window.escalateToAdminRole = function() {
  document.getElementById('profile-input-role').value = 'admin';
  showToast('Role disiapkan menjadi ADMIN. Klik "Simpan Profil" untuk mengirim payload!', 'warning');
};

async function handleProfileUpdate(e) {
  e.preventDefault();
  const name = document.getElementById('profile-input-name').value;
  const email = document.getElementById('profile-input-email').value;
  const prodi = document.getElementById('profile-input-prodi').value;
  const role = document.getElementById('profile-input-role').value;

  try {
    const res = await apiFetch('/api/profile', {
      method: 'PUT',
      body: { name, email, prodi, role }
    });

    showToast(res.message, res.user.role === 'admin' && state.currentUser.role !== 'admin' ? 'warning' : 'success');
    closeModal('modal-profile');
    if (res.user) {
      state.currentUser = res.user;
      localStorage.setItem('itsc_portal_user', JSON.stringify(res.user));
      updateUserHeader();
      await fetchAllUsers();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// NAVIGATION & TABS
// ==========================================
function setupEventListeners() {
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  const toggleBtn = document.getElementById('security-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSecurityMode);
  }

  const auditBtn = document.getElementById('open-audit-modal-btn');
  if (auditBtn) {
    auditBtn.addEventListener('click', openAuditModal);
  }
}

function switchTab(tabId) {
  state.currentTab = tabId;

  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const targetPanel = document.getElementById(`panel-${tabId}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // Load tab-specific content
  switch (tabId) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'grades':
      loadGrades();
      break;
    case 'assignments':
      loadAssignments();
      break;
    case 'forum':
      loadForum();
      break;
    case 'admin':
      loadAdminUsers();
      break;
  }
}

function renderApp() {
  renderAuthOrPortal();
}

// ==========================================
// TAB: DASHBOARD & COURSE SEARCH (SQLi DEMO)
// ==========================================
async function loadDashboard() {
  const user = state.currentUser;
  if (!user) return;

  const welcomeTitle = document.getElementById('dash-welcome-title');
  const welcomeSub = document.getElementById('dash-welcome-sub');
  if (welcomeTitle) welcomeTitle.textContent = `Selamat Datang, ${user.name}!`;
  if (welcomeSub) welcomeSub.textContent = `Portal Akademik Terpadu Institut Teknologi & Sains Cakrawala (${user.prodi || 'Fakultas Teknologi'})`;

  try {
    const courses = await apiFetch('/api/courses');
    state.courses = courses;

    let assignments = await apiFetch('/api/assignments');
    state.assignments = assignments;

    const statCourses = document.getElementById('stat-courses-count');
    const statAssignments = document.getElementById('stat-assignments-count');
    const statRole = document.getElementById('stat-role-name');

    if (statCourses) statCourses.textContent = courses.length;
    if (statAssignments) statAssignments.textContent = assignments.length;
    if (statRole) statRole.textContent = user.role.toUpperCase();

    renderCourseList(courses);
  } catch (err) {
    console.error('Gagal memuat data dashboard', err);
  }
}

function renderCourseList(courses) {
  const courseListEl = document.getElementById('dash-course-list');
  if (!courseListEl) return;

  if (courses.length === 0) {
    courseListEl.innerHTML = `<div class="card" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Tidak ada mata kuliah yang cocok dengan kata kunci pencarian.</div>`;
    return;
  }

  courseListEl.innerHTML = courses.map(c => `
    <div class="card" style="padding: 1rem; margin-bottom: 0.75rem; border-left: 4px solid var(--primary);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <span class="badge badge-info">${c.code} • ${c.sks} SKS • Semester ${c.semester}</span>
          <h4 style="margin: 0.35rem 0; font-size: 1rem;">${c.name}</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted);">Dosen Pengampu: <strong>${c.dosen_name || 'Dosen Pengampu'}</strong></p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="switchTab('assignments')">Lihat Tugas</button>
      </div>
    </div>
  `).join('');
}

// SQL Injection Search Demo
window.triggerSqliSearchDemo = function() {
  const input = document.getElementById('course-search-input');
  if (input) {
    input.value = "' UNION SELECT 99, 'SQLi-999', 'DATA RAHASIA TERINJEKSI', 4, 1, 1, 'Hacked Dosen' --";
    showToast('Payload SQL Injection dimasukkan! Menjalankan pencarian...', 'warning');
    handleCourseSearch(new Event('submit'));
  }
};

window.handleCourseSearch = async function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('course-search-input');
  const infoEl = document.getElementById('course-search-result-info');
  const q = input ? input.value : '';

  try {
    const res = await apiFetch(`/api/courses/search?q=${encodeURIComponent(q)}`);
    renderCourseList(res);

    if (infoEl) {
      if (q.includes("'") || q.includes('UNION')) {
        infoEl.innerHTML = `
          <div style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 0.5rem; border-radius: var(--radius-sm);">
            <strong>⚠️ [SQL INJECTION AKTIF]:</strong> Query berhasil dimanipulasi melalui concatenation! Data terinjeksi tampil pada daftar di bawah.
          </div>
        `;
        infoEl.style.display = 'block';
      } else {
        infoEl.style.display = 'none';
      }
    }
  } catch (err) {
    if (infoEl) {
      infoEl.innerHTML = `
        <div style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 0.5rem; border-radius: var(--radius-sm);">
          <strong>🚨 [SQL Injection Syntax Error]:</strong> ${err.message}
        </div>
      `;
      infoEl.style.display = 'block';
    }
    showToast(err.message, 'error');
  }
};

window.resetCourseSearch = function() {
  const input = document.getElementById('course-search-input');
  const infoEl = document.getElementById('course-search-result-info');
  if (input) input.value = '';
  if (infoEl) infoEl.style.display = 'none';
  loadDashboard();
};

// ==========================================
// TAB: NILAI & KHS (IDOR DEMO)
// ==========================================
async function loadGrades(targetId = null) {
  const studentId = targetId || state.activeGradesStudentId || state.currentUser.id;
  state.activeGradesStudentId = studentId;

  const idorContainer = document.getElementById('grades-idor-bar');
  const alertContainer = document.getElementById('grades-idor-alert');
  const tableBody = document.getElementById('grades-table-body');
  const gpaSummary = document.getElementById('grades-summary-gpa');
  const sksSummary = document.getElementById('grades-summary-sks');
  const studentNameTag = document.getElementById('grades-student-target-name');

  // Render IDOR student switcher buttons
  if (idorContainer) {
    const students = state.allUsers.filter(u => u.role === 'mahasiswa');
    idorContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; background: #fff; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px dashed ${state.securityMode.vulnerable ? '#ef4444' : '#10b981'}; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span style="font-size: 0.85rem; font-weight: 700;">🧪 Pengujian IDOR (Ganti Target ID Mahasiswa):</span>
          ${students.map(s => `
            <button class="btn btn-sm ${s.id === studentId ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="loadGrades(${s.id})">
              ${s.name.split(' ')[0]} (ID: ${s.id})
            </button>
          `).join('')}
        </div>
        <span style="font-size: 0.75rem; color: var(--text-muted);">
          Endpoint URL: <code>/api/grades/${studentId}</code>
        </span>
      </div>
    `;
  }

  try {
    const data = await apiFetch(`/api/grades/${studentId}`);

    if (alertContainer) {
      if (data.idorWarning) {
        alertContainer.innerHTML = `
          <div class="idor-alert">
            <span style="font-size: 1.25rem;">⚠️</span>
            <div>
              <strong>Kerentanan IDOR Terpicu (Mode Rentan):</strong><br/>
              ${data.idorWarning}
            </div>
          </div>
        `;
        alertContainer.style.display = 'block';
      } else {
        alertContainer.style.display = 'none';
      }
    }

    if (studentNameTag) {
      studentNameTag.textContent = `${data.student.name} (${data.student.identifier}) - ${data.student.prodi}`;
    }

    if (gpaSummary) gpaSummary.textContent = data.summary.ipk;
    if (sksSummary) sksSummary.textContent = `${data.summary.totalSks} SKS`;

    if (tableBody) {
      if (data.grades.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada rekap nilai untuk mahasiswa ini.</td></tr>`;
      } else {
        tableBody.innerHTML = data.grades.map((g, idx) => {
          let letterClass = 'badge-success';
          if (g.grade_letter.startsWith('B')) letterClass = 'badge-info';
          if (g.grade_letter.startsWith('C')) letterClass = 'badge-warning';
          if (g.grade_letter.startsWith('D') || g.grade_letter === 'E') letterClass = 'badge-danger';

          const isLecturer = state.currentUser.role === 'dosen' || state.currentUser.role === 'admin';

          return `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${g.course_code}</strong></td>
              <td>${g.course_name}</td>
              <td>${g.sks}</td>
              <td>${g.dosen_name}</td>
              <td><span class="badge ${letterClass}">${g.grade_letter} (${g.grade_number})</span></td>
              <td>${g.attendance_percent}%</td>
              <td>
                ${isLecturer ? `
                  <button class="btn btn-secondary btn-sm" onclick="openEditGradeModal(${g.enrollment_id}, '${escapeQuote(g.course_name)}', '${escapeQuote(data.student.name)}', '${g.grade_letter}', ${g.grade_number})">
                    ✏️ Ubah Nilai
                  </button>
                ` : `<span style="color: var(--text-light); font-size: 0.8rem;">Terverifikasi</span>`}
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="idor-alert" style="background: #f0fdf4; border-color: #bbf7d0; color: #166534;">
          <span style="font-size: 1.25rem;">🛡️</span>
          <div>
            <strong>Proteksi IDOR Bekerja (Mode Aman):</strong><br/>
            ${err.message}
          </div>
        </div>
      `;
      alertContainer.style.display = 'block';
    }
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc2626; font-weight: 600; padding: 2rem;">Akses ditolak oleh server (IDOR Protection Active).</td></tr>`;
    }
    if (gpaSummary) gpaSummary.textContent = '-';
    if (sksSummary) sksSummary.textContent = '-';
  }
}

// ==========================================
// TAB: TUGAS KULIAH & UPLOAD FILE
// ==========================================
async function loadAssignments() {
  const container = document.getElementById('assignments-list-container');
  const createBtn = document.getElementById('btn-create-assignment');
  if (!container) return;

  const isLecturer = state.currentUser.role === 'dosen' || state.currentUser.role === 'admin';
  if (createBtn) createBtn.style.display = isLecturer ? 'inline-flex' : 'none';

  try {
    const assignments = await apiFetch('/api/assignments');
    state.assignments = assignments;

    if (assignments.length === 0) {
      container.innerHTML = `<div class="card" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada penugasan kuliah yang diterbitkan.</div>`;
      return;
    }

    container.innerHTML = assignments.map(a => `
      <div class="card" style="margin-bottom: 1.25rem; border-left: 5px solid ${isLecturer ? 'var(--accent)' : 'var(--primary)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="flex: 1; min-width: 300px;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; flex-wrap: wrap;">
              <span class="badge badge-purple">${a.course_code} - ${a.course_name}</span>
              <span class="badge badge-warning">⏰ Tenggat: ${a.deadline}</span>
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem;">${a.title}</h3>
            <p style="font-size: 0.875rem; color: #475569; margin-bottom: 0.75rem;">${a.description || 'Tidak ada deskripsi rincian tugas.'}</p>
            <p style="font-size: 0.75rem; color: var(--text-light);">Dosen Pengampu: <strong>${a.dosen_name}</strong></p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${state.currentUser.role === 'mahasiswa' ? `
              <button class="btn btn-primary btn-sm" onclick="openSubmitModal(${a.id}, '${escapeQuote(a.title)}')">
                📤 Unggah Berkas Tugas
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="viewSubmissionsModal(${a.id}, '${escapeQuote(a.title)}')">
              📂 Lihat Pengumpulan & Nilai
            </button>
            ${isLecturer ? `
              <button class="btn btn-danger btn-sm" onclick="deleteAssignment(${a.id}, '${escapeQuote(a.title)}')">
                🗑️ Hapus Tugas
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="card" style="color: red;">Gagal memuat tugas: ${err.message}</div>`;
  }
}

window.deleteAssignment = async function(id, title) {
  if (confirm(`Apakah Anda yakin ingin menghapus tugas '${title}'?`)) {
    try {
      const res = await apiFetch(`/api/assignments/${id}`, { method: 'DELETE' });
      showToast(res.message, 'success');
      loadAssignments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

function openSubmitModal(assignmentId, title) {
  const modal = document.getElementById('modal-submit-assignment');
  const titleEl = document.getElementById('submit-modal-title');
  const form = document.getElementById('form-submit-assignment');
  const assignIdInput = document.getElementById('submit-assignment-id');

  if (titleEl) titleEl.textContent = `Unggah Tugas: ${title}`;
  if (assignIdInput) assignIdInput.value = assignmentId;
  if (form) form.reset();

  const vulnNotice = document.getElementById('upload-vuln-notice');
  if (vulnNotice) {
    if (state.securityMode.vulnerable) {
      vulnNotice.innerHTML = `
        <div style="background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 0.6rem; border-radius: var(--radius-sm); font-size: 0.8rem; margin-bottom: 0.75rem;">
          <strong>🧪 Pengujian Validasi Berkas Lemah (Mode Rentan):</strong><br/>
          Server tidak memvalidasi ekstensi berkas. Anda dapat menguji mengunggah berkas seperti <code>poc_payload.html</code> berisi tag <code>&lt;script&gt;alert('File Upload RCE / XSS')&lt;/script&gt;</code>.
          <button type="button" class="btn btn-sm btn-secondary" style="margin-top: 0.4rem; padding: 0.2rem 0.5rem;" onclick="generateHtmlPayload()">
            ⚡ Buat File Payload .HTML Otomatis
          </button>
        </div>
      `;
      vulnNotice.style.display = 'block';
    } else {
      vulnNotice.innerHTML = `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 0.6rem; border-radius: var(--radius-sm); font-size: 0.8rem; margin-bottom: 0.75rem;">
          <strong>🛡️ Validasi Berkas Aman (Mode Aman):</strong><br/>
          Hanya berkas berekstensi (.pdf, .docx, .zip, .rar, .png, .jpg) yang diterima sistem. Tipe berkas lain akan ditolak demi keamanan server.
        </div>
      `;
      vulnNotice.style.display = 'block';
    }
  }

  if (modal) modal.classList.add('active');
}

window.generateHtmlPayload = function() {
  const fileInput = document.getElementById('submissionFile');
  if (!fileInput) return;

  const content = `<!DOCTYPE html>
<html>
<head><title>Bukti Kerentanan File Upload</title></head>
<body style="font-family: sans-serif; padding: 2rem; background: #fff1f2;">
  <h1 style="color: #be123c;">⚠️ PoC: Validasi Berkas Lemah Ditemukan!</h1>
  <p>File ini adalah berkas HTML/Script yang diunggah ke server tanpa validasi ekstensi.</p>
  <script>
    alert('🚨 Validasi Berkas Lemah Berhasil Dieksploitasi di Server SIAKAD!');
  </script>
</body>
</html>`;

  const blob = new Blob([content], { type: 'text/html' });
  const file = new File([blob], 'payload_audit_poc.html', { type: 'text/html' });

  const dt = new DataTransfer();
  dt.items.add(file);
  fileInput.files = dt.files;

  showToast('File payload_audit_poc.html otomatis dimasukkan ke input file!', 'warning');
};

async function handleSubmissionSubmit(e) {
  e.preventDefault();
  const assignmentId = document.getElementById('submit-assignment-id').value;
  const fileInput = document.getElementById('submissionFile');
  const notesInput = document.getElementById('studentNotes');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Harap pilih berkas tugas yang ingin diunggah.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('submissionFile', fileInput.files[0]);
  formData.append('studentNotes', notesInput.value);

  try {
    const res = await apiFetch(`/api/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: formData
    });

    closeModal('modal-submit-assignment');
    showToast(res.message, res.file.isPotentiallyHarmful ? 'warning' : 'success');
    loadAssignments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// View Submissions Modal
async function viewSubmissionsModal(assignmentId, title) {
  const modal = document.getElementById('modal-view-submissions');
  const titleEl = document.getElementById('view-submissions-title');
  const listEl = document.getElementById('submissions-list-table');

  if (titleEl) titleEl.textContent = `Daftar Pengumpulan: ${title}`;
  if (modal) modal.classList.add('active');

  try {
    const submissions = await apiFetch(`/api/assignments/${assignmentId}/submissions`);
    if (!listEl) return;

    if (submissions.length === 0) {
      listEl.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada berkas tugas yang dikumpulkan.</td></tr>`;
      return;
    }

    const isLecturer = state.currentUser.role === 'dosen' || state.currentUser.role === 'admin';

    listEl.innerHTML = submissions.map((s, idx) => {
      const isHtml = s.original_name.endsWith('.html');
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${s.student_name}</strong><br/>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${s.student_nim}</span>
          </td>
          <td>
            <a href="/${s.file_path}" target="_blank" style="color: var(--primary); font-weight: 600; text-decoration: underline;">
              ${s.original_name}
            </a>
            ${isHtml ? '<span class="badge badge-danger" style="margin-left: 0.4rem;">HTML Executable</span>' : ''}
            <div style="font-size: 0.75rem; color: var(--text-light);">${(s.file_size / 1024).toFixed(1)} KB</div>
          </td>
          <td>
            ${s.score !== null ? `<span class="badge badge-success">${s.score} / 100</span>` : '<span class="badge badge-warning">Belum Dinilai</span>'}
            ${s.feedback ? `<div style="font-size: 0.75rem; color: #475569; margin-top: 0.2rem;">"${s.feedback}"</div>` : ''}
          </td>
          <td>${s.submitted_at}</td>
          <td>
            ${isLecturer ? `
              <button class="btn btn-secondary btn-sm" onclick="openGradeSubmissionModal(${s.id}, '${escapeQuote(s.student_name)}', ${s.score || 85}, '${escapeQuote(s.feedback || '')}')">
                ⭐ Beri Nilai
              </button>
            ` : `
              <a href="/api/submissions/download/${s.id}" class="btn btn-secondary btn-sm">
                ⬇️ Unduh
              </a>
            `}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    if (listEl) listEl.innerHTML = `<tr><td colspan="6" style="color: red;">Gagal memuat: ${err.message}</td></tr>`;
  }
}

function openGradeSubmissionModal(submissionId, studentName, currentScore, currentFeedback) {
  const modal = document.getElementById('modal-grade-submission');
  const titleEl = document.getElementById('grade-modal-title');
  const subIdInput = document.getElementById('grade-submission-id');
  const scoreInput = document.getElementById('grade-score-input');
  const feedbackInput = document.getElementById('grade-feedback-input');

  if (titleEl) titleEl.textContent = `Penilaian Tugas: ${studentName}`;
  if (subIdInput) subIdInput.value = submissionId;
  if (scoreInput) scoreInput.value = currentScore;
  if (feedbackInput) feedbackInput.value = currentFeedback;

  if (modal) modal.classList.add('active');
}

async function handleGradeSubmissionSubmit(e) {
  e.preventDefault();
  const submissionId = document.getElementById('grade-submission-id').value;
  const score = document.getElementById('grade-score-input').value;
  const feedback = document.getElementById('grade-feedback-input').value;

  try {
    const res = await apiFetch(`/api/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: { score: parseFloat(score), feedback }
    });
    showToast(res.message, 'success');
    closeModal('modal-grade-submission');
    closeModal('modal-view-submissions');
    loadAssignments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openCreateAssignmentModal() {
  const modal = document.getElementById('modal-create-assignment');
  const select = document.getElementById('create-assign-course');
  if (select) {
    select.innerHTML = state.courses.map(c => `
      <option value="${c.id}">${c.code} - ${c.name}</option>
    `).join('');
  }
  if (modal) modal.classList.add('active');
}

async function handleCreateAssignmentSubmit(e) {
  e.preventDefault();
  const courseId = document.getElementById('create-assign-course').value;
  const title = document.getElementById('create-assign-title').value;
  const description = document.getElementById('create-assign-desc').value;
  const deadline = document.getElementById('create-assign-deadline').value;

  try {
    const res = await apiFetch('/api/assignments', {
      method: 'POST',
      body: { courseId, title, description, deadline }
    });
    showToast(res.message, 'success');
    closeModal('modal-create-assignment');
    loadAssignments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// TAB: FORUM DISKUSI (STORED XSS DEMO)
// ==========================================
async function loadForum() {
  const threadsContainer = document.getElementById('forum-threads-container');
  if (!threadsContainer) return;

  try {
    const threads = await apiFetch('/api/forum/threads');

    if (threads.length === 0) {
      threadsContainer.innerHTML = `<div class="card" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada topik diskusi di forum kampus.</div>`;
      return;
    }

    threadsContainer.innerHTML = threads.map(t => `
      <div class="forum-thread-card" onclick="viewThreadDetails(${t.id})">
        <div class="thread-header">
          <div class="thread-author-meta">
            <img src="${t.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" class="thread-author-avatar" alt="Avatar"/>
            <div>
              <strong style="font-size: 0.9rem;">${t.author_name}</strong>
              <span class="user-role-tag role-${t.author_role}"> • ${t.author_role.toUpperCase()}</span>
            </div>
          </div>
          <span class="badge badge-info">${t.category}</span>
        </div>
        <h3 class="thread-title">${t.title}</h3>
        <div class="thread-snippet">${t.content}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-light); border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
          <span>💬 ${t.reply_count} Tanggapan</span>
          <span>📅 ${t.created_at}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    threadsContainer.innerHTML = `<div class="card" style="color: red;">Gagal memuat forum: ${err.message}</div>`;
  }
}

async function viewThreadDetails(threadId) {
  const modal = document.getElementById('modal-thread-details');
  const bodyEl = document.getElementById('thread-details-body');
  if (!modal || !bodyEl) return;

  modal.classList.add('active');
  bodyEl.innerHTML = '<div style="text-align: center; padding: 2rem;">Memuat detail diskusi...</div>';

  try {
    const data = await apiFetch(`/api/forum/threads/${threadId}`);
    state.selectedThread = data;

    const t = data.thread;
    const replies = data.replies;

    bodyEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
          <img src="${t.author_avatar}" class="thread-author-avatar" style="width: 40px; height: 40px;"/>
          <div>
            <h4 style="font-size: 1rem; margin: 0;">${t.author_name}</h4>
            <span class="user-role-tag role-${t.author_role}">${t.author_role.toUpperCase()} • ${t.created_at}</span>
          </div>
        </div>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem;">${t.title}</h2>
        <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); font-size: 0.95rem; line-height: 1.6; border: 1px solid var(--border-color);">
          ${t.content}
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
          💬 Tanggapan Diskusi (${replies.length})
        </h3>
        
        <div id="thread-replies-container">
          ${replies.length === 0 ? '<p style="color: var(--text-muted); font-size: 0.85rem;">Belum ada tanggapan. Jadilah yang pertama menanggapi!</p>' : ''}
          ${replies.map(r => `
            <div class="reply-item">
              <div class="reply-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <img src="${r.user_avatar}" style="width: 24px; height: 24px; border-radius: 50%;"/>
                  <strong>${r.user_name}</strong>
                  <span class="user-role-tag role-${r.user_role}">${r.user_role}</span>
                </div>
                <span style="color: var(--text-light); font-size: 0.75rem;">${r.created_at}</span>
              </div>
              <div class="reply-content-box">${r.reply_content}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Reply Box -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Beri Tanggapan:</h4>
        ${state.securityMode.vulnerable ? `
          <div style="background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; padding: 0.5rem; border-radius: var(--radius-sm); font-size: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
            <span>🧪 <strong>Mode Stored XSS Aktif:</strong> Masukan komentar tidak di-escape di server/klien!</span>
            <button class="btn btn-sm btn-danger" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;" onclick="insertXssPayload()">
              Sisipkan Script XSS
            </button>
          </div>
        ` : ''}
        <form onsubmit="handleSendReply(event, ${t.id})">
          <textarea id="reply-input-text" class="form-control" placeholder="Tuliskan tanggapan Anda..." style="min-height: 80px;" required></textarea>
          <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
            <button type="submit" class="btn btn-primary btn-sm">Kirim Balasan 💬</button>
          </div>
        </form>
      </div>
    `;

    if (state.securityMode.vulnerable) {
      setTimeout(() => {
        executeInjectedScripts(bodyEl);
      }, 50);
    }
  } catch (err) {
    bodyEl.innerHTML = `<div style="color: red;">Gagal memuat diskusi: ${err.message}</div>`;
  }
}

window.insertXssPayload = function() {
  const input = document.getElementById('reply-input-text');
  if (input) {
    input.value = `<img src="x" onerror="alert('🚨 [STORED XSS TRIGGERED] Berhasil mengeksekusi JavaScript di Forum Kampus!')">`;
  }
};

function executeInjectedScripts(element) {
  const scripts = element.querySelectorAll('script');
  scripts.forEach(script => {
    try {
      const newScript = document.createElement('script');
      newScript.text = script.innerText;
      document.body.appendChild(newScript);
    } catch (e) {
      console.warn('Script execution caught', e);
    }
  });
}

async function handleSendReply(e, threadId) {
  e.preventDefault();
  const input = document.getElementById('reply-input-text');
  if (!input) return;

  const content = input.value;
  try {
    const res = await apiFetch(`/api/forum/threads/${threadId}/reply`, {
      method: 'POST',
      body: { replyContent: content }
    });

    showToast(res.message, state.securityMode.vulnerable && content.includes('<') ? 'warning' : 'success');
    viewThreadDetails(threadId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openCreateThreadModal() {
  const modal = document.getElementById('modal-create-thread');
  const form = document.getElementById('form-create-thread');
  if (form) form.reset();
  if (modal) modal.classList.add('active');
}

async function handleCreateThreadSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('thread-title-input').value;
  const category = document.getElementById('thread-cat-input').value;
  const content = document.getElementById('thread-content-input').value;

  try {
    const res = await apiFetch('/api/forum/threads', {
      method: 'POST',
      body: { title, category, content }
    });

    showToast(res.message, 'success');
    closeModal('modal-create-thread');
    loadForum();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// TAB: ADMIN USER MANAGEMENT (CRUD)
// ==========================================
async function loadAdminUsers() {
  const tableBody = document.getElementById('admin-users-table-body');
  if (!tableBody) return;

  try {
    const users = await apiFetch('/api/admin/users');
    state.allUsers = users;
    renderQuickSwitcher();

    tableBody.innerHTML = users.map((u, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <img src="${u.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;"/>
            <div>
              <strong>${u.name}</strong><br/>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${u.email}</span>
            </div>
          </div>
        </td>
        <td><code>${u.username}</code></td>
        <td><span class="user-role-tag role-${u.role}">${u.role.toUpperCase()}</span></td>
        <td>${u.identifier || '-'}</td>
        <td>${u.prodi || '-'}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEditUserModal(${u.id})">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteUser(${u.id}, '${escapeQuote(u.name)}')">🗑️ Hapus</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">${err.message}</td></tr>`;
  }
}

function openAddUserModal() {
  const modal = document.getElementById('modal-add-user');
  const form = document.getElementById('form-add-user');
  if (form) form.reset();
  if (modal) modal.classList.add('active');
}

async function handleAddUserSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('add-user-username').value;
  const password = document.getElementById('add-user-password').value;
  const name = document.getElementById('add-user-name').value;
  const email = document.getElementById('add-user-email').value;
  const role = document.getElementById('add-user-role').value;
  const identifier = document.getElementById('add-user-identifier').value;
  const prodi = document.getElementById('add-user-prodi').value;

  try {
    const res = await apiFetch('/api/admin/users', {
      method: 'POST',
      body: { username, password, name, email, role, identifier, prodi }
    });
    showToast(res.message, 'success');
    closeModal('modal-add-user');
    await fetchAllUsers();
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditUserModal(userId) {
  const user = state.allUsers.find(u => u.id === userId);
  if (!user) return;

  const modal = document.getElementById('modal-edit-user');
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-user-name').value = user.name;
  document.getElementById('edit-user-email').value = user.email;
  document.getElementById('edit-user-role').value = user.role;
  document.getElementById('edit-user-identifier').value = user.identifier || '';
  document.getElementById('edit-user-prodi').value = user.prodi || '';
  document.getElementById('edit-user-password').value = '';

  if (modal) modal.classList.add('active');
}

async function handleEditUserSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('edit-user-id').value;
  const name = document.getElementById('edit-user-name').value;
  const email = document.getElementById('edit-user-email').value;
  const role = document.getElementById('edit-user-role').value;
  const identifier = document.getElementById('edit-user-identifier').value;
  const prodi = document.getElementById('edit-user-prodi').value;
  const password = document.getElementById('edit-user-password').value;

  try {
    const res = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: { name, email, role, identifier, prodi, password }
    });
    showToast(res.message, 'success');
    closeModal('modal-edit-user');
    await fetchAllUsers();
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmDeleteUser(userId, name) {
  if (confirm(`Apakah Anda yakin ingin menghapus akun '${name}' beserta seluruh datanya?`)) {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      showToast(res.message, 'success');
      await fetchAllUsers();
      loadAdminUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

function openEditGradeModal(enrollmentId, courseName, studentName, currentLetter, currentNum) {
  const modal = document.getElementById('modal-edit-enrollment-grade');
  document.getElementById('edit-grade-enrollment-id').value = enrollmentId;
  document.getElementById('edit-grade-modal-title').textContent = `Input Nilai: ${courseName} (${studentName})`;
  document.getElementById('edit-grade-letter').value = currentLetter;
  document.getElementById('edit-grade-number').value = currentNum;
  if (modal) modal.classList.add('active');
}

async function handleEditGradeSubmit(e) {
  e.preventDefault();
  const enrollmentId = document.getElementById('edit-grade-enrollment-id').value;
  const gradeLetter = document.getElementById('edit-grade-letter').value;
  const gradeNumber = document.getElementById('edit-grade-number').value;

  try {
    const res = await apiFetch('/api/grades/update', {
      method: 'POST',
      body: { enrollmentId, gradeLetter, gradeNumber: parseFloat(gradeNumber) }
    });
    showToast(res.message, 'success');
    closeModal('modal-edit-enrollment-grade');
    loadGrades(state.activeGradesStudentId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// AUDIT & VULNERABILITY LAB MODAL
// ==========================================
async function openAuditModal() {
  const modal = document.getElementById('modal-audit-lab');
  const content = document.getElementById('audit-lab-content');
  if (!modal || !content) return;

  modal.classList.add('active');
  content.innerHTML = '<div style="text-align: center; padding: 2rem;">Memuat daftar kerentanan...</div>';

  try {
    const data = await apiFetch('/api/security/audit-info');
    content.innerHTML = `
      <div style="background: #f1f5f9; padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 1.1rem; color: #0f172a;">${data.campusInfo.portalName}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">${data.campusInfo.institution} • Semester ${data.campusInfo.semester}</p>
        </div>
        <span class="badge ${data.currentMode === 'VULNERABLE' ? 'badge-danger' : 'badge-success'}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
          Status Sistem: ${data.currentMode}
        </span>
      </div>

      <div style="margin-bottom: 1rem;">
        <h4 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 0.5rem; color: #1e293b;">
          Daftar Kerentanan yang Dibuat Sengaja (Untuk Form & Evaluasi Dosen):
        </h4>
        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1rem;">
          Proyek ini secara sengaja mengimplementasikan <strong>4 Celah Keamanan Utama</strong> lengkap dengan sakelar mitigasi (Vulnerable Mode vs Secure Mode) sehingga dosen atau auditor dapat langsung menguji dan membandingkan hasilnya.
        </p>
      </div>

      ${data.vulnerabilities.map(v => `
        <div class="vulnerability-card highlight">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <strong style="font-size: 1rem; color: #991b1b;">${v.name}</strong>
            <span class="vuln-badge">${v.category}</span>
          </div>
          <p style="font-size: 0.85rem; color: #334155; margin-bottom: 0.4rem;"><strong>Lokasi Titik Celah:</strong> <code>${v.location}</code></p>
          <p style="font-size: 0.85rem; color: #475569; margin-bottom: 0.6rem;">${v.description}</p>
          
          ${v.testPayload ? `
            <div style="font-size: 0.75rem; font-weight: 700; color: #0f172a; margin-top: 0.4rem;">Contoh Payload Pengujian (PoC):</div>
            <div class="poc-box">
              <code>${escapeHtml(v.testPayload)}</code>
              <button class="copy-poc-btn" onclick="copyToClipboard('${escapeQuote(v.testPayload)}')">Salin PoC</button>
            </div>
          ` : ''}

          <div style="font-size: 0.8rem; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin-top: 0.5rem;">
            <strong>Solusi & Mitigasi (Saat Mode Aman Aktif):</strong> ${v.remediation}
          </div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    content.innerHTML = `<div style="color: red;">Gagal memuat info audit: ${err.message}</div>`;
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.25s ease reverse';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeQuote(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Payload PoC berhasil disalin ke clipboard!', 'success');
  }).catch(() => {
    showToast('Gagal menyalin.', 'error');
  });
}
