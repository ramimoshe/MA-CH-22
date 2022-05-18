const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const process = require('process');
const http = require('http');
const cards = require('./cards.json');

const port = +process.argv[2] || 3000
const host = 'localhost';

const readyRes = '{ ready: true }';
const contentType = 'Content-Type';
const appJson = 'application/json';
const readyUrl = '/ready';

let client;

const requestListener = async function (req, res) {
    res.setHeader(contentType, appJson);
    res.writeHead(200);
    if (req.url === readyUrl) {
        res.end(readyRes);
    } else {
        const key = req.url.substring(13);
        const missingCardIndex = await client.incr(key) - 1;
        if (missingCardIndex >= cards.length) {
            return res.end(`{ "id": "ALL CARDS" }`);
        }

        res.end(JSON.stringify(cards[missingCardIndex]));
    }
};

if (cluster.isPrimary) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    client = require('redis').createClient();
    client.on('error', (err) => console.log('Redis Client Error', err));

    client.on('ready', () => {
        const server = http.createServer(requestListener);
        server.listen(port, host);
    });

    client.connect();
}