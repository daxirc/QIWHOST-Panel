import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://172.30.185.15:8000/api";

// 1. Admin API axios instance
export const AdminAPI = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

AdminAPI.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("qiw_admin_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

AdminAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("qiw_admin_token");
        localStorage.removeItem("qiw_admin_user");
        localStorage.removeItem("qiw_user_role");
        localStorage.removeItem("qiw_user_data");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// 2. Customer API axios instance
export const CustomerAPI = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

CustomerAPI.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("qiw_customer_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

CustomerAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("qiw_customer_token");
        localStorage.removeItem("qiw_customer_user");
        localStorage.removeItem("qiw_user_role");
        localStorage.removeItem("qiw_user_data");
        window.location.href = "/customer/login";
      }
    }
    return Promise.reject(error);
  }
);

// 3. Fallback/Standard API instance for base compatibility
export const API = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

API.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const isAdminRoute = window.location.pathname.startsWith("/admin");
      const adminToken = localStorage.getItem("qiw_admin_token");
      const customerToken = localStorage.getItem("qiw_customer_token");
      const token = isAdminRoute ? adminToken : (customerToken || adminToken);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        const isAdminRoute = window.location.pathname.startsWith("/admin");
        if (isAdminRoute) {
          localStorage.removeItem("qiw_admin_token");
          window.location.href = "/login";
        } else {
          localStorage.removeItem("qiw_customer_token");
          window.location.href = "/customer/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
