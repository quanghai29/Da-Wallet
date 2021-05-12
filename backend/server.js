const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

require('express-async-errors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

require('./blockchain/initBlockChain');

/*  Get/post api for server  */
app.get('/', function (req, res) {
    res.json({
      message: 'Hello from BlockChain API'
    });
})

app.use('/blockchain', require('./routes/blockchain.route'));

/* Catching error */
app.use(function (req, res, next) {
    res.status(404).json({
      error_message: 'Endpoint not found'
    });
})
  
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({
      error_message: 'Something broke!'
    });
})

require('./blockchain/test');
require('./wallet/test');

const PORT_SERVER = 3000;
app.listen(PORT_SERVER, function () {
  console.log(`Blockchain Backend api is running at http://localhost:${PORT_SERVER}`);
})
  
