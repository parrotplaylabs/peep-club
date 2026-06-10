const API = '/api';

let appConfig = null;

function icon(name, cls = '') {
  const classes = cls ? `icon ${cls}` : 'icon';
  return `<i data-lucide="${name}" class="${classes}" aria-hidden="true"></i>`;
}

function brandIcon(cls = '') {
  const classes = cls ? `icon brand-icon ${cls}` : 'icon brand-icon';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${classes}" aria-hidden="true">
    <ellipse cx="12" cy="13" rx="6" ry="7"/>
    <path d="M9 10h6"/>
    <path d="M12 7v3"/>
    <circle cx="9" cy="9" r="0.5" fill="currentColor"/>
    <circle cx="15" cy="9" r="0.5" fill="currentColor"/>
  </svg>`;
}

function refreshIcons(root = document) {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({ nameAttr: 'data-lucide', attrs: { 'aria-hidden': 'true' }, root });
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function friendlyDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime12(time) {
  if (!time) return '';
  const [h, m] = String(time).split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  clearTimeout(el._t);
  if (!msg) {
    el.textContent = '';
    el.classList.add('hidden');
    el.classList.remove('error');
    return;
  }
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.toggle('error', isError);
  el._t = setTimeout(() => toast(''), 4000);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  if (appConfig?.csrfToken) {
    headers['X-CSRF-Token'] = appConfig.csrfToken;
  }
  const res = await fetch(API + path, { credentials: 'include', ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

async function copyToClipboard(text) {
  const copiedMsg = appConfig?.settings?.shareTemplates?.copiedToast || 'Copied — paste on your page';
  try {
    await navigator.clipboard.writeText(text);
    toast(copiedMsg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast(copiedMsg);
  }
}

async function loadSharePreview(kind, context) {
  const { text } = await api('/share/preview', {
    method: 'POST',
    body: { kind, context },
  });
  return text;
}

function shareBlock(previewId, copyAction, label = 'Social media message preview') {
  return `
    <div class="share-block">
      <pre class="share-preview" id="${previewId}" aria-label="${escapeHtml(label)}">Loading preview…</pre>
      <button type="button" class="btn btn-secondary" data-action="${copyAction}">${icon('share-2', 'icon--sm')} Copy for social media</button>
    </div>`;
}

function memberTypeOptions(settings, selected) {
  return (settings?.memberTypes || [])
    .filter((t) => t.active !== false)
    .map((t) => `<option value="${escapeHtml(t.id)}" ${t.id === selected ? 'selected' : ''}>${escapeHtml(t.label)}</option>`)
    .join('');
}

function volunteerRoleOptions(settings, selected) {
  return (settings?.volunteerRoles || [])
    .filter((r) => r.active !== false)
    .map((r) => `<option value="${escapeHtml(r.id)}" ${r.id === selected ? 'selected' : ''}>${escapeHtml(r.label)}</option>`)
    .join('');
}

function eventTypeOptions(selected) {
  const types = [
    ['meeting', 'Meeting'],
    ['tournament', 'Tournament'],
    ['social', 'Social'],
    ['other', 'Other'],
  ];
  return types.map(([id, label]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${label}</option>`).join('');
}

