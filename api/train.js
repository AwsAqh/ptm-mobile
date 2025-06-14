import { API_URL } from './config';

// Train a new model
export async function trainModel(formData, token) {
  console.log('API_URL:', API_URL);
  const response = await fetch(`${API_URL}/classify/train`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || 'Training failed');
  return data;
} 