const express = require('express');
const { route } = require('./blockchain.route');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('page/index', {
        layout: false,
        title: 'HomeWallet'
    });
});

module.exports = router;

