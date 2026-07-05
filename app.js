const VERSION = '1.3.0';
const PYPI_API = 'https://pypi.org/pypi';
const PYPI_STATS_API = 'https://pypistats.org/api/packages';
const CORS_PROXY = 'https://pypi-proxy.c307lucas.workers.dev/?url=';

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchBtnText = document.getElementById('searchBtnText');
const searchBtnSpinner = document.getElementById('searchBtnSpinner');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');
const emptyEl = document.getElementById('empty');
const suggestionsEl = document.getElementById('suggestions');

let chartInstance = null;
let currentSearch = null;

const SUGGESTIONS = ['requests', 'django', 'flask', 'numpy', 'pandas', 'fastapi', 'pytest', 'scrapy'];

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' mi';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + ' mil';
  return n.toLocaleString('pt-BR');
}

function showLoading(show) {
  loadingEl.classList.toggle('hidden', !show);
  searchBtn.disabled = show;
  searchBtnText.classList.toggle('hidden', show);
  searchBtnSpinner.classList.toggle('hidden', !show);
}

function showError(message) {
  errorEl.innerHTML = `<span class="error-icon">!</span><span>${message}</span>`;
  errorEl.classList.remove('hidden');
}

function hideError() {
  errorEl.classList.add('hidden');
}

function showResults(show) {
  resultsEl.classList.toggle('hidden', !show);
}

function showEmpty(show) {
  emptyEl.classList.toggle('hidden', !show);
}

