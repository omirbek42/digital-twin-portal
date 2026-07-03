// Общая модель данных, хранилище и логика оценки рисков.
// Используется и department-entry.html, и ceo-dashboard.html через localStorage.

const DEPARTMENTS = [
  {
    id: 'sales',
    name: 'Продажи',
    metrics: [
      { key: 'revenueActual', label: 'Выручка за период (факт)', unit: '₸' },
      { key: 'revenuePlan', label: 'План выручки', unit: '₸' },
      { key: 'pipeline', label: 'Pipeline (открытые сделки)', unit: '₸' },
      { key: 'conversionRate', label: 'Конверсия воронки', unit: '%' },
      { key: 'newClients', label: 'Новые клиенты', unit: 'шт' },
    ],
  },
  {
    id: 'marketing',
    name: 'Маркетинг',
    metrics: [
      { key: 'newLeads', label: 'Новые лиды', unit: 'шт' },
      { key: 'cacCurrent', label: 'CAC текущий', unit: '₸' },
      { key: 'cacLastWeek', label: 'CAC на прошлой неделе', unit: '₸' },
      { key: 'budgetSpent', label: 'Освоено бюджета', unit: '₸' },
    ],
  },
  {
    id: 'finance',
    name: 'Финансы',
    metrics: [
      { key: 'cashFlow', label: 'Cash flow за период', unit: '₸' },
      { key: 'marginActual', label: 'Маржинальность факт', unit: '%' },
      { key: 'marginPlan', label: 'Маржинальность план', unit: '%' },
      { key: 'receivables', label: 'Дебиторская задолженность', unit: '₸' },
      { key: 'payables', label: 'Кредиторская задолженность', unit: '₸' },
    ],
  },
  {
    id: 'operations',
    name: 'Операции',
    metrics: [
      { key: 'planExecution', label: 'Выполнение операционного плана', unit: '%' },
      { key: 'defectRate', label: 'Уровень брака', unit: '%' },
      { key: 'capacityUtilization', label: 'Загрузка мощностей', unit: '%' },
    ],
  },
  {
    id: 'hr',
    name: 'HR',
    metrics: [
      { key: 'headcountCurrent', label: 'Штат текущий', unit: 'чел' },
      { key: 'openVacancies', label: 'Открытые вакансии', unit: 'шт' },
      { key: 'turnoverRate', label: 'Текучесть кадров', unit: '%' },
      { key: 'vacancyClosureRate', label: 'Закрыто вакансий от плана', unit: '%' },
    ],
  },
];

const STORAGE_KEY = 'ceo_control_panel_v1';

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

const SEED_DATA = {
  sales: {
    values: { revenueActual: 48000000, revenuePlan: 50000000, pipeline: 20000000, conversionRate: 12, newClients: 18 },
    lastUpdated: hoursAgo(5),
  },
  marketing: {
    values: { newLeads: 280, cacCurrent: 7800, cacLastWeek: 7100, budgetSpent: 3200000 },
    lastUpdated: hoursAgo(30),
  },
  finance: {
    values: { cashFlow: -800000, marginActual: 20, marginPlan: 22, receivables: 4000000, payables: 3000000 },
    lastUpdated: hoursAgo(12),
  },
  operations: {
    values: { planExecution: 91, defectRate: 7, capacityUtilization: 88 },
    lastUpdated: hoursAgo(48),
  },
  hr: {
    values: { headcountCurrent: 134, openVacancies: 9, turnoverRate: 4, vacancyClosureRate: 65 },
    lastUpdated: hoursAgo(70),
  },
};

const storage = {
  _read() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  _write(data) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  ensureSeeded() {
    if (!this._read()) {
      this._write(SEED_DATA);
    }
  },
  getAll() {
    this.ensureSeeded();
    return this._read();
  },
  getDepartment(id) {
    const all = this.getAll();
    return all[id] || { values: {}, lastUpdated: null };
  },
  setDepartment(id, values) {
    const all = this.getAll();
    all[id] = { values, lastUpdated: new Date().toISOString() };
    this._write(all);
  },
};

window.storage = storage;
window.DEPARTMENTS = DEPARTMENTS;

