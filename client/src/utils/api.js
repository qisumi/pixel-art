const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }
  const data = JSON.parse(text);

  if (!data.success) {
    const error = new Error(data.error?.message || 'Request failed');
    error.code = data.error?.code;
    error.details = data.error?.details;
    throw error;
  }

  return data.data;
}

export const api = {
  patterns: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/patterns${query ? `?${query}` : ''}`);
    },
    get: (id) => request(`/patterns/${id}`),
    create: (data) => request('/patterns', { method: 'POST', body: data }),
    update: (id, data) => request(`/patterns/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/patterns/${id}`, { method: 'DELETE' }),
  },

  tags: {
    list: () => request('/tags'),
    create: (name) => request('/tags', { method: 'POST', body: { name } }),
    delete: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
  },

  colors: {
    list: () => request('/colors'),
    match: (hex) => request(`/colors/match?hex=${hex.replace('#', '')}`),
  },
};

export default api;
