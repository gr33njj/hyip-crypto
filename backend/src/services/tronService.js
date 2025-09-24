const TronWeb = require('tronweb');
const config = require('../config');
const Deposit = require('../models/Deposit');

class TronService {
    constructor() {
        this.tronWeb = null;
        this.isConnected = false;
        this.init();
    }

    // Инициализация TronWeb
    init() {
        try {
            const fullNode = config.tron.fullNode;
            const solidityNode = config.tron.solidityNode;
            const eventServer = config.tron.eventServer;

            this.tronWeb = new TronWeb({
                fullHost: fullNode,
                headers: config.tron.apiKey ? { 'TRON-PRO-API-KEY': config.tron.apiKey } : {},
                privateKey: '0'.repeat(64) // Пустой ключ для read-only операций
            });

            this.isConnected = true;
            console.log('✅ TronWeb инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации TronWeb:', error);
            this.isConnected = false;
        }
    }

    // Проверка подключения
    async checkConnection() {
        try {
            const nodeInfo = await this.tronWeb.trx.getNodeInfo();
            return nodeInfo && nodeInfo.activeConnectCount !== undefined;
        } catch (error) {
            console.error('Ошибка проверки подключения к TRON:', error);
            return false;
        }
    }

    // Получение информации о токене USDT
    async getUSDTContractInfo() {
        try {
            const contract = await this.tronWeb.contract().at(config.usdt.contractAddress);
            
            const name = await contract.name().call();
            const symbol = await contract.symbol().call();
            const decimals = await contract.decimals().call();
            const totalSupply = await contract.totalSupply().call();

            return {
                name: name,
                symbol: symbol,
                decimals: parseInt(decimals),
                totalSupply: totalSupply.toString(),
                contractAddress: config.usdt.contractAddress
            };
        } catch (error) {
            console.error('Ошибка получения информации о USDT контракте:', error);
            throw error;
        }
    }

    // Получение баланса USDT для адреса
    async getUSDTBalance(address) {
        try {
            const contract = await this.tronWeb.contract().at(config.usdt.contractAddress);
            const balance = await contract.balanceOf(address).call();
            
            // Конвертируем из wei в USDT (6 decimals)
            return this.tronWeb.fromSun(balance) / Math.pow(10, config.usdt.decimals - 6);
        } catch (error) {
            console.error(`Ошибка получения баланса USDT для ${address}:`, error);
            return 0;
        }
    }

    // Получение TRX баланса для адреса
    async getTRXBalance(address) {
        try {
            const balance = await this.tronWeb.trx.getBalance(address);
            return this.tronWeb.fromSun(balance);
        } catch (error) {
            console.error(`Ошибка получения баланса TRX для ${address}:`, error);
            return 0;
        }
    }

    // Проверка валидности TRON адреса
    isValidAddress(address) {
        return this.tronWeb.isAddress(address);
    }

    // Получение информации о транзакции
    async getTransactionInfo(txHash) {
        try {
            const transaction = await this.tronWeb.trx.getTransaction(txHash);
            const transactionInfo = await this.tronWeb.trx.getTransactionInfo(txHash);
            
            if (!transaction) {
                return null;
            }

            return {
                transaction,
                transactionInfo,
                hash: txHash,
                blockNumber: transactionInfo.blockNumber,
                confirmations: await this.getConfirmations(transactionInfo.blockNumber),
                success: transactionInfo.result === 'SUCCESS'
            };
        } catch (error) {
            console.error(`Ошибка получения информации о транзакции ${txHash}:`, error);
            return null;
        }
    }

    // Получение количества подтверждений для блока
    async getConfirmations(blockNumber) {
        try {
            const currentBlock = await this.tronWeb.trx.getCurrentBlock();
            const currentBlockNumber = currentBlock.block_header.raw_data.number;
            
            return Math.max(0, currentBlockNumber - blockNumber);
        } catch (error) {
            console.error('Ошибка получения подтверждений:', error);
            return 0;
        }
    }

