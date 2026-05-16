const TOKEN_KEY = 'rr_token';
const USER_KEY = 'rr_user';

const $ = (sel) => document.querySelector(sel);

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  if (!res.ok) {
    const msg =
      body?.message ||
      body?.errors?.map((e) => e.msg).join('; ') ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden', 'err');
  if (isError) el.classList.add('err');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 4200);
}

function verdictLabel(v) {
  if (v === 'ready') return 'Complete';
  if (v === 'not_ready') return 'Failed';
  if (v === 'needs_work') return 'Needs work';
  return v;
}

function verdictBadgeClass(v) {
  if (v === 'ready') return 'badge-ready';
  if (v === 'not_ready') return 'badge-not_ready';
  return 'badge-needs_work';
}

function checkerStatusBadgeClass(s) {
  if (s === 'pass') return 'badge-ready';
  if (s === 'fail') return 'badge-not_ready';
  return 'badge-needs_work';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function renderNav() {
  const nav = $('#nav');
  const user = getUser();
  const token = getToken();

  if (!token || !user) {
    nav.classList.add('hidden');
    nav.innerHTML = '';
    return;
  }

  nav.classList.remove('hidden');
  nav.innerHTML = `
    <a href="#/dashboard">Dashboard</a>
    <a href="#/history">History</a>
    <span class="email">${escapeHtml(user.email)}</span>
    <button type="button" class="btn btn-ghost" id="logout">Log out</button>
  `;
  $('#logout').onclick = () => {
    clearSession();
    location.hash = '#/login';
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseRoute() {
  const raw = (location.hash || '#/login').replace(/^#/, '') || '/login';
  const pathPart = raw.split('?')[0];
  const segments = pathPart.split('/').filter(Boolean);
  const path = segments[0] || 'login';

  if (path === 'check' && segments[1]) {
    return { name: 'check', id: parseInt(segments[1], 10) };
  }
  return { name: path };
}

async function pageLogin() {
  const main = $('#main');
  main.innerHTML = `
    <h1>Sign in</h1>
    <p class="sub">Use the same credentials as the REST API.</p>
    <div class="card" style="max-width:400px">
      <form id="form-login">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required autocomplete="username" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Sign in</button>
      </form>
      <p style="margin-top:1rem;font-size:0.9rem;color:var(--muted)">
        No account? <a href="#/register">Register</a>
      </p>
    </div>
  `;

  $('#form-login').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.user);
      renderNav();
      toast('Signed in');
      location.hash = '#/dashboard';
    } catch (err) {
      toast(err.message, true);
    }
  };
}

async function pageRegister() {
  const main = $('#main');
  main.innerHTML = `
    <h1>Create account</h1>
    <p class="sub">JWT is stored in <span class="mono">localStorage</span> for this demo.</p>
    <div class="card" style="max-width:400px">
      <form id="form-reg">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required autocomplete="username" />
        </div>
        <div class="form-group">
          <label for="password">Password (8+ chars)</label>
          <input type="password" id="password" required autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Register</button>
      </form>
      <p style="margin-top:1rem;font-size:0.9rem;color:var(--muted)">
        Already have an account? <a href="#/login">Sign in</a>
      </p>
    </div>
  `;

  $('#form-reg').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.user);
      renderNav();
      toast('Account created');
      location.hash = '#/dashboard';
    } catch (err) {
      toast(err.message, true);
    }
  };
}

