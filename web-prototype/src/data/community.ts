import { MapPin, Trophy, ShieldAlert, Briefcase, DollarSign, Timer, Moon, Rocket, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* Icon-name resolver — the backend serializes icons as strings; the client
 * maps them back to lucide components here. Add a new icon to this table. */
export const ICONS: Record<string, LucideIcon> = {
  MapPin, Trophy, ShieldAlert, Briefcase, DollarSign, Timer, Moon, Rocket, MessageSquare,
};
export const iconFor = (name: string): LucideIcon => ICONS[name] ?? MessageSquare;
import { WORK_PATHS } from './paths';

/*
 * COMMUNITY DATA — placeholder content (REDESIGN_BRIEF §4).
 * Path forums are DERIVED from the WORK_PATHS registry: adding a path in
 * paths.ts automatically creates its forum here. Other forums (Local /
 * Sport / Support) are standalone entries below.
 */

export type ForumCategory = 'Local' | 'Sport' | 'Support' | 'Path';

export interface ForumThread {
  id: string;
  title: string;
  category: ForumCategory;
  memberCount: number;
  activeNow: number;
  icon: LucideIcon;
  description: string;
  pathId?: string; // set for Path forums — links back to the work path
}

/* Derived: one forum per work path */
const pathForums: ForumThread[] = WORK_PATHS.map((path) => ({
  id: `path-${path.id}`,
  title: path.forum.title,
  category: 'Path',
  memberCount: path.forum.memberCount,
  activeNow: path.forum.activeNow,
  icon: path.icon,
  description: path.forum.description,
  pathId: path.id,
}));

/* Standalone forums */
const communityForums: ForumThread[] = [
  { id: 'local-davis-soccer', title: 'UC Davis - Pick-up Soccer', category: 'Local', memberCount: 42, activeNow: 5, icon: MapPin, description: 'Casual games, zero tryouts.' },
  { id: 'local-nyc-swimmers', title: 'Former Swimmers in NYC', category: 'Local', memberCount: 128, activeNow: 12, icon: MapPin, description: 'Lane mates turned city network.' },
  { id: 'support-acl', title: 'ACL Recovery Support', category: 'Support', memberCount: 890, activeNow: 45, icon: ShieldAlert, description: 'Rehab is a season too.' },
  { id: 'support-stories', title: 'Transition Stories', category: 'Support', memberCount: 1500, activeNow: 76, icon: Trophy, description: 'How you got through it — or how you are.' },
];

export const FORUMS: ForumThread[] = [...pathForums, ...communityForums];
export const getForum = (id: string | undefined) => FORUMS.find((f) => f.id === id);

/* Category display order for the directory */
export const FORUM_CATEGORIES: { id: ForumCategory; label: string }[] = [
  { id: 'Path', label: 'Work Paths' },
  { id: 'Support', label: 'Support' },
  { id: 'Local', label: 'Local' },
  { id: 'Sport', label: 'Sport' },
];

export type PostFlair = 'WIN' | 'VENT' | 'QUESTION' | 'RESOURCE' | 'MILESTONE';

export interface ForumPost {
  id: string;
  threadId: string;
  author: string;
  flair: PostFlair;
  title: string;
  body: string;
  upvotes: number;
  commentCount: number;
  timeAgo: string;
}

export interface ForumComment {
  id: string;
  author: string;
  text: string;
  upvotes: number;
  timeAgo: string;
  replies?: ForumComment[];
}

export const POSTS: ForumPost[] = [
  { id: 'p1', threadId: 'path-nine_to_five', author: 'MK', flair: 'WIN', title: 'Got the offer. 4 months after my last game.', body: 'Former D1 mid. Today I signed for an ops role. The interview was just film study on their company. Your discipline got you here — that same discipline builds the next life.', upvotes: 212, commentCount: 34, timeAgo: '3h' },
  { id: 'p2', threadId: 'path-nine_to_five', author: 'JD', flair: 'QUESTION', title: 'How do you explain your sport years in an interview?', body: 'I keep underselling it as "played college ball." How are you framing it without sounding like you peaked at 21?', upvotes: 98, commentCount: 41, timeAgo: '6h' },
  { id: 'p3', threadId: 'path-nine_to_five', author: 'AR', flair: 'VENT', title: 'Nobody keeps score at my job and it\'s messing with me', body: 'I used to know exactly where I stood every single day. Now feedback is a yearly PDF.', upvotes: 156, commentCount: 52, timeAgo: '1d' },
];

export const getPostsForForum = (threadId: string | undefined) =>
  POSTS.filter((p) => p.threadId === threadId);

export const COMMENTS: Record<string, ForumComment[]> = {
  p1: [
    { id: 'c1', author: 'TD', text: 'Huge. What did the reps look like between last game and offer?', upvotes: 24, timeAgo: '2h', replies: [
      { id: 'c1a', author: 'MK', text: 'Weekly game plan, honestly. One resume bullet rewritten, one coffee chat, one application. Same way we trained — small wins stacked.', upvotes: 41, timeAgo: '2h' },
    ]},
    { id: 'c2', author: 'SL', text: '"The interview was just film study" — stealing that. Congrats.', upvotes: 18, timeAgo: '1h' },
  ],
  p2: [
    { id: 'c3', author: 'RW', text: 'Stop naming the sport, start naming the skill. "Captain" becomes "led 25 peers without authority over them."', upvotes: 67, timeAgo: '5h', replies: [
      { id: 'c3a', author: 'JD', text: 'That reframing helps. It\'s the translation part I keep fumbling.', upvotes: 12, timeAgo: '4h', replies: [
        { id: 'c3b', author: 'RW', text: 'The Skill Map in Game Plan literally writes these for you. Start there.', upvotes: 19, timeAgo: '4h' },
      ]},
    ]},
    { id: 'c4', author: 'KB', text: 'Also: nobody thinks you peaked at 21 except you. They hear "D1" and think discipline, coachability, showing up.', upvotes: 45, timeAgo: '3h' },
  ],
  p3: [
    { id: 'c5', author: 'MJ', text: 'Make your own scoreboard. I track my weekly actions like training blocks. Sounds dumb, works.', upvotes: 38, timeAgo: '20h' },
  ],
};

export const FLAIR_STYLES: Record<PostFlair, string> = {
  WIN: 'bg-volt/10 text-volt',
  VENT: 'bg-hrv/10 text-hrv',
  QUESTION: 'bg-sleep/10 text-sleep',
  RESOURCE: 'bg-activity/10 text-activity',
  MILESTONE: 'bg-sand/10 text-sand',
};

export const CATEGORY_STYLES: Record<ForumCategory, { tile: string; label: string }> = {
  Local: { tile: 'bg-sleep/10 text-sleep', label: 'Local' },
  Sport: { tile: 'bg-activity/10 text-activity', label: 'Sport' },
  Support: { tile: 'bg-hrv/10 text-hrv', label: 'Support' },
  Path: { tile: 'bg-volt/10 text-volt', label: 'Path' },
};
