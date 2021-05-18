const express = require('express');
const bitcoin = require('../blockchain/initBlockChain');
const wallet = require('../wallet/wallet');
const trsUtil = require('../utils/transaction.util');
const trs = require('../transaction/transaction');
const router = express.Router();


/////////////////////////////////
/* API for wallet */
////////////////////////////////

router.get('/privateKey', (req, res) => {
    const privateKey = wallet.generatePrivateKey();
    const address = wallet.getPublicAdress(privateKey);
    
    //Get first reward for this account
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
})

router.post('/balance', (req, res) => {
    let address = req.body.address;
    console.log(address);
    if (address === undefined || address == null)
        return res.status(203).json({ message: 'Invalid input' });

    const balance = wallet.getBalance(address, bitcoin.unspentTxOuts);
    return res.status(200).json({ balance });
})

router.post('/buyCoin', (req, res) => {
    let toAddress = req.body.toAddress;
    let amount = req.body.amount;

    if (toAddress === undefined || amount == undefined)
        return res.status(203).json({ message: 'Invalid input' });

    try {
        const resp = bitcoin.generatenextBlockWithTransaction(toAddress, amount);
        const balance = wallet.getBalance(address, bitcoin.unspentTxOuts);
        res.status(200).json({ balance });
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e.message);
    }
})
/////////////////////////////////
/* API for blockchain exploe */
////////////////////////////////

router.get('/blocks', (req, res) => {
    res.send(bitcoin.blockchain);
});

router.post('/mineBlock', (req, res) => {
    const newBlock = bitcoin.generateNextBlock(req.body.data);
    res.send(newBlock);
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