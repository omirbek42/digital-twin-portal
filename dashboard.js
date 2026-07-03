// Логика дашборда CEO (ceo-dashboard.html)

function render() {
  const all = storage.getAll();
  renderKpiRow(all);
  renderAlarms(all);
  renderDeptCards(all);
  renderCompanyUpdated(all);
}

function renderKpiRow(all) {
  const sales = all.sales.values;
  const finance = all.finance.values;
  const hr = all.hr.values;

  const revenueDeviation = sales.revenuePlan > 0 ? ((sales.revenueActual - sales.revenuePlan) / sales.revenuePlan) * 100 : 0;
  const marginDeviation = finance.marginActual - finance.marginPlan;
  const cashFlow = finance.cashFlow;
  const turnover = hr.turnoverRate;

  const kpis = [
    {
      label: 'Выручка (факт)',
      value: fmtMoney(sales.revenueActual),
      delta: `${revenueDeviation >= 0 ? '+' : ''}${revenueDeviation.toFixed(1)}% к плану`,
      cls: revenueDeviation >= 0 ? 'good' : revenueDeviation >= -5 ? 'neutral' : 'bad',
    },
    {
      label: 'Маржинальность (факт)',
      value: `${finance.marginActual}%`,
      delta: `${marginDeviation >= 0 ? '+' : ''}${marginDeviation.toFixed(1)} п.п. к плану`,
      cls: marginDeviation >= 0 ? 'good' : marginDeviation >= -1 ? 'neutral' : 'bad',
    },
    {
      label: 'Cash flow',
      value: fmtMoney(cashFlow),
      delta: cashFlow >= 0 ? 'положительный' : 'отрицательный',
      cls: cashFlow >= 0 ? 'good' : 'bad',
    },
    {
      label: 'Текучесть кадров',
      value: `${turnover}%`,
      delta: turnover <= 5 ? 'в норме (≤5%)' : `выше нормы на ${(turnover - 5).toFixed(1)} п.п.`,
      cls: turnover <= 5 ? 'good' : turnover <= 10 ? 'neutral' : 'bad',
    },
  ];

  const row = document.getElementById('kpiRow');
  row.innerHTML = kpis
    .map(
      (k) => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-delta ${k.cls}">${k.delta}</div>
    </div>
  `
    )
    .join('');
}

function renderAlarms(all) {
  const summary = { red: 0, yellow: 0, green: 0 };
  const items = [];

  DEPARTMENTS.forEach((dept) => {
    const values = all[dept.id].values;
    const alarms = evaluateRisks(dept.id, values);
    const status = statusFromAlarms(alarms);
    summary[status] += 1;
    alarms.forEach((a) => items.push({ dept: dept.name, ...a }));
  });

  document.getElementById('alarmsSummary').innerHTML = `
    <div class="summary-pill red"><span class="num">${summary.red}</span> критично</div>
    <div class="summary-pill yellow"><span class="num">${summary.yellow}</span> требуют внимания</div>
    <div class="summary-pill green"><span class="num">${summary.green}</span> без замечаний</div>
  `;

  const list = document.getElementById('alarmList');
  if (items.length === 0) {
    list.innerHTML = '<div class="no-alarms">Активных алармов нет — все департаменты в норме.</div>';
    return;
  }
  const order = { red: 0, yellow: 1 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  list.innerHTML = items
    .map(
      (item) => `
    <div class="alarm-item ${item.severity}">
      <span class="dept-tag">${item.dept}:</span>
      <span>${item.text}</span>
    </div>
  `
    )
    .join('');
}

function renderDeptCards(all) {
  const grid = document.getElementById('deptGrid');
  grid.innerHTML = DEPARTMENTS.map((dept) => {
    const record = all[dept.id];
    const values = record.values;
    const alarms = evaluateRisks(dept.id, values);
    const status = statusFromAlarms(alarms);
    const metricsHtml = dept.metrics
      .map(
        (m) => `
      <div class="dept-metric-row">
        <span class="label">${m.label}</span>
        <span class="value">${fmtNumber(values[m.key], m.unit)}</span>
      </div>
    `
      )
      .join('');
    return `
      <div class="dept-card status-${status}">
        <div class="dept-card-header">
          <h3>${dept.name}</h3>
          <span class="status-dot status-${status}"></span>
        </div>
        <div class="dept-metrics">${metricsHtml}</div>
        <div class="dept-updated">Обновлено: ${fmtRelativeTime(record.lastUpdated)}</div>
      </div>
    `;
  }).join('');
}

function renderCompanyUpdated(all) {
  const timestamps = DEPARTMENTS.map((d) => all[d.id].lastUpdated).filter(Boolean);
  const latest = timestamps.length ? timestamps.sort().reverse()[0] : null;
  document.getElementById('companyUpdated').textContent = `Данные по компании обновлены: ${fmtRelativeTime(latest)}`;
}

document.getElementById('refreshBtn').addEventListener('click', render);

render();
