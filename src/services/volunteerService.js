import { volunteerRoleLabel } from '../lib/helpers.js';
import { store } from '../store/dataStore.js';

export async function getEventVolunteers(eventId) {
  const slots = await store.listVolunteerSlots(eventId);
  const openRoles = slots
    .filter((s) => s.open > 0)
    .map((s) => `${s.role_label} (${s.open} open)`);
  return { slots, openRoles };
}

export async function getVolunteerCallContext(eventId) {
  const data = await store.read();
  const event = data.events.find((e) => e.id === Number(eventId));
  if (!event) return null;
  const slots = await store.listVolunteerSlots(eventId);
  const openRoles = slots
    .filter((s) => s.open > 0)
    .map((s) => `${volunteerRoleLabel(data.settings, s.role)} (${s.open})`)
    .join(', ');
  return {
    eventTitle: event.title,
    eventDate: event.date,
    eventTime: event.start_time,
    location: event.location || data.settings.location,
    volunteerRoles: openRoles,
  };
}