// Единая функция оценки рисков — пороги калибруются здесь.
function evaluateRisks(deptId, v) {
  const alarms = [];
  const num = (x) => (typeof x === 'number' && !Number.isNaN(x) ? x : 0);

  if (deptId === 'sales') {
    const plan = num(v.revenuePlan);
    const ratio = plan > 0 ? (num(v.revenueActual) / plan) * 100 : 100;
    if (ratio < 80) {
      alarms.push({ severity: 'red', text: `Факт/план выручки ${ratio.toFixed(0)}% (факт ${fmtMoney(v.revenueActual)}, план ${fmtMoney(v.revenuePlan)})` });
    } else if (ratio <= 95) {
      alarms.push({ severity: 'yellow', text: `Факт/план выручки ${ratio.toFixed(0)}% (факт ${fmtMoney(v.revenueActual)}, план ${fmtMoney(v.revenuePlan)})` });
    }
    if (num(v.conversionRate) < 10) {
      alarms.push({ severity: 'yellow', text: `Конверсия воронки ${num(v.conversionRate)}% (ниже 10%)` });
    }
  }

  if (deptId === 'marketing') {
    const prev = num(v.cacLastWeek);
    const growth = prev > 0 ? ((num(v.cacCurrent) - prev) / prev) * 100 : 0;
    if (growth > 15) {
      alarms.push({ severity: 'red', text: `Рост CAC к прошлой неделе ${growth.toFixed(0)}% (${fmtMoney(v.cacLastWeek)} → ${fmtMoney(v.cacCurrent)})` });
    } else if (growth >= 5) {
      alarms.push({ severity: 'yellow', text: `Рост CAC к прошлой неделе ${growth.toFixed(0)}% (${fmtMoney(v.cacLastWeek)} → ${fmtMoney(v.cacCurrent)})` });
    }
  }

  if (deptId === 'finance') {
    const delta = num(v.marginActual) - num(v.marginPlan);
    if (delta <= -4) {
      alarms.push({ severity: 'red', text: `Маржа хуже плана на ${Math.abs(delta).toFixed(1)} п.п. (факт ${v.marginActual}%, план ${v.marginPlan}%)` });
    } else if (delta <= -1) {
      alarms.push({ severity: 'yellow', text: `Маржа хуже плана на ${Math.abs(delta).toFixed(1)} п.п. (факт ${v.marginActual}%, план ${v.marginPlan}%)` });
    }
    if (num(v.cashFlow) < 0) {
      alarms.push({ severity: 'red', text: `Отрицательный cash flow: ${fmtMoney(v.cashFlow)}` });
    }
    const payables = num(v.payables);
    if (payables > 0 && num(v.receivables) / payables > 2) {
      alarms.push({ severity: 'yellow', text: `Дебиторка/кредиторка ${(num(v.receivables) / payables).toFixed(1)}x (${fmtMoney(v.receivables)} / ${fmtMoney(v.payables)})` });
    }
  }

  if (deptId === 'operations') {
    const exec = num(v.planExecution);
    if (exec < 85) {
      alarms.push({ severity: 'red', text: `Выполнение плана ${exec}% (ниже 85%)` });
    } else if (exec <= 95) {
      alarms.push({ severity: 'yellow', text: `Выполнение плана ${exec}% (85–95%)` });
    }
    const defect = num(v.defectRate);
    if (defect > 10) {
      alarms.push({ severity: 'red', text: `Уровень брака ${defect}% (выше 10%)` });
    } else if (defect >= 5) {
      alarms.push({ severity: 'yellow', text: `Уровень брака ${defect}% (5–10%)` });
    }
    if (num(v.capacityUtilization) > 95) {
      alarms.push({ severity: 'yellow', text: `Загрузка мощностей ${v.capacityUtilization}% (выше 95%)` });
    }
  }

  if (deptId === 'hr') {
    const turnover = num(v.turnoverRate);
    if (turnover > 10) {
      alarms.push({ severity: 'red', text: `Текучесть кадров ${turnover}% (выше 10%)` });
    } else if (turnover >= 5) {
      alarms.push({ severity: 'yellow', text: `Текучесть кадров ${turnover}% (5–10%)` });
    }
    if (num(v.openVacancies) > 0 && num(v.vacancyClosureRate) < 50) {
      alarms.push({ severity: 'yellow', text: `Закрыто вакансий от плана ${v.vacancyClosureRate}% при ${v.openVacancies} открытых вакансиях` });
    }
  }

  return alarms;
}

function statusFromAlarms(alarms) {
  if (alarms.some((a) => a.severity === 'red')) return 'red';
  if (alarms.some((a) => a.severity === 'yellow')) return 'yellow';
  return 'green';
}

function fmtMoney(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₸';
}

function fmtNumber(n, unit) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  if (unit === '₸') return fmtMoney(n);
  return new Intl.NumberFormat('ru-RU').format(n) + (unit ? ' ' + unit : '');
}

function fmtRelativeTime(iso) {
  if (!iso) return 'нет данных';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}

window.evaluateRisks = evaluateRisks;
window.statusFromAlarms = statusFromAlarms;
window.fmtMoney = fmtMoney;
window.fmtNumber = fmtNumber;
window.fmtRelativeTime = fmtRelativeTime;
