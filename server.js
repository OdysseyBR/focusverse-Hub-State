require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

const app = express();
app.use(cors());
app.use(express.json());

// ── Firebase Admin ─────────────────────────────────────────────────────────
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
  universe_domain: 'googleapis.com',
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Cloudinary ─────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Auth Middleware ────────────────────────────────────────────────────────
async function autenticar(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ── Cloudinary Sign ────────────────────────────────────────────────────────
app.post('/api/cloudinary/sign', autenticar, (req, res) => {
  const { folder = 'focusverse' } = req.body;
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );
  res.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  });
});

// ── Eventos ────────────────────────────────────────────────────────────────
app.get('/api/eventos', autenticar, async (req, res) => {
  const snap = await db.collection('usuarios').doc(req.user.uid).collection('eventos').get();
  const eventos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json(eventos);
});

app.post('/api/eventos', autenticar, async (req, res) => {
  const ref = await db.collection('usuarios').doc(req.user.uid).collection('eventos').add(req.body);
  res.json({ id: ref.id, ...req.body });
});

app.put('/api/eventos/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('eventos').doc(req.params.id).update(req.body);
  res.json({ id: req.params.id, ...req.body });
});

app.delete('/api/eventos/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('eventos').doc(req.params.id).delete();
  res.json({ sucesso: true });
});

// ── Territórios ────────────────────────────────────────────────────────────
app.get('/api/territorios', autenticar, async (req, res) => {
  const snap = await db.collection('usuarios').doc(req.user.uid).collection('territorios').get();
  res.json(snap.docs.map(d => ({ territoryId: d.id, ...d.data() })));
});

app.post('/api/territorios', autenticar, async (req, res) => {
  const ref = await db.collection('usuarios').doc(req.user.uid).collection('territorios').add({
    ...req.body, criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ territoryId: ref.id, ...req.body });
});

app.put('/api/territorios/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('territorios').doc(req.params.id).update(req.body);
  res.json({ territoryId: req.params.id, ...req.body });
});

app.delete('/api/territorios/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('territorios').doc(req.params.id).delete();
  res.json({ sucesso: true });
});

// ── Rodovias ───────────────────────────────────────────────────────────────
app.get('/api/rodovias', autenticar, async (req, res) => {
  const snap = await db.collection('usuarios').doc(req.user.uid).collection('rodovias').get();
  res.json(snap.docs.map(d => ({ roadId: d.id, ...d.data() })));
});

app.post('/api/rodovias', autenticar, async (req, res) => {
  const ref = await db.collection('usuarios').doc(req.user.uid).collection('rodovias').add({
    ...req.body, criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ roadId: ref.id, ...req.body });
});

app.put('/api/rodovias/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('rodovias').doc(req.params.id).update(req.body);
  res.json({ roadId: req.params.id, ...req.body });
});

app.delete('/api/rodovias/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('rodovias').doc(req.params.id).delete();
  res.json({ sucesso: true });
});

// ── API do Mapa v1 (autenticação por API Key) ──────────────────────────────
function gerarApiKey() {
  const c = '0123456789abcdef';
  let k = 'fv_';
  for (let i = 0; i < 32; i++) k += c[Math.floor(Math.random() * 16)];
  return k;
}

async function autenticarApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Header X-API-Key ausente' });
  const doc = await db.collection('apiKeys').doc(apiKey).get();
  if (!doc.exists) return res.status(401).json({ error: 'API key inválida ou revogada' });
  req.uid = doc.data().uid;
  // Atualiza lastUsed sem bloquear a resposta
  doc.ref.update({ lastUsed: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
  next();
}

// Gerenciamento de API Keys (autenticado via Firebase token)
app.get('/api/apikeys', autenticar, async (req, res) => {
  const snap = await db.collection('usuarios').doc(req.user.uid).collection('apiKeys').orderBy('criadoEm', 'desc').get();
  res.json(snap.docs.map(d => ({ key: d.id, ...d.data() })));
});

app.post('/api/apikeys', autenticar, async (req, res) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  const key = gerarApiKey();
  const payload = { uid: req.user.uid, nome, criadoEm: admin.firestore.FieldValue.serverTimestamp() };
  await Promise.all([
    db.collection('apiKeys').doc(key).set(payload),
    db.collection('usuarios').doc(req.user.uid).collection('apiKeys').doc(key).set({ nome, criadoEm: admin.firestore.FieldValue.serverTimestamp() }),
  ]);
  res.json({ key, nome });
});

