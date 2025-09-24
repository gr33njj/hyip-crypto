import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Link,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Check, Close, Visibility, OpenInNew } from '@mui/icons-material';
import { Deposit, PaginatedResponse } from '../types';
import { adminApi } from '../services/api';
import toast from 'react-hot-toast';

export const DepositsPage: React.FC = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [totalRows, setTotalRows] = useState(0);
  
  // Модальные окна
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; deposit: Deposit | null }>({
    open: false,
    deposit: null,
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; deposit: Deposit | null }>({
    open: false,
    deposit: null,
  });
  
  // Форма одобрения
  const [approveAmount, setApproveAmount] = useState('');
  const [approveComment, setApproveComment] = useState('');
  
  // Форма отклонения
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadDeposits();
  }, [paginationModel]);

  const loadDeposits = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getDeposits({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
      });

      if (response.success) {
        setDeposits(response.data.deposits);
        setTotalRows(response.data.pagination.total);
      }
    } catch (error) {
      toast.error(adminApi.handleError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (deposit: Deposit) => {
    setApproveDialog({ open: true, deposit });
    setApproveAmount(deposit.amount || '');
    setApproveComment('');
  };

  const handleReject = (deposit: Deposit) => {
    setRejectDialog({ open: true, deposit });
    setRejectReason('');
  };

  const submitApprove = async () => {
    if (!approveDialog.deposit) return;

    try {
      const data: any = {};
      if (approveAmount && approveAmount !== approveDialog.deposit.amount) {
        data.amount = parseFloat(approveAmount);
      }
      if (approveComment) {
        data.admin_comment = approveComment;
      }

      await adminApi.approveDeposit(approveDialog.deposit.id, data);
      toast.success('Депозит одобрен');
      setApproveDialog({ open: false, deposit: null });
      loadDeposits();
    } catch (error) {
      toast.error(adminApi.handleError(error));
    }
  };

  const submitReject = async () => {
    if (!rejectDialog.deposit) return;

    try {
      await adminApi.rejectDeposit(rejectDialog.deposit.id, rejectReason);
      toast.success('Депозит отклонён');
      setRejectDialog({ open: false, deposit: null });
      loadDeposits();
    } catch (error) {
      toast.error(adminApi.handleError(error));
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      submitted: { label: 'Подан', color: 'info' as const },
      detected: { label: 'Обнаружен', color: 'secondary' as const },
      pending: { label: 'На проверке', color: 'warning' as const },
      approved: { label: 'Одобрен', color: 'success' as const },
      rejected: { label: 'Отклонён', color: 'error' as const },
      failed: { label: 'Ошибка', color: 'error' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'default' as const };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getTronScanLink = (txHash: string) => {
    return `https://tronscan.org/#/transaction/${txHash}`;
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    {
      field: 'user',
      headerName: 'Пользователь',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {params.row.first_name || params.row.username || `ID: ${params.row.telegram_id}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            TG: {params.row.telegram_id}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'amount',
      headerName: 'Сумма',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {params.row.amount ? `${parseFloat(params.row.amount).toFixed(6)} USDT` : '—'}
        </Typography>
      ),
    },
    {
      field: 'tx_hash',
      headerName: 'Транзакция',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontFamily="monospace">
            {params.row.tx_hash.slice(0, 8)}...{params.row.tx_hash.slice(-8)}
          </Typography>
          <IconButton
            size="small"
            onClick={() => window.open(getTronScanLink(params.row.tx_hash), '_blank')}
          >
            <OpenInNew fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Статус',
      width: 120,
      renderCell: (params) => getStatusChip(params.row.status),
    },
    {
      field: 'confirmations',
      headerName: 'Подтверждения',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.confirmations || 0}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Создан',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {new Date(params.row.created_at).toLocaleString('ru-RU')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Действия',
      width: 150,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            icon={<Visibility />}
            label="Просмотр"
            onClick={() => window.open(getTronScanLink(params.row.tx_hash), '_blank')}
          />,
        ];

        if (params.row.status === 'pending' || params.row.status === 'submitted') {
          actions.push(
            <GridActionsCellItem
              icon={<Check />}
              label="Одобрить"
              onClick={() => handleApprove(params.row)}
              color="success"
            />,
            <GridActionsCellItem
              icon={<Close />}
              label="Отклонить"
              onClick={() => handleReject(params.row)}
              color="error"
            />
          );
        }

        return actions;
      },
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Депозиты
      </Typography>

      <Paper>
        <DataGrid
          rows={deposits}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]}
          rowCount={totalRows}
          loading={loading}
          paginationMode="server"
          disableRowSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>

      {/* Диалог одобрения */}
      <Dialog open={approveDialog.open} onClose={() => setApproveDialog({ open: false, deposit: null })}>
        <DialogTitle>Одобрить депозит</DialogTitle>
        <DialogContent>
          {approveDialog.deposit && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Пользователь:</strong> {approveDialog.deposit.first_name || approveDialog.deposit.username} (TG: {approveDialog.deposit.telegram_id})
                </Typography>
                <Typography variant="body2">
                  <strong>Транзакция:</strong> {approveDialog.deposit.tx_hash}
                </Typography>
              </Alert>

              <TextField
                autoFocus
                margin="dense"
                label="Сумма USDT"
                type="number"
                fullWidth
                variant="outlined"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                helperText="Оставьте пустым, чтобы использовать сумму из транзакции"
                sx={{ mb: 2 }}
              />

              <TextField
                margin="dense"
                label="Комментарий (опционально)"
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog({ open: false, deposit: null })}>
            Отмена
          </Button>
          <Button onClick={submitApprove} variant="contained" color="success">
            Одобрить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог отклонения */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, deposit: null })}>
        <DialogTitle>Отклонить депозит</DialogTitle>
        <DialogContent>
          {rejectDialog.deposit && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Пользователь:</strong> {rejectDialog.deposit.first_name || rejectDialog.deposit.username} (TG: {rejectDialog.deposit.telegram_id})
                </Typography>
                <Typography variant="body2">
                  <strong>Транзакция:</strong> {rejectDialog.deposit.tx_hash}
                </Typography>
              </Alert>

              <TextField
                autoFocus
                margin="dense"
                label="Причина отклонения"
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, deposit: null })}>
            Отмена
          </Button>
          <Button 
            onClick={submitReject} 
            variant="contained" 
            color="error"
            disabled={!rejectReason.trim()}
          >
            Отклонить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
