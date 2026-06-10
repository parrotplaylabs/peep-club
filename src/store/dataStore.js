import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import {
  enrichSettings,
  memberTypeLabel,
  normalizeMemberTypes,
  normalizeVolunteerRoles,
  nowIso,
  todayDate,
  volunteerRoleLabel,
} from '../lib/helpers.js';

export const DEFAULT_SHARE_TEMPLATES = {
  welcomeMemberIntros: [
    'Welcome to {clubName}, {memberName}! 🐣',
    'Say hello to our newest member — {memberName}! 🎉',
    '{memberName} just joined {clubName}! Welcome aboard! 🐣',
  ],
  welcomeMemberClosings: [
    'See you at our next meeting!',
    'Questions? Reach us at {contact}.',
    'Glad to have you in the flock! 🐣',
  ],
  welcomeVisitorIntros: [
    'Welcome, {memberName}! Thanks for visiting {clubName} today. 🐣',
    'Great to have {memberName} drop by {clubName}!',
  ],
  welcomeVisitorClosings: [
    "Come back anytime — we'd love to see you again!",
    'Want to join? Message us at {contact}.',
  ],
  eventPromoIntros: [
    '📅 Upcoming at {clubName}:',
    'Mark your calendar — {clubName} event!',
    'Join us for this at {clubName}:',
  ],
  eventPromoClosings: [
    'All skill levels welcome! Questions? {contact}',
    'Hope to see you there! 🙌',
    'Spread the word — bring a friend!',
  ],
  announcementIntros: [
    '📢 {clubName} update:',
    'News from {clubName}:',
    'Heads up, {clubName} members:',
  ],
  announcementClosings: ['— {clubName}', 'See you soon! 🐣'],
  volunteerCallIntros: [
    '🙋 Volunteer help needed at {clubName}!',
    'Can you lend a hand at {clubName}?',
  ],
  volunteerCallClosings: [
    'Can you help? Reply or message {contact}. Thank you! 🙏',
    'Sign up by messaging {contact}. Every bit helps!',
  ],
  copiedToast: 'Copied — paste on your page',
};

export const DEFAULT_SETTINGS = {
  clubName: 'Peep Club',
  contactPhone: '',
  contactEmail: '',
  location: '',
  meetingDay: 'tuesday',
  meetingTime: '18:30',
  clubType: 'board_games',
  memberTypes: [
    { id: 'member', label: 'Member', active: true },
    { id: 'visitor', label: 'Visitor', active: true },
    { id: 'alumni', label: 'Alumni', active: true },
  ],
  volunteerRoles: [
    { id: 'setup', label: 'Setup / teardown', active: true },
    { id: 'snacks', label: 'Snacks & drinks', active: true },
    { id: 'registration', label: 'Registration desk', active: true },
    { id: 'timer', label: 'Timer / scoring', active: true },
  ],
  shareTemplates: { ...DEFAULT_SHARE_TEMPLATES },
};

const EMPTY_DATA = {
  meta: {
    nextId: {
      members: 1,
      events: 1,
      attendance: 1,
      announcements: 1,
      volunteer_slots: 1,
      volunteer_signups: 1,
    },
  },
  settings: { ...DEFAULT_SETTINGS },
  members: [],
  events: [],
  attendance: [],
  announcements: [],
  volunteer_slots: [],
  volunteer_signups: [],
};

let writeQueue = Promise.resolve();

function enqueue(fn) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(config.dataPath), { recursive: true });
  try {
    await fs.access(config.dataPath);
  } catch {
    await fs.writeFile(config.dataPath, JSON.stringify(EMPTY_DATA, null, 2), 'utf8');
  }
}

async function readData() {
  await ensureDataFile();
  const raw = await fs.readFile(config.dataPath, 'utf8');
  const data = JSON.parse(raw);
  data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  if (!data.settings.shareTemplates) {
    data.settings.shareTemplates = { ...DEFAULT_SHARE_TEMPLATES };
  } else {
    data.settings.shareTemplates = {
      ...DEFAULT_SHARE_TEMPLATES,
      ...data.settings.shareTemplates,
    };
  }
  if (!data.settings.memberTypes?.length) {
    data.settings.memberTypes = DEFAULT_SETTINGS.memberTypes;
  }
  data.settings.memberTypes = normalizeMemberTypes(
    data.settings.memberTypes,
    DEFAULT_SETTINGS.memberTypes
  );
  if (!data.settings.volunteerRoles?.length) {
    data.settings.volunteerRoles = DEFAULT_SETTINGS.volunteerRoles;
  }
  data.settings.volunteerRoles = normalizeVolunteerRoles(
    data.settings.volunteerRoles,
    DEFAULT_SETTINGS.volunteerRoles
  );
  data.members = data.members || [];
  data.events = data.events || [];
  data.attendance = data.attendance || [];
  data.announcements = data.announcements || [];
  data.volunteer_slots = data.volunteer_slots || [];
  data.volunteer_signups = data.volunteer_signups || [];
  return data;
}

