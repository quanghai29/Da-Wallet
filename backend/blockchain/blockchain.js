const Block = require('./block');
const blUtil = require('../utils/blockchain.util');

class BlockChain {
    constructor(genesisBlock){
        this.blockchain = [genesisBlock];
    }
    /////////////////////////////////
    /* add new block to chain */
    ////////////////////////////////

    // blockData: Transaction []
    creatNewBlock = (index, previousHash, timestamp, data, difficulty) => {
        let nonce = 0;
        const hash = blUtil.calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
        return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
    };

    generateRawNextBlock = (blockData) => {
        const previousBlock = this.getLatestBlock();
        const difficulty = 0;
        const nextIndex = previousBlock.index + 1;
        const nextTimestamp = blUtil.getCurrentTimestamp();
        const newBlock = this.creatNewBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
        this.addBlockToChain(newBlock);
        return newBlock;
    };

    addBlockToChain = (newBlock) => {
        if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
            this.blockchain.push(newBlock);
            return true;
        }
        return false;
    };
    
    /////////////////////////////////
    /* check valid */
    ////////////////////////////////

    //validate for one block
    isValidNewBlock = (newBlock, previousBlock) => {
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('invalid index');
            return false;
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.log('invalid previoushash');
            return false;
        } else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
            console.log(typeof (newBlock.hash) + ' ' + typeof this.calculateHashForBlock(newBlock));
            console.log('invalid hash: ' + this.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
            return false;
        }
        return true;
    };

    //validate for multiple block in chain
    // blockchainToValidate: Block []
    isValidChain = (blockchainToValidate) => {
        const isValidGenesis = (block) => {
            return JSON.stringify(block) === JSON.stringify(genesisBlock);
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
            && typeof block.data === 'string';
    };
}


module.exports = BlockChain;
