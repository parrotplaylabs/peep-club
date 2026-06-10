import { todayDate } from '../lib/helpers.js';
import { store } from '../store/dataStore.js';

export async function getAttendanceForDate(date = todayDate(), eventId = null) {
  const data = await store.read();
  const members = await store.listMembers('', { status: 'active' });
  const attendance = await store.listAttendance({
    date,
    eventId: eventId || undefined,
  });
  const checkedIds = new Set(
    attendance.filter((a) => a.member_id).map((a) => a.member_id)
  );
  return {
    date,
    eventId: eventId || null,
    members: members.map((m) => ({
      ...m,
      checked_in: checkedIds.has(m.id),
      attendance_id: attendance.find((a) => a.member_id === m.id)?.id || null,
    })),
    visitors: attendance.filter((a) => a.attendee_type === 'visitor'),
    total: attendance.length,
  };
}

export async function toggleMemberCheckIn({ date, member_id, event_id }) {
  const data = await store.read();
  const member = data.members.find((m) => m.id === Number(member_id));
  if (!member) return { ok: false, error: 'Member not found' };

  const existing = data.attendance.find(
    (a) =>
      a.date === date &&
      a.member_id === member.id &&
      (event_id ? a.event_id === Number(event_id) : true)
  );

  if (existing) {
    const result = await store.deleteAttendance(existing.id);
    return { ok: true, checked_in: false, ...result };
  }

  const result = await store.createAttendance({
    date,
    event_id: event_id || null,
    member_id: member.id,
    member_name: member.name,
    attendee_type: member.type === 'visitor' ? 'visitor' : 'member',
  });
  if (!result.ok) return result;
  return { ok: true, checked_in: true, attendance: result.attendance };
}

export async function addVisitorCheckIn({ date, member_name, event_id, notes = '' }) {
  const name = String(member_name || '').trim();
  if (!name) return { ok: false, error: 'Visitor name is required' };
  return store.createAttendance({
    date,
    event_id: event_id || null,
    member_id: null,
    member_name: name,
    attendee_type: 'visitor',
    notes,
  });
}
