-- Seed only immutable forum catalog fields. Membership counts are derived from
-- forum_memberships at read time; no demo posts or synthetic users are added.
insert into forums (id, title, category, description, icon, path_id)
values
    ('path-consulting', 'The Consulting Circuit', 'Path', 'Project seasons, client games, monetizing what you know.', 'Timer', 'consulting'),
    ('path-nine_to_five', 'Corporate Athletes', 'Path', 'Life in the 9–5. Scoreboards look different here.', 'Briefcase', 'nine_to_five'),
    ('path-entrepreneurship', 'Founders', 'Path', 'The new jersey says owner. Reality-testing welcome.', 'Rocket', 'entrepreneurship'),
    ('path-gig', 'Gig Life', 'Path', 'Income now, structure you build yourself.', 'DollarSign', 'gig'),
    ('path-overnight', 'Night Shift', 'Path', 'For the ones wired for odd hours. A bridge, not a dead end.', 'Moon', 'overnight'),
    ('local-davis-soccer', 'UC Davis - Pick-up Soccer', 'Local', 'Casual games, zero tryouts.', 'MapPin', null),
    ('local-nyc-swimmers', 'Former Swimmers in NYC', 'Local', 'Lane mates turned city network.', 'MapPin', null),
    ('support-acl', 'ACL Recovery Support', 'Support', 'Rehab is a season too.', 'ShieldAlert', null),
    ('support-stories', 'Transition Stories', 'Support', 'How you got through it — or how you are.', 'Trophy', null)
on conflict (id) do update set
    title = excluded.title,
    category = excluded.category,
    description = excluded.description,
    icon = excluded.icon,
    path_id = excluded.path_id,
    updated_at = now();