app.delete('/api/apikeys/:key', autenticar, async (req, res) => {
  const key = req.params.key;
  const doc = await db.collection('apiKeys').doc(key).get();
  if (!doc.exists || doc.data().uid !== req.user.uid) return res.status(403).json({ error: 'Não autorizado' });
  await Promise.all([
    db.collection('apiKeys').doc(key).delete(),
    db.collection('usuarios').doc(req.user.uid).collection('apiKeys').doc(key).delete(),
  ]);
  res.json({ sucesso: true });
});

// ── Endpoints públicos da API v1 ───────────────────────────────────────────
const pinsRef = (uid) => db.collection('usuarios').doc(uid).collection('mapa').doc('config').collection('pins');

app.get('/api/v1/mapa/pins', autenticarApiKey, async (req, res) => {
  const { nivel, parentId } = req.query;
  const snap = await pinsRef(req.uid).get();
  let pins = snap.docs.map(d => ({ pinId: d.id, ...d.data() }));
  if (nivel !== undefined) pins = pins.filter(p => (p.nivel ?? 1) === Number(nivel));
  if (parentId !== undefined) pins = pins.filter(p => p.parentId === (parentId === 'null' ? null : parentId));
  res.json({ pins, total: pins.length });
});

app.get('/api/v1/mapa/pins/:id', autenticarApiKey, async (req, res) => {
  const doc = await pinsRef(req.uid).doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Pin não encontrado' });
  res.json({ pinId: doc.id, ...doc.data() });
});

app.post('/api/v1/mapa/pins', autenticarApiKey, async (req, res) => {
  const ref = await pinsRef(req.uid).add({ ...req.body, criadoEm: admin.firestore.FieldValue.serverTimestamp() });
  res.status(201).json({ pinId: ref.id, ...req.body });
});

app.put('/api/v1/mapa/pins/:id', autenticarApiKey, async (req, res) => {
  const ref = pinsRef(req.uid).doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: 'Pin não encontrado' });
  await ref.update(req.body);
  res.json({ pinId: req.params.id, ...req.body });
});

app.delete('/api/v1/mapa/pins/:id', autenticarApiKey, async (req, res) => {
  const ref = pinsRef(req.uid).doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: 'Pin não encontrado' });
  await ref.delete();
  res.json({ sucesso: true });
});

app.get('/api/v1/mapa/camadas', autenticarApiKey, async (req, res) => {
  const doc = await db.collection('usuarios').doc(req.uid).collection('mapa').doc('config').get();
  const layers = doc.exists ? (doc.data().layers || []) : [];
  res.json({ camadas: layers.filter(l => l.url), total: layers.filter(l => l.url).length });
});

app.get('/api/v1/mapa/hierarquia', autenticarApiKey, async (req, res) => {
  const snap = await pinsRef(req.uid).get();
  const pins = snap.docs.map(d => ({ pinId: d.id, ...d.data() }));
  const buildTree = (pin) => ({ ...pin, filhos: pins.filter(p => p.parentId === pin.pinId).map(buildTree) });
  const raizes = pins.filter(p => !p.parentId).map(buildTree);
  res.json({ hierarquia: raizes, totalPins: pins.length });
});

// ── Geradores de Nome ──────────────────────────────────────────────────────
async function chamarClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro na API');
  return data.content[0].text;
}

