import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

export const UsersPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Пользователи
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Страница пользователей в разработке
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Здесь будет список всех пользователей с их статистикой
        </Typography>
      </Paper>
    </Container>
  );
};
