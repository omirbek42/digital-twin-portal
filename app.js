/* Прототип «Цифровой двойник» — вся логика на клиенте, данные в памяти браузера */

const state = {
  user: null,
  section: "home",
  search: "",
  kbCategory: null,
  pressDzo: null,
  trainingType: null,
  kanbanDzo: null,
  kanbanTasks: JSON.parse(JSON.stringify(KANBAN_TASKS)),
  openDzoGroups: new Set(),
};

const dzoName = (id) => (DZO_LIST.find((d) => d.id === id) || {}).name || "—";
const initials = (name) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const todayISO = () => new Date().toISOString().slice(0, 10);
const isOverdue = (due, column) => column !== "done" && due < todayISO();

/* ---------------- Аутентификация ---------------- */

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const login = document.getElementById("login-input").value.trim();
  const password = document.getElementById("password-input").value;
  const user = USERS.find((u) => u.login === login && u.password === password);
  if (!user) {
    loginError.classList.remove("hidden");
    return;
  }
  loginError.classList.add("hidden");
  state.user = user;
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("current-user-name").textContent = user.fullName;
  document.getElementById("current-user-role").textContent = user.role + (user.dzoId ? ` · ${dzoName(user.dzoId)}` : "");
  loginForm.reset();
  renderAll();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  state.user = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
});

/* ---------------- Навигация ---------------- */

const SECTION_LABELS = {
  home: "Главная",
  kb: "База знаний",
  press: "Пресс-релизы",
  training: "Обучающие материалы",
  contacts: "Рабочие группы",
  kanban: "Канбан-доска Upstream",
};

document.getElementById("nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  goToSection(btn.dataset.section);
});

document.getElementById("content").addEventListener("click", (e) => {
  const gotoBtn = e.target.closest("[data-goto]");
  if (gotoBtn) goToSection(gotoBtn.dataset.goto);
});

function goToSection(name) {
  state.section = name;
  state.search = "";
  document.getElementById("search-input").value = "";
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.section === name));
  document.querySelectorAll(".section").forEach((s) => s.classList.add("hidden"));
  document.getElementById(`section-${name}`).classList.remove("hidden");
  document.getElementById("topbar-label").textContent = SECTION_LABELS[name];
  const placeholders = {
    home: "Поиск в текущем разделе…",
    kb: "Поиск по названию, описанию, ДЗО…",
    press: "Поиск по названию, описанию, ДЗО…",
    training: "Поиск по названию, описанию…",
    contacts: "Поиск по имени, роли, ДЗО…",
    kanban: "Поиск по названию задачи, ДЗО, ответственному…",
  };
  document.getElementById("search-input").placeholder = placeholders[name] || placeholders.home;
  renderSection(name);
}

document.getElementById("search-input").addEventListener("input", (e) => {
  state.search = e.target.value.trim().toLowerCase();
  renderSection(state.section);
});

/* ---------------- Рендер: Главная ---------------- */

function renderHome() {
  const totalContacts = Object.values(CONTACTS).reduce((sum, arr) => sum + arr.length, 0);
  const stats = [
    { value: DZO_LIST.length, label: "Подключённых ДЗО" },
    { value: KB_DOCS.length, label: "Документов базы знаний" },
    { value: TRAINING_MATERIALS.length, label: "Обучающих материалов" },
    { value: totalContacts, label: "Участников рабочих групп" },
  ];
  document.getElementById("home-stats").innerHTML = stats
    .map((s) => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join("");

  document.getElementById("dzo-nodes").innerHTML = DZO_LIST
    .map((d) => `<div class="dzo-node"><span class="dot"></span>${d.name}</div>`)
    .join("");

  const latestKb = [...KB_DOCS].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  document.getElementById("preview-kb").innerHTML = latestKb.map(kbCardHtml).join("");

  const latestPress = [...PRESS_RELEASES].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  document.getElementById("preview-press").innerHTML = latestPress.map(pressCardHtml).join("");
}

/* ---------------- Рендер: База знаний ---------------- */

function kbCardHtml(doc) {
  return `<button class="card" data-modal="kb" data-id="${doc.id}">
    <div class="card-id">${doc.id}</div>
    <h3 class="card-title">${doc.title}</h3>
    <div class="card-meta"><span class="tag">${doc.category}</span><span class="tag">${dzoName(doc.dzoId)}</span><span class="tag">${doc.date}</span></div>
    <div class="card-desc">${doc.desc}</div>
  </button>`;
}

function renderKbCategories() {
  const chips = ["Все", ...KB_CATEGORIES];
  document.getElementById("kb-categories").innerHTML = chips
    .map((c) => {
      const active = (c === "Все" && !state.kbCategory) || c === state.kbCategory;
      return `<button class="chip ${active ? "active" : ""}" data-cat="${c}">${c}</button>`;
    })
    .join("");
}

document.getElementById("kb-categories").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.kbCategory = chip.dataset.cat === "Все" ? null : chip.dataset.cat;
  renderKb();
});

