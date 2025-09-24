import { TelegramWebApp } from '../types';

// Сервис для работы с Telegram WebApp API
class TelegramService {
  private webApp: TelegramWebApp | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  // Инициализация WebApp
  init() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;
      this.isInitialized = true;
      
      // Настраиваем WebApp
      this.webApp.ready();
      this.webApp.expand();
      
      // Применяем тему
      this.applyTheme();
      
      console.log('🤖 Telegram WebApp инициализован:', {
        version: this.webApp.version,
        platform: this.webApp.platform,
        colorScheme: this.webApp.colorScheme,
        viewportHeight: this.webApp.viewportHeight,
        user: this.webApp.initDataUnsafe?.user
      });
    } else {
      console.warn('⚠️ Telegram WebApp не доступен (возможно, запущено вне Telegram)');
    }
  }

  // Проверка, инициализован ли WebApp
  isReady(): boolean {
    return this.isInitialized && this.webApp !== null;
  }

  // Получение данных пользователя
  getUser() {
    if (!this.webApp) return null;
    return this.webApp.initDataUnsafe?.user || null;
  }

  // Получение init данных
  getInitData(): string {
    if (!this.webApp) return '';
    return this.webApp.initData || '';
  }

  // Получение текущей темы
  getColorScheme(): 'light' | 'dark' {
    if (!this.webApp) return 'light';
    return this.webApp.colorScheme || 'light';
  }

  // Получение параметров темы
  getThemeParams() {
    if (!this.webApp) return {};
    return this.webApp.themeParams || {};
  }

  // Применение темы к документу
  applyTheme() {
    if (!this.webApp) return;

    const themeParams = this.webApp.themeParams;
    const colorScheme = this.webApp.colorScheme;
    
    // Устанавливаем CSS переменные
    const root = document.documentElement;
    
    if (themeParams.bg_color) {
      root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
    }
    
    if (themeParams.text_color) {
      root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
    }
    
    if (themeParams.hint_color) {
      root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
    }
    
    if (themeParams.link_color) {
      root.style.setProperty('--tg-theme-link-color', themeParams.link_color);
    }
    
    if (themeParams.button_color) {
      root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
    }
    
    if (themeParams.button_text_color) {
      root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
    }
    
    if (themeParams.secondary_bg_color) {
      root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
    }

    // Устанавливаем data-theme атрибут
    document.documentElement.setAttribute('data-theme', colorScheme);
    
    // Устанавливаем цвет фона для body
    document.body.style.backgroundColor = themeParams.bg_color || (colorScheme === 'dark' ? '#17212b' : '#ffffff');
  }

  // Отображение главной кнопки
  showMainButton(text: string, onClick: () => void) {
    if (!this.webApp?.MainButton) return;

    this.webApp.MainButton.setText(text);
    this.webApp.MainButton.onClick(onClick);
    this.webApp.MainButton.show();
  }

  // Скрытие главной кнопки
  hideMainButton() {
    if (!this.webApp?.MainButton) return;
    this.webApp.MainButton.hide();
  }

  // Отображение кнопки "Назад"
  showBackButton(onClick: () => void) {
    if (!this.webApp?.BackButton) return;

    this.webApp.BackButton.onClick(onClick);
    this.webApp.BackButton.show();
  }

  // Скрытие кнопки "Назад"
  hideBackButton() {
    if (!this.webApp?.BackButton) return;
    this.webApp.BackButton.hide();
  }

  // Показать алерт
  showAlert(message: string, callback?: () => void) {
    if (!this.webApp) {
      alert(message);
      callback?.();
      return;
    }

    this.webApp.showAlert(message, callback);
  }

  // Показать подтверждение
  showConfirm(message: string, callback?: (confirmed: boolean) => void) {
    if (!this.webApp) {
      const confirmed = confirm(message);
      callback?.(confirmed);
      return;
    }

    this.webApp.showConfirm(message, callback);
  }

  // Показать всплывающее окно
  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }, callback?: (buttonId: string) => void) {
    if (!this.webApp) {
      this.showAlert(params.message);
      return;
    }

    this.webApp.showPopup(params, callback);
  }

  // Haptic feedback
  hapticFeedback(type: 'impact' | 'notification' | 'selection', style?: 'light' | 'medium' | 'heavy' | 'error' | 'success' | 'warning') {
    if (!this.webApp?.HapticFeedback) return;

    switch (type) {
      case 'impact':
        this.webApp.HapticFeedback.impactOccurred(style as any || 'medium');
        break;
      case 'notification':
        this.webApp.HapticFeedback.notificationOccurred(style as any || 'success');
        break;
      case 'selection':
        this.webApp.HapticFeedback.selectionChanged();
        break;
    }
  }

  // Отправка данных боту
  sendData(data: any) {
    if (!this.webApp) return;
    
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    this.webApp.sendData(jsonData);
  }

  // Закрытие WebApp
  close() {
    if (!this.webApp) return;
    this.webApp.close();
  }

  // Подписка на события
  onEvent(eventType: string, handler: () => void) {
    if (!this.webApp) return;
    this.webApp.onEvent(eventType, handler);
  }

  // Отписка от событий
  offEvent(eventType: string, handler: () => void) {
    if (!this.webApp) return;
    this.webApp.offEvent(eventType, handler);
  }

  // Получение высоты viewport
  getViewportHeight(): number {
    if (!this.webApp) return window.innerHeight;
    return this.webApp.viewportHeight;
  }

  // Получение стабильной высоты viewport
  getViewportStableHeight(): number {
    if (!this.webApp) return window.innerHeight;
    return this.webApp.viewportStableHeight;
  }

  // Проверка, развернуто ли приложение
  isExpanded(): boolean {
    if (!this.webApp) return true;
    return this.webApp.isExpanded;
  }

  // Получение платформы
  getPlatform(): string {
    if (!this.webApp) return 'unknown';
    return this.webApp.platform;
  }

  // Получение версии
  getVersion(): string {
    if (!this.webApp) return '0.0';
    return this.webApp.version;
  }

  // Включение подтверждения закрытия
  enableClosingConfirmation() {
    if (!this.webApp) return;
    this.webApp.isClosingConfirmationEnabled = true;
  }

  // Отключение подтверждения закрытия
  disableClosingConfirmation() {
    if (!this.webApp) return;
    this.webApp.isClosingConfirmationEnabled = false;
  }

  // Проверка, запущено ли в Telegram
  isInTelegram(): boolean {
    return this.isReady();
  }

  // Получение информации об окружении
  getEnvironmentInfo() {
    return {
      isInTelegram: this.isInTelegram(),
      platform: this.getPlatform(),
      version: this.getVersion(),
      colorScheme: this.getColorScheme(),
      viewportHeight: this.getViewportHeight(),
      isExpanded: this.isExpanded(),
      user: this.getUser(),
    };
  }
}

// Экспорт синглтона
export const telegramService = new TelegramService();

// Хук для использования в React компонентах
export const useTelegram = () => {
  return {
    webApp: telegramService,
    user: telegramService.getUser(),
    isReady: telegramService.isReady(),
    colorScheme: telegramService.getColorScheme(),
    themeParams: telegramService.getThemeParams(),
  };
};

export default telegramService;
