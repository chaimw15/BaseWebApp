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

app.get('/projects', function (request, response) {
  response.render('pages/projects');
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});

const cron = require('node-cron');

const task = cron.schedule('45 10 * * *', () => {
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

  firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    for (var studentKey in students) {
      var student = students[studentKey];
      console.log(student.lastName);
      var nextPayment = student.nextPayment;
      nextPayment = makeDateObject(nextPayment);

      var daysLeft = daysUntilPayment(nextPayment);
      console.log(daysLeft);

      var subject = "Peak College Tuition " + daysLeft + " Day Notice";
      var message = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College Tuition is due in " + daysLeft + " days. Please visit <a href='https://peakcollege.ca/'>peakcollege.ca</a> to pay.<br>If you have any questions about your payment, please resond to this email.</p>";

      switch (daysLeft) {
        case 7:
          console.log("case: 7");
          sendEmail(subject, message, student.email, student.firstName);
          break;

        case 2:
          console.log("case: 2");
          sendEmail(subject, message, student.email, student.firstName);
          break;

        case 0:
          console.log("case: 0");
          subject = "Peak College Tuition Due Today";
          message = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College Tuition is due today. Please visit <a href='https://peakcollege.ca/'>peakcollege.ca</a> to pay.<br>If you have any questions about your payment, please resond to this email.</p>";

          sendEmail(subject, message, student.email, student.firstName);
          break;

        case -1:
          console.log("case: -1");
          subject = "Peak College Tuition " + daysLeft + " Days Overdue";
          message = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College Tuition is " + daysLeft + " late. Please visit <a href='https://peakcollege.ca/'>peakcollege.ca</a> to pay.<br>If you have any questions about your payment, please resond to this email.</p>";

          sendEmail(subject, message, student.email, student.firstName);
          break;

        case -5:
          console.log("case: -5");
          subject = "Peak College Tuition " + daysLeft + " Days Overdue";
          message = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College Tuition is " + daysLeft + " late. Please visit <a href='https://peakcollege.ca/'>peakcollege.ca</a> to pay.<br>If you have any questions about your payment, please resond to this email.</p>";

          sendEmail(subject, message, student.email, student.firstName);
          break;

        case -7:
          console.log("case: -7");
          subject = "Peak College Tuition " + daysLeft + " Days Overdue";
          message = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College Tuition is " + daysLeft + " late. Please visit <a href='https://peakcollege.ca/'>peakcollege.ca</a> to pay.<br>If you have any questions about your payment, please resond to this email.</p>";

          sendEmail(subject, message, student.email, student.firstName);
          break;

        case -14:
          console.log("case: -14");
          subject = "Peak College Tuition " + daysLeft + " Days Overdue";
          message = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College Tuition is " + daysLeft + " late. Please visit <a href='https://peakcollege.ca/'>peakcollege.ca</a> to pay.<br>At 3 weeks late your enrollment in Peak College will be terminated.<br>If you have any questions about your payment, please resond to this email.</p>";

          sendEmail(subject, message, student.email, student.firstName);
          break;

        case -20:
          console.log("case: -20");
          subject = "Peak College Tuition " + daysLeft + " Days Overdue";
          message = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College Tuition is " + daysLeft + " late. Please visit <a href='https://peakcollege.ca/'>peakcollege.ca</a> to pay.<br>At 3 weeks late your enrollment in Peak College will be terminated.<br>If you have any questions about your payment, please resond to this email.</p>";

          sendEmail(subject, message, student.email, student.firstName);
          break;

        default:
          break;
      }
    }
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
  console.log("okay");
  requestMail.then((result) => {
    console.log("good");
    console.log(result.body)
  }).catch((err) => {
    console.log("bad");
    console.log(err.statusCode)
  });
}


// This file is what handles incoming requests and
// serves files to the browser, or executes server-side code
