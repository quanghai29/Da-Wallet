const BlockChain = require('../blockchain/blockchain');
const Block = require('../blockchain/block');

/* GenesisTransaction */
const genesisTransaction = {};
const genesisBlock = new Block( 0, '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627', '', 1465154705, [genesisTransaction], 0, 0);

const bitcoin = new BlockChain(genesisBlock);

module.exports = bitcoin;