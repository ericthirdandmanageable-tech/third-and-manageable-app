import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { FORUMS, FORUM_CATEGORIES, CATEGORY_STYLES, iconFor, type ForumThread } from '../data/community';
import { useAuth } from '../lib/useAuth';

type Category = (typeof FORUM_CATEGORIES)[number]['id'];

const adaptApiForum = (f: {
  id: string; title: string; category: string; description: string;
  member_count: number; active_now: number; icon: string; path_id?: string;
}): ForumThread => ({
  id: f.id, title: f.title, category: f.category as Category, description: f.description,
  memberCount: f.member_count, activeNow: f.active_now, icon: iconFor(f.icon), pathId: f.path_id,
});

const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [forums, setForums] = useState<ForumThread[]>(FORUMS);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const remote = await api.getForums();
      if (remote) setForums(remote.map(adaptApiForum));
    })();
  }, [user]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? forums.filter((f) =>
        [f.title, f.description, f.category, f.pathId ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    : forums;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-rise">
      <header className="mb-8">
        <h1 className="font-serif text-4xl text-sand italic mb-2">Community</h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
          Verified athletes only
        </p>
        <div className="yard-line mt-4" />
      </header>

      {/* Search */}
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by school, sport, topic, or path..."
          className="w-full bg-bg-surface border border-border-subtle rounded-full py-3.5 pl-12 pr-4 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-all"
        />
      </div>

      {q && visible.length === 0 && (
        <p className="text-[14px] text-text-tertiary text-center py-10">
          Nothing matches "{query.trim()}" yet — try a path, a sport, or a feeling.
        </p>
      )}

      {FORUM_CATEGORIES.map(({ id, label }) => {
        const rows = visible.filter((f) => f.category === id);
        if (rows.length === 0) return null;
        return (
          <section key={id} className="mb-10">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary mb-4">
              {label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rows.map((forum) => (
                <button
                  key={forum.id}
                  onClick={() => navigate(`/community/${forum.id}`)}
                  className="bg-bg-surface p-5 rounded-2xl border border-border-subtle hover:border-volt/50 hover:bg-bg-elevated transition-all duration-200 text-left group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className={clsx('w-12 h-12 rounded-lg flex items-center justify-center', CATEGORY_STYLES[forum.category].tile)}>
                      <forum.icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                      {CATEGORY_STYLES[forum.category].label}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-semibold text-text-primary mb-1 group-hover:text-volt transition-colors">
                    {forum.title}
                  </h3>
                  <p className="text-[13px] text-text-secondary mb-3">{forum.description}</p>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-text-tertiary">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      <span className="text-volt">{forum.activeNow} active</span> · {forum.memberCount} members
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Community;