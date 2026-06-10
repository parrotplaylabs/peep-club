import { store } from '../store/dataStore.js';

export async function publishAnnouncement(id) {
  return store.updateAnnouncement(id, { status: 'published' });
}
