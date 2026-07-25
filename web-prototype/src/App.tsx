import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Onboarding from './pages/Onboarding';
import CheckIn from './pages/CheckIn';
import GamePlan from './pages/GamePlan';
import PathDetail from './pages/PathDetail';
import ClipboardChat from './pages/ClipboardChat';
import Community from './pages/Community';
import Forum from './pages/Forum';
import Post from './pages/Post';
import Progress from './pages/Progress';
import Support from './pages/Support';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding sits outside the app shell — the original app's (auth)
            route group worked the same way: no tabs, no chrome, one job. */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<CheckIn />} />
          <Route path="game-plan" element={<GamePlan />} />
          <Route path="game-plan/paths/:pathId" element={<PathDetail />} />
          <Route path="clipboard" element={<ClipboardChat />} />
          <Route path="community" element={<Community />} />
          <Route path="community/:threadId" element={<Forum />} />
          <Route path="community/:threadId/:postId" element={<Post />} />
          <Route path="progress" element={<Progress />} />
          <Route path="support" element={<Support />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
