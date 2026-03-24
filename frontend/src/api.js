import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});

export const analyzeTokens = (text, model = 'gpt-4o') => {
  return api.post('/analyze', { text, model });
};

export const optimizeInput = (text, mode = 'auto') => {
  return api.post('/optimize', { text, mode });
};

export const validateAccuracy = (original, optimized) => {
  return api.post('/validate', { 
    original_output: original, 
    optimized_output: optimized 
  });
};

export default api;