    // Парсинг TRC-20 Transfer события из транзакции
    parseUSDTTransfer(transaction, transactionInfo) {
        try {
            if (!transactionInfo.log || transactionInfo.log.length === 0) {
                return null;
            }

            // Ищем Transfer события
            const transferEvents = transactionInfo.log.filter(log => {
                return log.address === this.tronWeb.address.toHex(config.usdt.contractAddress) &&
                       log.topics && log.topics.length === 3 &&
                       log.topics[0] === 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // Transfer event signature
            });

            if (transferEvents.length === 0) {
                return null;
            }

            const transfers = transferEvents.map(event => {
                const fromAddress = this.tronWeb.address.fromHex('41' + event.topics[1].slice(24));
                const toAddress = this.tronWeb.address.fromHex('41' + event.topics[2].slice(24));
                const amount = parseInt(event.data, 16) / Math.pow(10, config.usdt.decimals);

                return {
                    from: fromAddress,
                    to: toAddress,
                    amount: amount,
                    token: 'USDT-TRC20'
                };
            });

            return transfers;
        } catch (error) {
            console.error('Ошибка парсинга USDT Transfer:', error);
            return null;
        }
    }

    // Мониторинг новых блоков
    async startBlockMonitoring() {
        if (!this.isConnected) {
            console.error('TronWeb не подключен');
            return;
        }

        console.log('🔍 Запуск мониторинга новых блоков...');
        
        let lastProcessedBlock = await this.getLastProcessedBlock();
        
        const monitorBlocks = async () => {
            try {
                const currentBlock = await this.tronWeb.trx.getCurrentBlock();
                const currentBlockNumber = currentBlock.block_header.raw_data.number;

                if (currentBlockNumber > lastProcessedBlock) {
                    console.log(`📦 Обработка блоков ${lastProcessedBlock + 1} - ${currentBlockNumber}`);
                    
                    for (let blockNum = lastProcessedBlock + 1; blockNum <= currentBlockNumber; blockNum++) {
                        await this.processBlock(blockNum);
                    }
                    
                    lastProcessedBlock = currentBlockNumber;
                    await this.saveLastProcessedBlock(lastProcessedBlock);
                }
            } catch (error) {
                console.error('Ошибка мониторинга блоков:', error);
            }
        };

        // Проверяем новые блоки каждые 3 секунды
        setInterval(monitorBlocks, 3000);
        
        // Первоначальная проверка
        monitorBlocks();
    }

    // Обработка блока
    async processBlock(blockNumber) {
        try {
            const block = await this.tronWeb.trx.getBlockByNumber(blockNumber);
            
            if (!block || !block.transactions) {
                return;
            }

            for (const tx of block.transactions) {
                await this.processTransaction(tx.txID, blockNumber);
            }
        } catch (error) {
            console.error(`Ошибка обработки блока ${blockNumber}:`, error);
        }
    }

    // Обработка транзакции
    async processTransaction(txHash, blockNumber) {
        try {
            const txInfo = await this.getTransactionInfo(txHash);
            
            if (!txInfo || !txInfo.success) {
                return;
            }

            const transfers = this.parseUSDTTransfer(txInfo.transaction, txInfo.transactionInfo);
            
            if (!transfers || transfers.length === 0) {
                return;
            }

            // Обрабатываем каждый transfer
            for (const transfer of transfers) {
                await this.handleUSDTTransfer(txHash, transfer, blockNumber, txInfo.confirmations);
            }
        } catch (error) {
            console.error(`Ошибка обработки транзакции ${txHash}:`, error);
        }
    }

