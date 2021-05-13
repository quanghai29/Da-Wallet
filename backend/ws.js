const WebSocket = require('ws');
const transactionPool = require('./transaction/transactionPool');

const WS_PORT = 40567;

// all sockets 
let sockets = [];

if (!sockets) {
    sockets = new WebSocket.Server({
    port: WS_PORT
  });

  sockets.on('connection', function (ws) {
    console.log('client connects successfully.');
    initConnection(ws);
  })
  console.log(`WebSocket Server is running at port ${WS_PORT}`);
}

const initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());

    // query transactions pool only some time after chain query
    setTimeout(() => {
        broadcast(queryTransactionPoolMsg());
    }, 500);
};

// convert JSON to Object
const JSONToObject = (data) => {
    try {
        return JSON.parse(data);
    } catch (e) {
        console.log(e);
        return null;
    }
};

const initMessageHandler = (ws) => {
    ws.on('message', (data) => {

        try {
            const message = JSONToObject<Message>(data);
            if (message === null) {
                console.log('could not parse received JSON message: ' + data);
                return;
            }
            console.log('Received message: %s', JSON.stringify(message));
            switch (message.type) {
                case MessageType.QUERY_LATEST:
                    write(ws, responseLatestMsg());
                    break;
                case MessageType.QUERY_ALL:
                    write(ws, responseChainMsg());
                    break;
                case MessageType.RESPONSE_BLOCKCHAIN:
                    const receivedBlocks = JSONToObject(message.data);
                    if (receivedBlocks === null) {
                        console.log('invalid blocks received: %s', JSON.stringify(message.data));
                        break;
                    }
                    handleBlockchainResponse(receivedBlocks);
                    break;
                case MessageType.QUERY_TRANSACTION_POOL:
                    write(ws, responseTransactionPoolMsg());
                    break;
                case MessageType.RESPONSE_TRANSACTION_POOL:
                    const receivedTransactions = JSONToObject(message.data);
                    if (receivedTransactions === null) {
                        console.log('invalid transaction received: %s', JSON.stringify(message.data));
                        break;
                    }
                    receivedTransactions.forEach((transaction) => {
                        try {
                            handleReceivedTransaction(transaction);
                            // if no error is thrown, transaction was indeed added to the pool
                            // let's broadcast transaction pool
                            broadcast(responseTransactionPoolMsg());
                        } catch (e) {
                            console.log(e.message);
                        }
                    });
                    break;
            }
        } catch (e) {
            console.log(e);
        }
    });
};



/////////////////////////////////
/* Support function */
////////////////////////////////
const write = (ws, message) => ws.send(JSON.stringify(message));
const broadcast = (message) => sockets.forEach((socket) => write(socket, message));


/////////////////////////////////
/* Handle with transaction */
////////////////////////////////

//request all transaction in pool
const queryTransactionPoolMsg = () => ({
    'type': MessageType.QUERY_TRANSACTION_POOL,
    'data': null
});

//return all transaction in pool which are unconfirm
const responseTransactionPoolMsg = () => ({
    'type': MessageType.RESPONSE_TRANSACTION_POOL,
    'data': JSON.stringify(transactionPool.getTransactionPool())
});