function renderKb() {
  renderKbCategories();
  let docs = KB_DOCS;
  if (state.kbCategory) docs = docs.filter((d) => d.category === state.kbCategory);
  if (state.search) {
    docs = docs.filter((d) =>
      [d.title, d.desc, dzoName(d.dzoId)].some((f) => f.toLowerCase().includes(state.search))
    );
  }
  const list = document.getElementById("kb-list");
  list.innerHTML = docs.length ? docs.map(kbCardHtml).join("") : emptyState("Документы не найдены");
}

/* ---------------- Рендер: Пресс-релизы ---------------- */

function pressCardHtml(pr) {
  return `<button class="card" data-modal="press" data-id="${pr.id}">
    <div class="card-id">${pr.id}</div>
    <h3 class="card-title">${pr.title}</h3>
    <div class="card-meta"><span class="tag">${dzoName(pr.dzoId)}</span><span class="tag">${pr.date}</span></div>
    <div class="card-desc">${pr.summary}</div>
  </button>`;
}

function renderPressFilter() {
  const chips = [{ id: null, name: "Все" }, ...DZO_LIST];
  document.getElementById("press-dzo-filter").innerHTML = chips
    .map((d) => `<button class="chip ${d.id === state.pressDzo ? "active" : ""}" data-dzo="${d.id ?? ""}">${d.name}</button>`)
    .join("");
}

document.getElementById("press-dzo-filter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.pressDzo = chip.dataset.dzo || null;
  renderPress();
});

function renderPress() {
  renderPressFilter();
  let items = PRESS_RELEASES;
  if (state.pressDzo) items = items.filter((p) => p.dzoId === state.pressDzo);
  if (state.search) {
    items = items.filter((p) =>
      [p.title, p.summary, dzoName(p.dzoId)].some((f) => f.toLowerCase().includes(state.search))
    );
  }
  const list = document.getElementById("press-list");
  list.innerHTML = items.length ? items.map(pressCardHtml).join("") : emptyState("Пресс-релизы не найдены");
}

/* ---------------- Рендер: Обучение ---------------- */

function trainingCardHtml(t) {
  return `<button class="card" data-modal="training" data-id="${t.id}">
    <div class="card-id">${t.id}</div>
    <h3 class="card-title">${t.title}</h3>
    <div class="card-meta"><span class="tag">${t.type}</span><span class="tag">${t.duration}</span><span class="tag">${t.level}</span></div>
    <div class="card-desc">${t.desc}</div>
  </button>`;
}

function renderTrainingFilter() {
  const chips = ["Все", ...TRAINING_TYPES];
  document.getElementById("training-type-filter").innerHTML = chips
    .map((c) => {
      const active = (c === "Все" && !state.trainingType) || c === state.trainingType;
      return `<button class="chip ${active ? "active" : ""}" data-type="${c}">${c}</button>`;
    })
    .join("");
}

document.getElementById("training-type-filter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.trainingType = chip.dataset.type === "Все" ? null : chip.dataset.type;
  renderTraining();
});

function renderTraining() {
  renderTrainingFilter();
  let items = TRAINING_MATERIALS;
  if (state.trainingType) items = items.filter((t) => t.type === state.trainingType);
  if (state.search) {
    items = items.filter((t) => [t.title, t.desc].some((f) => f.toLowerCase().includes(state.search)));
  }
  const list = document.getElementById("training-list");
  list.innerHTML = items.length ? items.map(trainingCardHtml).join("") : emptyState("Материалы не найдены");
}

/* ---------------- Рендер: Контакты ---------------- */

function renderContacts() {
  const searchActive = !!state.search;
  const container = document.getElementById("contacts-list");
  container.innerHTML = DZO_LIST
    .map((d) => {
      const contacts = CONTACTS[d.id] || [];
      const filtered = searchActive
        ? contacts.filter((c) =>
            [c.name, c.role, d.name].some((f) => f.toLowerCase().includes(state.search))
          )
        : contacts;
      if (searchActive && filtered.length === 0) return "";
      const open = searchActive || state.openDzoGroups.has(d.id);
      const rows = filtered
        .map(
          (c) => `<div class="contact-row">
            <div class="c-name">${c.name}</div>
            <div class="c-role">${c.role}</div>
            <div class="c-email">${c.email}</div>
            <div class="c-phone">${c.phone}</div>
          </div>`
        )
        .join("");
      return `<div class="dzo-group ${open ? "open" : ""}" data-dzo-group="${d.id}">
        <button class="dzo-group-header">
          <span>${d.name} <span class="count">(${filtered.length})</span></span>
          <span class="chevron">›</span>
        </button>
        <div class="dzo-group-body">${rows || emptyState("Нет контактов")}</div>
      </div>`;
    })
    .join("");
}

