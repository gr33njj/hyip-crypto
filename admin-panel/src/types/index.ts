// Типы для админ-панели

export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  created_at: string;
  total_deposited: string;
  total_withdrawn: string;
  deposits_count: number;
  withdrawals_count: number;
}

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
  status: 'submitted' | 'detected' | 'pending' | 'approved' | 'rejected' | 'failed';
  submitted_at?: string;
  detected_at?: string;
  approved_at?: string;
  rejected_at?: string;
  processed_by?: number;
  admin_comment?: string;
  created_at: string;
  // User info
  telegram_id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface Withdrawal {
  id: number;
  user_id: number;
  requested_amount: string;
  to_address: string;
  withdrawal_type: 'partial' | 'full';
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  requested_at: string;
  processed_by?: number;
  processed_at?: string;
  paid_at?: string;
  tx_hash?: string;
  actual_amount?: string;
  admin_comment?: string;
  created_at: string;
  // User info
  telegram_id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface Accrual {
  id: number;
  user_id: number;
  amount: string;
  reason: string;
  accrual_type: 'manual' | 'interest' | 'bonus' | 'correction';
  reference_deposit_id?: number;
  created_by: number;
  processed_at: string;
  created_at: string;
  // User info
  telegram_id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface DashboardStats {
  statistics: {
    deposits: {
      total_deposits: number;
      submitted_count: number;
      detected_count: number;
      pending_count: number;
      approved_count: number;
      rejected_count: number;
      approved_amount: string;
      avg_approved_amount: string;
    };
    withdrawals: {
      total_withdrawals: number;
      pending_count: number;
      approved_count: number;
      paid_count: number;
      rejected_count: number;
      cancelled_count: number;
      paid_amount: string;
      pending_amount: string;
      avg_paid_amount: string;
    };
    accruals: {
      total_accruals: number;
      manual_count: number;
      interest_count: number;
      bonus_count: number;
      correction_count: number;
      total_amount: string;
      manual_amount: string;
      interest_amount: string;
      avg_amount: string;
    };
    users: {
      total_users: number;
      active_users: number;
      new_users_30d: number;
      new_users_7d: number;
    };
  };
  pending_operations: {
    deposits_count: number;
    withdrawals_count: number;
    withdrawals_amount: string;
  };
  pool_info: {
    balance: string;
    obligations: string;
    free_balance: string;
    ratio: string;
  };
  alerts: Alert[];
}

export interface Alert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
}

export interface AdminAction {
  id: number;
  admin_id: number;
  action_type: string;
  entity_type: string;
  entity_id?: number;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

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
    total: number;
    total_pages: number;
    has_more: boolean;
  };
}

export interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  user_id?: number;
}

export interface AuthUser {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  is_admin: boolean;
  token: string;
}
