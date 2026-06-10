import { contactDisplay, friendlyDate, formatTime12 } from './helpers.js';

function pickRandom(items) {
  if (!items?.length) return '';
  return items[Math.floor(Math.random() * items.length)];
}

function fillTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

function templateVars(settings, context = {}) {
  const contact = contactDisplay(settings);
  return {
    clubName: settings?.clubName || 'our club',
    memberName: context.memberName || '',
    eventTitle: context.eventTitle || '',
    eventDate: context.eventDate ? friendlyDate(context.eventDate) : '',
    eventTime: context.eventTime ? formatTime12(context.eventTime) : '',
    location: context.location || settings?.location || '',
    contact,
    body: context.body || '',
    announcementTitle: context.announcementTitle || '',
    volunteerRoles: context.volunteerRoles || '',
  };
}

function buildFromParts(intros, bodyLines, closings, vars) {
  const lines = [];
  const intro = pickRandom(intros);
  if (intro) lines.push(fillTemplate(intro, vars));
  if (bodyLines.length) {
    if (lines.length) lines.push('');
    lines.push(...bodyLines);
  }
  const closing = pickRandom(closings);
  if (closing) {
    if (lines.length) lines.push('');
    lines.push(fillTemplate(closing, vars));
  }
  return lines.join('\n').trim();
}

export function buildShareMessage(kind, settings, context = {}) {
  const templates = settings?.shareTemplates || {};
  const vars = templateVars(settings, context);

  switch (kind) {
    case 'welcome_member':
      return buildFromParts(
        templates.welcomeMemberIntros || ['Welcome to {clubName}, {memberName}! 🐣'],
        [
          "We're glad to have you in the community.",
          vars.location ? `We meet at ${vars.location}.` : '',
        ].filter(Boolean),
        templates.welcomeMemberClosings || [
          'See you at our next meeting!',
          'Questions? Reach us at {contact}.',
        ],
        vars
      );

    case 'welcome_visitor':
      return buildFromParts(
        templates.welcomeVisitorIntros || ['Welcome, {memberName}! Thanks for visiting {clubName} today. 🐣'],
        ['Hope you enjoyed the session!'],
        templates.welcomeVisitorClosings || [
          "Come back anytime — we'd love to see you again!",
          'Want to join? Message us at {contact}.',
        ],
        vars
      );

    case 'event_promo':
      return buildFromParts(
        templates.eventPromoIntros || ['📅 Upcoming at {clubName}:'],
        [
          `**${vars.eventTitle}**`,
          vars.eventDate ? `When: ${vars.eventDate}${vars.eventTime ? ` at ${vars.eventTime}` : ''}` : '',
          vars.location ? `Where: ${vars.location}` : '',
          context.description ? String(context.description).trim() : '',
        ].filter(Boolean),
        templates.eventPromoClosings || [
          'All skill levels welcome! Questions? {contact}',
          'Hope to see you there! 🙌',
        ],
        vars
      );

    case 'announcement':
      return buildFromParts(
        templates.announcementIntros || ['📢 {clubName} update:'],
        [
          vars.announcementTitle ? `**${vars.announcementTitle}**` : '',
          vars.body,
        ].filter(Boolean),
        templates.announcementClosings || ['— {clubName}'],
        vars
      );

    case 'volunteer_call':
      return buildFromParts(
        templates.volunteerCallIntros || ['🙋 Volunteer help needed at {clubName}!'],
        [
          vars.eventTitle ? `Event: ${vars.eventTitle}` : '',
          vars.eventDate ? `Date: ${vars.eventDate}` : '',
          vars.volunteerRoles ? `Open roles: ${vars.volunteerRoles}` : '',
        ].filter(Boolean),
        templates.volunteerCallClosings || [
          'Can you help? Reply or message {contact}. Thank you! 🙏',
        ],
        vars
      );

    default:
      return '';
  }
}
