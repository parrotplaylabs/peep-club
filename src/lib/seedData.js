import { addDays, nowIso, todayDate } from './helpers.js';
import { DEFAULT_SETTINGS } from '../store/dataStore.js';

export function buildSeedData() {
  const today = todayDate();
  const lastWeek = addDays(today, -7);
  const twoWeeksAgo = addDays(today, -14);
  const nextWeek = addDays(today, 7);
  const inTwoWeeks = addDays(today, 14);

  const settings = {
    ...DEFAULT_SETTINGS,
    clubName: 'Riverbend Chess & Board Games Club',
    contactPhone: '555-0142',
    contactEmail: 'hello@riverbendclub.example',
    location: 'Community Center, Room 3B',
    meetingDay: 'tuesday',
    meetingTime: '18:30',
    clubType: 'board_games',
  };

  const members = [
    { id: 1, name: 'Alex Kim', phone: '555-0101', email: 'alex@example.com', type: 'member', status: 'active', joined_at: '2024-09-01', notes: 'Chess captain', created_at: nowIso() },
    { id: 2, name: 'Jordan Lee', phone: '555-0102', email: '', type: 'member', status: 'active', joined_at: '2024-10-15', notes: 'Speedcubing enthusiast', created_at: nowIso() },
    { id: 3, name: 'Sam Rivera', phone: '555-0103', email: 'sam@example.com', type: 'member', status: 'active', joined_at: '2025-01-08', notes: 'Weekly regular', created_at: nowIso() },
    { id: 4, name: 'Taylor Brooks', phone: '', email: '', type: 'member', status: 'active', joined_at: '2025-02-20', notes: 'Board games', created_at: nowIso() },
    { id: 5, name: 'Morgan Chen', phone: '555-0105', email: '', type: 'member', status: 'active', joined_at: '2024-11-03', notes: 'Go player', created_at: nowIso() },
    { id: 6, name: 'Casey Walsh', phone: '555-0106', email: '', type: 'member', status: 'inactive', joined_at: '2024-06-12', notes: 'On break', created_at: nowIso() },
    { id: 7, name: 'Riley Park', phone: '', email: 'riley@example.com', type: 'member', status: 'active', joined_at: '2025-03-01', notes: '', created_at: nowIso() },
    { id: 8, name: 'Jamie Ortiz', phone: '555-0108', email: '', type: 'member', status: 'active', joined_at: '2024-12-18', notes: 'Volunteer coordinator', created_at: nowIso() },
    { id: 9, name: 'Pat Nguyen', phone: '', email: '', type: 'visitor', status: 'active', joined_at: today, notes: 'First visit today', created_at: nowIso() },
    { id: 10, name: 'Drew Ellis', phone: '555-0110', email: '', type: 'alumni', status: 'active', joined_at: '2023-05-01', notes: 'Moved away', created_at: nowIso() },
    { id: 11, name: 'Quinn Adams', phone: '555-0111', email: 'quinn@example.com', type: 'member', status: 'active', joined_at: '2025-04-10', notes: 'Robotics crossover', created_at: nowIso() },
    { id: 12, name: 'Skyler Moss', phone: '', email: '', type: 'member', status: 'active', joined_at: '2025-05-02', notes: '', created_at: nowIso() },
  ];

  const events = [
    {
      id: 1,
      title: 'Weekly Club Night',
      date: today,
      start_time: '18:30',
      end_time: '21:00',
      location: 'Community Center, Room 3B',
      description: 'Open play — chess, board games, and cubing tables.',
      type: 'meeting',
      status: 'scheduled',
      created_at: nowIso(),
    },
    {
      id: 2,
      title: 'Spring Mini Tournament',
      date: nextWeek,
      start_time: '10:00',
      end_time: '16:00',
      location: 'Community Center, Room 3B',
      description: 'Swiss-style chess tournament. All ages welcome.',
      type: 'tournament',
      status: 'scheduled',
      created_at: nowIso(),
    },
    {
      id: 3,
      title: 'Family Game Night',
      date: inTwoWeeks,
      start_time: '17:00',
      end_time: '20:00',
      location: 'Community Center, Room 3B',
      description: 'Bring your favorite board game to share!',
      type: 'social',
      status: 'scheduled',
      created_at: nowIso(),
    },
    {
      id: 4,
      title: 'Club Night',
      date: lastWeek,
      start_time: '18:30',
      end_time: '21:00',
      location: 'Community Center, Room 3B',
      description: '',
      type: 'meeting',
      status: 'completed',
      created_at: nowIso(),
    },
  ];

  const attendance = [
    { id: 1, date: twoWeeksAgo, event_id: null, member_id: 1, member_name: 'Alex Kim', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 2, date: twoWeeksAgo, event_id: null, member_id: 2, member_name: 'Jordan Lee', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 3, date: twoWeeksAgo, event_id: null, member_id: 3, member_name: 'Sam Rivera', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 4, date: lastWeek, event_id: 4, member_id: 1, member_name: 'Alex Kim', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 5, date: lastWeek, event_id: 4, member_id: 4, member_name: 'Taylor Brooks', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 6, date: lastWeek, event_id: 4, member_id: 5, member_name: 'Morgan Chen', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 7, date: lastWeek, event_id: 4, member_id: 8, member_name: 'Jamie Ortiz', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 8, date: lastWeek, event_id: 4, member_id: null, member_name: 'Guest Player', attendee_type: 'visitor', notes: 'Walk-in', created_at: nowIso() },
    { id: 9, date: today, event_id: 1, member_id: 1, member_name: 'Alex Kim', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 10, date: today, event_id: 1, member_id: 3, member_name: 'Sam Rivera', attendee_type: 'member', notes: '', created_at: nowIso() },
    { id: 11, date: today, event_id: 1, member_id: 7, member_name: 'Riley Park', attendee_type: 'member', notes: '', created_at: nowIso() },
  ];

  const announcements = [
    {
      id: 1,
      title: 'Tournament sign-ups open',
      body: 'Spring Mini Tournament spots are open! Reply if you want to play. Beginners welcome.',
      status: 'published',
      published_at: addDays(today, -2) + 'T10:00:00.000Z',
      created_at: nowIso(),
    },
    {
      id: 2,
      title: 'New board game donation',
      body: 'Thanks to Taylor for donating Catan and Ticket to Ride — now in the club library!',
      status: 'published',
      published_at: addDays(today, -5) + 'T10:00:00.000Z',
      created_at: nowIso(),
    },
    {
      id: 3,
      title: 'Summer schedule draft',
      body: 'Planning shorter summer meetings — feedback welcome at the next club night.',
      status: 'draft',
      published_at: null,
      created_at: nowIso(),
    },
  ];

  const volunteer_slots = [
    { id: 1, event_id: 2, role: 'setup', needed: 2, notes: 'Tables and boards', created_at: nowIso() },
    { id: 2, event_id: 2, role: 'registration', needed: 1, notes: 'Check-in desk', created_at: nowIso() },
    { id: 3, event_id: 2, role: 'timer', needed: 1, notes: 'Chess clocks', created_at: nowIso() },
    { id: 4, event_id: 2, role: 'snacks', needed: 1, notes: '', created_at: nowIso() },
  ];

  const volunteer_signups = [
    { id: 1, slot_id: 1, member_id: 8, member_name: 'Jamie Ortiz', created_at: nowIso() },
    { id: 2, slot_id: 2, member_id: 3, member_name: 'Sam Rivera', created_at: nowIso() },
    { id: 3, slot_id: 3, member_id: 1, member_name: 'Alex Kim', created_at: nowIso() },
  ];

  return {
    meta: {
      nextId: {
        members: 13,
        events: 5,
        attendance: 12,
        announcements: 4,
        volunteer_slots: 5,
        volunteer_signups: 4,
      },
    },
    settings,
    members,
    events,
    attendance,
    announcements,
    volunteer_slots,
    volunteer_signups,
  };
}
