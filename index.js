const express = require('express');
const axios = require('axios');

const port = '9999';
const app = express();

const sendData = async(id, res) => {
    const { data } = await axios.get(
        'https://jsonplaceholder.typicode.com/comments/' + id
    );
    const dataString = JSON.stringify(data);
    await sleep(1000);
    res.write(dataString);
};

const sleep = async(ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

app.get('/events', async(_, res) => {
    res.writeHead(200, {
        'Content-Type' : 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    while(true){
        let i = Math.floor(Math.random() * 501);
        await sendData(i, res);
    }
    res.end();
});

app.listen(port, () => {
    console.log(`Server listening to port ${port}...`);
})