-- ============================================================================
-- Default seed data — 10 templates (FOLLOW_UP + NEW_EMAIL × Mon–Fri).
-- Uses INSERT IGNORE so admin edits are NEVER overwritten on re-run/reboot.
-- Variables available: {{name}} and {{email}}
-- ============================================================================

USE `gmail_followup_automation`;

INSERT IGNORE INTO `email_templates` (`template_type`, `day_of_week`, `subject`, `body`) VALUES
-- ─── FOLLOW-UP TEMPLATES ────────────────────────────────────────────────────
('FOLLOW_UP', 'Monday',
 'Monday Follow-up',
 'Hi {{name}},\n\nI wanted to follow up regarding our previous conversation.\n\nPlease let me know if you have any updates.\n\nThank you.'),
('FOLLOW_UP', 'Tuesday',
 'Tuesday Follow-up',
 'Hi {{name}},\n\nI hope you are doing well.\n\nI wanted to check back on our previous conversation and see if you had a chance to think it over.\n\nLooking forward to your response.\n\nBest regards.'),
('FOLLOW_UP', 'Wednesday',
 'Wednesday Follow-up',
 'Hi {{name}},\n\nFollowing up again on our previous conversation.\n\nIf there is anything blocking your decision, I would be happy to help clarify.\n\nThank you for your time.'),
('FOLLOW_UP', 'Thursday',
 'Thursday Follow-up',
 'Hi {{name}},\n\nI wanted to circle back on our previous conversation.\n\nPlease let me know a convenient time to connect, or feel free to reply with any questions.\n\nWarm regards.'),
('FOLLOW_UP', 'Friday',
 'Friday Follow-up',
 'Hi {{name}},\n\nAs the week comes to a close, I wanted to gently follow up on our previous conversation.\n\nHave a great weekend, and I look forward to hearing from you.\n\nRegards.'),
-- ─── NEW EMAIL TEMPLATES ────────────────────────────────────────────────────
('NEW_EMAIL', 'Monday',
 'Introduction',
 'Hi {{name}},\n\nI wanted to reach out and introduce our services.\n\nPlease let me know if you would be interested in discussing this further.\n\nRegards.'),
('NEW_EMAIL', 'Tuesday',
 'Introduction — Let''s Connect',
 'Hi {{name}},\n\nI am reaching out to introduce our services and how we may be able to help you.\n\nWould you be open to a brief conversation this week?\n\nBest regards.'),
('NEW_EMAIL', 'Wednesday',
 'Hello From Our Team',
 'Hi {{name}},\n\nI wanted to introduce our company and the value we bring to partners like you.\n\nI would love to hear about your current priorities and see if there is a fit.\n\nKind regards.'),
('NEW_EMAIL', 'Thursday',
 'Quick Introduction',
 'Hi {{name}},\n\nI am reaching out to briefly introduce our services, which may be relevant for you.\n\nIf this sounds interesting, I will gladly share more details.\n\nThanks.'),
('NEW_EMAIL', 'Friday',
 'Introduction Before the Weekend',
 'Hi {{name}},\n\nI wanted to briefly introduce our services as this week wraps up.\n\nFeel free to reply with any questions — I will get back to you right away.\n\nRegards.');
