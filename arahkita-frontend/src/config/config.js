const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

const rawConfig = {
  apiBaseUrl: rawApiUrl,
  API_BASE_URL: rawApiUrl,
  isDev: Boolean(import.meta.env.DEV),
};

export const config = Object.freeze(rawConfig);
export default config;
