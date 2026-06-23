// ドロップゾーンへのドラッグ&ドロップでファイル入力にセットし、フォームを自動送信する
function initDropzone() {
  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("csv-input");
  const form = document.getElementById("upload-form");
  if (!dropzone || !input || !form) return;

  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  });
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("drag-over");
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      form.submit();
    }
  });
  input.addEventListener("change", () => {
    if (input.files && input.files[0]) form.submit();
  });
}

// 時間効果 / 講座評価 タブの切替（クライアント側のみ、サーバー再読込なし）
function initTabs() {
  const buttons = document.querySelectorAll(".tab[data-tab]");
  const panels = document.querySelectorAll(".tab-panel[data-tab]");
  const tabInput = document.getElementById("tab-input");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      panels.forEach((p) => (p.style.display = p.dataset.tab === target ? "" : "none"));
      if (tabInput) tabInput.value = target;
    });
  });
}

const CHART_COLORS = {
  blue: "#2563eb",
  sky: "#0ea5e9",
  gray: "#94a3b8",
  amber: "#f59e0b",
};

function hbar(canvasId, labels, values, color, label) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  new Chart(el, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label, data: values, backgroundColor: color, borderRadius: 4 }],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  });
}

function vbar(canvasId, labels, values, color, label, xTitle, yTitle) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  new Chart(el, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label, data: values, backgroundColor: color, borderRadius: 4 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: !!xTitle, text: xTitle || "" } },
        y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: !!yTitle, text: yTitle || "" } },
      },
    },
  });
}

function pie(canvasId, labels, values) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  new Chart(el, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [CHART_COLORS.blue, CHART_COLORS.gray, CHART_COLORS.amber],
        },
      ],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}

// クライアント／講座のチェック付きドロップダウンの開閉
function initCheckboxDropdowns() {
  const dropdowns = document.querySelectorAll("[data-checkbox-dropdown]");
  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".checkbox-dropdown-trigger");
    const panel = dropdown.querySelector(".checkbox-dropdown-panel");
    const clearBtn = dropdown.querySelector("[data-dropdown-clear]");
    const allBtn = dropdown.querySelector("[data-dropdown-all]");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.contains("open");
      dropdowns.forEach((d) => d.querySelector(".checkbox-dropdown-panel").classList.remove("open"));
      if (!isOpen) panel.classList.add("open");
    });

    clearBtn?.addEventListener("click", () => {
      panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        if (cb.checked) cb.checked = false;
      });
      trigger.closest("form")?.submit();
    });

    allBtn?.addEventListener("click", () => {
      panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = true;
      });
      trigger.closest("form")?.submit();
    });
  });

  document.addEventListener("click", () => {
    dropdowns.forEach((d) => d.querySelector(".checkbox-dropdown-panel").classList.remove("open"));
  });
}

const GRANULARITY_LABELS = { day: "日次", month: "月次", year: "年次" };

function renderTrendChart(trendChartRef, points) {
  const trendEl = document.getElementById("trendLineChart");
  if (!trendEl) return trendChartRef;
  if (trendChartRef.chart) {
    trendChartRef.chart.destroy();
  }
  trendChartRef.chart = new Chart(trendEl, {
    type: "line",
    data: {
      labels: points.map((d) => d.month),
      datasets: [
        {
          label: "総節約時間(年間換算)",
          data: points.map((d) => d.totalAnnualHours),
          borderColor: CHART_COLORS.blue,
          yAxisID: "y",
          tension: 0.2,
        },
        {
          label: "回答件数",
          data: points.map((d) => d.count),
          borderColor: CHART_COLORS.gray,
          yAxisID: "y1",
          tension: 0.2,
        },
      ],
    },
    options: {
      scales: {
        y: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          title: { display: true, text: "時間/年" },
        },
        y1: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { precision: 0 },
          title: { display: true, text: "件数" },
        },
      },
    },
  });
  return trendChartRef;
}

function initTrendGranularityToggle(data) {
  const toggle = document.getElementById("trend-granularity-toggle");
  const caption = document.getElementById("trend-caption");
  if (!toggle || !data.trendByGranularity) return;

  const trendChartRef = {};
  renderTrendChart(trendChartRef, data.trendByGranularity.month || []);

  const buttons = toggle.querySelectorAll("button[data-granularity]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = btn.dataset.granularity;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      renderTrendChart(trendChartRef, data.trendByGranularity[g] || []);
      if (caption) {
        caption.textContent = `回答日を${GRANULARITY_LABELS[g]}単位で集計しています。青線は年間換算した節約時間の合計、グレー線は回答件数です。`;
      }
    });
  });
}

function initCharts(data) {
  hbar(
    "courseBarChart",
    data.byCourse.map((d) => d.key),
    data.byCourse.map((d) => d.totalAnnualHours),
    CHART_COLORS.blue,
    "総節約時間(年間換算)"
  );
  hbar(
    "clientBarChart",
    data.byClient.map((d) => d.key),
    data.byClient.map((d) => d.totalAnnualHours),
    CHART_COLORS.sky,
    "総節約時間(年間換算)"
  );

  initTrendGranularityToggle(data);

  vbar(
    "satBarChart",
    data.satDist.map((d) => d.score),
    data.satDist.map((d) => d.count),
    CHART_COLORS.blue,
    "回答数",
    "満足度",
    "件数"
  );
  vbar(
    "compBarChart",
    data.compDist.map((d) => d.score),
    data.compDist.map((d) => d.count),
    CHART_COLORS.sky,
    "回答数",
    "理解度",
    "件数"
  );
  vbar(
    "diffBarChart",
    data.diffDist.map((d) => d.score),
    data.diffDist.map((d) => d.count),
    CHART_COLORS.amber,
    "回答数",
    "難易度",
    "件数"
  );

  if (data.npsBreakdown.data.length) {
    pie(
      "npsPieChart",
      data.npsBreakdown.data.map((d) => d.name),
      data.npsBreakdown.data.map((d) => d.value)
    );
  }
  if (data.applyDist.length) {
    pie(
      "applyPieChart",
      data.applyDist.map((d) => d.name),
      data.applyDist.map((d) => d.value)
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initDropzone();
  initTabs();
  initCheckboxDropdowns();
  const dataEl = document.getElementById("chart-data");
  if (dataEl) {
    const data = JSON.parse(dataEl.textContent);
    initCharts(data);
  }
});
