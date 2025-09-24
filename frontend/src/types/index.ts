// Основные типы для приложения

// Пользователь
export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  wallet_address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Баланс пользователя
export interface Balance {
  on_chain_balance: string;
  accrued_balance: string;
  withdrawn_balance: string;
  total_balance: string;
}

// Депозит
export interface Deposit {
  id: number;
  user_id: number;
  tx_hash: string;
  amount?: string;
  token: string;
  from_address?: string;
  to_address: string;
  block_number?: number;
  confirmations: number;
  status: DepositStatus;
  submitted_at?: string;
  detected_at?: string;
  approved_at?: string;
  rejected_at?: string;
  processed_by?: number;
  admin_comment?: string;
  created_at: string;
  updated_at: string;
}

export type DepositStatus = 'submitted' | 'detected' | 'pending' | 'approved' | 'rejected' | 'failed';

// Заявка на вывод
export interface Withdrawal {
  id: number;
  user_id: number;
  requested_amount: string;
  to_address: string;
  withdrawal_type: WithdrawalType;
  status: WithdrawalStatus;
  requested_at: string;
  processed_by?: number;
  processed_at?: string;
  paid_at?: string;
  tx_hash?: string;
  actual_amount?: string;
  admin_comment?: string;
  created_at: string;
  updated_at: string;
}

export type WithdrawalType = 'partial' | 'full';
export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

// Начисление
export interface Accrual {
  id: number;
  user_id: number;
  amount: string;
  reason: string;
  accrual_type: AccrualType;
  reference_deposit_id?: number;
  reference_tx_hash?: string;
  created_by: number;
  processed_at: string;
  created_at: string;
}

export type AccrualType = 'manual' | 'interest' | 'bonus' | 'correction';

// История операций
export interface HistoryItem {
  id: number;
  operation_type: 'deposit' | 'withdrawal' | 'accrual';
  amount?: string;
  status?: string;
  created_at: string;
  tx_hash?: string;
  reason?: string;
  accrual_type?: AccrualType;
}

// Информация о пуле для депозитов
export interface PoolInfo {
  pool_address: string;
  token_contract: string;
  network: string;
  min_amount: number;
  confirmations_required: number;
  instructions: {
    ru: string[];
    en: string[];
  };
}

// Информация о выводе
export interface WithdrawalInfo {
  current_balance: string;
  available_balance: string;
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  daily_limit: number;
  daily_withdrawn: number;
  available_today: number;
  has_pending_withdrawal: boolean;
  withdrawal_fee_percent: number;
  estimated_processing_time: {
    approval: string;
    payment: string;
  };
  supported_addresses: string[];
  instructions: {
    ru: string[];
    en: string[];
  };
}

// API ответы
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    total_pages?: number;
    has_more: boolean;
  };
}

// Telegram WebApp типы
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: any;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  MainButton: TelegramMainButton;
  BackButton: TelegramBackButton;
  HapticFeedback: TelegramHapticFeedback;
  ready: () => void;
  expand: () => void;
  close: () => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showPopup: (params: any, callback?: (buttonId: string) => void) => void;
  onEvent: (eventType: string, eventHandler: () => void) => void;
  offEvent: (eventType: string, eventHandler: () => void) => void;
  sendData: (data: string) => void;
}

export interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  setParams: (params: any) => void;
}

export interface TelegramBackButton {
  isVisible: boolean;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
}

export interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

// Глобальные типы
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// Формы
export interface DepositFormData {
  tx_hash: string;
}

export interface WithdrawalFormData {
  requested_amount: string;
  to_address: string;
  withdrawal_type: WithdrawalType;
}

// Статистика пользователя
export interface UserStats {
  registration_date: string;
  total_deposits: number;
  approved_deposits: number;
  total_withdrawals: number;
  paid_withdrawals: number;
  total_accruals: number;
  total_deposited: string;
  total_withdrawn: string;
  total_accrued: string;
}

// Профиль пользователя (расширенный)
export interface UserProfile {
  user: User;
  balance: Balance;
  stats: UserStats;
}

// Ошибки API
export interface ApiError {
  error: string;
  message: string;
  details?: any;
  status?: number;
}

// Состояние загрузки
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

// Фильтры для списков
export interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface DepositFilters extends ListFilters {
  tx_hash?: string;
  from_address?: string;
}

export interface WithdrawalFilters extends ListFilters {
  amount_from?: string;
  amount_to?: string;
}

// Настройки приложения
export interface AppSettings {
  language: 'ru' | 'en';
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  currency_display: 'USDT' | 'USD';
}

// Уведомления
export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type { };
