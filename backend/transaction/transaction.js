

class TxIn {
    txOutId;
    txOutIndex;
    signature;
}

class TxOut {
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}

class Transaction {
    id;
    txIns;
    txOuts;
}

module.exports = {
    //generate Id of Transaction
    getTransactionId = (transaction) => {
        const txInContent = transaction.txIns
            .map((txIn) => txIn.txOutId + txIn.txOutIndex)
            .reduce((a, b) => a + b, '');
    
        const txOutContent = transaction.txOuts
            .map((txOut) => txOut.address + txOut.amount)
            .reduce((a, b) => a + b, '');
    
        return CryptoJS.SHA256(txInContent + txOutContent).toString();
    }
}
