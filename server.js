require('dotenv').config();
var express = require('express');
var router = express.Router();
var cors = require('cors');
const { createOrder } = require('./pagarme');
// const fetch = require('node-fetch');
const fs = require('fs');
const serverPort = 5000;

const MailerLite = require('@mailerlite/mailerlite-nodejs').default;

const mailerlite = new MailerLite({
  api_key: process.env.MAILERLITE_KEY
});

const mailerlite_group_id_espera = process.env.MAILERLITE_GROUP_ID.toString();
const mailerlite_group_id_desafio = process.env.MAILERLITE_GROUP_ID_DESAFIO.toString();

//For HTTPS
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', router);

app.get('/', (req, res) => {
	res.json('hi');
});

router.get('/recom', (req, res) => {
  const bunny_api_key = process.env.BUNNY_API_KEY;
  const get_video_info = async (video_id) => {
    const library_id = "236258"
    const url = `https://video.bunnycdn.com/library/${library_id}/videos/${video_id}`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            AccessKey: bunny_api_key
        }
    };
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return ({
          id: data.guid, 
          title: data.title, 
          thumbnail_url: `https://vz-6f64f7fb-752.b-cdn.net/${data.guid}/${data.thumbnailFileName}`,
          length: data.length
        });
    } catch(err) {
      console.error('error:', err);
    }
  };

  const call_declerk = async () => {
    const url = `https://api.dominioeletrico.com.br/recom`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            AccessKey: bunny_api_key
        }
    };
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return (data);
    } catch(err) {
      console.error('error:', err);
    }
  };
});

router.get('/similar', (req, res) => {
  const bunny_api_key = process.env.BUNNY_API_KEY;

  const availableCollections = [
    "e1e127d6-2712-410c-b61d-feb3621183f0",
    "e2326952-6131-46a6-b972-dd0534c280f8"
  ];

  const fetchVideos = async () => {
        let arrayOfVideos = [];
        const url = `https://video.bunnycdn.com/library/236258/videos?page=1&itemsPerPage=30&collection=bb29f908-2f6f-43cf-a044-6fb1c4a6c02b&orderBy=date`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                AccessKey: bunny_api_key
            }
        };
        const shuffleArray = (array) => {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        };        
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            // console.log(data.items[0]);
            data.items.forEach(video => {
                arrayOfVideos.push({ 
                    id: video.guid, 
                    title: video.title, 
                    thumbnail_url: `https://vz-6f64f7fb-752.b-cdn.net/${video.guid}/${video.thumbnailFileName}`,
                    length: video.length
                });
                // console.log(arrayOfVideos);
            });
            console.log(arrayOfVideos);
            res.json(shuffleArray(arrayOfVideos));
        } catch (err) {
            console.error('error:', err);
        }
  };
  fetchVideos();
});

router.get('/playlist/:playlistId', (req, res) => {
  const bunny_api_key = process.env.BUNNY_API_KEY;
  const playlistId = req.params.playlistId;

  const availableCollections = [
    "e1e127d6-2712-410c-b61d-feb3621183f0",
    "e2326952-6131-46a6-b972-dd0534c280f8"
  ];

  const fetchVideos = async () => {
        let arrayOfVideos = [];
        const url = `https://video.bunnycdn.com/library/236258/videos?page=1&itemsPerPage=100&collection=${playlistId}&orderBy=title`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                AccessKey: bunny_api_key
            }
        };       
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            // console.log(data.items[0]);
            data.items.forEach(video => {
                arrayOfVideos.push({ 
                    id: video.guid, 
                    title: video.title, 
                    thumbnail_url: `https://vz-6f64f7fb-752.b-cdn.net/${video.guid}/${video.thumbnailFileName}`,
                    length: video.length
                });
                // console.log(arrayOfVideos);
            });
            console.log(arrayOfVideos);
            res.json(arrayOfVideos);
        } catch (err) {
            console.error('error:', err);
        }
  };
  fetchVideos();
});

router.get('/videoinfo/:videoId', (req, res) => {
  const bunny_api_key = process.env.BUNNY_API_KEY;
  const videoId = req.params.videoId;
  // const videoId = "df888598-6b99-46ef-bb12-4f2e310af093";
  const url = `https://video.bunnycdn.com/library/236258/videos/${videoId}`;
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

router.post('/getcheckout', (req, res) => {
  const name = req.body.name;
  const email = req.body.email;

  createOrder(name, email)
    .then((paymentUrl) => {
      res.json({ paymentUrl });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while creating the order.' });
    });
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
    let mailerlite_group_id = "";

    if (utm_term === "de_desafio") {
      mailerlite_group_id = mailerlite_group_id_desafio;
    } else {
      mailerlite_group_id = mailerlite_group_id_espera;
    }

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
        if (data.success === true && data.score >= 0.05) {
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
              status: "active", 
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