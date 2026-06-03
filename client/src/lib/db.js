import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, serverTimestamp, limit, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_CATEGORIES = [
  { id: 'characters',    label: 'Personagens',    icon: '👤' },
  { id: 'stories',       label: 'Histórias',      icon: '📖' },
  { id: 'geography',     label: 'Geografia',      icon: '🌍' },
  { id: 'cities',        label: 'Cidades',        icon: '🏙️' },
  { id: 'states',        label: 'Estados',        icon: '🗾' },
  { id: 'countries',     label: 'Países',         icon: '🚩' },
  { id: 'government',    label: 'Governo',        icon: '🏛️' },
  { id: 'companies',     label: 'Empresas',       icon: '🏢' },
  { id: 'infrastructure',label: 'Infraestrutura', icon: '⚙️' },
  { id: 'civilizations', label: 'Civilizações',   icon: '🏺' },
];

export const CATEGORIES      = DEFAULT_CATEGORIES.map(c => c.id);
export const CATEGORY_LABELS = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c.label]));
export const CATEGORY_ICONS  = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c.icon]));

export async function createCategory(data) {
  return addDoc(collection(db, 'categories'), { ...data, createdAt: serverTimestamp() });
}

export async function getAllCategories() {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('createdAt')));
  const saved = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const savedIds = new Set(saved.map(c => c.id));
  const defaults = DEFAULT_CATEGORIES.filter(c => !savedIds.has(c.id));
  return [...defaults, ...saved];
}

export function subscribeToCategorias(callback) {
  return onSnapshot(
    query(collection(db, 'categories'), orderBy('createdAt')),
    snap => {
      const saved = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const savedIds = new Set(saved.map(c => c.id));
      const customOnly = saved.filter(c => !DEFAULT_CATEGORIES.find(d => d.id === c.id));
      const overrides  = saved.filter(c =>  DEFAULT_CATEGORIES.find(d => d.id === c.id));
      const mergedDefaults = DEFAULT_CATEGORIES.map(d => {
        const override = overrides.find(o => o.id === d.id);
        return override ? { ...d, ...override } : { ...d, custom: false };
      });
      callback([...mergedDefaults, ...customOnly.map(c => ({ ...c, custom: true }))]);
    }
  );
}

export async function createArticle(data) {
  return addDoc(collection(db, 'articles'), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function updateArticle(id, data) {
  return updateDoc(doc(db, 'articles', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteArticle(id) {
  return deleteDoc(doc(db, 'articles', id));
}

export async function getArticle(id) {
  const snap = await getDoc(doc(db, 'articles', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getArticlesByCategory(category) {
  const q = query(collection(db, 'articles'), where('category', '==', category), orderBy('title'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllArticles() {
  const q = query(collection(db, 'articles'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRecentArticles(n = 8) {
  const q = query(collection(db, 'articles'), orderBy('updatedAt', 'desc'), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function searchArticles(term) {
  const all = await getAllArticles();
  const t = term.toLowerCase();
  return all.filter(a =>
    a.title?.toLowerCase().includes(t) ||
    a.summary?.toLowerCase().includes(t) ||
    (a.tags || []).some(tag => tag.toLowerCase().includes(t))
  );
}

export async function getArticleByTitle(title) {
  const all = await getAllArticles();
  return all.find(a => a.title?.toLowerCase() === title.toLowerCase()) || null;
}
