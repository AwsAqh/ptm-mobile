import { API_URL } from './config';

// Get all models
export async function getModels() {
  const response = await fetch(`${API_URL}/classify/models`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || 'Failed to fetch models');
  return data;
}

// Get model classes
export async function getModelClasses(modelId) {
  const response = await fetch(`${API_URL}/classify/classes/${modelId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || 'Failed to fetch model classes');
  return data;
}

// Classify image
export async function classifyImage(modelId, imageUri) {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  });
  formData.append('modelId', modelId);

  const response = await fetch(`${API_URL}/classify/classify`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || 'Classification failed');
  return data;
} 