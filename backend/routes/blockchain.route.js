const express = require('express');
const bitcoin = require('../blockchain/initBlockChain');
const wallet = require('../wallet/wallet');
const trsUtil = require('../utils/transaction.util');
const trsPool = require('../transaction/transactionPool');
const router = express.Router();


/////////////////////////////////
/* API for wallet */
////////////////////////////////

router.get('/privateKey', (req, res) => {
    const privateKey = wallet.generatePrivateKey();
    const address = wallet.getPublicAdress(privateKey);

    //set first coin for miner
    bitcoin.getFirstBalance(address);
    res.json({ privateKey });
});

router.post('/wallet', (req, res) => {
    const privateKey = req.body.privateKey;
    const address = wallet.getPublicAdress(privateKey);

    if (trsUtil.isValidAddress(address)) {
        return res.status(200).json({ message: 'Success', address });
    }
    return res.status(203).json({ message: 'Not correct private Key' });
});

router.post('/balance', (req, res) => {
    let address = req.body.address;
    console.log(address);
    if (address === undefined || address == null)
        return res.status(203).json({ message: 'Invalid input' });

    const balance = wallet.getBalance(address, bitcoin.unspentTxOuts);
    return res.status(200).json({ balance });
})

router.post('/sendTransaction', (req, res) => {
    try {
        const address = req.body.address;
        const amount = req.body.amount;
        const privateKey = req.body.privateKey;

        if (address === undefined || amount === undefined || privateKey === undefined) {
            throw Error('invalid address or amount');
        }
        const resp = bitcoin.sendTransaction(privateKey, address, amount);

        console.log(trsPool.getTransactionPool());
        res.status(200).json({resp});
    } catch (e) {
        console.log(e.message);
        res.status(400).json({message: "Don't send transaction"});
    }
});


router.post('/mineBlock', (req, res) => {
    const address = req.body.address;
    const newBlock = bitcoin.generateNextBlock(address);
    if (newBlock === null) {
        res.status(400).json({message: 'could not generate block'});
    } else {
        res.status(200).json({newBlock});
    }
});

/////////////////////////////////
/* API for blockchain exploe */
////////////////////////////////

router.get('/blocks', (req, res) => {
    res.send(bitcoin.blockchain);
});



router.post('/mineTransaction', (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;
    try {
        const resp = generatenextBlockWithTransaction(address, amount);
        res.send(resp);
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e.message);
    }
});

router.post('/sendTransaction', (req, res) => {

})
// router.get('/peers', (req, res) => {
//     res.send(getSockets().map(( s ) => s._socket.remoteAddress + ':' + s._socket.remotePort));
// });

// router.post('/addPeer', (req, res) => {
//     connectToPeers(req.body.peer);
//     res.send();
// });

module.exports = router;