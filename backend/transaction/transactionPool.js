const _ = require('lodash');
const transaction = require('./transaction');

let transactionPool = []; // Transaction[]

//get all transaction Input in this pool
//aTransactionPool: Transaction[]
//return TxIn[]
const getTxPoolIns = (aTransactionPool) => {
    return _(aTransactionPool)
        .map((tx) => tx.txIns)
        .flatten()
        .value();
};

//check transaction
//txIn: TxIn, unspentTxOuts: UnspentTxOut[]
const hasTxIn = (txIn, unspentTxOuts) => {
    const foundTxIn = unspentTxOuts.find((uTxO) => {
        return uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex;
    });
    return foundTxIn !== undefined;
};
module.exports = {
    /////////////////////////////////
    /* check valid */
    ////////////////////////////////

    //tx: Transaction
    //aTtransactionPool: Transaction[]
    isValidTxForPool (tx, aTtransactionPool)  {
        const txPoolIns = getTxPoolIns(aTtransactionPool);

        //txIns: TxIn[]
        const containsTxIn = (txIns, txIn) => {
            return _.find(txPoolIns, ((txPoolIn) => {
                return txIn.txOutIndex === txPoolIn.txOutIndex && txIn.txOutId === txPoolIn.txOutId;
            }));
        };
    
        for (const txIn of tx.txIns) {
            if (containsTxIn(txPoolIns, txIn)) {
                console.log('txIn already found in the txPool');
                return false;
            }
        }
        return true;
    },
    

    /////////////////////////////////
    /* handle with transtaction Pool */
    ////////////////////////////////
    addToTransactionPool (tx, unspentTxOuts) {

        if (!transaction.validateTransaction(tx, unspentTxOuts)) {
            throw Error('Trying to add invalid tx to pool');
        }
    
        if (!this.isValidTxForPool(tx, transactionPool)) {
            throw Error('Trying to add invalid tx to pool');
        }
        console.log('adding to txPool: %s', JSON.stringify(tx));
        transactionPool.push(tx);
    },
    
    //Update transaction pool
    //unspentTxOuts: UnspentTxOut[]
    updateTransactionPool (unspentTxOuts) {
        const invalidTxs = [];
        for (const tx of transactionPool) {
            for (const txIn of tx.txIns) {
                if (!hasTxIn(txIn, unspentTxOuts)) {
                    invalidTxs.push(tx);
                    break;
                }
            }
        }
        if (invalidTxs.length > 0) {
            console.log('removing the following transactions from txPool: %s', JSON.stringify(invalidTxs));
            transactionPool = _.without(transactionPool, ...invalidTxs);
        }
    },

    getTransactionPool() {
        return _.cloneDeep(transactionPool);
    }
}