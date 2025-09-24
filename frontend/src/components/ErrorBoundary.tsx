import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Здесь можно добавить отправку ошибки в сервис мониторинга
    // например, Sentry, LogRocket и т.д.
    if (process.env.NODE_ENV === 'production') {
      // reportError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-6">💥</div>
            
            <h1 className="text-2xl font-bold text-primary mb-4">
              Что-то пошло не так
            </h1>
            
            <p className="text-secondary mb-6">
              Произошла неожиданная ошибка. Мы уже работаем над её устранением.
            </p>

            <div className="space-y-3 mb-6">
              <Button 
                onClick={this.handleReset}
                variant="primary"
                fullWidth
              >
                Попробовать снова
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="secondary"
                fullWidth
              >
                Перезагрузить приложение
              </Button>
            </div>

            {/* Детали ошибки в development режиме */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-secondary rounded-lg p-4 max-h-60 overflow-auto">
                <summary className="cursor-pointer font-semibold mb-2 text-error-600">
                  Детали ошибки (dev mode)
                </summary>
                <div className="text-xs font-mono text-primary space-y-2">
                  <div>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
