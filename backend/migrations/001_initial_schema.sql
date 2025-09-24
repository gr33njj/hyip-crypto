-- Создание схемы базы данных для системы управления депозитами USDT

-- Включаем UUID расширение
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    wallet_address TEXT UNIQUE, -- назначенный адрес TRON (если используется индивидуальные адреса)
    language_code VARCHAR(10) DEFAULT 'ru',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы users
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- Таблица депозитов с расширенной логикой для единого пула
CREATE TABLE deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tx_hash TEXT UNIQUE NOT NULL,
    amount NUMERIC(30,6) CHECK (amount > 0),
    token VARCHAR(32) DEFAULT 'USDT-TRC20',
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL, -- должен быть пул-адрес
    block_number BIGINT,
    confirmations INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN (
        'submitted',    -- клиент вставил tx_hash
        'detected',     -- найден мониторингом  
        'pending',      -- ждёт апрува админа
        'approved',     -- одобрен
        'rejected',     -- отклонён
        'failed'        -- ошибка обработки
    )),
    submitted_at TIMESTAMP,
    detected_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    processed_by INTEGER, -- admin user id
    admin_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы deposits
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_tx_hash ON deposits(tx_hash);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_from_address ON deposits(from_address);
CREATE INDEX idx_deposits_block_number ON deposits(block_number);
CREATE INDEX idx_deposits_created_at ON deposits(created_at);

-- Таблица начислений процентов
CREATE TABLE accruals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(30,6) NOT NULL CHECK (amount != 0), -- может быть отрицательным для корректировок
    reason TEXT NOT NULL,
    accrual_type VARCHAR(20) DEFAULT 'manual' CHECK (accrual_type IN (
        'manual',       -- ручное начисление админом
        'interest',     -- процентные начисления
        'bonus',        -- бонусы
        'correction'    -- корректировки
    )),
    reference_deposit_id INTEGER REFERENCES deposits(id), -- связь с депозитом (опционально)
    created_by INTEGER NOT NULL, -- admin user id
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы accruals
CREATE INDEX idx_accruals_user_id ON accruals(user_id);
CREATE INDEX idx_accruals_created_by ON accruals(created_by);
CREATE INDEX idx_accruals_created_at ON accruals(created_at);

-- Таблица заявок на вывод
CREATE TABLE withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    requested_amount NUMERIC(30,6) NOT NULL CHECK (requested_amount > 0),
    to_address TEXT NOT NULL,
    withdrawal_type VARCHAR(20) DEFAULT 'partial' CHECK (withdrawal_type IN (
        'partial',      -- частичный вывод
        'full'          -- полный вывод
    )),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- ожидает обработки
        'approved',     -- одобрена, но не выплачена
        'paid',         -- выплачена
        'rejected',     -- отклонена
        'cancelled'     -- отменена
    )),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_by INTEGER, -- admin user id
    processed_at TIMESTAMP,
    paid_at TIMESTAMP,
    tx_hash TEXT, -- хеш транзакции выплаты
    actual_amount NUMERIC(30,6), -- фактическая сумма с учётом комиссий
    admin_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы withdrawals
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_created_at ON withdrawals(created_at);

-- Таблица административных действий (аудит)
CREATE TABLE admin_actions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL, -- telegram_id админа или system
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50), -- deposits, withdrawals, accruals, etc
    entity_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы admin_actions
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_entity_type ON admin_actions(entity_type);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at);

-- Таблица снимков баланса (опционально, для производительности)
CREATE TABLE balance_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    on_chain_balance NUMERIC(30,6) DEFAULT 0,
    accrued_balance NUMERIC(30,6) DEFAULT 0,
    withdrawn_balance NUMERIC(30,6) DEFAULT 0,
    total_balance NUMERIC(30,6) GENERATED ALWAYS AS (on_chain_balance + accrued_balance - withdrawn_balance) STORED,
    snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы balance_snapshots
CREATE INDEX idx_balance_snapshots_user_id ON balance_snapshots(user_id);
CREATE INDEX idx_balance_snapshots_snapshot_at ON balance_snapshots(snapshot_at);

-- Таблица настроек системы
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставляем настройки по умолчанию
INSERT INTO system_settings (key, value, description) VALUES 
('min_deposit_amount', '10', 'Минимальная сумма депозита в USDT'),
('max_withdrawal_amount', '10000', 'Максимальная сумма вывода в USDT'),
('confirmations_threshold', '20', 'Минимальное количество подтверждений для депозита'),
('pool_wallet_address', '', 'Адрес пула для приёма депозитов'),
('hot_wallet_address', '', 'Адрес горячего кошелька для выплат'),
('withdrawal_fee_percent', '0', 'Комиссия за вывод в процентах'),
('daily_withdrawal_limit', '50000', 'Дневной лимит выводов в USDT'),
('maintenance_mode', 'false', 'Режим технического обслуживания');

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггеры
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для расчёта баланса пользователя
CREATE OR REPLACE FUNCTION calculate_user_balance(p_user_id INTEGER)
RETURNS TABLE (
    on_chain_balance NUMERIC(30,6),
    accrued_balance NUMERIC(30,6),
    withdrawn_balance NUMERIC(30,6),
    total_balance NUMERIC(30,6)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as on_chain_balance,
        COALESCE(SUM(a.amount), 0) as accrued_balance,
        COALESCE(SUM(CASE WHEN w.status = 'paid' THEN w.actual_amount ELSE 0 END), 0) as withdrawn_balance,
        COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) + 
        COALESCE(SUM(a.amount), 0) - 
        COALESCE(SUM(CASE WHEN w.status = 'paid' THEN w.actual_amount ELSE 0 END), 0) as total_balance
    FROM users u
    LEFT JOIN deposits d ON u.id = d.user_id
    LEFT JOIN accruals a ON u.id = a.user_id  
    LEFT JOIN withdrawals w ON u.id = w.user_id
    WHERE u.id = p_user_id
    GROUP BY u.id;
END;
$$ LANGUAGE plpgsql;
