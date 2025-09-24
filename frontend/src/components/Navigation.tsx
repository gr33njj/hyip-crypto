import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react';
import { useTelegram } from '../services/telegram';
import clsx from 'clsx';

interface NavigationProps {
  currentPath: string;
}

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPath }) => {
  const navigate = useNavigate();
  const { webApp } = useTelegram();

  const navItems: NavItem[] = [
    {
      path: '/',
      icon: <Home className="w-5 h-5" />,
      label: 'Главная',
    },
    {
      path: '/deposit',
      icon: <ArrowDownToLine className="w-5 h-5" />,
      label: 'Пополнить',
    },
    {
      path: '/withdrawal',
      icon: <ArrowUpFromLine className="w-5 h-5" />,
      label: 'Вывести',
    },
    {
      path: '/history',
      icon: <History className="w-5 h-5" />,
      label: 'История',
    },
  ];

  const handleNavigation = (path: string) => {
    if (currentPath !== path) {
      webApp.hapticFeedback('selection');
      navigate(path);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-gray-200 safe-area-bottom">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 px-1 transition-all duration-200',
                'touch-manipulation',
                isActive 
                  ? 'text-link' 
                  : 'text-secondary hover:text-primary'
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-error-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.div>
                  )}
                </div>
                <span className="text-xs mt-1 font-medium">
                  {item.label}
                </span>
              </motion.div>
              
              {/* Активный индикатор */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-link rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;
