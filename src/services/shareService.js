import { buildShareMessage } from '../lib/share.js';
import { getVolunteerCallContext } from './volunteerService.js';
import { store } from '../store/dataStore.js';

export async function previewShareMessage(kind, context = {}) {
  const settings = await store.getSettings();

  if (kind === 'volunteer_call' && context.eventId) {
    const volunteerContext = await getVolunteerCallContext(context.eventId);
    if (volunteerContext) {
      context = { ...context, ...volunteerContext };
    }
  }

  if (kind === 'event_promo' && context.eventId) {
    const event = await store.findEvent(Number(context.eventId));
    if (event) {
      context = {
        ...context,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.start_time,
        location: event.location || settings.location,
        description: event.description,
      };
    }
  }

  if (kind === 'announcement' && context.announcementId) {
    const announcement = await store.findAnnouncement(Number(context.announcementId));
    if (announcement) {
      context = {
        ...context,
        announcementTitle: announcement.title,
        body: announcement.body,
      };
    }
  }

  if (kind === 'welcome_member' && context.memberId) {
    const member = await store.findMember(Number(context.memberId));
    if (member) {
      context = { ...context, memberName: member.name };
    }
  }

  const text = buildShareMessage(kind, settings, context);
  return { text, kind };
}
