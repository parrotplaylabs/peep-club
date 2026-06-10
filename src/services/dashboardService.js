import { addDays, todayDate } from '../lib/helpers.js';
import { store } from '../store/dataStore.js';

export async function getDashboardStats() {
  const data = await store.read();
  const today = todayDate();
  const weekEnd = addDays(today, 7);

  const todayAttendance = data.attendance.filter((a) => a.date === today);
  const todayEvents = data.events.filter(
    (e) => e.date === today && e.status !== 'cancelled'
  );
  const upcomingEvents = data.events
    .filter((e) => e.date > today && e.date <= weekEnd && e.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date));

  const activeMembers = data.members.filter(
    (m) => m.status === 'active' && m.type === 'member'
  );

  const recentAnnouncements = data.announcements
    .filter((a) => a.status === 'published')
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
    .slice(0, 3);

  const openVolunteerSlots = data.volunteer_slots.reduce((sum, slot) => {
    const filled = data.volunteer_signups.filter((s) => s.slot_id === slot.id).length;
    return sum + Math.max(0, (slot.needed || 1) - filled);
  }, 0);

  return {
    today,
    memberCount: activeMembers.length,
    todayAttendanceCount: todayAttendance.length,
    todayEvents,
    upcomingEvents,
    recentAnnouncements,
    openVolunteerSlots,
    settings: {
      clubName: data.settings.clubName,
      meetingDay: data.settings.meetingDay,
      meetingTime: data.settings.meetingTime,
      location: data.settings.location,
    },
  };
}
