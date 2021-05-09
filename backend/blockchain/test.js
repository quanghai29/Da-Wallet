const BlockChain = require('./blockchain');
const Block = require('./block');

const genesisTransaction = {};
const genesisBlock = new Block( 0, '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627', '', 1465154705, [genesisTransaction], 0, 0);

const bitcoin = new BlockChain(genesisBlock);
const bitcoin1 = new BlockChain(genesisBlock);
let blockData = [];

//bitcoin.generateRawNextBlock(blockData);
bitcoin1.generateRawNextBlock(blockData);

bitcoin.replaceChain(bitcoin1.blockchain);

console.log(bitcoin);