document.getElementById("contacts-list").addEventListener("click", (e) => {
  const header = e.target.closest(".dzo-group-header");
  if (!header) return;
  const group = header.closest(".dzo-group");
  const id = group.dataset.dzoGroup;
  if (state.openDzoGroups.has(id)) state.openDzoGroups.delete(id);
  else state.openDzoGroups.add(id);
  renderContacts();
});

/* ---------------- Рендер: Канбан ---------------- */

const KANBAN_DZO_IDS = ["d1", "d2"]; // Upstream: Озенмунайгаз, Эмбамунайгаз

function renderKanbanFilter() {
  const dzos = DZO_LIST.filter((d) => KANBAN_DZO_IDS.includes(d.id));
  const chips = [{ id: null, name: "Все" }, ...dzos];
  document.getElementById("kanban-dzo-filter").innerHTML = chips
    .map((d) => `<button class="chip ${d.id === state.kanbanDzo ? "active" : ""}" data-dzo="${d.id ?? ""}">${d.name}</button>`)
    .join("");
}

document.getElementById("kanban-dzo-filter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.kanbanDzo = chip.dataset.dzo || null;
  renderKanban();
});

function kanbanCardHtml(task) {
  const overdue = isOverdue(task.due, task.column);
  return `<div class="kanban-card ${overdue ? "overdue" : ""}" draggable="true" data-task-id="${task.id}">
    <div class="kanban-card-title">${task.title}</div>
    <div class="card-meta"><span class="tag">${dzoName(task.dzoId)}</span><span class="priority-badge priority-${task.priority}">${task.priority}</span></div>
    <div class="kanban-card-meta">
      <span><span class="avatar">${initials(task.assignee)}</span>${task.assignee}</span>
      <span class="${overdue ? "due-overdue" : ""}">${task.due}${overdue ? " ⚠" : ""}</span>
    </div>
  </div>`;
}

function renderKanban() {
  renderKanbanFilter();
  let tasks = state.kanbanTasks;
  if (state.kanbanDzo) tasks = tasks.filter((t) => t.dzoId === state.kanbanDzo);
  if (state.search) {
    tasks = tasks.filter((t) =>
      [t.title, t.assignee, dzoName(t.dzoId)].some((f) => f.toLowerCase().includes(state.search))
    );
  }
  const board = document.getElementById("kanban-board");
  board.innerHTML = KANBAN_COLUMNS.map((col) => {
    const colTasks = tasks.filter((t) => t.column === col.id);
    const addBtn = col.id === "todo" ? `<button class="btn-add-task" id="add-task-btn">+ Добавить задачу</button>` : "";
    return `<div class="kanban-col" data-column="${col.id}">
      <div class="kanban-col-header"><span>${col.title}</span><span class="count">${colTasks.length}</span></div>
      <div class="kanban-col-body">${colTasks.map(kanbanCardHtml).join("")}</div>
      ${addBtn}
    </div>`;
  }).join("");
  attachKanbanDnD();
}

function attachKanbanDnD() {
  const board = document.getElementById("kanban-board");
  board.querySelectorAll(".kanban-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      card.classList.add("dragging");
      board.dataset.draggingId = card.dataset.taskId;
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });
  board.querySelectorAll(".kanban-col").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const taskId = board.dataset.draggingId;
      const task = state.kanbanTasks.find((t) => t.id === taskId);
      if (task) task.column = col.dataset.column;
      renderKanban();
    });
  });
  const addBtn = document.getElementById("add-task-btn");
  if (addBtn) addBtn.addEventListener("click", openAddTaskModal);
}

/* ---------------- Модальные окна ---------------- */

const modalRoot = document.getElementById("modal-root");

function closeModal() {
  modalRoot.innerHTML = "";
}

