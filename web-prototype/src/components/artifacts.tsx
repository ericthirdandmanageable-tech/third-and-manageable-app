import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { Download, Share2, Check } from 'lucide-react';
import { SKILL_MAP } from '../data/skills';
import { JOURNEY } from '../data/journey';
import { getPath } from '../data/paths';

/*
 * PROGRESS ARTIFACTS (REDESIGN_BRIEF §12) — every milestone is renderable
 * as a designed, exportable card. Template-driven: fixed compositions with
 * data slots. Editorial and earned in tone. Private by default; sharing is
 * always an explicit action. Export rasterizes the card to a PNG.
 *
 * Cards take the athlete's real data as props; the placeholder registry
 * values are only defaults so a card never renders empty.
 */

interface SkillEntry { skill: string; translation: string; origin?: string }

const ArtifactShell = ({
  children, name, share,
}: {
  children: React.ReactNode;
  name: string;
  /* When set, renders "Share to forum" — navigates to the forum with the
   * draft prefilled. The athlete still reviews and posts explicitly. */
  share?: { forumId: string; title: string; body: string };
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exported, setExported] = useState(false);

  const exportPng = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${name}.png`;
      a.click();
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch {
      // html-to-image can fail on cross-origin fonts; leave the card in place.
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={cardRef} className="bg-bg-surface rounded-[20px] border border-border-subtle p-8 grain relative overflow-hidden">
        {children}
        <div className="yard-line mt-6" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mt-3">
          Third &amp; Manageable
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={exportPng}
          className="flex-1 flex items-center justify-center gap-2 bg-bg-elevated border border-border-subtle text-text-secondary text-[13px] font-medium py-2.5 rounded-full hover:text-text-primary hover:border-text-tertiary transition-all"
        >
          {exported ? <><Check className="w-4 h-4 text-volt" /> Saved</> : <><Download className="w-4 h-4" /> Export</>}
        </button>
        {share && (
          <button
            onClick={() => navigate(`/community/${share.forumId}`, { state: { draft: { title: share.title, body: share.body } } })}
            className="flex-1 flex items-center justify-center gap-2 bg-volt/10 border border-volt/40 text-volt text-[13px] font-medium py-2.5 rounded-full hover:bg-volt/20 transition-all"
          >
            <Share2 className="w-4 h-4" /> Share to forum
          </button>
        )}
      </div>
    </div>
  );
};

/* 1. Skill Map Card — "What the game taught you" */
export const SkillMapCard = ({ entries = SKILL_MAP }: { entries?: SkillEntry[] }) => (
  <ArtifactShell name="skill-map">
    <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-2">Transferable Skill Map</p>
    <h3 className="font-serif text-3xl text-sand italic mb-5">What the game taught you</h3>
    <div className="space-y-2.5">
      {entries.map((entry) => (
        <div key={entry.skill} className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[13px] text-volt shrink-0">{entry.skill}</span>
          <span className="text-[13px] text-text-secondary text-right">{entry.translation}</span>
        </div>
      ))}
    </div>
  </ArtifactShell>
);

/* 2. Day Counter Card — oversized mono numerals */
export const DayCounterCard = ({
  day = JOURNEY.day, totalDays = JOURNEY.totalDays, phaseName = 'Foundation',
}: { day?: number; totalDays?: number; phaseName?: string }) => (
  <ArtifactShell name="day-counter">
    <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-2">The Journey</p>
    <p className="font-mono text-7xl text-volt leading-none mb-2">
      {String(day).padStart(2, '0')}
      <span className="text-2xl text-text-tertiary"> / {totalDays}</span>
    </p>
    <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary mb-4">{phaseName}</p>
    <p className="font-serif text-xl text-sand italic">"You showed up today. That's what matters."</p>
  </ArtifactShell>
);

/* 3. Path Commitment Card — rendered only when a path is committed */
export const PathCommitmentCard = ({
  pathId, entries = SKILL_MAP, day = JOURNEY.day,
}: { pathId: string; entries?: SkillEntry[]; day?: number }) => {
  const path = getPath(pathId);
  if (!path) return null;
  return (
    <ArtifactShell
      name="path-commitment"
      share={{
        forumId: `path-${path.id}`,
        title: `Committed: ${path.name}`,
        body: `Day ${day} of 90 — I just committed to the ${path.name} path. First reps are next. Anyone here a few months ahead of me?`,
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-2">Path Committed</p>
      <h3 className="font-serif text-3xl text-sand italic mb-4">{path.name}</h3>
      <div className="space-y-2.5 mb-4">
        {entries.slice(0, 3).map((entry) => (
          <div key={entry.skill} className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[13px] text-volt shrink-0">{entry.skill}</span>
            <span className="text-[13px] text-text-secondary text-right">{entry.translation}</span>
          </div>
        ))}
      </div>
      <p className="font-mono text-[11px] text-text-tertiary">Day {day} · Committed to the path</p>
    </ArtifactShell>
  );
};

/* 4. Weekly Recap Card */
export const WeeklyRecapCard = ({
  streak = JOURNEY.streak, completed, total,
}: { streak?: number; completed: number; total: number }) => (
  <ArtifactShell name="weekly-recap">
    <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-2">Weekly Recap</p>
    <div className="flex items-baseline gap-6 mb-4">
      <p className="font-mono text-5xl text-volt leading-none">{streak}</p>
      <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">day streak</p>
      <p className="font-mono text-5xl text-volt leading-none">{completed}/{total}</p>
      <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">reps done</p>
    </div>
    <p className="font-serif text-xl text-sand italic">"Consistency beats intensity."</p>
  </ArtifactShell>
);
