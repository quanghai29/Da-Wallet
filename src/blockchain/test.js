const Block = require('./block');
const blUtil = require('../utils/blockchain.util');
const txUtil = require('../utils/transaction.util');
const wallet = require('../wallet/wallet');
const trs = require('../transaction/transaction');
const trsPool = require('../transaction/transactionPool');
const ws = require('../ws');
const _ = require('lodash');

// in seconds
const BLOCK_GENERATION_INTERVAL = 10;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

//Local Variable
const sysPrivateKey = '76456b9075147a8b5c52e9985fd309f1c532aafed70e4d010b7249cb9c897692';
const sysAdress = '04165c7464825649c888b6d9345ed5664964814ad9f57114f0927009bb0aaca3439a283f316bb28a0a8899cb183666e60879deb3d9ac6279c604b44b78987486d8';

/* GenesisTransaction */
const genesisTxt = {};
genesisTxt.txIns = [{'signature': '', 'txOutId': '', 'txOutIndex': 0}];
genesisTxt.txOuts = [{
    'address': sysAdress,
    'amount': 900000000
}]
genesisTxt.id = trs.getTransactionId(genesisTxt);

const hash = blUtil.calculateHash(0,'',blUtil.getCurrentTimestamp(),[genesisTxt],0,0);
const genesisBlock = new Block(0,hash,'',blUtil.getCurrentTimestamp(),[genesisTxt],0,0);

let blockchain = [genesisBlock];

