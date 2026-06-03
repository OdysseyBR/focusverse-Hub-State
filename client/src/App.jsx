import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Hub pages (site 1)
import Timeline        from './pages/Timeline';
import Personagens     from './pages/Personagens';
import PersonagemEditor from './pages/PersonagemEditor';
import Faccoes         from './pages/Faccoes';
import FaccaoEditor    from './pages/FaccaoEditor';
import Locais          from './pages/Locais';
import LocalEditor     from './pages/LocalEditor';
import Mapa            from './pages/Mapa';
import GeradorPersonagem from './pages/GeradorPersonagem';
import GeradorLocal    from './pages/GeradorLocal';
import ApiMapa         from './pages/ApiMapa';

// Wiki pages (site 2)
import WikiHome        from './pages/wiki/Home';
import WikiArticle     from './pages/wiki/Article';
import WikiArticleEditor from './pages/wiki/ArticleEditor';
import WikiCategory    from './pages/wiki/Category';
import WikiSearch      from './pages/wiki/Search';
import WikiManageCategories from './pages/wiki/ManageCategories';

// Auth
import Login           from './pages/Login';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Layout />}>
        {/* Root redirect */}
        <Route index element={<Navigate to="/timeline" replace />} />

        {/* ── Hub ── */}
        <Route path="/timeline" element={<PrivateRoute><Timeline /></PrivateRoute>} />
        <Route path="/personagens" element={<PrivateRoute><Personagens /></PrivateRoute>} />
        <Route path="/personagens/novo" element={<PrivateRoute adminOnly><PersonagemEditor /></PrivateRoute>} />
        <Route path="/personagens/:id/editar" element={<PrivateRoute adminOnly><PersonagemEditor /></PrivateRoute>} />
        <Route path="/faccoes" element={<PrivateRoute><Faccoes /></PrivateRoute>} />
        <Route path="/faccoes/novo" element={<PrivateRoute adminOnly><FaccaoEditor /></PrivateRoute>} />
        <Route path="/faccoes/:id/editar" element={<PrivateRoute adminOnly><FaccaoEditor /></PrivateRoute>} />
        <Route path="/locais" element={<PrivateRoute><Locais /></PrivateRoute>} />
        <Route path="/locais/novo" element={<PrivateRoute adminOnly><LocalEditor /></PrivateRoute>} />
        <Route path="/locais/:id/editar" element={<PrivateRoute adminOnly><LocalEditor /></PrivateRoute>} />
        <Route path="/mapa" element={<PrivateRoute><Mapa /></PrivateRoute>} />
        <Route path="/gerador-personagem" element={<PrivateRoute><GeradorPersonagem /></PrivateRoute>} />
        <Route path="/gerador-local" element={<PrivateRoute><GeradorLocal /></PrivateRoute>} />
        <Route path="/api-mapa" element={<PrivateRoute adminOnly><ApiMapa /></PrivateRoute>} />

        {/* ── Wiki ── */}
        <Route path="/wiki" element={<PrivateRoute><WikiHome /></PrivateRoute>} />
        <Route path="/wiki/search" element={<PrivateRoute><WikiSearch /></PrivateRoute>} />
        <Route path="/wiki/category/:cat" element={<PrivateRoute><WikiCategory /></PrivateRoute>} />
        <Route path="/wiki/article/:id" element={<PrivateRoute><WikiArticle /></PrivateRoute>} />
        <Route path="/wiki/new" element={<PrivateRoute adminOnly><WikiArticleEditor /></PrivateRoute>} />
        <Route path="/wiki/edit/:id" element={<PrivateRoute adminOnly><WikiArticleEditor /></PrivateRoute>} />
        <Route path="/wiki/manage-categories" element={<PrivateRoute adminOnly><WikiManageCategories /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}