function openKbModal(id) {
  const doc = KB_DOCS.find((d) => d.id === id);
  modalRoot.innerHTML = `<div class="modal-overlay" data-close="1">
    <div class="modal">
      <div class="modal-header">
        <div><div class="card-id">${doc.id}</div><h2>${doc.title}</h2></div>
        <button class="modal-close" data-close="1">×</button>
      </div>
      <div class="card-meta"><span class="tag">${doc.category}</span><span class="tag">${dzoName(doc.dzoId)}</span><span class="tag">${doc.date}</span></div>
      <p>${doc.desc}</p>
    </div>
  </div>`;
}

function openPressModal(id) {
  const pr = PRESS_RELEASES.find((p) => p.id === id);
  modalRoot.innerHTML = `<div class="modal-overlay" data-close="1">
    <div class="modal">
      <div class="modal-header">
        <div><div class="card-id">${pr.id}</div><h2>${pr.title}</h2></div>
        <button class="modal-close" data-close="1">×</button>
      </div>
      <div class="card-meta"><span class="tag">${dzoName(pr.dzoId)}</span><span class="tag">${pr.date}</span></div>
      <p>${pr.summary}</p>
    </div>
  </div>`;
}

function openTrainingModal(id) {
  const t = TRAINING_MATERIALS.find((x) => x.id === id);
  modalRoot.innerHTML = `<div class="modal-overlay" data-close="1">
    <div class="modal">
      <div class="modal-header">
        <div><div class="card-id">${t.id}</div><h2>${t.title}</h2></div>
        <button class="modal-close" data-close="1">×</button>
      </div>
      <div class="card-meta"><span class="tag">${t.type}</span><span class="tag">${t.duration}</span><span class="tag">${t.level}</span></div>
      <p>${t.desc}</p>
    </div>
  </div>`;
}

function openAddTaskModal() {
  const dzoOptions = DZO_LIST.filter((d) => KANBAN_DZO_IDS.includes(d.id))
    .map((d) => `<option value="${d.id}">${d.name}</option>`)
    .join("");
  modalRoot.innerHTML = `<div class="modal-overlay" data-close="1">
    <div class="modal">
      <div class="modal-header">
        <h2>Новая задача</h2>
        <button class="modal-close" data-close="1">×</button>
      </div>
      <form id="add-task-form">
        <div class="form-field">
          <label for="task-title">Название задачи</label>
          <input id="task-title" required>
        </div>
        <div class="form-field">
          <label for="task-dzo">ДЗО</label>
          <select id="task-dzo">${dzoOptions}</select>
        </div>
        <div class="form-field">
          <label for="task-assignee">Ответственный</label>
          <select id="task-assignee"></select>
        </div>
        <div class="form-field">
          <label for="task-priority">Приоритет</label>
          <select id="task-priority">
            <option>Высокий</option>
            <option selected>Средний</option>
            <option>Низкий</option>
          </select>
        </div>
        <div class="form-field">
          <label for="task-due">Срок</label>
          <input id="task-due" type="date" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" data-close="1">Отмена</button>
          <button type="submit" class="btn-primary" style="width:auto;">Добавить</button>
        </div>
      </form>
    </div>
  </div>`;

  const dzoSelect = document.getElementById("task-dzo");
  const assigneeSelect = document.getElementById("task-assignee");
  function fillAssignees() {
    const dzoId = dzoSelect.value;
    const names = [...(KANBAN_ASSIGNEES[dzoId] || []), ...(KANBAN_ASSIGNEES.d4 || [])];
    assigneeSelect.innerHTML = names.map((n) => `<option>${n}</option>`).join("");
  }
  dzoSelect.addEventListener("change", fillAssignees);
  fillAssignees();

  document.getElementById("add-task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const newTask = {
      id: `T-${String(state.kanbanTasks.length + 1).padStart(3, "0")}`,
      title: document.getElementById("task-title").value.trim(),
      dzoId: dzoSelect.value,
      assignee: assigneeSelect.value,
      priority: document.getElementById("task-priority").value,
      due: document.getElementById("task-due").value,
      column: "todo",
    };
    state.kanbanTasks.push(newTask);
    closeModal();
    renderKanban();
  });
}

document.addEventListener("click", (e) => {
  if (e.target.dataset.close) closeModal();
  const card = e.target.closest("[data-modal]");
  if (card) {
    const { modal, id } = card.dataset;
    if (modal === "kb") openKbModal(id);
    if (modal === "press") openPressModal(id);
    if (modal === "training") openTrainingModal(id);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ---------------- Общий рендер ---------------- */

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function renderSection(name) {
  if (name === "home") renderHome();
  if (name === "kb") renderKb();
  if (name === "press") renderPress();
  if (name === "training") renderTraining();
  if (name === "contacts") renderContacts();
  if (name === "kanban") renderKanban();
}

function renderAll() {
  goToSection("home");
}
