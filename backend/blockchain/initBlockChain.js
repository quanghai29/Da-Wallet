const BlockChain = require('../blockchain/blockchain');
const Block = require('../blockchain/block');
const Blutil = require('../utils/blockchain.util');
//for test
const wallet = require('../wallet/wallet');
const trs = require('../transaction/transaction');


//Local Variable
const sysPrivateKey = '76456b9075147a8b5c52e9985fd309f1c532aafed70e4d010b7249cb9c897692';
const sysAdress = '04165c7464825649c888b6d9345ed5664964814ad9f57114f0927009bb0aaca3439a283f316bb28a0a8899cb183666e60879deb3d9ac6279c604b44b78987486d8';

/* GenesisTransaction */
const genesisTxt = {};
genesisTxt.txIns = [{'signature': '', 'txOutId': '', 'txOutIndex': 0}];
genesisTxt.txOuts = [{
    'address': sysAdress,
    'amount': 900000000
}]
genesisTxt.id = trs.getTransactionId(genesisTxt);

const hash = Blutil.calculateHash(0,'',Blutil.getCurrentTimestamp(),[genesisTxt],0,0);
const genesisBlock = new Block(0,hash,'',Blutil.getCurrentTimestamp(),[genesisTxt],0,0);

const bitcoin = new BlockChain(genesisBlock);

//const privateKey = wallet.generatePrivateKey();
//const address = wallet.getPublicAdress(privateKey);

// //Get first reward for this account
//bitcoin.getFirstBalance(address);
//const balance =  wallet.getBalance(address,bitcoin.unspentTxOuts);

//console.log(bitcoin);
//console.log(balance);
module.exports = bitcoin;