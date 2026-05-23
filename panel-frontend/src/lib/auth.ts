import API, { AdminAPI, CustomerAPI } from "./api";
import Cookies from "js-cookie";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  username?: string;
}

// 1. Decoupled Admin Auth Functions
export const adminLogin = async (email: string, password: string) => {
  const response = await AdminAPI.post("/admin/login", { email, password });
  const { token, user } = response.data;

  if (typeof window !== "undefined") {
    localStorage.setItem("qiw_admin_token", token);
    localStorage.setItem("qiw_admin_user", JSON.stringify(user));
    localStorage.setItem("qiw_user_role", "admin");
    localStorage.setItem("qiw_user_data", JSON.stringify(user));

    Cookies.set("qiw_admin_token", token, { expires: 7 });
    Cookies.set("qiw_user_role", "admin", { expires: 7 });
  }

  return { token, user };
};

export const adminLogout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("qiw_admin_token");
    localStorage.removeItem("qiw_admin_user");
    localStorage.removeItem("qiw_user_role");
    localStorage.removeItem("qiw_user_data");

    Cookies.remove("qiw_admin_token");
    Cookies.remove("qiw_user_role");

    window.location.href = "/login";
  }
};

export const isAdminAuthenticated = () => {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("qiw_admin_token");
  }
  return false;
};

// 2. Decoupled Customer Auth Functions
export const customerLogin = async (email: string, password: string) => {
  // Post using CustomerAPI instance
  const response = await CustomerAPI.post("/customer/login", { email, password });
  const { token, customer } = response.data;

  if (typeof window !== "undefined") {
    localStorage.setItem("qiw_customer_token", token);
    localStorage.setItem("qiw_customer_user", JSON.stringify(customer));
    localStorage.setItem("qiw_user_role", "customer");
    localStorage.setItem("qiw_user_data", JSON.stringify(customer));

    Cookies.set("qiw_customer_token", token, { expires: 7 });
    Cookies.set("qiw_user_role", "customer", { expires: 7 });
  }

  return { token, user: customer };
};

export const customerLogout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("qiw_customer_token");
    localStorage.removeItem("qiw_customer_user");
    localStorage.removeItem("qiw_user_role");
    localStorage.removeItem("qiw_user_data");

    Cookies.remove("qiw_customer_token");
    Cookies.remove("qiw_user_role");

    window.location.href = "/customer/login";
  }
};

export const isCustomerAuthenticated = () => {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("qiw_customer_token");
  }
  return false;
};

// 3. Fallback Auth Functions for Base Compatibility
export const login = async (
  loginValue: string,
  passwordValue: string,
  type: "admin" | "customer" = "admin"
) => {
  if (type === "admin") {
    return adminLogin(loginValue, passwordValue);
  } else {
    return customerLogin(loginValue, passwordValue);
  }
};

export const logout = () => {
  adminLogout();
  customerLogout();
};

export const getUser = (): AuthUser | null => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem("qiw_user_data");
    return data ? JSON.parse(data) : null;
  }
  return null;
};

export const getUserRole = (): "admin" | "customer" | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("qiw_user_role") as "admin" | "customer" | null;
  }
  return null;
};

export const isAuthenticated = (type?: "admin" | "customer"): boolean => {
  if (typeof window !== "undefined") {
    if (type === "admin") {
      return isAdminAuthenticated();
    }
    if (type === "customer") {
      return isCustomerAuthenticated();
    }
    return isAdminAuthenticated() || isCustomerAuthenticated();
  }
  return false;
};
