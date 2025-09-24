const express = require('express');
const router = express.Router();
const telegramBotService = require('../services/telegramBot');
const { validateWebhookTx } = require('../middleware/validation');
const depositController = require('../controllers/depositController');

// Telegram webhook
router.post('/telegram', async (req, res) => {
    try {
        await telegramBotService.handleWebhook(req, res);
    } catch (error) {
        console.error('Ошибка обработки Telegram webhook:', error);
        res.status(500).json({
            error: 'webhook_error',
            message: 'Ошибка обработки webhook'
        });
    }
});

// Webhook для TRON транзакций (уже существует в deposits роуте)
router.post('/tx', validateWebhookTx, depositController.webhookTransaction);

// Webhook для уведомлений (можно использовать для интеграции с внешними сервисами)
router.post('/notification', async (req, res) => {
    try {
        const { type, data } = req.body;

        switch (type) {
            case 'deposit_approved':
                await telegramBotService.notifyDepositReceived(
                    data.user_id,
                    data.amount,
                    data.tx_hash,
                    'approved'
                );
                break;

            case 'deposit_rejected':
                await telegramBotService.notifyDepositReceived(
                    data.user_id,
                    data.amount,
                    data.tx_hash,
                    'rejected'
                );
                break;

            case 'withdrawal_approved':
                await telegramBotService.notifyWithdrawal(
                    data.user_id,
                    data.amount,
                    'approved'
                );
                break;

            case 'withdrawal_paid':
                await telegramBotService.notifyWithdrawal(
                    data.user_id,
                    data.amount,
                    'paid',
                    data.tx_hash
                );
                break;

            case 'withdrawal_rejected':
                await telegramBotService.notifyWithdrawal(
                    data.user_id,
                    data.amount,
                    'rejected',
                    null,
                    data.reason
                );
                break;

            default:
                console.log('Неизвестный тип уведомления:', type);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка обработки уведомления:', error);
        res.status(500).json({
            error: 'notification_error',
            message: 'Ошибка обработки уведомления'
        });
    }
});

module.exports = router;
