var express = require('express');
var app = express();

const mailjet = require ('node-mailjet')
.connect('6f9416b727cffc0d89dec6b4a24b83ab', 'bce7eb357dbe5795e238a0f098f13c4e')
const request = mailjet
.post("send", {'version': 'v3.1'})
.request({
  "Messages":[
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
})
request
  .then((result) => {
    console.log(result.body)
  })
  .catch((err) => {
    console.log(err.statusCode)
  })

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname));

// views is directory for all template files
app.set('views', __dirname + '/html');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/home');
});

app.get('/students', function(request, response) {
  response.render('pages/students');
});

app.get('/projects', function(request, response) {
  response.render('pages/projects');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


// This file is what handles incoming requests and
// serves files to the browser, or executes server-side code
