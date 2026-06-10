import { addDays, todayDate } from '../lib/helpers.js';
import { store } from '../store/dataStore.js';

export async function getAnalytics({ range = '30d' } = {}) {
  const data = await store.read();
  const today = todayDate();
  const days = range === '90d' ? 90 : range === '7d' ? 7 : 30;
  const startDate = addDays(today, -days);

  const members = data.members;
  const activeMembers = members.filter((m) => m.status === 'active' && m.type === 'member');
  const visitors = members.filter((m) => m.type === 'visitor');
  const alumni = members.filter((m) => m.type === 'alumni');

  const attendanceInRange = data.attendance.filter(
    (a) => a.date >= startDate && a.date <= today
  );

  const weeklyAttendance = [];
  for (let i = 0; i < Math.min(8, Math.ceil(days / 7)); i++) {
    const weekEnd = addDays(today, -i * 7);
    const weekStart = addDays(weekEnd, -6);
    const count = data.attendance.filter(
      (a) => a.date >= weekStart && a.date <= weekEnd
    ).length;
    weeklyAttendance.unshift({ weekStart, weekEnd, count });
  }

  const eventAttendance = {};
  for (const record of attendanceInRange) {
    if (record.event_id) {
      eventAttendance[record.event_id] = (eventAttendance[record.event_id] || 0) + 1;
    }
  }

  const topEvents = Object.entries(eventAttendance)
    .map(([eventId, count]) => {
      const event = data.events.find((e) => e.id === Number(eventId));
      return { event_id: Number(eventId), title: event?.title || 'Event', count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalSlots = data.volunteer_slots.length;
  const totalNeeded = data.volunteer_slots.reduce((sum, s) => sum + (s.needed || 1), 0);
  const totalFilled = data.volunteer_signups.length;
  const volunteerCoverage =
    totalNeeded > 0 ? Math.round((totalFilled / totalNeeded) * 100) : null;

  const newMembersInRange = members.filter(
    (m) => m.joined_at && m.joined_at >= startDate
  ).length;

  return {
    range,
    startDate,
    endDate: today,
    memberCounts: {
      total: members.length,
      active: activeMembers.length,
      visitors: visitors.length,
      alumni: alumni.length,
      newInRange: newMembersInRange,
    },
    attendance: {
      totalInRange: attendanceInRange.length,
      uniqueDates: new Set(attendanceInRange.map((a) => a.date)).size,
      weekly: weeklyAttendance,
    },
    events: {
      scheduled: data.events.filter((e) => e.status === 'scheduled').length,
      completed: data.events.filter((e) => e.status === 'completed').length,
      topByAttendance: topEvents,
    },
    volunteers: {
      totalSlots,
      totalNeeded,
      totalFilled,
      coveragePercent: volunteerCoverage,
    },
    announcements: {
      published: data.announcements.filter((a) => a.status === 'published').length,
      draft: data.announcements.filter((a) => a.status === 'draft').length,
    },
  };
}
