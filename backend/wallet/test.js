const wallet = require('./wallet');

wallet.initWallet();
const address = wallet.getPublicFromWallet();
console.log(address);