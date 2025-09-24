import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '../types';

// Базовая конфигурация API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Interceptor для запросов
    this.api.interceptors.request.use(
      (config) => {
        // Добавляем Telegram WebApp данные для аутентификации
        if (window.Telegram?.WebApp?.initData) {
          config.headers.Authorization = `twa-init-data ${window.Telegram.WebApp.initData}`;
        }

        // Логируем запросы в development режиме
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
        }

        return config;
      },
      (error) => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor для ответов
    this.api.interceptors.response.use(
      (response) => {
        // Логируем ответы в development режиме
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
        }

        return response;
      },
      (error: AxiosError) => {
        console.error('❌ Response error:', error);

        // Обработка ошибок сети
        if (!error.response) {
          const networkError: ApiError = {
            error: 'network_error',
            message: 'Нет соединения с сервером',
            status: 0
          };
          return Promise.reject(networkError);
        }

        // Обработка ошибок сервера
        const apiError: ApiError = {
          error: error.response.data?.error || 'unknown_error',
          message: error.response.data?.message || 'Произошла ошибка',
          details: error.response.data?.details,
          status: error.response.status
        };

        return Promise.reject(apiError);
      }
    );
  }

  // Общий метод для выполнения запросов
  async request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api({
        method,
        url,
        data,
      });

      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  }

  // GET запрос
  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url);
  }

  // POST запрос
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data);
  }

  // PUT запрос
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data);
  }

  // DELETE запрос
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url);
  }

  // Установка токена для админской аутентификации
  setAuthToken(token: string) {
    this.api.defaults.headers.Authorization = `Bearer ${token}`;
  }

  // Удаление токена
  removeAuthToken() {
    delete this.api.defaults.headers.Authorization;
  }

  // Получение базового URL
  getBaseURL(): string {
    return API_BASE_URL;
  }
}

// Экземпляр API сервиса
export const apiService = new ApiService();

// Хелперы для обработки ошибок
export const handleApiError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ApiError).message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Произошла неизвестная ошибка';
};

export const isApiError = (error: unknown): error is ApiError => {
  return typeof error === 'object' && error !== null && 'error' in error && 'message' in error;
};

// Типизированные методы для конкретных API endpoints
export class TypedApiService {
  // Проверка доступности API
  static async healthCheck(): Promise<boolean> {
    try {
      await apiService.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Получение информации о пуле
  static async getPoolInfo() {
    return apiService.get('/deposits/pool-address');
  }

  // Пользовательские методы
  static async getUserProfile() {
    return apiService.get('/user/profile');
  }

  static async getUserBalance() {
    return apiService.get('/user/balance');
  }

  static async updateUserProfile(data: any) {
    return apiService.put('/user/profile', data);
  }

  static async getUserHistory(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiService.get(`/user/history${queryString}`);
  }

  // Депозиты
  static async getUserDeposits(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiService.get(`/deposits${queryString}`);
  }

  static async submitDeposit(data: { tx_hash: string }) {
    return apiService.post('/deposits/submit', data);
  }

  static async getDeposit(id: number) {
    return apiService.get(`/deposits/${id}`);
  }

  // Выводы
  static async getWithdrawalInfo() {
    return apiService.get('/withdrawals/info');
  }

  static async getUserWithdrawals(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiService.get(`/withdrawals${queryString}`);
  }

  static async createWithdrawal(data: any) {
    return apiService.post('/withdrawals', data);
  }

  static async getWithdrawal(id: number) {
    return apiService.get(`/withdrawals/${id}`);
  }

  static async cancelWithdrawal(id: number) {
    return apiService.delete(`/withdrawals/${id}`);
  }
}

export default apiService;