async function pageDashboard() {
  const main = $('#main');
  main.innerHTML = `
    <h1>Analyze a repository</h1>
    <p class="sub">Paste a public GitHub URL. The API runs checkers, calls Gemini (or fallback), and saves a row you can open from History.</p>
    <div class="card">
      <form id="form-check">
        <div class="form-group">
          <label for="repoUrl">GitHub repository URL</label>
          <input type="url" id="repoUrl" required placeholder="https://github.com/owner/repo" />
        </div>
        <button type="submit" class="btn btn-primary" id="btn-analyze">
          Analyze repository
        </button>
      </form>
      <div id="result" class="hidden" style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)"></div>
    </div>
  `;

  const form = $('#form-check');
  const btn = $('#btn-analyze');
  const resultEl = $('#result');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const repoUrl = $('#repoUrl').value.trim();
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Running…';
    resultEl.classList.add('hidden');
    resultEl.innerHTML = '';

    try {
      const data = await api('/api/check', {
        method: 'POST',
        body: JSON.stringify({ repoUrl }),
      });
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <p style="margin:0 0 0.5rem"><strong>Done.</strong> Score <span class="score-pill">${data.aiReport?.score ?? '—'}</span> · ${verdictLabel(data.aiReport?.verdict)}</p>
        <p class="mono" style="margin:0;font-size:0.85rem;color:var(--muted)">Check #${data.checkId} · source: ${escapeHtml(data.aiReport?.source || '')}</p>
        <p style="margin-top:0.75rem">
          <a href="#/check/${data.checkId}">Open full report →</a>
        </p>
      `;
      toast('Analysis saved');
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Analyze repository';
    }
  };
}

function buildChecksQuery(filters) {
  const q = new URLSearchParams();
  if (filters.minScore !== '') q.set('minScore', filters.minScore);
  if (filters.maxScore !== '') q.set('maxScore', filters.maxScore);
  if (filters.verdict) q.set('verdict', filters.verdict);
  q.set('limit', '50');
  return q.toString();
}

async function pageHistory() {
  const main = $('#main');

  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const minScore = params.get('minScore') ?? '';
  const maxScore = params.get('maxScore') ?? '';
  const verdict = params.get('verdict') ?? '';

  main.innerHTML = `
    <h1>Check history</h1>
    <p class="sub">Filters map to <span class="mono">GET /api/checks?…</span> query params (server-side SQL).</p>
    <div class="card">
      <form id="filters" class="row">
        <div class="form-group">
          <label for="f-min">Min score</label>
          <input type="number" id="f-min" min="0" max="100" placeholder="e.g. 71" value="${escapeHtml(minScore)}" />
        </div>
        <div class="form-group">
          <label for="f-max">Max score</label>
          <input type="number" id="f-max" min="0" max="100" placeholder="100" value="${escapeHtml(maxScore)}" />
        </div>
        <div class="form-group">
          <label for="f-verdict">Status</label>
          <select id="f-verdict">
            <option value="" ${!verdict ? 'selected' : ''}>All</option>
            <option value="ready" ${verdict === 'ready' ? 'selected' : ''}>Complete only (ready)</option>
            <option value="needs_work" ${verdict === 'needs_work' ? 'selected' : ''}>Needs work</option>
            <option value="not_ready" ${verdict === 'not_ready' ? 'selected' : ''}>Failed only (not ready)</option>
          </select>
        </div>
        <div class="form-group" style="min-width:120px">
          <label>&nbsp;</label>
          <button type="submit" class="btn btn-primary" style="width:100%">Apply</button>
        </div>
      </form>
      <p style="font-size:0.85rem;color:var(--muted);margin:0 0 1rem">
        Preset: <a href="#/history?minScore=71">Score &gt; 70</a>
        · <a href="#/history?verdict=not_ready">Failed only</a>
        · <a href="#/history?verdict=ready">Complete only</a>
      </p>
      <div id="table-host"><p class="muted">Loading…</p></div>
    </div>
  `;

  $('#filters').onsubmit = (e) => {
    e.preventDefault();
    const q = new URLSearchParams();
    const a = $('#f-min').value.trim();
    const b = $('#f-max').value.trim();
    const v = $('#f-verdict').value;
    if (a !== '') q.set('minScore', a);
    if (b !== '') q.set('maxScore', b);
    if (v) q.set('verdict', v);
    location.hash = '#/history' + (q.toString() ? `?${q}` : '');
  };

  const qs = buildChecksQuery({ minScore, maxScore, verdict });
  try {
    const data = await api(`/api/checks?${qs}`);
    const rows = data.checks || [];
    const host = $('#table-host');

    if (rows.length === 0) {
      host.innerHTML = '<p style="color:var(--muted)">No checks match these filters.</p>';
      return;
    }

    host.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Repository</th>
              <th>Score</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (c) => `
              <tr class="clickable" data-id="${c.id}">
                <td class="mono">${escapeHtml(c.repoFullName || c.repoUrl)}</td>
                <td><span class="score-pill">${c.score}</span></td>
                <td><span class="badge ${verdictBadgeClass(c.verdict)}">${verdictLabel(c.verdict)}</span></td>
                <td>${escapeHtml(formatDate(c.createdAt))}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    host.querySelectorAll('tr.clickable').forEach((tr) => {
      tr.onclick = () => {
        location.hash = `#/check/${tr.dataset.id}`;
      };
    });
  } catch (err) {
    $('#table-host').innerHTML = `<p style="color:var(--bad)">${escapeHtml(err.message)}</p>`;
  }
}

