const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const exphbs = require('express-handlebars');

require('express-async-errors');
const PORT_SERVER = 3000;
const URL_SERVER = 'http://localhost:3000';
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


app.engine('hbs', exphbs(
  {
      defaultLayout: 'main.hbs',
      layoutsDir: 'views/_layouts'
  })
);

app.set('view engine', 'hbs');

require('./blockchain/initBlockChain');

/* Get/post api for server */
app.get('/', function (req, res) {
  res.render('page/index', {
    url: URL_SERVER,
    layout: false,
    title: 'HomeWallet'
  });
})

app.get('/myWallet/:address', function (req, res) {
  const address = req.params.address;
  res.render('page/wallet', {
    url: URL_SERVER,
    layout: false,
    title: 'My Wallet',
    data: {
      address
    }
  });
})


app.use('/blockchain', require('./routes/blockchain.route'));
require('./ws');

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

//require('./blockchain/test');
//require('./wallet/test');


app.listen(PORT_SERVER, function () {
  console.log(`Blockchain Backend api is running at http://localhost:${PORT_SERVER}`);
})
  
