const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;
const txUtil = require('../utils/transaction.util');

const ec = new EC('secp256k1');

const COINBASE_AMOUNT = 50;

class UnspentTxOut {
    constructor(txOutId, txOutIndex, address, amount) {
        this.txOutId = txOutId;//string
        this.txOutIndex = txOutIndex;//number
        this.address = address;//string
        this.amount = amount;//number
    }
}

class TxIn {
    txOutId;//string
    txOutIndex;//number
    signature;//string
}

class TxOut {
    constructor(address, amount) {
        this.address = address;//string
        this.amount = amount;//number
    }
}

class Transaction {
    id;//string
    txIns;// TxIn[]
    txOuts;// TxOut[]
}

module.exports = {
    
    /////////////////////////////////
    /* support Function */
    ////////////////////////////////

    //aUnspentTxOuts : UnspentTxOut[]
    findUnspentTxOut(transactionId, index, aUnspentTxOuts) {
        return aUnspentTxOuts.find((uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index);
    },

    /////////////////////////////////
    /* check validate */
    ////////////////////////////////
    validateTransaction (transaction, aUnspentTxOuts) {

        if (!isValidTransactionStructure(transaction)) {
            return false;
        }
    
        if (getTransactionId(transaction) !== transaction.id) {
            console.log('invalid tx id: ' + transaction.id);
            return false;
        }
        const hasValidTxIns = transaction.txIns
            .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
            .reduce((a, b) => a && b, true);
    
        if (!hasValidTxIns) {
            console.log('some of the txIns are invalid in tx: ' + transaction.id);
            return false;
        }
    
        const totalTxInValues = transaction.txIns
            .map((txIn) => getTxInAmount(txIn, aUnspentTxOuts))
            .reduce((a, b) => (a + b), 0);
    
        const totalTxOutValues = transaction.txOuts
            .map((txOut) => txOut.amount)
            .reduce((a, b) => (a + b), 0);
    
        if (totalTxOutValues !== totalTxInValues) {
            console.log('totalTxOutValues !== totalTxInValues in tx: ' + transaction.id);
            return false;
        }
        return true;
    },

    //check valid transaction Input
    validateTxIn (txIn, transaction, aUnspentTxOuts)  {
        const referencedUTxOut =
            aUnspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
        if (referencedUTxOut == null) {
            console.log('referenced txOut not found: ' + JSON.stringify(txIn));
            return false;
        }
        const address = referencedUTxOut.address;
    
        const key = ec.keyFromPublic(address, 'hex');
        const validSignature = key.verify(transaction.id, txIn.signature);
        if (!validSignature) {
            console.log('invalid txIn signature: %s txId: %s address: %s', txIn.signature, transaction.id, referencedUTxOut.address);
            return false;
        }
        return true;
    },

    //validate coinbase transaction
    validateCoinbaseTx (transaction, blockIndex) {
        if (transaction == null) {
            console.log('the first transaction in the block must be coinbase transaction');
            return false;
        }
        if (getTransactionId(transaction) !== transaction.id) {
            console.log('invalid coinbase tx id: ' + transaction.id);
            return false;
        }
        if (transaction.txIns.length !== 1) {
            console.log('one txIn must be specified in the coinbase transaction');
            return;
        }
        if (transaction.txIns[0].txOutIndex !== blockIndex) {
            console.log('the txIn signature in coinbase tx must be the block height');
            return false;
        }
        if (transaction.txOuts.length !== 1) {
            console.log('invalid number of txOuts in coinbase transaction');
            return false;
        }
        if (transaction.txOuts[0].amount !== COINBASE_AMOUNT) {
            console.log('invalid coinbase amount in coinbase transaction');
            return false;
        }
        return true;
    },

    /////////////////////////////////
    /* create/generate : key/Id */
    ////////////////////////////////

    //generate Id of Transaction
    // transaction: Transaction
    getTransactionId (transaction) {
        const txInContent = transaction.txIns
            .map((txIn) => txIn.txOutId + txIn.txOutIndex)
            .reduce((a, b) => a + b, '');

        const txOutContent = transaction.txOuts
            .map((txOut) => txOut.address + txOut.amount)
            .reduce((a, b) => a + b, '');

        return CryptoJS.SHA256(txInContent + txOutContent).toString();
    },

    //Create singnature
    // transaction: Transaction
    // txIndex : number
    // privateKey: string
    // aUspentTxOuts: UnspentTxOut[]
    signTxIn (transaction, txInIndex, privateKey, aUnspentTxOuts) {
        const txIn = transaction.txIns[txInIndex];
        const dataToSign = transaction.id;
        const referencedUnspentTxOut = findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts);
        const referencedAddress = referencedUnspentTxOut.address;
        const key = ec.keyFromPrivate(privateKey, 'hex');
        const signature = toHexString(key.sign(dataToSign).toDER());
        return signature;
    },

    /////////////////////////////////
    /* Update unspent transaction Out */
    ////////////////////////////////

    //aTransactions: Transaction[]
    //aUnspentTxOuts: UnspentTxOut[]
    updateUnspentTxOuts (aTransactions, aUnspentTxOuts) {
        const newUnspentTxOuts = aTransactions
            .map((t) => {
                return t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
            })
            .reduce((a, b) => a.concat(b), []);
    
        const consumedTxOuts = aTransactions
            .map((t) => t.txIns)
            .reduce((a, b) => a.concat(b), [])
            .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));
    
        const resultingUnspentTxOuts = aUnspentTxOuts
            .filter(((uTxO) => !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)))
            .concat(newUnspentTxOuts);
    
        return resultingUnspentTxOuts;
    },

    //tạo transaction đầu tiên của address
    //address : string
    // blockIndex : number
    getCoinbaseTransaction (address, blockIndex) {
        const t = new Transaction();
        const txIn = new TxIn();
        txIn.signature = '';
        txIn.txOutId = '';
        txIn.txOutIndex = blockIndex;
    
        t.txIns = [txIn];
        t.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
        t.id = this.getTransactionId(t);
        return t;
    }
}
