import { addDays, todayDate } from '../lib/helpers.js';
import { store } from '../store/dataStore.js';

export async function listUpcomingEvents({ days = 30 } = {}) {
  const today = todayDate();
  const end = addDays(today, days);
  return store.listEvents({ fromDate: today, toDate: end, status: 'scheduled' });
}

export async function getEventDetail(id) {
  const event = await store.findEvent(id);
  if (!event) return null;
  const slots = await store.listVolunteerSlots(id);
  return { event, volunteerSlots: slots };
}