app.post('/api/gerador/personagem', autenticar, async (req, res) => {
  const { tema, estilo, genero, epoca } = req.body;
  const prompt = `Gere exatamente 8 nomes ${genero === 'Unissex' ? 'unissex' : genero === 'Masculino' ? 'masculinos' : 'femininos'} para personagens de ficção inspirados na cultura ${tema}, estilo ${estilo}, época ${epoca}. Retorne APENAS os 8 nomes, um por linha, sem numeração, sem explicações, sem pontuação extra. Os nomes devem soar autênticos para a cultura e época especificadas.`;
  try {
    const texto = await chamarClaude(prompt);
    const nomes = texto.split('\n').map(n => n.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean).slice(0, 8);
    res.json({ nomes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gerador/local', autenticar, async (req, res) => {
  const { tema, estilo, epoca, hemisferio, orientacao } = req.body;
  const prompt = `Gere exatamente 8 nomes de lugares fictícios inspirados na cultura ${tema}, estilo ${estilo} (ex: portuário = nomes com Porto/Harbor/San, industrial = nomes que remetem a indústria, agrícola = nomes ligados ao campo), época ${epoca}, hemisfério ${hemisferio}, tradição ${orientacao}. Retorne APENAS os 8 nomes de lugares, um por linha, sem numeração, sem explicações. Os nomes devem soar verossímeis para a cultura e época, como nomes reais de cidades/regiões.`;
  try {
    const texto = await chamarClaude(prompt);
    const nomes = texto.split('\n').map(n => n.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean).slice(0, 8);
    res.json({ nomes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mapa ───────────────────────────────────────────────────────────────────
const DEFAULT_LAYERS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1, url: '', name: `Camada ${i + 1}`, visible: true,
}));

app.get('/api/mapa/config', autenticar, async (req, res) => {
  const doc = await db.collection('usuarios').doc(req.user.uid).collection('mapa').doc('config').get();
  res.json(doc.exists ? doc.data() : { layers: DEFAULT_LAYERS });
});

app.put('/api/mapa/config', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('mapa').doc('config').set(req.body, { merge: true });
  res.json({ sucesso: true });
});

app.get('/api/mapa/pins', autenticar, async (req, res) => {
  const snap = await db.collection('usuarios').doc(req.user.uid).collection('mapa').doc('config').collection('pins').get();
  res.json(snap.docs.map(d => ({ pinId: d.id, ...d.data() })));
});

app.post('/api/mapa/pins', autenticar, async (req, res) => {
  const ref = await db.collection('usuarios').doc(req.user.uid).collection('mapa').doc('config').collection('pins').add(req.body);
  res.json({ pinId: ref.id, ...req.body });
});

app.delete('/api/mapa/pins/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('mapa').doc('config').collection('pins').doc(req.params.id).delete();
  res.json({ sucesso: true });
});

// ── Locais ─────────────────────────────────────────────────────────────────
app.get('/api/locais', autenticar, async (req, res) => {
  const snap = await db.collection('usuarios').doc(req.user.uid).collection('locais').orderBy('nome').get();
  res.json(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
});

app.get('/api/locais/:id', autenticar, async (req, res) => {
  const doc = await db.collection('usuarios').doc(req.user.uid).collection('locais').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ docId: doc.id, ...doc.data() });
});

app.post('/api/locais', autenticar, async (req, res) => {
  const ref = await db.collection('usuarios').doc(req.user.uid).collection('locais').add({
    ...req.body,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ docId: ref.id, ...req.body });
});

app.put('/api/locais/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('locais').doc(req.params.id).update(req.body);
  res.json({ docId: req.params.id, ...req.body });
});

app.delete('/api/locais/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('locais').doc(req.params.id).delete();
  res.json({ sucesso: true });
});

// ── Facções ────────────────────────────────────────────────────────────────
app.get('/api/faccoes', autenticar, async (req, res) => {
  const snap = await db.collection('usuarios').doc(req.user.uid).collection('faccoes').orderBy('nomeCompleto').get();
  res.json(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
});

app.get('/api/faccoes/:id', autenticar, async (req, res) => {
  const doc = await db.collection('usuarios').doc(req.user.uid).collection('faccoes').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ docId: doc.id, ...doc.data() });
});

app.post('/api/faccoes', autenticar, async (req, res) => {
  const ref = await db.collection('usuarios').doc(req.user.uid).collection('faccoes').add({
    ...req.body,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ docId: ref.id, ...req.body });
});

app.put('/api/faccoes/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('faccoes').doc(req.params.id).update(req.body);
  res.json({ docId: req.params.id, ...req.body });
});

app.delete('/api/faccoes/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('faccoes').doc(req.params.id).delete();
  res.json({ sucesso: true });
});

// ── Personagens ────────────────────────────────────────────────────────────
app.get('/api/personagens', autenticar, async (req, res) => {
  const snap = await db.collection('usuarios').doc(req.user.uid).collection('personagens').orderBy('nomeCompleto').get();
  res.json(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
});

app.get('/api/personagens/:id', autenticar, async (req, res) => {
  const doc = await db.collection('usuarios').doc(req.user.uid).collection('personagens').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ docId: doc.id, ...doc.data() });
});

app.post('/api/personagens', autenticar, async (req, res) => {
  const ref = await db.collection('usuarios').doc(req.user.uid).collection('personagens').add({
    ...req.body,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ docId: ref.id, ...req.body });
});

app.put('/api/personagens/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('personagens').doc(req.params.id).update(req.body);
  res.json({ docId: req.params.id, ...req.body });
});

app.delete('/api/personagens/:id', autenticar, async (req, res) => {
  await db.collection('usuarios').doc(req.user.uid).collection('personagens').doc(req.params.id).delete();
  res.json({ sucesso: true });
});

// ── React Build (produção) ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

// Serve frontend
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