function showSuggestions(show) {
  suggestionsEl.classList.toggle('hidden', !show);
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getPackageFromURL() {
  return location.hash.replace(/^#\//, '').trim() || '';
}

function updateURL(name) {
  if (name) {
    history.replaceState(null, '', `#/${encodeURIComponent(name)}`);
  } else {
    history.replaceState(null, '', '/');
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function buildPackageHTML(info, recent) {
  const recentData = recent && recent.data;
  const totalDownloads = recentData ? recentData.last_day + recentData.last_week + recentData.last_month : null;

  let statsHTML = '';
  if (recentData) {
    statsHTML = `
      <div class="stat-card">
        <div class="stat-value">${formatNumber(recentData.last_day)}</div>
        <div class="stat-label">Últimas 24h</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(recentData.last_week)}</div>
        <div class="stat-label">Últimos 7 dias</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(recentData.last_month)}</div>
        <div class="stat-label">Últimos 30 dias</div>
      </div>
      <div class="stat-card stat-card-highlight">
        <div class="stat-value">${formatNumber(totalDownloads)}</div>
        <div class="stat-label">Total (período)</div>
      </div>`;
  } else {
    statsHTML = `<div class="stat-card stat-card-full"><div class="stat-label">Dados de download indisponíveis no momento</div></div>`;
  }

  let badgesHTML = '';
  if (info.requires_python) {
    badgesHTML += `<span class="badge badge-python">Python ${escapeHTML(info.requires_python.replace(/>=?\s*/, ''))}</span>`;
  }
  if (info.license) {
    badgesHTML += `<span class="badge badge-license">${escapeHTML(info.license)}</span>`;
  }

  let infoGridHTML = '';
  const authorName = info.author || info.author_email;
  if (authorName) {
    infoGridHTML += `
      <div class="info-item">
        <span class="info-label">Autor</span>
        <span class="info-value">${escapeHTML(authorName.replace(/<[^>]+>/, '').trim() || authorName)}</span>
      </div>`;
  }
  if (info.home_page) {
    try {
      const hostname = new URL(info.home_page).hostname;
      infoGridHTML += `
        <div class="info-item">
          <span class="info-label">Site</span>
          <a href="${escapeHTML(info.home_page)}" target="_blank" rel="noopener noreferrer" class="info-value info-link">${escapeHTML(hostname)}</a>
        </div>`;
    } catch (_) {}
  }
  if (info.requires_dist) {
    infoGridHTML += `
      <div class="info-item">
        <span class="info-label">Dependências</span>
        <span class="info-value">${info.requires_dist.length}</span>
      </div>`;
  }
  if (info.classifiers && info.classifiers.length > 0) {
    const cats = info.classifiers.filter(c => c.startsWith('Topic ::')).map(c => c.split(' :: ').pop()).slice(0, 3);
    if (cats.length > 0) {
      infoGridHTML += `
        <div class="info-item">
          <span class="info-label">Categorias</span>
          <span class="info-value">${cats.join(', ')}</span>
        </div>`;
    }
  }
  if (info.project_urls) {
    const entries = Object.entries(info.project_urls).slice(0, 3);
    if (entries.length > 0) {
      infoGridHTML += `
        <div class="info-item">
          <span class="info-label">Links</span>
          <div class="info-links">`;
      entries.forEach(([key, url]) => {
        infoGridHTML += `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="info-link">${escapeHTML(key)}</a>`;
      });
      infoGridHTML += `</div></div>`;
    }
  }

  const name = escapeHTML(info.name);
  const version = escapeHTML(info.version);
  const summary = info.summary ? escapeHTML(info.summary) : '';

  return `
    <div class="package-info">
      <div class="package-header">
        <div class="package-name-section">
          <h2 class="package-name">${name}</h2>
          <span class="package-version">v${version}</span>
        </div>
        <div class="package-badges">${badgesHTML}</div>
      </div>
      ${summary ? `<p class="package-summary">${summary}</p>` : ''}
      <div class="stats-grid">${statsHTML}</div>
      <div class="info-grid">${infoGridHTML}</div>
      <div class="package-link">
        <a href="https://pypi.org/project/${encodeURIComponent(info.name)}/" target="_blank" rel="noopener noreferrer" class="pypi-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.3l7 3.5-7 3.5-7-3.5 7-3.5zM4 16.2V9.5l7 3.5v6.7l-7-3.5zm16 0l-7 3.5v-6.7l7-3.5v6.7z"/>
          </svg>
          Ver no PyPI
        </a>
      </div>
    </div>`;
}

function renderChart(downloadData) {
  if (!downloadData || downloadData.length === 0) return;

  const filtered = downloadData.filter(d => d.category === 'with_mirrors');
  if (filtered.length === 0) return;

  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-90);

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const labels = recent.map(d => formatDateLabel(d.date));
  const values = recent.map(d => d.downloads);
  const total = values.reduce((a, b) => a + b, 0);

  const canvas = document.createElement('canvas');
  canvas.id = 'downloadChart';
  const chartWrapper = document.querySelector('.chart-wrapper');
  chartWrapper.innerHTML = '';
  chartWrapper.appendChild(canvas);

  document.getElementById('chartTotal').textContent = total.toLocaleString('pt-BR') + ' downloads no período';

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Downloads',
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHitRadius: 10,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#f1f5f9',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const d = new Date(recent[items[0].dataIndex].date);
              return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
            },
            label: (ctx) => Number(ctx.parsed.y).toLocaleString('pt-BR') + ' downloads',
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { size: 12 },
            maxTicksLimit: 10,
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(51, 65, 85, 0.4)' },
          ticks: {
            color: '#64748b',
            font: { size: 12 },
            callback: (value) => {
              if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
              if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
              return value;
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index',
      }
    }
  });
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND');
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function handleSearch(query) {
  const name = query.trim().toLowerCase();
  if (!name) return;

  if (currentSearch === name) return;
  currentSearch = name;

  hideError();
  showResults(false);
  showSuggestions(false);
  showEmpty(false);
  showLoading(true);

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  try {
    const proxyStats = u => fetchJSON(`${CORS_PROXY}${encodeURIComponent(u)}`);
    const [pkgData, recentStats, overallStats] = await Promise.all([
      fetchJSON(`${PYPI_API}/${encodeURIComponent(name)}/json`),
      proxyStats(`${PYPI_STATS_API}/${encodeURIComponent(name)}/recent`).catch(() => null),
      proxyStats(`${PYPI_STATS_API}/${encodeURIComponent(name)}/overall`).catch(() => null),
    ]);

    if (currentSearch !== name) return;

    const info = pkgData.info;
    const recent = recentStats;
    const overall = overallStats;

    let html = buildPackageHTML(info, recent);
    if (overall && overall.data && overall.data.length > 0) {
      html += `
        <div class="chart-container">
          <div class="chart-header">
            <h3 class="chart-title">Downloads nos últimos ${Math.min(overall.data.length, 90)} dias</h3>
            <span class="chart-total" id="chartTotal"></span>
          </div>
          <div class="chart-wrapper"></div>
        </div>`;
    }

    resultsEl.innerHTML = html;
    showResults(true);
    showEmpty(false);

    if (overall && overall.data && overall.data.length > 0) {
      renderChart(overall.data);
    }

    updateURL(name);
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (currentSearch !== name) return;
    if (err.message === 'NOT_FOUND') {
      showError(`Pacote "${escapeHTML(name)}" não encontrado no PyPI.`);
    } else {
      showError(`Erro ao buscar dados: ${escapeHTML(err.message)}`);
    }
    showEmpty(true);
  } finally {
    if (currentSearch === name) {
      showLoading(false);
    }
  }
}

document.getElementById('versionDisplay').textContent = `v${VERSION}`;

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSearch(searchInput.value);
});

const initialPkg = getPackageFromURL();
if (initialPkg) {
  searchInput.value = initialPkg;
  handleSearch(initialPkg);
}

SUGGESTIONS.forEach(name => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'suggestion-btn';
  btn.textContent = name;
  btn.addEventListener('click', () => {
    searchInput.value = name;
    handleSearch(name);
  });
  suggestionsEl.appendChild(btn);
});
