import { parseCsv } from '../lib/csv.js';
import { store } from '../store/dataStore.js';

const HEADER_ALIASES = {
  name: ['name', 'member', 'member name', 'full name'],
  phone: ['phone', 'tel', 'telephone', 'mobile', 'cell'],
  email: ['email', 'e-mail', 'mail'],
  type: ['type', 'member type', 'role'],
  notes: ['notes', 'note', 'comments', 'comment'],
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

function detectColumnMap(headerRow) {
  const map = {};
  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(key)) {
        map[field] = index;
      }
    }
  });
  return Object.hasOwn(map, 'name') ? map : null;
}

function rowToMember(cells, columnMap) {
  const value = (field, fallbackIndex) => {
    const index = columnMap[field];
    if (index !== undefined) return String(cells[index] || '').trim();
    if (fallbackIndex !== undefined && cells[fallbackIndex] !== undefined) {
      return String(cells[fallbackIndex] || '').trim();
    }
    return '';
  };

  if (columnMap) {
    return {
      name: value('name'),
      phone: value('phone'),
      email: value('email'),
      type: value('type') || 'member',
      notes: value('notes'),
    };
  }

  return {
    name: value('name', 0),
    phone: value('phone', 1),
    email: value('email', 2),
    type: value('type', 3) || 'member',
    notes: value('notes', 4),
  };
}

export function parseMemberCsv(text) {
  const rows = parseCsv(text).filter((cells) => cells.some((cell) => cell.length > 0));
  if (!rows.length) return { ok: false, error: 'No data found in CSV' };

  const headerMap = detectColumnMap(rows[0]);
  const dataRows = headerMap ? rows.slice(1) : rows;
  if (!dataRows.length) return { ok: false, error: 'No member rows found in CSV' };

  const members = dataRows.map((cells, index) => ({
    line: (headerMap ? 2 : 1) + index,
    ...rowToMember(cells, headerMap),
  }));

  return { ok: true, members, hasHeader: Boolean(headerMap) };
}

export async function importMembersFromCsv(text, { skipDuplicates = true } = {}) {
  const parsed = parseMemberCsv(text);
  if (!parsed.ok) return parsed;
  return store.importMembers(parsed.members, { skipDuplicates });
}
