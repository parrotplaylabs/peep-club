import { enrichSettings, todayDate } from '../lib/helpers.js';
import { requireCsrf } from '../middleware/csrf.js';
import { getAnalytics } from '../services/analyticsService.js';
import {
  addVisitorCheckIn,
  getAttendanceForDate,
  toggleMemberCheckIn,
} from '../services/attendanceService.js';
import { isAuthenticated, isPinRequired, verifyPin } from '../services/authService.js';
import { getDashboardStats } from '../services/dashboardService.js';
import { getEventDetail } from '../services/eventService.js';
import { importMembersFromCsv } from '../services/memberService.js';
import { previewShareMessage } from '../services/shareService.js';
import { buildSeedData } from '../lib/seedData.js';
import { destroySession } from '../server/session.js';
import { Router } from '../server/router.js';
import { config } from '../config.js';
import { store } from '../store/dataStore.js';

const router = new Router();

function publicConfig(req) {
  return {
    appName: config.appName,
    pinRequired: isPinRequired(),
    authenticated: isAuthenticated(req),
    csrfToken: req.session.csrfToken || '',
    settings: null,
  };
}

function requireAuth(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'PIN required. Please unlock the system.' });
  }
}

function guardPost(req, res) {
  if (isPinRequired()) requireCsrf(req, res);
  requireAuth(req, res);
}

router.get('/api/health', async (req, res) => {
  res.json({
    ok: true,
    app: config.appName,
    env: config.appEnv,
    railway: config.isRailway,
    dataPath: config.dataPath,
    volumeMount: process.env.RAILWAY_VOLUME_MOUNT_PATH || null,
    pinRequired: isPinRequired(),
  });
});

router.get('/api/config', async (req, res) => {
  const settings = await store.getSettings();
  res.json({ ...publicConfig(req), settings });
});

router.post('/api/auth/login', async (req, res) => {
  if (!isPinRequired()) {
    req.session.authenticated = true;
    return res.json({ ok: true, authenticated: true, csrfToken: req.session.csrfToken });
  }
  if (isPinRequired()) requireCsrf(req, res);
  if (res.ended) return;

  const pin = String(req.body.pin || '');
  const valid = await verifyPin(pin);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  req.session.authenticated = true;
  res.json({ ok: true, authenticated: true, csrfToken: req.session.csrfToken });
});

router.post('/api/auth/logout', async (req, res) => {
  if (isPinRequired()) requireCsrf(req, res);
  if (res.ended) return;
  destroySession(req, res);
  res.json({ ok: true, authenticated: false });
});

router.get('/api/dashboard', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const stats = await getDashboardStats();
  res.json(stats);
});

router.get('/api/analytics', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const analytics = await getAnalytics({ range: req.query.range || '30d' });
  res.json(analytics);
});

router.get('/api/members', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const members = await store.listMembers(req.query.q || '', {
    type: req.query.type || undefined,
    status: req.query.status || undefined,
  });
  res.json({ members });
});

router.post('/api/members', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const member = await store.createMember(req.body);
  res.json({ member });
});

router.post('/api/members/import', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const csv = String(req.body.csv || req.body.text || '').trim();
  if (!csv) return res.status(400).json({ error: 'CSV data is required' });
  const result = await importMembersFromCsv(csv, {
    skipDuplicates: req.body.skip_duplicates !== false,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result);
});

router.post('/api/members/:id/update', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const id = Number(req.params.id);
  const member = await store.updateMember(id, req.body);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  res.json({ member });
});

router.post('/api/members/:id/delete', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const id = Number(req.params.id);
  const result = await store.deleteMember(id);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result);
});

router.get('/api/events', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const events = await store.listEvents({
    fromDate: req.query.from || undefined,
    toDate: req.query.to || undefined,
    status: req.query.status || undefined,
    type: req.query.type || undefined,
  });
  res.json({ events });
});

router.get('/api/events/:id', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const detail = await getEventDetail(Number(req.params.id));
  if (!detail) return res.status(404).json({ error: 'Event not found' });
  res.json(detail);
});

router.post('/api/events', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const title = String(req.body.title || '').trim();
  const date = String(req.body.date || '').trim();
  if (!title || !date) return res.status(400).json({ error: 'Title and date are required' });
  const event = await store.createEvent(req.body);
  res.json({ event });
});

