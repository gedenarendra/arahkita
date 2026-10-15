import axios from "axios";
import config from "../config/config";

export const axiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (reqConfig) => reqConfig,
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

export const apiClient = {
  async get(url, params = {}, requestConfig = {}) {
    try {
      const response = await axiosInstance.get(url, {
        params,
        ...requestConfig,
      });
      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error:
          error.response?.data?.message || error.message || "Request failed",
      };
    }
  },

  async post(url, data = {}, requestConfig = {}) {
    try {
      const response = await axiosInstance.post(url, data, requestConfig);
      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error:
          error.response?.data?.message || error.message || "Request failed",
      };
    }
  },
};

export default apiClient;