async function pageCheckDetail(id) {
  const main = $('#main');
  main.innerHTML = '<p>Loading report…</p>';

  try {
    const { check } = await api(`/api/checks/${id}`);
    const report = check.aiReport || {};
    const checkers = check.checkerResults || [];

    const risks = Array.isArray(report.risks) ? report.risks : [];
    const fixes = Array.isArray(report.fixes) ? report.fixes : [];

    main.innerHTML = `
      <a href="#/history" class="back-link">← Back to history</a>
      <div class="report-hero">
        <div>
          <h1 style="margin-bottom:0.25rem">${escapeHtml(check.repoFullName || check.repoUrl)}</h1>
          <p class="sub" style="margin:0">${escapeHtml(formatDate(check.createdAt))} · AI source: ${escapeHtml(report.source || '—')}</p>
        </div>
        <div>
          <div class="big-score">${report.score ?? check.score}</div>
          <span class="badge ${verdictBadgeClass(check.verdict)}">${verdictLabel(check.verdict)}</span>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0;font-size:1.1rem">Summary</h2>
        <p style="margin:0">${escapeHtml(report.summary || '—')}</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h2 style="margin-top:0;font-size:1.1rem">Risks</h2>
          ${
            risks.length
              ? `<ul class="list-risks">${risks
                  .map(
                    (r) =>
                      `<li><strong>${escapeHtml(r.title || '')}</strong> — ${escapeHtml(r.detail || '')} <span class="mono" style="color:var(--muted)">(${escapeHtml(r.severity || '')})</span></li>`
                  )
                  .join('')}</ul>`
              : '<p style="color:var(--muted);margin:0">None listed.</p>'
          }
        </div>
        <div class="card">
          <h2 style="margin-top:0;font-size:1.1rem">Suggestions</h2>
          ${
            fixes.length
              ? `<ul class="list-fixes">${fixes
                  .map(
                    (f) =>
                      `<li>${escapeHtml(f.action || '')} <span class="mono" style="color:var(--muted)">[${escapeHtml(f.priority || '')}]</span></li>`
                  )
                  .join('')}</ul>`
              : '<p style="color:var(--muted);margin:0">None listed.</p>'
          }
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0;font-size:1.1rem">Checker breakdown</h2>
        ${checkers
          .map((c) => {
            const findings = (c.findings || [])
              .map(
                (f) =>
                  `<li><span class="mono">${escapeHtml(f.severity)}</span>: ${escapeHtml(f.message)}</li>`
              )
              .join('');
            return `
            <div class="checker-card">
              <h3>
                ${escapeHtml(c.name)}
                <span class="badge ${checkerStatusBadgeClass(c.status)}">${escapeHtml(c.status)}</span>
              </h3>
              <p style="margin:0;font-size:0.9rem;color:var(--muted)">${escapeHtml(c.summary || '')}</p>
              ${findings ? `<ul style="margin:0.5rem 0 0;padding-left:1.1rem;font-size:0.9rem">${findings}</ul>` : ''}
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  } catch (err) {
    main.innerHTML = `
      <a href="#/history" class="back-link">← Back to history</a>
      <p style="color:var(--bad)">${escapeHtml(err.message)}</p>
    `;
  }
}

function requireAuth(route) {
  if (!getToken()) {
    location.hash = '#/login';
    return false;
  }
  return true;
}

async function router() {
  renderNav();
  const route = parseRoute();

  if (route.name === 'login') {
    if (getToken()) {
      location.hash = '#/dashboard';
      return;
    }
    await pageLogin();
    return;
  }

  if (route.name === 'register') {
    if (getToken()) {
      location.hash = '#/dashboard';
      return;
    }
    await pageRegister();
    return;
  }

  if (route.name === 'dashboard') {
    if (!requireAuth()) return;
    await pageDashboard();
    return;
  }

  if (route.name === 'history') {
    if (!requireAuth()) return;
    await pageHistory();
    return;
  }

  if (route.name === 'check') {
    if (!requireAuth()) return;
    if (!route.id || Number.isNaN(route.id)) {
      location.hash = '#/history';
      return;
    }
    await pageCheckDetail(route.id);
    return;
  }

  location.hash = '#/login';
}

window.addEventListener('hashchange', router);
router();
