require('dotenv').config();
var express = require('express');
var router = express.Router();
var cors = require('cors');
// const fetch = require('node-fetch');
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

router.get('/similar', (req, res) => {
  const bunny_api_key = process.env.BUNNY_API_KEY;
  // Sample array of objects
  const arrayOfObjects = [
      { id: "df888598-6b99-46ef-bb12-4f2e310af093", title: "01_circuito_corrente_alternada_calcular_frequencia.mp4", thumbnail_url: "https://vz-a2c51b42-74b.b-cdn.net/df888598-6b99-46ef-bb12-4f2e310af093/thumbnail_fb4e8774.jpg" },
      { id: "718dbf44-0458-4a2c-9fef-219b8033422c", title: "02_circuito_de_primeira_ordem_RL.mp4", thumbnail_url: "https://vz-a2c51b42-74b.b-cdn.net/718dbf44-0458-4a2c-9fef-219b8033422c/thumbnail_7fe99388.jpg"},
      { id: "2c1416db-7634-4f11-bd0f-112fe17b3450", title: "03_circuito_RL_potencia_complexa.mp4", thumbnail_url: "https://vz-a2c51b42-74b.b-cdn.net/2c1416db-7634-4f11-bd0f-112fe17b3450/thumbnail_66304a20.jpg" }
  ];

  let arrayOfVideos = [];

  const availableCollections = [
    "e1e127d6-2712-410c-b61d-feb3621183f0",
    "e2326952-6131-46a6-b972-dd0534c280f8"
  ];

  for (const collection in availableCollections) {
    const url = `https://video.bunnycdn.com/library/188909/videos?page=1&itemsPerPage=10&collection=${collection}&orderBy=date`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        AccessKey: bunny_api_key
      }
    };
  
    fetch(url, options)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        for (const video in data.items) {
            arrayOfVideos.push({ id: video.guid, title: video.title, thumbnail_url: `https://vz-a2c51b42-74b.b-cdn.net/${video.guid}/${video.thumbnailFileName}`});
        }
    })
    .catch(err => console.error('error:' + err));
  }


  // Send the array of objects as the response
  res.json(arrayOfVideos);
});

router.get('/videoinfo/:videoId', (req, res) => {
  const bunny_api_key = process.env.BUNNY_API_KEY;
  const videoId = req.params.videoId;
  // const videoId = "df888598-6b99-46ef-bb12-4f2e310af093";
  const url = `https://video.bunnycdn.com/library/188909/videos/${videoId}`;
  const options = {
  method: 'GET',
  headers: {
      accept: 'application/json',
      AccessKey: bunny_api_key
    }
  };
  fetch(url, options)
  .then(response => response.json())
  .then(data => {
    res.json(data);
  })
  .catch(err => console.error('error:' + err));
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
		key: fs.readFileSync('privkey.pem'),
		cert: fs.readFileSync('fullchain.pem'),
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