const express = require('express');
const request = require('request');

const app = express();
const targetServer = "https://lamdera.com"

app.use((req, res, next) => {
    req.body = req.body || {};
    req.body.verb = req.method;
    req.body.headers = req.headers;
    req.body.query = req.query;
    next();
});

app.all('*', (req, res) => {
    const options = {
        method: 'POST',
        body: req.body,
        json: true,
        url: targetServer + req.originalUrl
    };

    console.log(options);

    request(options, (err, response, body) => {
        if (err) {
            return res.status(500).json({ error: err });
        }
        if (!body.response_token) {
            return res.json(body);
        }
        let responseReceived = false;
        const timeout = setTimeout(() => {
            if (!responseReceived) {
                return res.status(408).json({ error: 'Response timed out' });
            }
        }, 20000);

        const intervalId = setInterval(() => {
            const pollOptions = {
              method: "POST",
              body: body,
              json: true,
              url: `${targetServer}${req.originalUrl}ByToken` // "https://lamdera.com/getAllUsersByToken"
            };
            request(pollOptions, (err, response, body) => {
                if (err) {
                    clearTimeout(timeout);
                    clearInterval(intervalId);
                    return res.status(500).json({ error: err });
                }
                if (body.result) {
                    clearTimeout(timeout);
                    clearInterval(intervalId);
                    responseReceived = true;
                    return res.json(body);
                }
            });
        }, 50);
    });
});

app.listen(3001, () => {
    console.log('Server listening on port 3001!');
});

module.exports = app;