function statusBadge(status) {
  return `<span class="badge badge-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function typeBadge(type) {
  return `<span class="badge badge-${escapeHtml(type)}">${escapeHtml(type)}</span>`;
}

const ACTIONS_TH = '<th scope="col"><span class="sr-only">Actions</span></th>';

function iconBtn(action, label, iconName, extra = '') {
  return `<button type="button" class="btn btn-sm btn-icon" data-action="${action}" aria-label="${escapeHtml(label)}" ${extra}>${icon(iconName, 'icon--sm')}</button>`;
}

function showModal(html) {
  const panel = document.getElementById('modal-panel');
  const modal = document.getElementById('modal');
  panel.innerHTML = html;
  modal.classList.remove('hidden');
  modal.removeAttribute('hidden');
  refreshIcons(panel);
  const focusable = panel.querySelector('input, button, select, textarea');
  focusable?.focus();
}

function hideModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.setAttribute('hidden', '');
  document.getElementById('modal-panel').innerHTML = '';
}

async function loadConfig() {
  appConfig = await api('/config');
  document.title = appConfig.appName;
  renderHeader();
}

function renderHeader() {
  const header = document.getElementById('site-header');
  if (!appConfig?.authenticated) {
    header.innerHTML = `<div class="header-inner"><a href="/" class="brand">${brandIcon()} ${escapeHtml(appConfig?.appName || 'Peep Club')}</a></div>`;
    refreshIcons(header);
    return;
  }
  const path = window.location.pathname;
  const links = [
    ['/', 'layout-dashboard', 'Dashboard'],
    ['/members', 'users', 'Members'],
    ['/attendance', 'clipboard-check', 'Attendance'],
    ['/events', 'calendar-days', 'Events'],
    ['/announcements', 'megaphone', 'News'],
    ['/analytics', 'bar-chart-3', 'Analytics'],
    ['/settings', 'settings', 'Settings'],
  ];
  header.innerHTML = `
    <div class="header-inner">
      <a href="/" class="brand">${brandIcon()} ${escapeHtml(appConfig.appName)}</a>
      <nav class="nav" aria-label="Main navigation">
        ${links.map(([href, ic, label]) => `<a href="${href}" class="${path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}" ${path === href || (href !== '/' && path.startsWith(href)) ? 'aria-current="page"' : ''}>${icon(ic, 'icon--sm')} ${label}</a>`).join('')}
        ${appConfig.pinRequired ? `<button type="button" class="btn btn-sm" data-action="logout" aria-label="Lock app" style="margin-left:0.5rem;background:rgba(255,255,255,0.2);border-color:transparent;color:#fff">${icon('lock', 'icon--sm')} Lock</button>` : ''}
      </nav>
    </div>`;
  refreshIcons(header);
}

function parseRoute() {
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const query = Object.fromEntries(url.searchParams.entries());
  if (path === '/') return { name: 'dashboard', query };
  if (path === '/members') return { name: 'members', query };
  if (path === '/attendance') return { name: 'attendance', query };
  if (path === '/events') return { name: 'events', query };
  if (path.startsWith('/events/')) return { name: 'event-detail', query: { ...query, id: path.split('/')[2] } };
  if (path === '/announcements') return { name: 'announcements', query };
  if (path === '/analytics') return { name: 'analytics', query };
  if (path === '/settings') return { name: 'settings', query };
  return { name: 'dashboard', query };
}

function navigate(path) {
  history.pushState(null, '', path);
  route();
}

async function route() {
  const app = document.getElementById('app');
  try {
    await loadConfig();
    if (appConfig.pinRequired && !appConfig.authenticated) {
      app.innerHTML = renderUnlock();
      refreshIcons(app);
      bindPageEvents();
      return;
    }
    renderHeader();
    const { name, query } = parseRoute();
    switch (name) {
      case 'dashboard': app.innerHTML = await renderDashboard(); break;
      case 'members': app.innerHTML = await renderMembers(query); break;
      case 'attendance': app.innerHTML = await renderAttendance(query); break;
      case 'events': app.innerHTML = await renderEvents(query); break;
      case 'event-detail': app.innerHTML = await renderEventDetail(query); break;
      case 'announcements': app.innerHTML = await renderAnnouncements(query); break;
      case 'analytics': app.innerHTML = await renderAnalytics(query); break;
      case 'settings': app.innerHTML = await renderSettings(); break;
      default: app.innerHTML = await renderDashboard();
    }
    bindPageEvents();
    refreshIcons(app);
    await initSharePreviews(name, query);
  } catch (err) {
    app.innerHTML = `<div class="card"><p>Error: ${escapeHtml(err.message)}</p><button class="btn" onclick="location.reload()">${icon('refresh-cw', 'icon--sm')} Retry</button></div>`;
    refreshIcons(app);
  }
}

function renderUnlock() {
  return `
    <div class="card unlock-screen">
      <h1 class="unlock-title">${brandIcon()} ${escapeHtml(appConfig?.appName || 'Peep Club')}</h1>
      <p>Enter your operator PIN to unlock the club desk.</p>
      <form id="unlock-form">
        <div class="form-group">
          <label for="pin">PIN</label>
          <input type="password" id="pin" name="pin" inputmode="numeric" autocomplete="current-password" required autofocus>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">${icon('lock-open', 'icon--sm')} Unlock</button>
      </form>
    </div>`;
}

async function renderDashboard() {
  const stats = await api('/dashboard');
  return `
    <h1 class="page-title">${icon('layout-dashboard')} Dashboard</h1>
    <p style="color:var(--muted);margin-top:-0.5rem">${escapeHtml(stats.settings?.clubName || '')}</p>
    <div class="grid-3" style="margin-bottom:1rem">
      <div class="card stat">${icon('users', 'stat-icon')}<div class="stat-value">${stats.memberCount}</div><div class="stat-label">Active members</div></div>
      <div class="card stat">${icon('clipboard-check', 'stat-icon')}<div class="stat-value">${stats.todayAttendanceCount}</div><div class="stat-label">Checked in today</div></div>
      <div class="card stat">${icon('hand-heart', 'stat-icon')}<div class="stat-value">${stats.openVolunteerSlots}</div><div class="stat-label">Open volunteer slots</div></div>
    </div>
    <div class="btn-group" style="margin-bottom:1rem">
      <a href="/attendance" class="btn btn-primary" data-nav>${icon('clipboard-check', 'icon--sm')} Take attendance</a>
      <a href="/members" class="btn" data-nav>${icon('user-plus', 'icon--sm')} Add member</a>
      <a href="/events" class="btn" data-nav>${icon('calendar-plus', 'icon--sm')} New event</a>
    </div>
    <div class="grid-2">
      <div class="card">
        <h2 style="margin:0 0 0.75rem;font-size:1.1rem">${icon('calendar', 'icon--sm')} Today's events</h2>
        ${stats.todayEvents?.length ? `<ul style="margin:0;padding-left:1.25rem">${stats.todayEvents.map((e) => `<li><strong>${escapeHtml(e.title)}</strong> ${formatTime12(e.start_time)}</li>`).join('')}</ul>` : '<p class="empty-state" style="padding:1rem">No events today</p>'}
      </div>
      <div class="card">
        <h2 style="margin:0 0 0.75rem;font-size:1.1rem">${icon('calendar-clock', 'icon--sm')} Upcoming (7 days)</h2>
        ${stats.upcomingEvents?.length ? `<ul style="margin:0;padding-left:1.25rem">${stats.upcomingEvents.map((e) => `<li><a href="/events/${e.id}" data-nav>${escapeHtml(e.title)}</a> — ${friendlyDate(e.date)}</li>`).join('')}</ul>` : '<p class="empty-state" style="padding:1rem">Nothing scheduled</p>'}
      </div>
    </div>
    ${stats.recentAnnouncements?.length ? `
    <div class="card">
      <h2 style="margin:0 0 0.75rem;font-size:1.1rem">${icon('megaphone', 'icon--sm')} Recent announcements</h2>
      <ul style="margin:0;padding-left:1.25rem">${stats.recentAnnouncements.map((a) => `<li><strong>${escapeHtml(a.title)}</strong></li>`).join('')}</ul>
    </div>` : ''}`;
}

async function renderMembers(query) {
  const q = query.q || '';
  const { members } = await api(`/members?q=${encodeURIComponent(q)}`);
  return `
    <h1 class="page-title">${icon('users')} Members</h1>
    <div class="toolbar">
      <form id="member-search" class="btn-group" style="margin:0" role="search">
        <label for="member-search-input" class="sr-only">Search members</label>
        <input type="search" id="member-search-input" name="q" value="${escapeHtml(q)}" placeholder="Search name, phone, email…" style="padding:0.45rem 0.65rem;border:1px solid var(--border);border-radius:8px">
        <button type="submit" class="btn">${icon('search', 'icon--sm')} Search</button>
      </form>
      <div class="btn-group">
        <button class="btn btn-primary" data-action="add-member">${icon('user-plus', 'icon--sm')} Add member</button>
        <button class="btn" data-action="import-members">${icon('upload', 'icon--sm')} Import CSV</button>
      </div>
    </div>
    <div class="card table-wrap">
      ${members.length ? `<table>
        <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Contact</th><th scope="col">Last visit</th>${ACTIONS_TH}</tr></thead>
        <tbody>${members.map((m) => `<tr>
          <td><strong>${escapeHtml(m.name)}</strong></td>
          <td>${typeBadge(m.type)}</td>
          <td>${statusBadge(m.status)}</td>
          <td>${escapeHtml(m.phone || m.email || '—')}</td>
          <td>${m.last_attendance_date ? friendlyDate(m.last_attendance_date) : '—'}</td>
          <td>
            ${iconBtn('edit-member', `Edit ${m.name}`, 'pencil', `data-id="${m.id}"`)}
            ${iconBtn('share-member', `Share welcome message for ${m.name}`, 'share-2', `data-id="${m.id}" data-name="${escapeHtml(m.name)}"`)}
          </td>
        </tr>`).join('')}</tbody>
      </table>` : '<p class="empty-state">No members yet. Add your first member or import a CSV.</p>'}
    </div>`;
}

async function renderAttendance(query) {
  const date = query.date || todayDate();
  const eventId = query.event_id || '';
  const sheet = await api(`/attendance?date=${encodeURIComponent(date)}${eventId ? `&event_id=${eventId}` : ''}`);
  const eventOptions = (sheet.eventsOnDate || []).map((e) =>
    `<option value="${e.id}" ${String(e.id) === String(eventId) ? 'selected' : ''}>${escapeHtml(e.title)}</option>`
  ).join('');
  return `
    <h1 class="page-title">${icon('clipboard-check')} Attendance</h1>
    <div class="card">
      <div class="form-row">
        <div class="form-group">
          <label for="attendance-date">Meeting date</label>
          <input type="date" id="attendance-date" value="${escapeHtml(date)}">
        </div>
        <div class="form-group">
          <label for="attendance-event">Link to event (optional)</label>
          <select id="attendance-event">
            <option value="">— No event —</option>
            ${eventOptions}
          </select>
        </div>
      </div>
      <p style="color:var(--muted);font-size:0.85rem;margin:0">Check members in for this date. Event link is optional.</p>
    </div>
    <div class="card">
      <div class="toolbar">
        <strong>${sheet.total} checked in</strong>
        <span style="color:var(--muted)">${friendlyDate(date)}</span>
      </div>
      <div class="attendance-list">
        ${sheet.members.map((m) => `
          <div class="attendance-row ${m.checked_in ? 'checked' : ''}">
            <input type="checkbox" id="att-${m.id}" data-action="toggle-attendance" data-member-id="${m.id}" ${m.checked_in ? 'checked' : ''}>
            <label for="att-${m.id}">${escapeHtml(m.name)} <span class="member-type-hint">${escapeHtml(m.type_label)}</span></label>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 0.75rem;font-size:1.1rem">${icon('user-plus', 'icon--sm')} Visitors today</h2>
      <form id="visitor-form" class="form-row" style="align-items:flex-end">
        <div class="form-group" style="margin:0;flex:1">
          <label for="visitor-name">Visitor name</label>
          <input type="text" id="visitor-name" name="member_name" placeholder="First-time guest" required>
        </div>
        <button type="submit" class="btn btn-primary">${icon('plus', 'icon--sm')} Add visitor</button>
      </form>
      ${sheet.visitors?.length ? `<ul style="margin:1rem 0 0;padding:0;list-style:none">${sheet.visitors.map((v) => `
        <li style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border)">
          <span>${escapeHtml(v.member_name)} ${typeBadge('visitor')}</span>
          <span>
            ${iconBtn('share-visitor', `Share visitor welcome for ${v.member_name}`, 'share-2', `data-name="${escapeHtml(v.member_name)}"`)}
            ${iconBtn('remove-attendance', `Remove check-in for ${v.member_name}`, 'x', `data-id="${v.id}"`)}
          </span>
        </li>`).join('')}</ul>` : '<p class="empty-state" style="padding:1rem 0">No visitors checked in</p>'}
    </div>`;
}

async function renderEvents(query) {
  const { events } = await api('/events');
  return `
    <h1 class="page-title">${icon('calendar-days')} Events</h1>
    <div class="toolbar">
      <span style="color:var(--muted)">${events.length} events</span>
      <button class="btn btn-primary" data-action="add-event">${icon('calendar-plus', 'icon--sm')} New event</button>
    </div>
    <div class="card table-wrap">
      ${events.length ? `<table>
        <thead><tr><th scope="col">Title</th><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Type</th><th scope="col">Status</th>${ACTIONS_TH}</tr></thead>
        <tbody>${events.map((e) => `<tr>
          <td><a href="/events/${e.id}" data-nav><strong>${escapeHtml(e.title)}</strong></a></td>
          <td>${friendlyDate(e.date)}</td>
          <td>${e.start_time ? formatTime12(e.start_time) : '—'}${e.end_time ? ` – ${formatTime12(e.end_time)}` : ''}</td>
          <td>${typeBadge(e.type)}</td>
          <td>${statusBadge(e.status)}</td>
          <td>${iconBtn('edit-event', `Edit ${e.title}`, 'pencil', `data-id="${e.id}"`)}</td>
        </tr>`).join('')}</tbody>
      </table>` : '<p class="empty-state">No events yet. Create your first club meeting or tournament.</p>'}
    </div>`;
}

async function renderEventDetail(query) {
  const id = Number(query.id);
  const { event, volunteerSlots } = await api(`/events/${id}`);
  const { members } = await api('/members?status=active');
  return `
    <p><a href="/events" data-nav>${icon('arrow-left', 'icon--sm')} Back to events</a></p>
    <h1 class="page-title">${icon('calendar')} ${escapeHtml(event.title)}</h1>
    <div class="grid-2">
      <div class="card">
        <p><strong>Date:</strong> ${friendlyDate(event.date)}</p>
        <p><strong>Time:</strong> ${event.start_time ? formatTime12(event.start_time) : '—'}${event.end_time ? ` – ${formatTime12(event.end_time)}` : ''}</p>
        <p><strong>Location:</strong> ${escapeHtml(event.location || '—')}</p>
        <p><strong>Type:</strong> ${typeBadge(event.type)} ${statusBadge(event.status)}</p>
        ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
        <div class="btn-group" style="margin-top:0.75rem">
          <button class="btn" data-action="edit-event" data-id="${event.id}">${icon('pencil', 'icon--sm')} Edit</button>
          <button class="btn btn-secondary" data-action="share-event" data-id="${event.id}">${icon('share-2', 'icon--sm')} Copy promo</button>
        </div>
        ${shareBlock('share-event-preview', 'copy-event-share')}
      </div>
      <div class="card">
        <h2 style="margin:0 0 0.75rem;font-size:1.1rem">${icon('hand-heart', 'icon--sm')} Volunteers</h2>
        ${volunteerSlots.length ? volunteerSlots.map((slot) => `
          <div style="border-bottom:1px solid var(--border);padding:0.65rem 0">
            <strong>${escapeHtml(slot.role_label)}</strong> — ${slot.filled}/${slot.needed} filled
            ${slot.notes ? `<div style="color:var(--muted);font-size:0.85rem">${escapeHtml(slot.notes)}</div>` : ''}
            ${slot.signups.length ? `<ul style="margin:0.35rem 0;padding-left:1.25rem;font-size:0.85rem">${slot.signups.map((s) => `<li>${escapeHtml(s.member_name)} ${iconBtn('remove-signup', `Remove ${s.member_name} from ${slot.role_label}`, 'x', `data-id="${s.id}"`)}</li>`).join('')}</ul>` : ''}
            ${slot.open > 0 ? `<form data-action="signup-form" data-slot-id="${slot.id}" class="form-row" style="margin-top:0.5rem;align-items:flex-end">
              <div class="form-group" style="margin:0;flex:1">
                <label for="signup-member-${slot.id}" class="sr-only">Assign member to ${escapeHtml(slot.role_label)}</label>
                <select id="signup-member-${slot.id}" name="member_id" required><option value="">Assign member…</option>${members.filter((m) => m.type === 'member').map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}</select>
              </div>
              <button type="submit" class="btn btn-sm">Sign up</button>
            </form>` : '<span class="badge badge-published">Full</span>'}
            <button type="button" class="btn btn-sm" style="margin-top:0.35rem" data-action="delete-slot" data-id="${slot.id}">${icon('trash-2', 'icon--sm')} Remove slot</button>
          </div>`).join('') : '<p class="empty-state" style="padding:1rem 0">No volunteer slots yet</p>'}
        <form id="add-volunteer-slot" style="margin-top:1rem">
          <input type="hidden" name="event_id" value="${event.id}">
          <div class="form-row">
            <div class="form-group"><label for="volunteer-role">Role</label><select id="volunteer-role" name="role" required>${volunteerRoleOptions(appConfig.settings)}</select></div>
            <div class="form-group"><label for="volunteer-needed">Needed</label><input type="number" id="volunteer-needed" name="needed" value="1" min="1" max="20"></div>
          </div>
          <button type="submit" class="btn btn-sm btn-primary">${icon('plus', 'icon--sm')} Add volunteer slot</button>
        </form>
        ${volunteerSlots.some((s) => s.open > 0) ? `
          <div style="margin-top:1rem">
            <button class="btn btn-secondary" data-action="share-volunteer" data-id="${event.id}">${icon('share-2', 'icon--sm')} Copy volunteer call</button>
            ${shareBlock('share-volunteer-preview', 'copy-volunteer-share')}
          </div>` : ''}
      </div>
    </div>`;
}

async function renderAnnouncements(query) {
  const { announcements } = await api('/announcements');
  const editId = query.edit ? Number(query.edit) : null;
  const editing = editId ? announcements.find((a) => a.id === editId) : null;
  return `
    <h1 class="page-title">${icon('megaphone')} Announcements</h1>
    <div class="grid-2">
      <div class="card">
        <h2 style="margin:0 0 0.75rem;font-size:1.1rem">${editing ? 'Edit' : 'New'} announcement</h2>
        <form id="announcement-form">
          <input type="hidden" name="id" value="${editing?.id || ''}">
          <div class="form-group"><label for="announcement-title">Title</label><input type="text" id="announcement-title" name="title" value="${escapeHtml(editing?.title || '')}" required></div>
          <div class="form-group"><label for="announcement-body">Body</label><textarea id="announcement-body" name="body" rows="5" required>${escapeHtml(editing?.body || '')}</textarea></div>
          <div class="form-group"><label for="announcement-status">Status</label>
            <select id="announcement-status" name="status">
              <option value="draft" ${editing?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="published" ${editing?.status === 'published' ? 'selected' : ''}>Published</option>
            </select>
          </div>
          <div class="btn-group">
            <button type="submit" class="btn btn-primary">${icon('save', 'icon--sm')} Save</button>
            ${editing ? `<a href="/announcements" class="btn" data-nav>Cancel</a>` : ''}
          </div>
        </form>
        ${editing?.status === 'published' ? shareBlock('share-announcement-preview', 'copy-announcement-share') : ''}
      </div>
      <div class="card table-wrap">
        <h2 style="margin:0 0 0.75rem;font-size:1.1rem">All announcements</h2>
        ${announcements.length ? `<table>
          <thead><tr><th scope="col">Title</th><th scope="col">Status</th>${ACTIONS_TH}</tr></thead>
          <tbody>${announcements.map((a) => `<tr>
            <td><strong>${escapeHtml(a.title)}</strong></td>
            <td>${statusBadge(a.status)}</td>
            <td>
              <a href="/announcements?edit=${a.id}" class="btn btn-sm" data-nav aria-label="Edit ${escapeHtml(a.title)}">${icon('pencil', 'icon--sm')}<span class="sr-only">Edit</span></a>
              ${a.status === 'published' ? iconBtn('share-announcement', `Share announcement: ${a.title}`, 'share-2', `data-id="${a.id}"`) : ''}
              ${iconBtn('delete-announcement', `Delete announcement: ${a.title}`, 'trash-2', `data-id="${a.id}"`)}
            </td>
          </tr>`).join('')}</tbody>
        </table>` : '<p class="empty-state">No announcements yet</p>'}
      </div>
    </div>`;
}

async function renderAnalytics(query) {
  const range = query.range || '30d';
  const data = await api(`/analytics?range=${encodeURIComponent(range)}`);
  const maxBar = Math.max(...data.attendance.weekly.map((w) => w.count), 1);
  return `
    <h1 class="page-title">${icon('bar-chart-3')} Analytics</h1>
    <div class="toolbar">
      <label for="analytics-range">Date range</label>
      <select id="analytics-range">
        <option value="7d" ${range === '7d' ? 'selected' : ''}>Last 7 days</option>
        <option value="30d" ${range === '30d' ? 'selected' : ''}>Last 30 days</option>
        <option value="90d" ${range === '90d' ? 'selected' : ''}>Last 90 days</option>
      </select>
    </div>
    <div class="grid-3" style="margin-bottom:1rem">
      <div class="card stat"><div class="stat-value">${data.memberCounts.active}</div><div class="stat-label">Active members</div></div>
      <div class="card stat"><div class="stat-value">${data.attendance.totalInRange}</div><div class="stat-label">Check-ins (${range})</div></div>
      <div class="card stat"><div class="stat-value">${data.memberCounts.newInRange}</div><div class="stat-label">New members</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h2 style="margin:0 0 0.75rem;font-size:1.1rem">Weekly attendance</h2>
        <div class="bar-chart" role="img" aria-label="Weekly attendance bar chart for the selected date range">
          ${data.attendance.weekly.map((w) => `
            <div class="bar-col">
              <div class="bar-fill" style="height:${Math.round((w.count / maxBar) * 100)}%" aria-hidden="true"></div>
              <div class="bar-label">${w.count} check-ins, week of ${w.weekStart.slice(5)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <h2 style="margin:0 0 0.75rem;font-size:1.1rem">Roster breakdown</h2>
        <p>Members: <strong>${data.memberCounts.active}</strong></p>
        <p>Visitors on roster: <strong>${data.memberCounts.visitors}</strong></p>
        <p>Alumni: <strong>${data.memberCounts.alumni}</strong></p>
        <p>Meeting days with check-ins: <strong>${data.attendance.uniqueDates}</strong></p>
        ${data.volunteers.coveragePercent !== null ? `<p>Volunteer coverage: <strong>${data.volunteers.coveragePercent}%</strong> (${data.volunteers.totalFilled}/${data.volunteers.totalNeeded})</p>` : ''}
      </div>
    </div>
    ${data.events.topByAttendance.length ? `
    <div class="card">
      <h2 style="margin:0 0 0.75rem;font-size:1.1rem">Top events by attendance</h2>
      <ul style="margin:0;padding-left:1.25rem">${data.events.topByAttendance.map((e) => `<li>${escapeHtml(e.title)} — ${e.count} check-ins</li>`).join('')}</ul>
    </div>` : ''}`;
}

async function renderSettings() {
  const s = appConfig.settings;
  const clubTypes = [
    ['general', 'General'],
    ['chess', 'Chess club'],
    ['speedcubing', 'Speedcubing'],
    ['board_games', 'Board games'],
    ['go', 'Go club'],
    ['homeschool', 'Homeschool group'],
    ['robotics', 'Robotics club'],
    ['school_org', 'School organization'],
  ];
  return `
    <h1 class="page-title">${icon('settings')} Settings</h1>
    <form id="settings-form">
      <div class="card">
        <h2 style="margin:0 0 0.75rem;font-size:1.1rem">Club profile</h2>
        <div class="form-row">
          <div class="form-group"><label for="settings-club-name">Club name</label><input type="text" id="settings-club-name" name="clubName" value="${escapeHtml(s.clubName || '')}"></div>
          <div class="form-group"><label for="settings-club-type">Club type</label>
            <select id="settings-club-type" name="clubType">${clubTypes.map(([id, label]) => `<option value="${id}" ${s.clubType === id ? 'selected' : ''}>${label}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-group"><label for="settings-location">Location</label><input type="text" id="settings-location" name="location" value="${escapeHtml(s.location || '')}"></div>
        <div class="form-row">
          <div class="form-group"><label for="settings-contact-phone">Contact phone</label><input type="text" id="settings-contact-phone" name="contactPhone" value="${escapeHtml(s.contactPhone || '')}"></div>
          <div class="form-group"><label for="settings-contact-email">Contact email</label><input type="email" id="settings-contact-email" name="contactEmail" value="${escapeHtml(s.contactEmail || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="settings-meeting-day">Regular meeting day</label>
            <select id="settings-meeting-day" name="meetingDay">
              ${['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((d) => `<option value="${d}" ${s.meetingDay === d ? 'selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label for="settings-meeting-time">Regular meeting time</label><input type="time" id="settings-meeting-time" name="meetingTime" value="${escapeHtml(s.meetingTime || '18:30')}"></div>
        </div>
        <button type="submit" class="btn btn-primary">${icon('save', 'icon--sm')} Save settings</button>
      </div>
    </form>
    <div class="card">
      <h2 style="margin:0 0 0.75rem;font-size:1.1rem">Data</h2>
      <div class="btn-group">
        <a href="/api/export/backup" class="btn" download>${icon('download', 'icon--sm')} Download backup</a>
        <label for="restore-file" class="btn" style="cursor:pointer">${icon('upload', 'icon--sm')} Restore backup</label>
        <input type="file" id="restore-file" accept=".json,application/json" class="sr-only">
        <button class="btn btn-danger" data-action="reseed">${icon('rotate-ccw', 'icon--sm')} Reset to sample data</button>
      </div>
    </div>`;
}

async function initSharePreviews(viewName, query) {
  if (viewName === 'event-detail' && query.id) {
    const el = document.getElementById('share-event-preview');
    if (el) el.textContent = await loadSharePreview('event_promo', { eventId: Number(query.id) });
    const vel = document.getElementById('share-volunteer-preview');
    if (vel) vel.textContent = await loadSharePreview('volunteer_call', { eventId: Number(query.id) });
  }
  if (viewName === 'announcements' && query.edit) {
    const el = document.getElementById('share-announcement-preview');
    if (el) el.textContent = await loadSharePreview('announcement', { announcementId: Number(query.edit) });
  }
}

function memberFormModal(member = null) {
  const s = appConfig.settings;
  return `
    <h2 id="modal-title">${member ? 'Edit member' : 'Add member'}</h2>
    <form id="member-form">
      <input type="hidden" name="id" value="${member?.id || ''}">
      <div class="form-group"><label for="member-name">Name</label><input type="text" id="member-name" name="name" value="${escapeHtml(member?.name || '')}" required></div>
      <div class="form-row">
        <div class="form-group"><label for="member-phone">Phone</label><input type="text" id="member-phone" name="phone" value="${escapeHtml(member?.phone || '')}"></div>
        <div class="form-group"><label for="member-email">Email</label><input type="email" id="member-email" name="email" value="${escapeHtml(member?.email || '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label for="member-type">Type</label><select id="member-type" name="type">${memberTypeOptions(s, member?.type || 'member')}</select></div>
        <div class="form-group"><label for="member-status">Status</label>
          <select id="member-status" name="status">
            <option value="active" ${member?.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${member?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label for="member-notes">Notes</label><textarea id="member-notes" name="notes" rows="2">${escapeHtml(member?.notes || '')}</textarea></div>
      <div class="btn-group">
        <button type="submit" class="btn btn-primary">Save</button>
        <button type="button" class="btn" data-action="close-modal">Cancel</button>
      </div>
    </form>`;
}

function eventFormModal(event = null) {
  return `
    <h2 id="modal-title">${event ? 'Edit event' : 'New event'}</h2>
    <form id="event-form">
      <input type="hidden" name="id" value="${event?.id || ''}">
      <div class="form-group"><label for="event-title">Title</label><input type="text" id="event-title" name="title" value="${escapeHtml(event?.title || '')}" required></div>
      <div class="form-row">
        <div class="form-group"><label for="event-date">Date</label><input type="date" id="event-date" name="date" value="${escapeHtml(event?.date || todayDate())}" required></div>
        <div class="form-group"><label for="event-type">Type</label><select id="event-type" name="type">${eventTypeOptions(event?.type || 'meeting')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label for="event-start">Start</label><input type="time" id="event-start" name="start_time" value="${escapeHtml(event?.start_time || appConfig.settings.meetingTime || '18:30')}"></div>
        <div class="form-group"><label for="event-end">End</label><input type="time" id="event-end" name="end_time" value="${escapeHtml(event?.end_time || '')}"></div>
      </div>
      <div class="form-group"><label for="event-location">Location</label><input type="text" id="event-location" name="location" value="${escapeHtml(event?.location || appConfig.settings.location || '')}"></div>
      <div class="form-group"><label for="event-description">Description</label><textarea id="event-description" name="description" rows="3">${escapeHtml(event?.description || '')}</textarea></div>
      ${event ? `<div class="form-group"><label for="event-status">Status</label>
        <select id="event-status" name="status">
          <option value="scheduled" ${event.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
          <option value="completed" ${event.status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="cancelled" ${event.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select></div>` : ''}
      <div class="btn-group">
        <button type="submit" class="btn btn-primary">Save</button>
        <button type="button" class="btn" data-action="close-modal">Cancel</button>
      </div>
    </form>`;
}

function importModal() {
  return `
    <h2 id="modal-title">Import members (CSV)</h2>
    <p style="color:var(--muted);font-size:0.9rem">Paste CSV with columns: name, phone, email, type, notes. Header row optional.</p>
    <form id="import-form">
      <div class="form-group"><label for="import-csv">CSV data</label><textarea id="import-csv" name="csv" rows="8" placeholder="name,phone,email&#10;Alex Kim,555-0101,alex@example.com" required></textarea></div>
      <div class="btn-group">
        <button type="submit" class="btn btn-primary">Import</button>
        <button type="button" class="btn" data-action="close-modal">Cancel</button>
      </div>
    </form>`;
}

function shareModal(text) {
  return `
    <h2 id="modal-title">${icon('share-2', 'icon--sm')} Share message</h2>
    <pre class="share-preview" id="modal-share-text" aria-label="Social media message preview">${escapeHtml(text)}</pre>
    <div class="btn-group">
      <button type="button" class="btn btn-primary" data-action="copy-modal-share">${icon('copy', 'icon--sm')} Copy for social media</button>
      <button type="button" class="btn" data-action="close-modal">Close</button>
    </div>`;
}

function bindPageEvents() {
  document.getElementById('unlock-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const result = await api('/auth/login', { method: 'POST', body: { pin: e.target.pin.value } });
      appConfig.authenticated = true;
      appConfig.csrfToken = result.csrfToken;
      toast('Unlocked');
      route();
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById('member-search')?.addEventListener('submit', (e) => {
    e.preventDefault();
    navigate(`/members?q=${encodeURIComponent(new FormData(e.target).get('q') || '')}`);
  });

  document.getElementById('attendance-date')?.addEventListener('change', (e) => {
    const date = e.target.value;
    const eventId = document.getElementById('attendance-event')?.value || '';
    navigate(`/attendance?date=${date}${eventId ? `&event_id=${eventId}` : ''}`);
  });

  document.getElementById('attendance-event')?.addEventListener('change', (e) => {
    const date = document.getElementById('attendance-date')?.value || todayDate();
    const eventId = e.target.value;
    navigate(`/attendance?date=${date}${eventId ? `&event_id=${eventId}` : ''}`);
  });

  document.getElementById('visitor-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const date = document.getElementById('attendance-date')?.value || todayDate();
    const eventId = document.getElementById('attendance-event')?.value || null;
    try {
      await api('/attendance/visitor', {
        method: 'POST',
        body: {
          date,
          member_name: form.member_name.value,
          event_id: eventId,
        },
      });
      toast('Visitor checked in');
      navigate(`/attendance?date=${date}${eventId ? `&event_id=${eventId}` : ''}`);
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById('announcement-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form));
    const id = body.id;
    delete body.id;
    try {
      if (id) {
        await api(`/announcements/${id}/update`, { method: 'POST', body });
      } else {
        await api('/announcements', { method: 'POST', body });
      }
      toast('Announcement saved');
      navigate('/announcements');
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const result = await api('/settings/update', {
        method: 'POST',
        body: Object.fromEntries(new FormData(form)),
      });
      appConfig.settings = result.settings;
      toast('Settings saved');
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById('restore-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Restore will replace all data. Continue?')) return;
    try {
      const payload = JSON.parse(await file.text());
      await api('/import/backup', { method: 'POST', body: payload });
      toast('Backup restored');
      route();
    } catch (err) {
      toast(err.message, true);
    }
    e.target.value = '';
  });

  document.getElementById('analytics-range')?.addEventListener('change', (e) => {
    navigate(`/analytics?range=${e.target.value}`);
  });

  document.getElementById('add-volunteer-slot')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const eventId = form.event_id.value;
    try {
      await api(`/events/${eventId}/volunteers`, {
        method: 'POST',
        body: Object.fromEntries(new FormData(form)),
      });
      toast('Volunteer slot added');
      navigate(`/events/${eventId}`);
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.querySelectorAll('[data-action="signup-form"]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const slotId = form.dataset.slotId;
      const memberId = new FormData(form).get('member_id');
      try {
        await api(`/volunteer-slots/${slotId}/signup`, {
          method: 'POST',
          body: { member_id: memberId },
        });
        toast('Volunteer signed up');
        route();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
}

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    e.preventDefault();
    navigate(nav.getAttribute('href'));
    return;
  }

  const action = e.target.closest('[data-action]');
  if (!action) {
    const link = e.target.closest('a[href^="/"]');
    if (link && !link.target && !link.hasAttribute('download')) {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    }
    return;
  }

  const act = action.dataset.action;

  if (act === 'close-modal') {
    hideModal();
    return;
  }

  if (act === 'logout') {
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
      appConfig.authenticated = false;
      navigate('/');
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }

  if (act === 'add-member') {
    showModal(memberFormModal());
    document.getElementById('member-form')?.addEventListener('submit', submitMemberForm);
    return;
  }

  if (act === 'edit-member') {
    const { members } = await api('/members');
    const member = members.find((m) => m.id === Number(action.dataset.id));
    showModal(memberFormModal(member));
    document.getElementById('member-form')?.addEventListener('submit', submitMemberForm);
    return;
  }

  if (act === 'import-members') {
    showModal(importModal());
    document.getElementById('import-form')?.addEventListener('submit', submitImportForm);
    return;
  }

  if (act === 'share-member') {
    const text = await loadSharePreview('welcome_member', { memberId: Number(action.dataset.id), memberName: action.dataset.name });
    showModal(shareModal(text));
    return;
  }

  if (act === 'share-visitor') {
    const text = await loadSharePreview('welcome_visitor', { memberName: action.dataset.name });
    showModal(shareModal(text));
    return;
  }

  if (act === 'copy-modal-share') {
    const text = document.getElementById('modal-share-text')?.textContent || '';
    await copyToClipboard(text);
    return;
  }

  if (act === 'toggle-attendance') {
    const date = document.getElementById('attendance-date')?.value || todayDate();
    const eventId = document.getElementById('attendance-event')?.value || null;
    try {
      await api('/attendance/toggle', {
        method: 'POST',
        body: { date, member_id: Number(action.dataset.memberId), event_id: eventId },
      });
      route();
    } catch (err) {
      toast(err.message, true);
      action.checked = !action.checked;
    }
    return;
  }

  if (act === 'remove-attendance') {
    if (!confirm('Remove this check-in?')) return;
    try {
      await api(`/attendance/${action.dataset.id}/delete`, { method: 'POST', body: {} });
      route();
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }

  if (act === 'add-event') {
    showModal(eventFormModal());
    document.getElementById('event-form')?.addEventListener('submit', submitEventForm);
    return;
  }

  if (act === 'edit-event') {
    const { event } = await api(`/events/${action.dataset.id}`);
    showModal(eventFormModal(event));
    document.getElementById('event-form')?.addEventListener('submit', submitEventForm);
    return;
  }

  if (act === 'share-event' || act === 'copy-event-share') {
    const id = action.dataset.id || parseRoute().query.id;
    const text = act === 'copy-event-share'
      ? document.getElementById('share-event-preview')?.textContent
      : await loadSharePreview('event_promo', { eventId: Number(id) });
    if (act === 'share-event') {
      showModal(shareModal(text));
    } else {
      await copyToClipboard(text || '');
    }
    return;
  }

  if (act === 'share-volunteer' || act === 'copy-volunteer-share') {
    const id = action.dataset.id || parseRoute().query.id;
    const text = act === 'copy-volunteer-share'
      ? document.getElementById('share-volunteer-preview')?.textContent
      : await loadSharePreview('volunteer_call', { eventId: Number(id) });
    if (act === 'share-volunteer') {
      showModal(shareModal(text));
    } else {
      await copyToClipboard(text || '');
    }
    return;
  }

  if (act === 'share-announcement' || act === 'copy-announcement-share') {
    const id = action.dataset.id || new URLSearchParams(window.location.search).get('edit');
    const text = act === 'copy-announcement-share'
      ? document.getElementById('share-announcement-preview')?.textContent
      : await loadSharePreview('announcement', { announcementId: Number(id) });
    if (act === 'share-announcement') {
      showModal(shareModal(text));
    } else {
      await copyToClipboard(text || '');
    }
    return;
  }

  if (act === 'delete-announcement') {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api(`/announcements/${action.dataset.id}/delete`, { method: 'POST', body: {} });
      toast('Deleted');
      navigate('/announcements');
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }

  if (act === 'delete-slot') {
    if (!confirm('Remove this volunteer slot?')) return;
    try {
      await api(`/volunteer-slots/${action.dataset.id}/delete`, { method: 'POST', body: {} });
      route();
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }

  if (act === 'remove-signup') {
    try {
      await api(`/volunteer-signups/${action.dataset.id}/delete`, { method: 'POST', body: {} });
      route();
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }

  if (act === 'reseed') {
    if (!confirm('Reset all data to sample seed? This cannot be undone.')) return;
    try {
      await api('/reset/reseed', { method: 'POST', body: {} });
      toast('Reset to sample data');
      route();
    } catch (err) {
      toast(err.message, true);
    }
  }
});

async function submitMemberForm(e) {
  e.preventDefault();
  const form = e.target;
  const body = Object.fromEntries(new FormData(form));
  const id = body.id;
  delete body.id;
  try {
    if (id) {
      await api(`/members/${id}/update`, { method: 'POST', body });
    } else {
      await api('/members', { method: 'POST', body });
    }
    hideModal();
    toast('Member saved');
    route();
  } catch (err) {
    toast(err.message, true);
  }
}

async function submitEventForm(e) {
  e.preventDefault();
  const form = e.target;
  const body = Object.fromEntries(new FormData(form));
  const id = body.id;
  delete body.id;
  try {
    if (id) {
      await api(`/events/${id}/update`, { method: 'POST', body });
      hideModal();
      toast('Event saved');
      navigate(`/events/${id}`);
    } else {
      const { event } = await api('/events', { method: 'POST', body });
      hideModal();
      toast('Event created');
      navigate(`/events/${event.id}`);
    }
  } catch (err) {
    toast(err.message, true);
  }
}

async function submitImportForm(e) {
  e.preventDefault();
  const csv = new FormData(e.target).get('csv');
  try {
    const result = await api('/members/import', { method: 'POST', body: { csv } });
    hideModal();
    toast(`Imported ${result.createdCount} member(s)`);
    route();
  } catch (err) {
    toast(err.message, true);
  }
}

window.addEventListener('popstate', route);
route();
