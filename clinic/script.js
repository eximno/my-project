
const API_URL = 'https://script.google.com/macros/s/AKfycbx5HQ9c_843O7q9y7ZCcMIQPRJPAMh76wJCP1FdOZjRN8XcF5tB8SfnIzTt-od__SjwsA/exec';

/* =========================================================
 * API HELPERS
 * ========================================================= */

async function apiGet(action, params) {
  params = params || {};
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(API_URL + '?' + query);
  return res.json();
}


async function apiPost(action, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

/* =========================================================
 * SESSION
 * ========================================================= */

function saveSession(user) {
  localStorage.setItem('clinicUser', JSON.stringify(user));
}

function getSession() {
  const raw = localStorage.getItem('clinicUser');
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem('clinicUser');
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

function requireAuth(requiredRole) {
  const user = getSession();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === 'admin' ? 'admin.html' : 'appointment.html';
    return null;
  }
  return user;
}

function renderSessionBadge(user) {
  const badge = document.getElementById('sessionBadge');
  if (badge) badge.textContent = user.username + ' \u00B7 ' + user.role;
}

function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + type;
}

function clearMsg(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = '';
  el.className = 'msg';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* =========================================================
 * PAGE: login.html
 * ========================================================= */
function initLoginPage() {
  const existing = getSession();
  if (existing) {
    window.location.href = existing.role === 'admin' ? 'admin.html' : 'appointment.html';
    return;
  }

  document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearMsg('loginMsg');

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const res = await apiPost('login', { username, password });
      btn.disabled = false;
      btn.textContent = 'Log In';
      if (res.success) {
        saveSession(res.user);
        window.location.href = res.user.role === 'admin' ? 'admin.html' : 'appointment.html';
      } else {
        showMsg('loginMsg', res.message, 'error');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Log In';
      showMsg('loginMsg', 'Could not reach the server: ' + err.message, 'error');
    }
  });
}

/* =========================================================
 * PAGE: register.html
 * ========================================================= */
function initRegisterPage() {
  document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearMsg('registerMsg');

    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    if (password !== confirm) {
      showMsg('registerMsg', 'Passwords do not match.', 'error');
      return;
    }

    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const res = await apiPost('register', { username, password });
      btn.disabled = false;
      btn.textContent = 'Create Account';
      if (res.success) {
        showMsg('registerMsg', 'Account created. Redirecting to login...', 'success');
        setTimeout(function () { window.location.href = 'login.html'; }, 1200);
      } else {
        showMsg('registerMsg', res.message, 'error');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Create Account';
      showMsg('registerMsg', 'Could not reach the server: ' + err.message, 'error');
    }
  });
}

/* =========================================================
 * PAGE: appointment.html (patient dashboard)
 * ========================================================= */
function initAppointmentPage() {
  const user = requireAuth('patient');
  if (!user) return;
  renderSessionBadge(user);

  const dateInput = document.getElementById('apptDate');
  if (dateInput) {
    dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
  }

  document.getElementById('bookForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearMsg('bookMsg');

    const appointment = {
      username: user.username,
      patientName: document.getElementById('patientName').value,
      date: document.getElementById('apptDate').value,
      time: document.getElementById('apptTime').value,
      reason: document.getElementById('apptReason').value
    };

    const btn = document.getElementById('bookBtn');
    btn.disabled = true;
    btn.textContent = 'Booking...';

    try {
      const res = await apiPost('bookAppointment', appointment);
      btn.disabled = false;
      btn.textContent = 'Book Appointment';
      if (res.success) {
        showMsg('bookMsg', res.message, 'success');
        document.getElementById('bookForm').reset();
        loadMyAppointments(user.username);
      } else {
        showMsg('bookMsg', res.message, 'error');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Book Appointment';
      showMsg('bookMsg', 'Could not reach the server: ' + err.message, 'error');
    }
  });

  loadMyAppointments(user.username);
}

async function loadMyAppointments(username) {
  const tbody = document.getElementById('myApptTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Loading...</td></tr>';

  try {
    const rows = await apiGet('getMyAppointments', { username });
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No appointments booked yet.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r =>
      '<tr><td>' + escapeHtml(r.patientName) + '</td>' +
      '<td>' + escapeHtml(r.date) + '</td>' +
      '<td>' + escapeHtml(r.time) + '</td>' +
      '<td>' + escapeHtml(r.reason) + '</td></tr>'
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Could not load appointments.</td></tr>';
  }
}

/* =========================================================
 * PAGE: admin.html
 * ========================================================= */
function initAdminPage() {
  const user = requireAuth('admin');
  if (!user) return;
  renderSessionBadge(user);

  loadAllAppointments();
  loadAllUsers();
}

async function loadAllAppointments() {
  const tbody = document.getElementById('adminApptTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Loading...</td></tr>';

  try {
    const rows = await apiGet('getAllAppointments');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No appointments in the system.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r =>
      '<tr><td>' + r.id + '</td><td>' + escapeHtml(r.username) + '</td>' +
      '<td>' + escapeHtml(r.patientName) + '</td>' +
      '<td>' + escapeHtml(r.date) + '</td><td>' + escapeHtml(r.time) + '</td>' +
      '<td>' + escapeHtml(r.reason) + '</td>' +
      '<td><button class="btn danger" style="padding:4px 10px;font-size:12px" onclick="removeAppointment(' + r.id + ')">Delete</button></td></tr>'
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Could not load appointments.</td></tr>';
  }
}

async function removeAppointment(id) {
  await apiPost('deleteAppointment', { id });
  loadAllAppointments();
}

async function loadAllUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Loading...</td></tr>';

  try {
    const rows = await apiGet('getAllUsers');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="2" class="empty-state">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r =>
      '<tr><td>' + escapeHtml(r.username) + '</td><td>' + escapeHtml(r.role) + '</td></tr>'
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Could not load users.</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('loginForm')) initLoginPage();
  if (document.getElementById('registerForm')) initRegisterPage();
  if (document.getElementById('bookForm')) initAppointmentPage();
  if (document.getElementById('adminApptTableBody')) initAdminPage();
});