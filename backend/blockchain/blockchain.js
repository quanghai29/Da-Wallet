const Block = require('./block');

class BlockChain {
    constructor(genesisBlock){
        this.blockchain = [genesisBlock];
        this.length = 1;
    }

    addNewBlock = (newBlock) => {
        this.blockchain.push(newBlock);
        this.length++;
    }

    getLatestBlock = () => this.blockchain[this.length - 1];
}


module.exports = BlockChain;
