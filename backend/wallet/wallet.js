const trs =  require('../transaction/transaction'); 
const EC = require('elliptic').ec;
const fs = require('fs');
const _ = require('lodash');

const ec = new EC('secp256k1');

const privateKeyLocation = process.env.PRIVATE_KEY || 'node/wallet/private_key';

const getPrivateFromWallet = () => {
    const buffer = fs.readFileSync(privateKeyLocation, 'utf8');
    return buffer.toString();
};


/////////////////////////////////
/* Handle with transaction */
////////////////////////////////

// amount : number : số tiền cần gửi đi
// myUnspentTxOuts : mảng Unspent chưa tổng amount của ví
const findTxOutsForAmount = (amount, myUnspentTxOuts) => {
    let currentAmount = 0;
    const includedUnspentTxOuts = [];
    for (const myUnspentTxOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(myUnspentTxOut);
        currentAmount = currentAmount + myUnspentTxOut.amount;
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return { includedUnspentTxOuts, leftOverAmount };
        }
    }

    const eMsg = 'Cannot create transaction from the available unspent transaction outputs.' +
        ' Required amount:' + amount + '. Available unspentTxOuts:' + JSON.stringify(myUnspentTxOuts);
    throw Error(eMsg);
};

//transaction out khi gửi coins đi
const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const txOut1 = {
        'address':receiverAddress,
        'amount': amount
    };
    if (leftOverAmount === 0) {
        return [txOut1];
    } else {
        const leftOverTx = {
            'address':myAddress, 
            'amount': leftOverAmount};
        return [txOut1, leftOverTx];
    }
};

module.exports = {
    /////////////////////////////////
    /* Public / private key  */
    ////////////////////////////////
    getPublicFromWallet() {
        const privateKey = getPrivateFromWallet();
        const key = ec.keyFromPrivate(privateKey, 'hex');
        return key.getPublic().encode('hex');
    },

    getPublicAdress(privateKey) {
        const key = ec.keyFromPrivate(privateKey, 'hex');
        return key.getPublic().encode('hex');
    },

    generatePrivateKey () {
        const keyPair = ec.genKeyPair();
        const privateKey = keyPair.getPrivate();
        return privateKey.toString(16);
    },

    /////////////////////////////////
    /* Handle with wallet function */
    ////////////////////////////////

    //Init wallet and write privatekey in "private_key" file
    initWallet() {
        // let's not override existing private key 
        if (fs.existsSync(privateKeyLocation)) {
            return;
        }
        const newPrivateKey = this.generatePrivateKey();

        fs.writeFileSync(privateKeyLocation, newPrivateKey);
        console.log('new wallet with private key created to : %s', privateKeyLocation);
    },

    //sum all the unspent uTxO of your address
    getBalance(address, unspentTxOuts) {
        return _(unspentTxOuts)
            .filter((uTxO) => uTxO.address === address)
            .map((uTxO) => uTxO.amount)
            .sum();
    },

    /////////////////////////////////
    /* Handle with transactions */
    ////////////////////////////////
    createTransaction(receiverAddress ,amount ,privateKey ,unspentTxOuts ,txPool) {
        console.log('txPool: %s', JSON.stringify(txPool));
        const myAddress = this.getPublicAdress(privateKey);
        const myUnspentTxOutsA = unspentTxOuts.filter((uTxO) => uTxO.address === myAddress);

        const myUnspentTxOuts = this.filterTxPoolTxs(myUnspentTxOutsA, txPool);

        // filter from unspentOutputs such inputs that are referenced in pool
        const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);

        const toUnsignedTxIn = (unspentTxOut) => {
            const txIn = {};
            txIn.txOutId = unspentTxOut.txOutId;
            txIn.txOutIndex = unspentTxOut.txOutIndex;
            return txIn;
        };

        const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);

        const tx = {};
        tx.txIns = unsignedTxIns;
        tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);

        tx.id = trs.getTransactionId(tx);

        tx.txIns = tx.txIns.map((txIn, index) => {
            txIn.signature = trs.signTxIn(tx, index, privateKey, unspentTxOuts);
            return txIn;
        });

        return tx;
    },

    filterTxPoolTxs (unspentTxOuts, transactionPool) {
        const txIns = _(transactionPool)
            .map((tx) => tx.txIns)
            .flatten()
            .value();
        const removable = [];
        for (const unspentTxOut of unspentTxOuts) {
            const txIn = _.find(txIns, (aTxIn) => {
                return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
            });
    
            if (txIn === undefined) {
    
            } else {
                removable.push(unspentTxOut);
            }
        }
    
        return _.without(unspentTxOuts, ...removable);
    }
}