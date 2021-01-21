var express = require('express');
var app = express();

const mailjet = require('node-mailjet')
  .connect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname));

// views is directory for all template files
app.set('views', __dirname + '/html');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
  response.render('pages/home');
});

app.get('/students', function (request, response) {
  response.render('pages/students');
});

app.get('/projects', function (request, response) {
  response.render('pages/projects');
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});

app.get('/email', function (request, response) {
  console.log("eh");
  const requestMail = mailjet.post("send", { 'version': 'v3.1' }).request({
    "Messages": [
      {
        "From": {
          "Email": "chaimw@hotmail.ca",
          "Name": "Chaim"
        },
        "To": [
          {
            "Email": "chaimw@hotmail.ca",
            "Name": "Chaim"
          }
        ],
        "Subject": "Greetings from Mailjet.",
        "TextPart": "My first Mailjet email",
        "HTMLPart": "<h3>Dear passenger 1, welcome to <a href='https://www.mailjet.com/'>Mailjet</a>!</h3><br />May the delivery force be with you!",
        "CustomID": "AppGettingStartedTest"
      }
    ]
  });
  console.log("okay");
  requestMail.then((result) => {
    console.log("good");
    console.log(result.body)
  }).catch((err) => {
    console.log("bad");
    console.log(err.statusCode)
  });
});


// This file is what handles incoming requests and
// serves files to the browser, or executes server-side code
