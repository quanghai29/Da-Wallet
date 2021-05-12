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
    }
}