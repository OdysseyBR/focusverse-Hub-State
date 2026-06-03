import { apiFetch } from './api';

// Upload autenticado via server (usa as credenciais do projeto 1 / server.js)
export async function uploadImage(file, folder = 'focusverse') {
  const { timestamp, signature, apiKey, cloudName } = await apiFetch('/api/cloudinary/sign', {
    method: 'POST',
    body: JSON.stringify({ folder }),
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro no upload');
  return data.secure_url;
}

export function validateImage(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) return 'Apenas JPG, PNG ou WEBP';
  if (file.size > 4 * 1024 * 1024) return 'Imagem deve ter no máximo 4MB';
  return null;
}

export function validateAudio(file) {
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];
  if (!validTypes.includes(file.type)) return 'Apenas MP3, WAV ou OGG';
  if (file.size > 10 * 1024 * 1024) return 'Áudio deve ter no máximo 10MB';
  return null;
}
