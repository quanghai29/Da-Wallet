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

// router.get('/peers', (req, res) => {
//     res.send(getSockets().map(( s ) => s._socket.remoteAddress + ':' + s._socket.remotePort));
// });

// router.post('/addPeer', (req, res) => {
//     connectToPeers(req.body.peer);
//     res.send();
// });

module.exports = router;