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

function vbar(canvasId, labels, values, color, label) {
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
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
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

  const trendEl = document.getElementById("trendLineChart");
  if (trendEl) {
    new Chart(trendEl, {
      type: "line",
      data: {
        labels: data.trend.map((d) => d.month),
        datasets: [
          {
            label: "総節約時間(年間換算)",
            data: data.trend.map((d) => d.totalAnnualHours),
            borderColor: CHART_COLORS.blue,
            yAxisID: "y",
            tension: 0.2,
          },
          {
            label: "回答件数",
            data: data.trend.map((d) => d.count),
            borderColor: CHART_COLORS.gray,
            yAxisID: "y1",
            tension: 0.2,
          },
        ],
      },
      options: {
        scales: {
          y: { type: "linear", position: "left", beginAtZero: true },
          y1: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: { precision: 0 },
          },
        },
      },
    });
  }

  vbar(
    "satBarChart",
    data.satDist.map((d) => d.score),
    data.satDist.map((d) => d.count),
    CHART_COLORS.blue,
    "回答数"
  );
  vbar(
    "compBarChart",
    data.compDist.map((d) => d.score),
    data.compDist.map((d) => d.count),
    CHART_COLORS.sky,
    "回答数"
  );
  vbar(
    "diffBarChart",
    data.diffDist.map((d) => d.score),
    data.diffDist.map((d) => d.count),
    CHART_COLORS.amber,
    "回答数"
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
  const dataEl = document.getElementById("chart-data");
  if (dataEl) {
    const data = JSON.parse(dataEl.textContent);
    initCharts(data);
  }
});
