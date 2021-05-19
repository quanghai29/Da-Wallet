class Block {
    // index : index of block in blockchain
    // hash: string;
    // previousHash: string;
    // timestamp: number;
    // data: Transaction[];
    // difficulty: number;
    // nonce: number;
    constructor(index, hash, previousHash,
                timestamp, data, difficulty, nonce) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

module.exports = Block;