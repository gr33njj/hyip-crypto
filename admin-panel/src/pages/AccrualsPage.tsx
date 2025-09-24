import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

export const AccrualsPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Начисления
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Страница начислений в разработке
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Здесь будет возможность создавать ручные начисления и просматривать историю
        </Typography>
      </Paper>
    </Container>
  );
};
