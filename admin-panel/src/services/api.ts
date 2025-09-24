import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, AuthUser } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class AdminApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadToken();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private loadToken() {
    this.token = localStorage.getItem('admin_token');
  }

  private saveToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  private clearAuth() {
    this.token = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }

  // Auth methods
  async login(telegramId: number, adminPassword: string): Promise<AuthUser> {
    const response = await this.api.post<ApiResponse<{ token: string; user: AuthUser }>>('/auth/admin/login', {
      telegram_id: telegramId,
      admin_password: adminPassword,
    });

    if (response.data.success && response.data.data) {
      const { token, user } = response.data.data;
      this.saveToken(token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      return user;
    }

    throw new Error('Login failed');
  }

  logout() {
    this.clearAuth();
  }

  getCurrentUser(): AuthUser | null {
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Dashboard
  async getDashboard() {
    const response = await this.api.get('/admin/dashboard');
    return response.data;
  }

  // Deposits
  async getDeposits(params: any = {}) {
    const response = await this.api.get('/admin/deposits', { params });
    return response.data;
  }

  async approveDeposit(id: number, data: { amount?: number; admin_comment?: string }) {
    const response = await this.api.post(`/admin/deposits/${id}/approve`, data);
    return response.data;
  }

  async rejectDeposit(id: number, reason: string) {
    const response = await this.api.post(`/admin/deposits/${id}/reject`, { reason });
    return response.data;
  }

  // Withdrawals
  async getWithdrawals(params: any = {}) {
    const response = await this.api.get('/admin/withdrawals', { params });
    return response.data;
  }

  async approveWithdrawal(id: number, adminComment?: string) {
    const response = await this.api.post(`/admin/withdrawals/${id}/approve`, { admin_comment: adminComment });
    return response.data;
  }

  async rejectWithdrawal(id: number, reason: string) {
    const response = await this.api.post(`/admin/withdrawals/${id}/reject`, { reason });
    return response.data;
  }

  async markWithdrawalPaid(id: number, txHash: string, actualAmount?: number) {
    const response = await this.api.post(`/admin/withdrawals/${id}/paid`, {
      tx_hash: txHash,
      actual_amount: actualAmount,
    });
    return response.data;
  }

  // Accruals
  async createAccrual(data: {
    user_id: number;
    amount: number;
    reason: string;
    accrual_type?: string;
    reference_deposit_id?: number;
  }) {
    const response = await this.api.post('/admin/accruals', data);
    return response.data;
  }

  async getAccruals(params: any = {}) {
    const response = await this.api.get('/admin/accruals', { params });
    return response.data;
  }

  // Users
  async getUsers(params: any = {}) {
    const response = await this.api.get('/admin/users', { params });
    return response.data;
  }

  async getUserById(id: number) {
    const response = await this.api.get(`/admin/users/${id}`);
    return response.data;
  }

  // Admin actions (audit log)
  async getAdminActions(params: any = {}) {
    const response = await this.api.get('/admin/actions', { params });
    return response.data;
  }

  // Utility method for handling errors
  handleError(error: any): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Произошла неизвестная ошибка';
  }
}

export const adminApi = new AdminApiService();
export default adminApi;
