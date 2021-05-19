 /////////////////////////////////
    /* check validate of structure */
    ////////////////////////////////

    // valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
    // address: string
    const isValidAddress = (address) => {
        if (address.length !== 130) {
            console.log(address);
            console.log('invalid public key length');
            return false;
        } else if (address.match('^[a-fA-F0-9]+$') === null) {
            console.log('public key must contain only hex characters');
            return false;
        } else if (!address.startsWith('04')) {
            console.log('public key must start with 04');
            return false;
        }
        return true;
    };

    //check validate of structure transaction
    const isValidTransactionStructure = (transaction) => {
        if (typeof transaction.id !== 'string') {
            console.log('transactionId missing');
            return false;
        }
        if (!(transaction.txIns instanceof Array)) {
            console.log('invalid txIns type in transaction');
            return false;
        }
        if (!transaction.txIns
            .map(isValidTxInStructure)
            .reduce((a, b) => (a && b), true)) {
            return false;
        }

        if (!(transaction.txOuts instanceof Array)) {
            console.log('invalid txIns type in transaction');
            return false;
        }

        if (!transaction.txOuts
            .map(isValidTxOutStructure)
            .reduce((a, b) => (a && b), true)) {
            return false;
        }
        return true;
    };

    //check validate of transactionOutput structure
    const isValidTxOutStructure = (txOut) => {
        if (txOut == null) {
            console.log('txOut is null');
            return false;
        } else if (typeof txOut.address !== 'string') {
            console.log('invalid address type in txOut');
            return false;
        } else if (!isValidAddress(txOut.address)) {
            console.log('invalid TxOut address');
            return false;
        } else if (typeof txOut.amount !== 'number') {
            console.log('invalid amount type in txOut');
            return false;
        } else {
            return true;
        }
    };

    //check valid transaction Input structure
    const isValidTxInStructure = (txIn) => {
        if (txIn == null) {
            console.log('txIn is null');
            return false;
        } else if (typeof txIn.signature !== 'string') {
            console.log('invalid signature type in txIn');
            return false;
        } else if (typeof txIn.txOutId !== 'string') {
            console.log('invalid txOutId type in txIn');
            return false;
        } else if (typeof txIn.txOutIndex !== 'number') {
            console.log('invalid txOutIndex type in txIn');
            return false;
        } else {
            return true;
        }
    };

module.exports = {
    isValidAddress,
    isValidTransactionStructure,
    isValidTxOutStructure,
    isValidTxInStructure
}