let unspentTxOuts = [...trs.processTransactions(blockchain[0].data, [], 0)]; //genesisTransaction
    
    /////////////////////////////////
    /* add new block to chain */
    ////////////////////////////////

    // tạo thông tin cho một block
    const creatNewBlock = (index, previousHash, timestamp, data, difficulty) => {
        let nonce = 0;
        while (true) {
            const hash = blUtil.calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
            if (hashMatchesDifficulty(hash, difficulty)) {
                return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
            }
            nonce++;
        }
    };

    const generateNextBlock = (address) => {
        const coinbaseTx = trs.getCoinbaseTransaction(address, blockchain.length);
        const blockData = [coinbaseTx].concat(trsPool.getTransactionPool());
        
        const newBlock = generateRawNextBlock(blockData);
        return newBlock;
    };

    //Tạo mới 1 block kế tiếp
    // blockData: Transaction []
    const generateRawNextBlock = (blockData) => {
        const previousBlock = getLatestBlock();
        const difficulty = getDifficulty();
        const nextIndex = previousBlock.index + 1;
        const nextTimestamp = blUtil.getCurrentTimestamp();
        const newBlock = creatNewBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
        if (addBlockToChain(newBlock) === true) {
            ws.broadcastLatest();
            return newBlock;
        } else {
            return null;
        }
        return newBlock;
    };


    //Tạo 1 block với transaction khi thực hiện giao dịch
    //privateKey cua nguoi gui
    const generatenextBlockWithTransaction = (privateKey, address, receiverAddress, amount) => {
        if (!txUtil.isValidAddress(receiverAddress)) {
            throw Error('invalid address');
        }
        if (typeof amount !== 'number') {
            throw Error('invalid amount');
        }
        const coinbaseTx = trs.getCoinbaseTransaction(address, blockchain.length);
        const tx = wallet.createTransaction(receiverAddress, amount, privateKey, _.cloneDeep(unspentTxOuts), trsPool.getTransactionPool());
        const blockData = [coinbaseTx, tx];
        const newBlock = generateRawNextBlock(blockData);
        return newBlock;
    };

    //Khởi tạo 1 số tiền ban đầu cho tài khoản
    getFirstBalance = (receiverAddress) => {
        const amount = 30;
        const newBlock = generatenextBlockWithTransaction(sysPrivateKey, sysAdress, receiverAddress, amount);
        return newBlock;
    }

    //Thêm một block mới vào chain
    addBlockToChain = (newBlock) => {
        if (isValidNewBlock(newBlock, blockchain[blockchain.length - 1])) {
            const retVal = trs.processTransactions(newBlock.data, getUnspentTxOuts(), newBlock.index);
            if (retVal === null) {
                console.log('block is not valid in terms of transactions');
                return false;
            } else {
                blockchain.push(newBlock);
                setUnspentTxOuts(retVal);
                trsPool.updateTransactionPool(unspentTxOuts);
                return true;
            }
        }
        return false;
    };

    // and txPool should be only updated at the same time
    const setUnspentTxOuts = (newUnspentTxOut) => {
        console.log('replacing unspentTxouts with: %s', newUnspentTxOut);
        unspentTxOuts = newUnspentTxOut;
    };

    const sendTransaction = (privateKey, address, amount) => {
        const tx = wallet.createTransaction(address, amount, privateKey, getUnspentTxOuts(), trsPool.getTransactionPool());
        trsPool.addToTransactionPool(tx, getUnspentTxOuts());
        ws.broadCastTransactionPool();
        return tx;
    };

    /////////////////////////////////
    /* replaceChain */
    ////////////////////////////////

    //newBlocks : Block[]
    const replaceChain = (newBlocks) => {
        if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
            console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
            blockchain = newBlocks;
            ws.broadcastLatest();
        } else {
            console.log('Received blockchain invalid');
        }
    };


    /////////////////////////////////
    /* check valid */
    ////////////////////////////////

    //validate for one block
    const isValidNewBlock = (newBlock, previousBlock) => {
        if (!isValidBlockStructure(newBlock)) {
            console.log('invalid block structure: %s', JSON.stringify(newBlock));
            return false;
        }
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('invalid index');
            return false;
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.log('invalid previoushash');
            return false;
        } else if (!isValidTimestamp(newBlock, previousBlock)) {
            console.log('invalid timestamp');
            return false;
        } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
            console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
            console.log('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
            return false;
        } else if (hashMatchesDifficulty(newBlock.hash, newBlock.difficulty) === false) {
            console.log('block difficulty not satisfied. Expected: ' + block.difficulty + 'got: ' + block.hash);
            return false;
        }
        return true;
    };

    //validate for multiple block in chain
    // blockchainToValidate: Block []
    const isValidChain = (blockchainToValidate) => {
        const isValidGenesis = (block) => {
            return JSON.stringify(block) === JSON.stringify(blockchain[0]);
        };

        if (isValidGenesis(blockchainToValidate[0]) === false) {
            return false;
        }

        for (let i = 1; i < blockchainToValidate.length; i++) {
            if (isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1]) === false) {
                return false;
            }
        }
        return true;
    };

    const hashMatchesDifficulty = (hash, difficulty) => {
        const hashInBinary = blUtil.hexToBinary(hash);
        const requiredPrefix = '0'.repeat(difficulty);
        return hashInBinary.startsWith(requiredPrefix);
    };

    const isValidTimestamp = (newBlock, previousBlock) => {
        return (previousBlock.timestamp - 60 < newBlock.timestamp)
            && newBlock.timestamp - 60 < blUtil.getCurrentTimestamp();
    };


    /////////////////////////////////
    /* get and conculate difficulty of block */
    ////////////////////////////////
    const getDifficulty = () => {
        const latestBlock = blockchain[blockchain.length - 1];
        if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
            return getAdjustedDifficulty(latestBlock);
        } else {
            return latestBlock.difficulty;
        }
    };

    const getAdjustedDifficulty = (latestBlock) => {
        const prevAdjustmentBlock = blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
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
    const getLatestBlock = () => blockchain[blockchain.length - 1];

    const calculateHashForBlock = (block) => blUtil.calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);

    const isValidBlockStructure = (block) => {
        return typeof block.index === 'number'
            && typeof block.hash === 'string'
            && typeof block.previousHash === 'string'
            && typeof block.timestamp === 'number'
        //&& typeof block.data === 'string';
    };

    const handleReceivedTransaction = (transaction) => {
        addToTransactionPool(transaction, getUnspentTxOuts());
    };

    const getUnspentTxOuts = () => unspentTxOuts;

    const getBlockchain = () => blockchain;

    // gets the unspent transaction outputs owned by the wallet
    const getMyUnspentTransactionOutputs = (address) => {
        return findUnspentTxOuts(address, getUnspentTxOuts());
    };
module.exports = {
    getBlockchain, getUnspentTxOuts, getLatestBlock, sendTransaction,
    generateRawNextBlock, generateNextBlock, generatenextBlockWithTransaction,
    handleReceivedTransaction, getMyUnspentTransactionOutputs,
    isValidBlockStructure, replaceChain, addBlockToChain,getFirstBalance
}
