const helper = require('../utils/helper.util');
const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;
const trsUtil = require('../utils/transaction.util');
const _ = require('lodash');
const wallet = require('../wallet/wallet');


const ec = new EC('secp256k1');

const COINBASE_AMOUNT = 900000000;

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
    constructor(){
        this.txOutId = '';
        this.txOutIndex = 0;
        this.signature = '';
    }
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
    constructor(){
        this.id = '';
        this.txIns = [];
        this.txOuts = [];
    }
}

     /////////////////////////////////
    /* support Function */
    ////////////////////////////////
    function getTxInAmount (txIn, aUnspentTxOuts) {
        return findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts).amount;
    };

    //aUnspentTxOuts : UnspentTxOut[]
    function findUnspentTxOut(transactionId, index, aUnspentTxOuts) {
        return aUnspentTxOuts.find((uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index);
    };

    /////////////////////////////////
    /* check validate */
    ////////////////////////////////
    function validateTransaction (transaction, aUnspentTxOuts) {

        if (!trsUtil.isValidTransactionStructure(transaction)) {
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
    };

    //check valid transaction Input
    function validateTxIn (txIn, transaction, aUnspentTxOuts)  {
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
    };

    //validate coinbase transaction
    function validateCoinbaseTx (transaction, blockIndex) {
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
    };

    function validateBlockTransactions (aTransactions, aUnspentTxOuts, blockIndex) {
        const coinbaseTx = aTransactions[0];
        if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
            console.log('invalid coinbase transaction: ' + JSON.stringify(coinbaseTx));
            return false;
        }
    
        // check for duplicate txIns. Each txIn can be included only once
        const txIns = _(aTransactions)
            .map((tx) => tx.txIns)
            .flatten()
            .value();
    
        if (hasDuplicates(txIns)) {
            return false;
        }
    
        // all but coinbase transactions
        const normalTransactions = aTransactions.slice(1);
        return normalTransactions.map((tx) => validateTransaction(tx, aUnspentTxOuts))
            .reduce((a, b) => (a && b), true);
    };


    function hasDuplicates(txIns) {
        const groups = _.countBy(txIns, (txIn) => txIn.txOutId + txIn.txOutIndex);
        return _(groups)
            .map((value, key) => {
                if (value > 1) {
                    console.log('duplicate txIn: ' + key);
                    return true;
                } else {
                    return false;
                }
            })
            .includes(true);
    };
    
    /////////////////////////////////
    /* create/generate : key/Id */
    ////////////////////////////////

    //generate Id of Transaction
    // transaction: Transaction
    function getTransactionId (transaction) {
        
        let txInContent = '', txOutContent = '';
        if(transaction.hasOwnProperty('txIns')){
            txInContent = transaction.txIns.map((txIn) => txIn.txOutId + txIn.txOutIndex).reduce((a, b) => a + b, '');
        }

        if(transaction.hasOwnProperty('txOuts')){
            txOutContent = transaction.txOuts.map((txOut) => txOut.address + txOut.amount).reduce((a, b) => a + b, '');
        }
        return CryptoJS.SHA256(txInContent + txOutContent).toString();
    };

    //Create singnature
    // transaction: Transaction
    // txIndex : number
    // privateKey: string
    // aUspentTxOuts: UnspentTxOut[]
    function signTxIn (transaction, txInIndex, privateKey, aUnspentTxOuts) {
        const txIn = transaction.txIns[txInIndex];
        const dataToSign = transaction.id;
        const referencedUnspentTxOut = findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts);

        if (referencedUnspentTxOut == null) {
            console.log('could not find referenced txOut');
            throw Error();
        }

        const referencedAddress = referencedUnspentTxOut.address;

        // if (wallet.getPublicAdress(privateKey) !== referencedAddress) {
        //     console.log('trying to sign an input with private' +
        //         ' key that does not match the address that is referenced in txIn');
        //     throw Error();
        // }

        const key = ec.keyFromPrivate(privateKey, 'hex');
        const signature = helper.toHexString(key.sign(dataToSign).toDER());

        return signature;
    };

    /////////////////////////////////
    /* Update unspent transaction Out */
    ////////////////////////////////

    //aTransactions: Transaction[]
    //aUnspentTxOuts: UnspentTxOut[]
    function updateUnspentTxOuts (aTransactions, aUnspentTxOuts) {
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
    };

    // tạo transaction
    // aTransactions: Transaction[]
    // aUnspentTxOuts: UnspentTxOut[]
    // blockIndex: number
    function processTransactions (aTransactions, aUnspentTxOuts, blockIndex) {

        if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
            console.log('invalid block transactions');
            return null;
        }
        return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
    };
    
    //tạo transaction đầu tiên của address
    //address : string
    // blockIndex : number
    function getCoinbaseTransaction (address, blockIndex) {
        const t = new Transaction();
        const txIn = new TxIn();
        txIn.signature = '';
        txIn.txOutId = '';
        txIn.txOutIndex = blockIndex;
    
        t.txIns = [txIn];
        t.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
        t.id = this.getTransactionId(t);
        return t;
    };
module.exports = {
   processTransactions, signTxIn, getTransactionId, validateTransaction,
   UnspentTxOut, TxIn, TxOut, getCoinbaseTransaction, hasDuplicates,
   Transaction
};
