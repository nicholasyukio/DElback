require('dotenv').config();
var express = require('express');
var router = express.Router();
var cors = require('cors');
const fs = require('fs');
const serverPort = 5000;

const MailerLite = require('@mailerlite/mailerlite-nodejs').default;

const mailerlite = new MailerLite({
  api_key: process.env.MAILERLITE_KEY
});

const mailerlite_group_id = process.env.MAILERLITE_GROUP_ID.toString();

//For HTTPS
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', router);

app.get('/', (req, res) => {
	res.json('hi');
});

router.post('/send', (req, res, next) => {
    const currentDateTimeUTC = new Date();
    const formattedDateTime = currentDateTimeUTC.toISOString().slice(0, 19).replace('T', ' ');

    // Extracting first and last name parts
    let fullName = req.body.name;
    let first_name, last_name;

    // Check if the input contains spaces
    if (fullName.includes(' ')) {
        let splitName = fullName.split(' ');
        first_name = splitName.shift(); // Extract the first part as first_name
        last_name = splitName.join(' '); // Join the remaining parts as last_name
    } else {
        first_name = fullName; // If no spaces, the whole input is first_name
        last_name = null;
    }

    const utm_source = req.body.utm_source;
    const utm_term = req.body.utm_term;
    const utm_medium = req.body.utm_medium;

    // console.log(req);

    const postArray = {
      secret: process.env.RECAPTCHA_SECRET,
      response: req.body['g-recaptcha-response']
    };
    
    const postJSON = new URLSearchParams(postArray).toString();
    
    fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: postJSON
    })
    .then(response => response.json())
    .then(data => {
        // Handle the response
        if (data.success === true && data.score >= 0.5) {
            // The reCaptcha verification was successful
            console.log("reCaptcha verification successful!");
            console.log(data);

            const params = {
              email: req.body.email,
              fields: {
                name: first_name,
                last_name: last_name,
                utm_source: utm_source,
                utm_term: utm_term,
                utm_medium: utm_medium
              },
              groups: [mailerlite_group_id],
              status: "active", // possible statuses: active, unsubscribed, unconfirmed, bounced or junk.
              subscribed_at: formattedDateTime,
              update_at: formattedDateTime,
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

        } else {
            console.log("reCaptcha verification FAILED!");
            console.log(data);
            console.log(postArray);
        }
    })
    .catch(error => {
        // Handle errors
        console.log("Error");
        console.error('Error:', error);
    });

});

// This is for https server, make sure to set the path to the certificates
const httpsServer = https.createServer(
	{
		key: fs.readFileSync('/etc/letsencrypt/live/dominioeletrico.com.br/privkey.pem'),
		cert: fs.readFileSync('/etc/letsencrypt/live/dominioeletrico.com.br/fullchain.pem'),
	},
	app
);
httpsServer.listen(serverPort, () =>
	console.log(`backend is running on port ${serverPort}`)
);

//For testing locally
// app.listen(serverPort, () =>
// 	console.log(`backend is running on port ${serverPort}`)
// );