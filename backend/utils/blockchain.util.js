const CryptoJS = require('crypto-js');

module.exports = {
    calculateHash (index,previousHash ,timestamp ,data ,difficulty, nonce) {
        return CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();
    },

    getCurrentTimestamp() {
        return Math.round(new Date().getTime() / 1000);
    }
}