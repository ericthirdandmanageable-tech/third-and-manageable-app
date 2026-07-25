import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';

/* 404 — unknown URLs used to render a blank content area with working nav. */
const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6 md:p-10 max-w-xl mx-auto animate-rise text-center pt-24">
      <div className="w-16 h-16 bg-bg-surface border border-border-subtle rounded-full flex items-center justify-center mx-auto mb-6">
        <Compass className="w-8 h-8 text-volt" />
      </div>
      <h1 className="font-serif text-4xl text-sand italic mb-3">Out of bounds</h1>
      <p className="text-[15px] text-text-secondary mb-8">
        This page isn't on the depth chart. It may have moved, or the link is off.
      </p>
      <button
        onClick={() => navigate('/')}
        className="bg-volt text-volt-ink font-semibold px-6 py-3 rounded-full hover:bg-volt/90 transition-all"
      >
        Back to today's check-in
      </button>
    </div>
  );
};

export default NotFound;
