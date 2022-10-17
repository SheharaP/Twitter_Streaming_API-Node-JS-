const http = require('http');
const needle = require('needle');
const express = require('express');
const cors = require('cors');
const webSocketServer = require('websocket').server;
const config = require('dotenv').config();
const TOKEN = process.env.TWITTER_BEARER_TOKEN;

const app = express()
app.use(cors(), express.json(), express.urlencoded({extended : false}))

const server = http.createServer(app);

server.listen(9898, function () {
    console.log("Websocket server listening on port 9898");
});

const wsServer = new webSocketServer({
    httpServer: server
})



const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL =
    'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id'

const rules = [{ value: 'books' }]

// Get stream rules (pre-defined)
async function getRules() {
    const response = await needle('get', rulesURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
    })
    console.log(response.body)
    return response.body
}

// Set predenfined stream rules
async function setRules() {
    const data = {
        add: rules,
    }

    //get tweets as a response by posting the rules with access token
    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
        },
    })

    return response.body
}

// Delete stream rules
async function deleteRules(rules) {
    if (!Array.isArray(rules.data)) {
        return null
    }

    const ids = rules.data.map((rule) => rule.id)

    const data = {
        delete: {
            ids: ids,
        },
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
        },
    })

    return response.body
}

//get tweet stream with the pre defined stream URL
function streamTweets(socket) {
    const stream = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
    })
    return stream;
}

wsServer.on('request', function (request) {

    const connection = request.accept(null, request.origin);

    connection.on('message', async function (message) {

        let currentRules;

        try {
            currentRules = await getRules();
            await deleteRules(currentRules);
            await setRules();
        }
        catch (error) {
            console.log(error);
            process.exit(1);
        }

        const filteredStream = streamTweets(connection);

        try{
            filteredStream.on('data', data => {

                const dataString = JSON.parse(data);
    
                console.log(dataString);
    
                const details = {
                    id : dataString.data.id,
                    text: dataString.data.text,
                    username: dataString.includes.users[0].username,
                }
                console.log(details);
                connection.send(JSON.stringify(details));
            })
        }
        catch(e){
            console.log('Stream ended');
            process.exit(1);
        }
        

        connection.on('end', () => {
            console.log('Stream done');
        });

        connection.on('close', function (reasonCode, description) {
            console.log('Client has disconnected');
        })

    })
})
