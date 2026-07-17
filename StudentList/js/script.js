
const API_URL = 'https://script.google.com/macros/s/AKfycbxsNn6t-OKJOSjo5rGH4V-PwqoHcJm3Yveo4neIsuc_vA52OibwpYTrGKggnR3UkpsG/exec';

const form = document.getElementById('recordForm');
const nameInput = document.getElementById('name');
const courseInput = document.getElementById('course');
const idInput = document.getElementById('recordId');
const tableBody = document.getElementById('tableBody');
const formTitle = document.getElementById('formTitle');
const cancelBtn = document.getElementById('cancelBtn');
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('statusMsg');

document.addEventListener('DOMContentLoaded', loadRecords);
form.addEventListener('submit', handleSubmit);
cancelBtn.addEventListener('click', resetForm);

// ---------- READ ----------
async function loadRecords() {
  setStatus('Loading records…');
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message);
    renderTable(json.data);
    setStatus('');
  } catch (err) {
    setStatus('Could not load records: ' + err.message, true);
  }
}

function renderTable(records) {
  tableBody.innerHTML = '';
  if (!records.length) {
    tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No records yet.</td></tr>';
    return;
  }
  records.forEach(rec => {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = rec.name;

    const courseTd = document.createElement('td');
    courseTd.textContent = rec.course;

    const actionsTd = document.createElement('td');
    actionsTd.className = 'text-end';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-outline-primary me-1';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editRecord(rec.id, rec.name, rec.course));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-outline-danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => removeRecord(rec.id));

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);

    tr.appendChild(nameTd);
    tr.appendChild(courseTd);
    tr.appendChild(actionsTd);
    tableBody.appendChild(tr);
  });
}

// ---------- CREATE / UPDATE ----------
async function handleSubmit(e) {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const name = nameInput.value.trim();
  const course = courseInput.value.trim();
  const id = idInput.value;
  const action = id ? 'update' : 'create';

  const params = new URLSearchParams({ action, name, course });
  if (id) params.append('id', id);

  submitBtn.disabled = true;
  setStatus(id ? 'Updating…' : 'Adding…');

  try {
    // Sent as application/x-www-form-urlencoded — a "simple" request,
    // so no CORS preflight is triggered against the Apps Script endpoint.
    const res = await fetch(API_URL, { method: 'POST', body: params });
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message);
    resetForm();
    loadRecords();
  } catch (err) {
    setStatus('Save failed: ' + err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
}

function editRecord(id, name, course) {
  idInput.value = id;
  nameInput.value = name;
  courseInput.value = course;
  formTitle.textContent = 'Edit Record';
  submitBtn.textContent = 'Save Changes';
  cancelBtn.classList.remove('d-none');
  nameInput.focus();
}

// ---------- DELETE ----------
async function removeRecord(id) {
  if (!confirm('Delete this record?')) return;
  setStatus('Deleting…');
  try {
    const params = new URLSearchParams({ action: 'delete', id });
    const res = await fetch(API_URL, { method: 'POST', body: params });
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message);
    loadRecords();
  } catch (err) {
    setStatus('Delete failed: ' + err.message, true);
  }
}

// ---------- HELPERS ----------
function resetForm() {
  form.reset();
  form.classList.remove('was-validated');
  idInput.value = '';
  formTitle.textContent = 'Add Record';
  submitBtn.textContent = 'Add';
  cancelBtn.classList.add('d-none');
}

function setStatus(msg, isError = false) {
  statusMsg.textContent = msg;
  statusMsg.className = isError ? 'mt-3 small text-danger' : 'mt-3 small text-muted';
}
