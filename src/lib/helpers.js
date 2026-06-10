export function nowIso() {
  return new Date().toISOString();
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function friendlyDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime12(time) {
  if (!time) return '';
  const [h, m] = String(time).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function normalizeMemberTypes(memberTypes, defaults = []) {
  const byId = new Map((defaults || []).map((t) => [t.id, { ...t }]));
  for (const t of memberTypes || []) {
    const base = byId.get(t.id) || {};
    byId.set(t.id, { ...base, ...t, active: t.active !== false });
  }
  const ordered = (memberTypes || []).map((t) => byId.get(t.id)).filter(Boolean);
  if (ordered.length) return ordered;
  return [...byId.values()];
}

export function normalizeVolunteerRoles(roles, defaults = []) {
  const byId = new Map((defaults || []).map((r) => [r.id, { ...r }]));
  for (const r of roles || []) {
    const base = byId.get(r.id) || {};
    byId.set(r.id, { ...base, ...r, active: r.active !== false });
  }
  const ordered = (roles || []).map((r) => byId.get(r.id)).filter(Boolean);
  if (ordered.length) return ordered;
  return [...byId.values()];
}

export function enrichSettings(settings) {
  const merged = { ...settings };
  if (merged.memberTypes?.length) {
    merged.memberTypes = normalizeMemberTypes(merged.memberTypes, merged.memberTypes);
  }
  if (merged.volunteerRoles?.length) {
    merged.volunteerRoles = normalizeVolunteerRoles(merged.volunteerRoles, merged.volunteerRoles);
  }
  return merged;
}

export function memberTypeLabel(settings, typeId) {
  return (settings?.memberTypes || []).find((t) => t.id === typeId)?.label || typeId || 'Member';
}

export function volunteerRoleLabel(settings, roleId) {
  return (settings?.volunteerRoles || []).find((r) => r.id === roleId)?.label || roleId || 'Volunteer';
}

export function contactDisplay(settings) {
  const parts = [];
  if (settings?.contactPhone) parts.push(settings.contactPhone);
  if (settings?.contactEmail) parts.push(settings.contactEmail);
  return parts.join(' · ') || 'our club';
}
