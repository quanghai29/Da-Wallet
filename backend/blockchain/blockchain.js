const Block = require('./block');
const blUtil = require('../utils/blockchain.util');
const txUtil = require('../utils/transaction.util');
const wallet = require('../wallet/wallet');
const trs =require('../transaction/transaction');
const trsPool = require('../transaction/transactionPool');
const _ = require('lodash');

// in seconds
const BLOCK_GENERATION_INTERVAL = 10;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

//Local Variable
const sysPrivateKey = '76456b9075147a8b5c52e9985fd309f1c532aafed70e4d010b7249cb9c897692';
const sysAdress = '04165c7464825649c888b6d9345ed5664964814ad9f57114f0927009bb0aaca3439a283f316bb28a0a8899cb183666e60879deb3d9ac6279c604b44b78987486d8';

class BlockChain {
    constructor(genesisBlock){
        this.blockchain = [genesisBlock];
        
        this.unspentTxOuts = [...trs.processTransactions(this.blockchain[0].data, [], 0)]; //genesisTransaction
    }

    /////////////////////////////////
    /* add new block to chain */
    ////////////////////////////////

    // tạo thông tin cho một block
    creatNewBlock = (index, previousHash, timestamp, data, difficulty) => {
        let nonce = 0;
        while (true) {
            const hash = blUtil.calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
            if (this.hashMatchesDifficulty(hash, difficulty)) {
                return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
            }
            nonce++;
        }
    };

    generateNextBlock = (address) => {
        const coinbaseTx = trs.getCoinbaseTransaction(address, this.blockchain.length);
        const blockData = [coinbaseTx].concat(trsPool.getTransactionPool());
        return this.generateRawNextBlock(blockData);
    };

    //Tạo mới 1 block kế tiếp
    // blockData: Transaction []
    generateRawNextBlock = (blockData) => {
        const previousBlock = this.getLatestBlock();
        const difficulty = this.getDifficulty();
        const nextIndex = previousBlock.index + 1;
        const nextTimestamp = blUtil.getCurrentTimestamp();
        const newBlock = this.creatNewBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
        this.addBlockToChain(newBlock);
        return newBlock;
    };


    //Tạo 1 block với transaction khi thực hiện giao dịch
    //privateKey cua nguoi gui
    generatenextBlockWithTransaction = (privateKey ,address, receiverAddress, amount) => {
        if (!txUtil.isValidAddress(receiverAddress)) {
            throw Error('invalid address');
        }
        if (typeof amount !== 'number') {
            throw Error('invalid amount');
        }
        const coinbaseTx = trs.getCoinbaseTransaction(address, this.blockchain.length);
        const tx = wallet.createTransaction(receiverAddress, amount, privateKey, _.cloneDeep(this.unspentTxOuts), trsPool.getTransactionPool());
        const blockData = [coinbaseTx, tx];
        return this.generateRawNextBlock(blockData);
    };

    //Khởi tạo 1 số tiền ban đầu cho tài khoản
    getFirstBalance = (receiverAddress) => {
        const amount = 30;
        return this.generatenextBlockWithTransaction(sysPrivateKey, sysAdress, receiverAddress, amount);
    }

    //Thêm một block mới vào chain
    addBlockToChain = (newBlock) => {
        if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
            this.blockchain.push(newBlock);
            return true;
        }
        return false;
    };
    
    sendTransaction = (address, amount) => {
        const tx = wallet.createTransaction(address, amount, wallet.getPrivateFromWallet(), _.cloneDeep(this.unspentTxOuts), getTransactionPool());
        addToTransactionPool(tx, getUnspentTxOuts());
        //broadCastTransactionPool();
        return tx;
    };

    /////////////////////////////////
    /* replaceChain */
    ////////////////////////////////

    //newBlocks : Block[]
    replaceChain = (newBlocks) => {
        if (this.isValidChain(newBlocks) && newBlocks.length > this.blockchain.length) {
            console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
            this.blockchain = newBlocks;
            //broadcastLatest();
        } else {
            console.log('Received blockchain invalid');
        }
    };


    /////////////////////////////////
    /* check valid */
    ////////////////////////////////

    //validate for one block
    isValidNewBlock = (newBlock, previousBlock) => {
        if (!this.isValidBlockStructure(newBlock)) {
            console.log('invalid block structure: %s', JSON.stringify(newBlock));
            return false;
        }
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('invalid index');
            return false;
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.log('invalid previoushash');
            return false;
        } else if (!this.isValidTimestamp(newBlock, previousBlock)) {
            console.log('invalid timestamp');
            return false;
        } else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
            console.log(typeof (newBlock.hash) + ' ' + typeof this.calculateHashForBlock(newBlock));
            console.log('invalid hash: ' + this.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
            return false;
        }else if(this.hashMatchesDifficulty(newBlock.hash, newBlock.difficulty) === false){
            console.log('block difficulty not satisfied. Expected: ' + block.difficulty + 'got: ' + block.hash);
            return false;
        }
        return true;
    };

    //validate for multiple block in chain
    // blockchainToValidate: Block []
    isValidChain = (blockchainToValidate) => {
        const isValidGenesis = (block) => {
            return JSON.stringify(block) === JSON.stringify(this.blockchain[0]);
        };
    
        if (isValidGenesis(blockchainToValidate[0]) === false) {
            return false;
        }
    
        for (let i = 1; i < blockchainToValidate.length; i++) {
            if (this.isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1]) === false) {
                return false;
            }
        }
        return true;
    };

    hashMatchesDifficulty = (hash, difficulty) => {
        const hashInBinary = blUtil.hexToBinary(hash);
        const requiredPrefix = '0'.repeat(difficulty);
        return hashInBinary.startsWith(requiredPrefix);
    };

    isValidTimestamp = (newBlock, previousBlock) => {
        return ( previousBlock.timestamp - 60 < newBlock.timestamp )
            && newBlock.timestamp - 60 < blUtil.getCurrentTimestamp();
    };


    /////////////////////////////////
    /* get and conculate difficulty of block */
    ////////////////////////////////
    getDifficulty = () => {
        const latestBlock = this.blockchain[this.blockchain.length - 1];
        if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
            return getAdjustedDifficulty(latestBlock);
        } else {
            return latestBlock.difficulty;
        }
    };

    getAdjustedDifficulty = (latestBlock) => {
        const prevAdjustmentBlock = this.blockchain[this.blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
        const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
        const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
        if (timeTaken < timeExpected / 2) {
            return prevAdjustmentBlock.difficulty + 1;
        } else if (timeTaken > timeExpected * 2) {
            return prevAdjustmentBlock.difficulty - 1;
        } else {
            return prevAdjustmentBlock.difficulty;
        }
    };

    /////////////////////////////////
    /* support function */
    ////////////////////////////////
    getLatestBlock = () => this.blockchain[this.blockchain.length - 1];

    calculateHashForBlock = (block) => blUtil.calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);

    isValidBlockStructure = (block) => {
        return typeof block.index === 'number'
            && typeof block.hash === 'string'
            && typeof block.previousHash === 'string'
            && typeof block.timestamp === 'number'
            //&& typeof block.data === 'string';
    };

    handleReceivedTransaction = (transaction) => {
        addToTransactionPool(transaction, getUnspentTxOuts());
    };

    getUnspentTxOuts = () => this.unspentTxOuts;
    
}


module.exports = BlockChain;
