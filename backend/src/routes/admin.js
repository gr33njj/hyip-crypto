const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { 
    validateDepositAdmin, 
    validateReject, 
    validateAccrual, 
    validateMarkPaid,
    validatePagination,
    validateListFilters
} = require('../middleware/validation');

// Все админские роуты требуют JWT аутентификации и прав админа
router.use(authenticateJWT);
router.use(requireAdmin);

// Дашборд админа
router.get('/dashboard', adminController.getDashboard);

// Управление депозитами
router.get('/deposits', validatePagination, validateListFilters, adminController.getAllDeposits);
router.post('/deposits/:id/approve', validateDepositAdmin, adminController.approveDeposit);
router.post('/deposits/:id/reject', validateReject, adminController.rejectDeposit);

// Управление выводами
router.get('/withdrawals', validatePagination, validateListFilters, adminController.getAllWithdrawals);
router.post('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.post('/withdrawals/:id/reject', validateReject, adminController.rejectWithdrawal);
router.post('/withdrawals/:id/paid', validateMarkPaid, adminController.markWithdrawalPaid);

// Управление начислениями
router.post('/accruals', validateAccrual, adminController.createAccrual);

// Управление пользователями
router.get('/users', validatePagination, adminController.getAllUsers);

module.exports = router;
