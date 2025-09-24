import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

export const WithdrawalsPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Выводы
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Страница выводов в разработке
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Здесь будет таблица с заявками на вывод и возможность их обработки
        </Typography>
      </Paper>
    </Container>
  );
};