    // Обработка USDT перевода
    async handleUSDTTransfer(txHash, transfer, blockNumber, confirmations) {
        try {
            // Проверяем, что это перевод на наш пул-адрес
            if (transfer.to !== config.wallets.poolAddress) {
                return;
            }

            // Проверяем минимальную сумму
            if (transfer.amount < config.security.minDepositAmount) {
                console.log(`💰 Транзакция ${txHash} ниже минимальной суммы: ${transfer.amount} USDT`);
                return;
            }

            // Проверяем, не обработана ли уже эта транзакция
            const existingDeposit = await Deposit.findByTxHash(txHash);
            
            if (existingDeposit) {
                // Обновляем количество подтверждений
                if (existingDeposit.confirmations !== confirmations) {
                    await Deposit.updateConfirmations(txHash, confirmations);
                    console.log(`🔄 Обновлены подтверждения для ${txHash}: ${confirmations}`);
                }
                return;
            }

            // Создаём новый депозит
            const deposit = await Deposit.createFromMonitoring({
                tx_hash: txHash,
                amount: transfer.amount,
                token: transfer.token,
                from_address: transfer.from,
                to_address: transfer.to,
                block_number: blockNumber,
                confirmations: confirmations
            });

            console.log(`💰 Обнаружен новый депозит: ${transfer.amount} USDT от ${transfer.from}`);
            console.log(`📝 Транзакция: ${txHash}`);

            // Если достаточно подтверждений, переводим в статус pending
            if (confirmations >= config.security.confirmationsThreshold) {
                await Deposit.update(deposit.id, { status: 'pending' });
                console.log(`✅ Депозит ${deposit.id} готов к одобрению администратором`);
                
                // Здесь можно отправить уведомление администратору
                await this.notifyAdminNewDeposit(deposit);
            }

        } catch (error) {
            console.error('Ошибка обработки USDT перевода:', error);
        }
    }

    // Уведомление администратора о новом депозите
    async notifyAdminNewDeposit(deposit) {
        try {
            // Здесь будет интеграция с Telegram ботом для уведомлений
            console.log(`📢 Новый депозит требует одобрения: ${deposit.id}`);
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }

    // Сохранение последнего обработанного блока
    async saveLastProcessedBlock(blockNumber) {
        try {
            const fs = require('fs').promises;
            await fs.writeFile('/tmp/last_processed_block.txt', blockNumber.toString());
        } catch (error) {
            console.error('Ошибка сохранения последнего блока:', error);
        }
    }

    // Получение последнего обработанного блока
    async getLastProcessedBlock() {
        try {
            const fs = require('fs').promises;
            const data = await fs.readFile('/tmp/last_processed_block.txt', 'utf8');
            return parseInt(data) || await this.getCurrentBlockNumber() - 10; // Начинаем с 10 блоков назад
        } catch (error) {
            // Если файл не существует, начинаем с текущего блока
            return await this.getCurrentBlockNumber() - 10;
        }
    }

    // Получение номера текущего блока
    async getCurrentBlockNumber() {
        try {
            const currentBlock = await this.tronWeb.trx.getCurrentBlock();
            return currentBlock.block_header.raw_data.number;
        } catch (error) {
            console.error('Ошибка получения текущего блока:', error);
            return 0;
        }
    }

    // Валидация транзакции перед одобрением
    async validateTransaction(txHash, expectedAmount = null, expectedToAddress = null) {
        try {
            const txInfo = await this.getTransactionInfo(txHash);
            
            if (!txInfo) {
                return { valid: false, reason: 'Транзакция не найдена' };
            }

            if (!txInfo.success) {
                return { valid: false, reason: 'Транзакция неуспешна' };
            }

            const transfers = this.parseUSDTTransfer(txInfo.transaction, txInfo.transactionInfo);
            
            if (!transfers || transfers.length === 0) {
                return { valid: false, reason: 'Не найдены USDT переводы' };
            }

            // Находим перевод на наш адрес
            const relevantTransfer = transfers.find(t => 
                t.to === (expectedToAddress || config.wallets.poolAddress)
            );

            if (!relevantTransfer) {
                return { valid: false, reason: 'Перевод не на указанный адрес' };
            }

            if (expectedAmount && Math.abs(relevantTransfer.amount - expectedAmount) > 0.000001) {
                return { valid: false, reason: 'Сумма не совпадает' };
            }

            if (txInfo.confirmations < config.security.confirmationsThreshold) {
                return { 
                    valid: false, 
                    reason: `Недостаточно подтверждений: ${txInfo.confirmations}/${config.security.confirmationsThreshold}` 
                };
            }

            return {
                valid: true,
                transfer: relevantTransfer,
                confirmations: txInfo.confirmations,
                blockNumber: txInfo.blockNumber
            };

        } catch (error) {
            console.error('Ошибка валидации транзакции:', error);
            return { valid: false, reason: 'Ошибка проверки транзакции' };
        }
    }
}

// Экспорт синглтона
const tronService = new TronService();

module.exports = tronService;
