require('dotenv').config();
var express = require('express');
var router = express.Router();
var cors = require('cors');
const fs = require('fs');
const serverPort = 5000;

// For CommonJS (CJS)
const MailerLite = require('@mailerlite/mailerlite-nodejs').default;

const mailerlite = new MailerLite({
  api_key: process.env.MAILERLITE_KEY
});

//For HTTPS
//const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', router);

app.get('/', (req, res) => {
	res.json('hi');
});

router.post('/send', (req, res, next) => {
    const currentDateTime = new Date();
    const formattedDateTime = currentDateTime.toISOString().slice(0, 19).replace('T', ' ');

    const params = {
        email: req.body.email,
        fields: {
          name: req.body.name,
          last_name: "Testerson",
          company: "MailerLite",
          country: "Best country",
          city: "Best city",
          phone: "37060677606",
          state: "Best state",
          z_i_p: "99999"
        },
        groups: ["108849248378815498"],
        status: "active", // possible statuses: active, unsubscribed, unconfirmed, bounced or junk.
        subscribed_at: formattedDateTime,
        ip_address: null,
        opted_in_at: formattedDateTime,
        optin_ip: null,
        unsubscribed_at: null
      };
      
      mailerlite.subscribers.createOrUpdate(params)
        .then(response => {
          console.log(response.data);
          res.json({
            status: 'success',
        });
        })
        .catch(error => {
          if (error.response) console.log(error.response.data);
          res.json({
            status: 'fail',
        });
        });

});

//This is for https server, make sure to set the path to the certificates
// const httpsServer = https.createServer(
// 	{
// 		key: fs.readFileSync('path-to-privkey.pem'),
// 		cert: fs.readFileSync('path-to-cert.pem'),
// 	},
// 	app
// );
// httpsServer.listen(serverPort, () =>
// 	console.log(`backend is running on port ${serverPort}`)
// );

//For testing locally
app.listen(serverPort, () =>
	console.log(`backend is running on port ${serverPort}`)
);