router.post('/api/events/:id/update', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const event = await store.updateEvent(Number(req.params.id), req.body);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({ event });
});

router.post('/api/events/:id/delete', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const result = await store.deleteEvent(Number(req.params.id));
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

router.get('/api/events/:id/volunteers', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const slots = await store.listVolunteerSlots(Number(req.params.id));
  res.json({ slots });
});

router.post('/api/events/:id/volunteers', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const role = String(req.body.role || '').trim();
  if (!role) return res.status(400).json({ error: 'Role is required' });
  const slot = await store.createVolunteerSlot({
    event_id: Number(req.params.id),
    role,
    needed: req.body.needed,
    notes: req.body.notes,
  });
  res.json({ slot });
});

router.post('/api/volunteer-slots/:id/delete', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const result = await store.deleteVolunteerSlot(Number(req.params.id));
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

router.post('/api/volunteer-slots/:id/signup', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const member_id = Number(req.body.member_id);
  if (!member_id) return res.status(400).json({ error: 'Member is required' });
  const member = await store.findMember(member_id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  const result = await store.createVolunteerSignup({
    slot_id: Number(req.params.id),
    member_id,
    member_name: member.name,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result);
});

router.post('/api/volunteer-signups/:id/delete', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const result = await store.deleteVolunteerSignup(Number(req.params.id));
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

router.get('/api/attendance', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const date = req.query.date || todayDate();
  const eventId = req.query.event_id ? Number(req.query.event_id) : null;
  const sheet = await getAttendanceForDate(date, eventId);
  const eventsOnDate = (await store.listEvents({ fromDate: date, toDate: date })).filter(
    (e) => e.status !== 'cancelled'
  );
  res.json({ ...sheet, eventsOnDate });
});

router.post('/api/attendance/toggle', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const date = String(req.body.date || todayDate()).trim();
  const member_id = Number(req.body.member_id);
  if (!member_id) return res.status(400).json({ error: 'Member is required' });
  const result = await toggleMemberCheckIn({
    date,
    member_id,
    event_id: req.body.event_id ? Number(req.body.event_id) : null,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result);
});

router.post('/api/attendance/visitor', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const result = await addVisitorCheckIn({
    date: String(req.body.date || todayDate()).trim(),
    member_name: req.body.member_name,
    event_id: req.body.event_id ? Number(req.body.event_id) : null,
    notes: req.body.notes,
  });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result);
});

router.post('/api/attendance/:id/delete', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const result = await store.deleteAttendance(Number(req.params.id));
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

router.get('/api/announcements', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const announcements = await store.listAnnouncements({
    status: req.query.status || undefined,
  });
  res.json({ announcements });
});

router.post('/api/announcements', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const announcement = await store.createAnnouncement(req.body);
  res.json({ announcement });
});

router.post('/api/announcements/:id/update', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const announcement = await store.updateAnnouncement(Number(req.params.id), req.body);
  if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
  res.json({ announcement });
});

router.post('/api/announcements/:id/delete', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const result = await store.deleteAnnouncement(Number(req.params.id));
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

router.post('/api/share/preview', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const kind = String(req.body.kind || '').trim();
  if (!kind) return res.status(400).json({ error: 'Share kind is required' });
  const preview = await previewShareMessage(kind, req.body.context || {});
  res.json(preview);
});

router.get('/api/export/backup', async (req, res) => {
  requireAuth(req, res);
  if (res.ended) return;
  const data = await store.exportBackup();
  res.headers['Content-Type'] = 'application/json';
  res.headers['Content-Disposition'] = `attachment; filename="peep-club-backup-${todayDate()}.json"`;
  res.end(JSON.stringify(data, null, 2));
});

router.post('/api/import/backup', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const payload = req.body;
  if (!payload || !payload.settings || !Array.isArray(payload.members)) {
    return res.status(400).json({ error: 'Invalid backup file' });
  }
  await store.replaceAll(payload);
  res.json({ ok: true });
});

router.post('/api/reset/reseed', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  const seedData = buildSeedData();
  await store.replaceAll(seedData);
  res.json({
    ok: true,
    message: 'Data reset to sample seed.',
    settings: enrichSettings(seedData.settings),
  });
});

router.post('/api/settings/update', async (req, res) => {
  guardPost(req, res);
  if (res.ended) return;
  try {
    const settings = await store.updateSettings(req.body);
    res.json({ settings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
