const express = require('express');
const bitcoin = require('../blockchain/initBlockChain');
const router = express.Router();

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