async function writeData(data) {
  const tmp = `${config.dataPath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, config.dataPath);
}

function nextId(data, key) {
  if (!data.meta.nextId) data.meta.nextId = {};
  if (!data.meta.nextId[key]) data.meta.nextId[key] = 1;
  return data.meta.nextId[key]++;
}

function enrichMember(member, data) {
  return {
    ...member,
    type_label: memberTypeLabel(data.settings, member.type),
  };
}

function enrichEvent(event) {
  return { ...event };
}

function enrichAttendance(record, data) {
  const event = record.event_id
    ? data.events.find((e) => e.id === record.event_id)
    : null;
  return {
    ...record,
    event_title: event?.title || '',
  };
}

function enrichVolunteerSlot(slot, data) {
  const signups = data.volunteer_signups.filter((s) => s.slot_id === slot.id);
  return {
    ...slot,
    role_label: volunteerRoleLabel(data.settings, slot.role),
    signups,
    filled: signups.length,
    open: Math.max(0, (slot.needed || 1) - signups.length),
  };
}

export const store = {
  async read() {
    return readData();
  },

  async mutate(mutator) {
    return enqueue(async () => {
      const data = await readData();
      const result = await mutator(data);
      await writeData(data);
      return result;
    });
  },

  async replaceAll(newData) {
    return enqueue(async () => {
      await writeData(newData);
      return true;
    });
  },

  async getSettings() {
    const data = await readData();
    return enrichSettings(data.settings);
  },

  async updateSettings(updates) {
    return this.mutate((data) => {
      const next = { ...data.settings, ...updates };
      if (updates.memberTypes) {
        next.memberTypes = normalizeMemberTypes(
          updates.memberTypes,
          data.settings.memberTypes?.length
            ? data.settings.memberTypes
            : DEFAULT_SETTINGS.memberTypes
        );
      }
      if (updates.volunteerRoles) {
        next.volunteerRoles = normalizeVolunteerRoles(
          updates.volunteerRoles,
          data.settings.volunteerRoles?.length
            ? data.settings.volunteerRoles
            : DEFAULT_SETTINGS.volunteerRoles
        );
      }
      if (updates.shareTemplates) {
        next.shareTemplates = {
          ...data.settings.shareTemplates,
          ...updates.shareTemplates,
        };
      }
      data.settings = next;
      return enrichSettings(data.settings);
    });
  },

  async listMembers(q = '', { type, status } = {}) {
    const data = await readData();
    const query = String(q).trim().toLowerCase();
    return data.members
      .filter((m) => {
        if (type && m.type !== type) return false;
        if (status && m.status !== status) return false;
        if (!query) return true;
        return (
          m.name.toLowerCase().includes(query) ||
          (m.phone || '').toLowerCase().includes(query) ||
          (m.email || '').toLowerCase().includes(query)
        );
      })
      .map((m) => {
        const lastAttendance = data.attendance
          .filter((a) => a.member_id === m.id)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        return {
          ...enrichMember(m, data),
          last_attendance_date: lastAttendance?.date || null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async findMember(id) {
    const data = await readData();
    const member = data.members.find((m) => m.id === id);
    return member ? enrichMember(member, data) : null;
  },

  async createMember({ name, phone = '', email = '', type = 'member', status = 'active', notes = '', joined_at }) {
    return this.mutate((data) => {
      const member = {
        id: nextId(data, 'members'),
        name: String(name).trim(),
        phone: String(phone || '').trim(),
        email: String(email || '').trim(),
        type: String(type || 'member').trim(),
        status: String(status || 'active').trim(),
        joined_at: joined_at || todayDate(),
        notes: String(notes || '').trim(),
        created_at: nowIso(),
      };
      data.members.push(member);
      return enrichMember(member, data);
    });
  },

  async importMembers(rows, { skipDuplicates = true } = {}) {
    return this.mutate((data) => {
      const created = [];
      const skipped = [];
      const errors = [];

      for (const row of rows) {
        const name = String(row.name || '').trim();
        const line = row.line || null;
        if (!name) {
          errors.push({ line, error: 'Name is required' });
          continue;
        }
        const existing = data.members.find(
          (m) => m.name.toLowerCase() === name.toLowerCase()
        );
        if (existing && skipDuplicates) {
          skipped.push({ line, name, reason: 'Already exists' });
          continue;
        }
        const member = {
          id: nextId(data, 'members'),
          name,
          phone: String(row.phone || '').trim(),
          email: String(row.email || '').trim(),
          type: String(row.type || 'member').trim(),
          status: 'active',
          joined_at: todayDate(),
          notes: String(row.notes || '').trim(),
          created_at: nowIso(),
        };
        data.members.push(member);
        created.push(enrichMember(member, data));
      }

      return {
        ok: true,
        created,
        skipped,
        errors,
        createdCount: created.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
      };
    });
  },

  async updateMember(id, updates) {
    return this.mutate((data) => {
      const member = data.members.find((m) => m.id === id);
      if (!member) return null;
      if (updates.name !== undefined) member.name = String(updates.name).trim();
      if (updates.phone !== undefined) member.phone = String(updates.phone || '').trim();
      if (updates.email !== undefined) member.email = String(updates.email || '').trim();
      if (updates.type !== undefined) member.type = String(updates.type).trim();
      if (updates.status !== undefined) member.status = String(updates.status).trim();
      if (updates.notes !== undefined) member.notes = String(updates.notes || '').trim();
      if (updates.joined_at !== undefined) member.joined_at = updates.joined_at;
      member.updated_at = nowIso();
      return enrichMember(member, data);
    });
  },

  async deleteMember(id) {
    return this.mutate((data) => {
      const member = data.members.find((m) => m.id === id);
      if (!member) return { ok: false, error: 'Member not found' };
      data.members = data.members.filter((m) => m.id !== id);
      data.attendance = data.attendance.filter((a) => a.member_id !== id);
      data.volunteer_signups = data.volunteer_signups.filter((s) => s.member_id !== id);
      return { ok: true };
    });
  },

  async listEvents({ fromDate, toDate, status, type } = {}) {
    const data = await readData();
    return data.events
      .filter((e) => {
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        if (status && e.status !== status) return false;
        if (type && e.type !== type) return false;
        return true;
      })
      .map(enrichEvent)
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
  },

  async findEvent(id) {
    const data = await readData();
    const event = data.events.find((e) => e.id === id);
    return event ? enrichEvent(event) : null;
  },

  async createEvent(event) {
    return this.mutate((data) => {
      const item = {
        id: nextId(data, 'events'),
        title: String(event.title || '').trim(),
        date: event.date,
        start_time: String(event.start_time || '').trim(),
        end_time: String(event.end_time || '').trim(),
        location: String(event.location || '').trim(),
        description: String(event.description || '').trim(),
        type: String(event.type || 'meeting').trim(),
        status: String(event.status || 'scheduled').trim(),
        created_at: nowIso(),
      };
      data.events.push(item);
      return enrichEvent(item);
    });
  },

  async updateEvent(id, updates) {
    return this.mutate((data) => {
      const event = data.events.find((e) => e.id === id);
      if (!event) return null;
      const fields = ['title', 'date', 'start_time', 'end_time', 'location', 'description', 'type', 'status'];
      for (const field of fields) {
        if (updates[field] !== undefined) {
          event[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
        }
      }
      event.updated_at = nowIso();
      return enrichEvent(event);
    });
  },

  async deleteEvent(id) {
    return this.mutate((data) => {
      const event = data.events.find((e) => e.id === id);
      if (!event) return { ok: false, error: 'Event not found' };
      data.events = data.events.filter((e) => e.id !== id);
      data.attendance = data.attendance.map((a) =>
        a.event_id === id ? { ...a, event_id: null } : a
      );
      const slotIds = data.volunteer_slots.filter((s) => s.event_id === id).map((s) => s.id);
      data.volunteer_slots = data.volunteer_slots.filter((s) => s.event_id !== id);
      data.volunteer_signups = data.volunteer_signups.filter((s) => !slotIds.includes(s.slot_id));
      return { ok: true };
    });
  },

  async listAttendance({ date, eventId, memberId } = {}) {
    const data = await readData();
    return data.attendance
      .filter((a) => {
        if (date && a.date !== date) return false;
        if (eventId && a.event_id !== Number(eventId)) return false;
        if (memberId && a.member_id !== Number(memberId)) return false;
        return true;
      })
      .map((a) => enrichAttendance(a, data))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async findAttendance(id) {
    const data = await readData();
    const record = data.attendance.find((a) => a.id === id);
    return record ? enrichAttendance(record, data) : null;
  },

  async createAttendance(record) {
    return this.mutate((data) => {
      if (record.member_id) {
        const dup = data.attendance.find(
          (a) =>
            a.date === record.date &&
            a.member_id === record.member_id &&
            (record.event_id ? a.event_id === record.event_id : true)
        );
        if (dup) return { ok: false, error: 'Already checked in', existing: enrichAttendance(dup, data) };
      }
      const item = {
        id: nextId(data, 'attendance'),
        date: record.date,
        event_id: record.event_id || null,
        member_id: record.member_id || null,
        member_name: String(record.member_name || '').trim(),
        attendee_type: String(record.attendee_type || 'member').trim(),
        notes: String(record.notes || '').trim(),
        created_at: nowIso(),
      };
      data.attendance.push(item);
      return { ok: true, attendance: enrichAttendance(item, data) };
    });
  },

  async deleteAttendance(id) {
    return this.mutate((data) => {
      const record = data.attendance.find((a) => a.id === id);
      if (!record) return { ok: false, error: 'Attendance record not found' };
      data.attendance = data.attendance.filter((a) => a.id !== id);
      return { ok: true };
    });
  },

  async listAnnouncements({ status } = {}) {
    const data = await readData();
    return data.announcements
      .filter((a) => !status || a.status === status)
      .sort((a, b) => (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at));
  },

  async findAnnouncement(id) {
    const data = await readData();
    return data.announcements.find((a) => a.id === id) || null;
  },

  async createAnnouncement({ title, body, status = 'draft' }) {
    return this.mutate((data) => {
      const item = {
        id: nextId(data, 'announcements'),
        title: String(title || '').trim(),
        body: String(body || '').trim(),
        status: String(status || 'draft').trim(),
        published_at: status === 'published' ? nowIso() : null,
        created_at: nowIso(),
      };
      data.announcements.push(item);
      return item;
    });
  },

  async updateAnnouncement(id, updates) {
    return this.mutate((data) => {
      const item = data.announcements.find((a) => a.id === id);
      if (!item) return null;
      if (updates.title !== undefined) item.title = String(updates.title).trim();
      if (updates.body !== undefined) item.body = String(updates.body).trim();
      if (updates.status !== undefined) {
        item.status = String(updates.status).trim();
        if (item.status === 'published' && !item.published_at) {
          item.published_at = nowIso();
        }
      }
      item.updated_at = nowIso();
      return item;
    });
  },

  async deleteAnnouncement(id) {
    return this.mutate((data) => {
      const item = data.announcements.find((a) => a.id === id);
      if (!item) return { ok: false, error: 'Announcement not found' };
      data.announcements = data.announcements.filter((a) => a.id !== id);
      return { ok: true };
    });
  },

  async listVolunteerSlots(eventId) {
    const data = await readData();
    return data.volunteer_slots
      .filter((s) => s.event_id === Number(eventId))
      .map((s) => enrichVolunteerSlot(s, data));
  },

  async createVolunteerSlot({ event_id, role, needed = 1, notes = '' }) {
    return this.mutate((data) => {
      const slot = {
        id: nextId(data, 'volunteer_slots'),
        event_id: Number(event_id),
        role: String(role).trim(),
        needed: Math.max(1, Number(needed) || 1),
        notes: String(notes || '').trim(),
        created_at: nowIso(),
      };
      data.volunteer_slots.push(slot);
      return enrichVolunteerSlot(slot, data);
    });
  },

  async deleteVolunteerSlot(id) {
    return this.mutate((data) => {
      const slot = data.volunteer_slots.find((s) => s.id === id);
      if (!slot) return { ok: false, error: 'Volunteer slot not found' };
      data.volunteer_slots = data.volunteer_slots.filter((s) => s.id !== id);
      data.volunteer_signups = data.volunteer_signups.filter((s) => s.slot_id !== id);
      return { ok: true };
    });
  },

  async createVolunteerSignup({ slot_id, member_id, member_name }) {
    return this.mutate((data) => {
      const slot = data.volunteer_slots.find((s) => s.id === Number(slot_id));
      if (!slot) return { ok: false, error: 'Volunteer slot not found' };
      const existing = data.volunteer_signups.find(
        (s) => s.slot_id === slot.id && s.member_id === Number(member_id)
      );
      if (existing) return { ok: false, error: 'Member already signed up for this slot' };
      const filled = data.volunteer_signups.filter((s) => s.slot_id === slot.id).length;
      if (filled >= slot.needed) return { ok: false, error: 'Slot is full' };
      const signup = {
        id: nextId(data, 'volunteer_signups'),
        slot_id: slot.id,
        member_id: Number(member_id),
        member_name: String(member_name || '').trim(),
        created_at: nowIso(),
      };
      data.volunteer_signups.push(signup);
      return { ok: true, signup, slot: enrichVolunteerSlot(slot, data) };
    });
  },

  async deleteVolunteerSignup(id) {
    return this.mutate((data) => {
      const signup = data.volunteer_signups.find((s) => s.id === id);
      if (!signup) return { ok: false, error: 'Signup not found' };
      data.volunteer_signups = data.volunteer_signups.filter((s) => s.id !== id);
      return { ok: true };
    });
  },

  async exportBackup() {
    return readData();
  },
};
