// Логика формы ввода показателей департамента (department-entry.html)

let activeDeptId = null;

function renderChips() {
  const row = document.getElementById('chipRow');
  row.innerHTML = '';
  DEPARTMENTS.forEach((dept) => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (dept.id === activeDeptId ? ' active' : '');
    chip.textContent = dept.name;
    chip.addEventListener('click', () => selectDepartment(dept.id));
    row.appendChild(chip);
  });
}

function selectDepartment(deptId) {
  activeDeptId = deptId;
  renderChips();
  renderForm();
}

function renderForm() {
  const dept = DEPARTMENTS.find((d) => d.id === activeDeptId);
  const panel = document.getElementById('formPanel');
  const grid = document.getElementById('formGrid');
  if (!dept) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';
  const saved = storage.getDepartment(dept.id).values || {};

  grid.innerHTML = '';
  dept.metrics.forEach((metric) => {
    const field = document.createElement('div');
    field.className = 'field';
    const value = saved[metric.key] !== undefined ? saved[metric.key] : '';
    field.innerHTML = `
      <label for="f_${metric.key}">${metric.label} (${metric.unit})</label>
      <input type="number" step="any" id="f_${metric.key}" data-key="${metric.key}" value="${value}" />
    `;
    grid.appendChild(field);
  });

  document.getElementById('saveToast').classList.remove('show');
}

function saveForm() {
  const dept = DEPARTMENTS.find((d) => d.id === activeDeptId);
  if (!dept) return;
  const values = {};
  dept.metrics.forEach((metric) => {
    const input = document.getElementById(`f_${metric.key}`);
    values[metric.key] = input.value === '' ? 0 : parseFloat(input.value);
  });
  storage.setDepartment(dept.id, values);

  const toast = document.getElementById('saveToast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

document.getElementById('saveBtn').addEventListener('click', saveForm);

renderChips();
