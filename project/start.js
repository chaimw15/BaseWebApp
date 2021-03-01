var express = require('express');
var app = express();

var firebase = require("firebase/app");
require("firebase/database");
require("firebase/auth");

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

app.get('/classes', function (request, response) {
  response.render('pages/classes');
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});

const cron = require('node-cron');

const task = cron.schedule('15 0 * * *', () => {
  console.log('running...');

  var firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "peak-college.firebaseapp.com",
    databaseURL: "https://peak-college-default-rtdb.firebaseio.com",
    projectId: "peak-college",
    storageBucket: "peak-college.appspot.com",
    messagingSenderId: "619539747172",
    appId: "1:619539747172:web:6715729d16085dd3ba2a71"
  };

  // Initializing Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  } else {
    firebase.app();
  }

  console.log('still running...');

  var database = firebase.database();

  database.ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    database.ref("email-settings").once('value').then((snapshot2) => {
      var emails = snapshot2.val();

      for (var studentKey in students) {
        var student = students[studentKey];

        var nextPayment = student.nextPayment;
        nextPayment = makeDateObject(nextPayment);

        var daysLeft = daysUntilPayment(nextPayment);

        var amountDue = 0;

        if (student.monthsLeft != null && student.monthsLeft > 0) {
          amountDue = (student.tuition - student.principal) / student.monthsLeft;
        }

        if (daysLeft < 0) {
          amountDue *= 1.03;
        }

        if (amountDue > 0) {
          amountDue = amountDue.toFixed(2);

          var subject = "Peak College Tuition " + daysLeft + " Day Notice";
          var startMessage = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College tuition payment of $" + amountDue + " is <strong>"
          var endMessage = " Please send us an e-transfer at <a href='mailto:info@peakcollege.ca'>info@peakcollege.ca</a> to pay.<br>If you have any questions about your payment, please respond to this email.<br><br>Best regards,<br><br>Peak College Student Services</p>";
          var message = startMessage + "due in " + daysLeft + " days.</strong>" + endMessage;

          for (emailKeys in emails) {
            if (emails[emailKeys].days == daysLeft) {
              if (daysLeft == 1) {
                message = startMessage + "due in 1 day.</strong>" + endMessage;

              } else if (daysLeft == 0) {
                subject = "Peak College Tuition Due Today";
                message = startMessage + "due today.</strong>" + endMessage;

              } else if (daysLeft == -1) {
                message = startMessage + "1 day overdue.</strong>" + endMessage;

              } else if (daysLeft < -1) {
                subject = "Peak College Tuition " + daysLeft + " Days Overdue";
                message = startMessage + Math.abs(daysLeft) + " overdue.</strong>" + endMessage;

              } else if (daysLeft <= -14) {
                subject = "Peak College Tuition " + daysLeft + " Days Overdue";
                message = startMessage + Math.abs(daysLeft) + " overdue.</strong> If your payment is over 3 weeks late (21 days) your enrollment in Peak College will be automatically terminated." + endMessage;

              }
              sendEmail(subject, message, student.email, student.firstName);
            }
          }
        }
      }
    });
  });
});

function daysUntilPayment(nextPayment) {
  var currentDate = new Date();

  var Difference_In_Time = nextPayment.getTime() - currentDate.getTime();

  return Math.ceil(Difference_In_Time / (1000 * 3600 * 24));
}

function makeDateObject(dateString) {
  var temp = dateString.split("-");

  return new Date(parseInt(temp[0]), parseInt(temp[1]) - 1, parseInt(temp[2]));
}

function sendEmail(subject, message, studentEmail, studentName) {
  console.log("eh");
  const requestMail = mailjet.post("send", { 'version': 'v3.1' }).request({
    "Messages": [
      {
        "From": {
          "Email": "chaimw@hotmail.ca",
          "Name": "Peak Healthcare College"
        },
        "To": [
          {
            "Email": studentEmail,
            "Name": studentName
          }
        ],
        "Subject": subject,
        "TextPart": "Peak College Automated Email",
        "HTMLPart": message,
        "CustomID": "PeakCollegeApp01"
      }
    ]
  });
  requestMail.then((result) => {
    console.log(result.body)
  }).catch((err) => {
    console.log(err.statusCode)
  });
}


// This file is what handles incoming requests and
// serves files to the browser, or executes server-side code
