// Turn on Kaffeine at http://kaffeine.herokuapp.com/ to start app

var express = require('express');
var app = express();

var firebase = require("firebase/app");
require("firebase/database");
require("firebase/auth");
require('firebase');

const PDFDocument = require('pdfkit');
const fs = require('fs');

const mailjet = require('node-mailjet')
  .connect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname));

// views is directory for all template files
app.set('views', __dirname + '/html');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
  response.render('pages/signin');
});

app.get('/students', function (request, response) {
  response.render('pages/students');
});

app.get('/dashboard', function (request, response) {
  response.render('pages/dashboard');
});
app.get('/registration', function (request, response) {
  response.render('pages/registration');
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});

const cron = require('node-cron');
const { getMaxListeners } = require('pdfkit');
const { Base64Encode } = require('base64-stream');

const task = cron.schedule('00 18 * * *', () => {
  console.log('Running...');

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

  console.log('Firebase initialized...');

  var database = firebase.database();

  database.ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    database.ref("email-settings").once('value').then((snapshot2) => {
      var emails = snapshot2.val();

      for (var studentKey in students) {
        var student = students[studentKey];

        var returnData = calculateAmountDue3(student);
        var amountDue = returnData[0];
        var dueDate = returnData[1];
        var remainingBalance = returnData[2];
        var interest = interest[3];

        var prettyDate = makeDateObject(dueDate);
        prettyDate = toNormalDate(prettyDate.getMonth(), prettyDate.getDate(), prettyDate.getFullYear());

        var daysLeft = differenceInDays(dueDate, getCurrentDate());

        if (amountDue > 0) {


          amountDue = amountDue.toFixed(2);
          interest = interest.toFixed(2);

          var subject = "Peak College Tuition " + daysLeft + " Day Notice";
          var greeting = "<p>Dear " + student.firstName + ",<br><br>";
          var middleMessage = "This is a friendly reminder that your tuition payment is due on " + prettyDate + ".<br>Your tuition balance is $" + remainingBalance + " and $" + interest + " interest. Please make your monthly payment.<br>You will be charged a late fee of 3% interest if not paid on time.<br>";
          var endMessage = "Please send an e-transfer to <a href='mailto:yunny@peakcollge.ca'>yunny@peakcollge.ca<a>.<br>Please contact the school office if you have any questions.<br>Sincerely,<br>Peak Admin";
          var message = "";

          for (emailKeys in emails) {
            if (emails[emailKeys].days == daysLeft) {
              if (daysLeft < 0) {
                subject = "Peak College Tuition Overdue";
                middleMessage = "Our records show that you have missed your monthly payment of $500 yesterday.<br>We would appreciate your payment as soon as possible.<br>";
              }
              message = greeting + middleMessage + endMessage;
              console.log("Prepping email to " + student.firstName + "...");
              console.log("Amount due: $" + amountDue);
              console.log("Sending email...");
              sendEmail(subject, message, student.email, student.firstName);
            }
          }
        }
      }
    });
  });
});

function toNormalDate(month, day, year) {
  switch (month) {
    case 0:
      month = "Jan."
      break;
    case 1:
      month = "Feb."
      break;
    case 2:
      month = "Mar."
      break;
    case 3:
      month = "Apr."
      break;
    case 4:
      month = "May"
      break;
    case 5:
      month = "Jun."
      break;
    case 6:
      month = "Jul."
      break;
    case 7:
      month = "Aug."
      break;
    case 8:
      month = "Sep."
      break;
    case 9:
      month = "Oct."
      break;
    case 10:
      month = "Nov."
      break;
    case 11:
      month = "Dec."
      break;

    default:
      break;
  }

  if (day < 10) {
    day = "0" + day;
  }

  return month + " " + day;
}

function sendEmail(subject, message, studentEmail, studentName) {
  const requestMail = mailjet.post("send", { 'version': 'v3.1' }).request({
    "Messages": [
      {
        "From": {
          "Email": "ara@peakcollege.ca",
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
    console.log("Email sent!");
  }).catch((err) => {
    console.log(err.statusCode)
  });
}

function calculateAmountDue3(student) {
  //console.log(student.firstName);
  var currentDate = new Date();
  var currentMonth = currentDate.getMonth();
  var currentYear = currentDate.getFullYear();

  var regDate = makeDateObject(student.startDate);
  var monthCounter = regDate.getMonth() + 1;
  var yearCounter = regDate.getFullYear();

  if (monthCounter > 11) {
    monthCounter = 0;
    yearCounter++;
  }

  var remainingBalance = student.tuition - student.downpayment;
  var payments = student.payments;
  var interest = 0;
  var dueThisMonth = 500;

  while (yearCounter < currentYear || (yearCounter == currentYear && monthCounter <= currentMonth)) {
    dueThisMonth = Math.min(500, remainingBalance + interest);
    //console.log(toNormalDate(monthCounter, yearCounter));

    for (var paymentKey in student.payments) {
      var payment = payments[paymentKey];
      var paymentDate = makeDateObject(payment.payDate);
      var paymentMonth = paymentDate.getMonth();
      var paymentYear = paymentDate.getFullYear();
      if (paymentYear == yearCounter && paymentMonth == monthCounter) {
        if (payment.amount > dueThisMonth) {
          dueThisMonth = 0;
        } else {
          dueThisMonth -= payment.amount;
        }
        if (payment.amount >= interest) {
          payment.amount -= interest;
          interest = 0;
          remainingBalance -= payment.amount;
        } else {
          interest -= payment.amount;
        }
      }
    }
    if (!(yearCounter == currentYear && monthCounter == currentMonth) && dueThisMonth != 0) {
      //console.log("Month missed, adding interest on $" + dueThisMonth);
      interest += dueThisMonth * 0.03;
    } else if (!(yearCounter == currentYear && monthCounter == currentMonth) || dueThisMonth == 0) {
      //console.log("Month Paid");
    }

    if (monthCounter == 11) {
      yearCounter++;
      monthCounter = -1;
    }
    monthCounter++;
  }

  var amountDue = Math.min(dueThisMonth, remainingBalance + interest);
  var dueDate = getThisMonthPayDate(student.startDate);

  //console.log(dueDate);

  return [amountDue, dueDate, remainingBalance, interest];
}

function differenceInDays(laterDate, earlierDate) {
  var Difference_In_Time = makeDateObject(laterDate).getTime() - makeDateObject(earlierDate).getTime();

  return Math.ceil(Difference_In_Time / (1000 * 3600 * 24));
}

function getCurrentDate() {
  var date = new Date();

  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();

  if (month < 10) {
    month = "0" + month;
  }

  if (day < 10) {
    day = "0" + day;
  }

  return year + "-" + month + "-" + day
}

function makeDateObject(dateString) {
  var temp = dateString.split("-");

  return new Date(parseInt(temp[0]), parseInt(temp[1]) - 1, parseInt(temp[2]));
}

function getThisMonthPayDate(startDate) {
  var currentDate = new Date();
  var enrolArray = startDate.split("-");

  var year = currentDate.getFullYear();
  var month = currentDate.getMonth() + 1;
  var currentDay = currentDate.getDate();
  var day = parseInt(enrolArray[2]);

  if (month > 12) {
    month = 1;
    year = year + 1;
  }

  if (day == 31) {
    if (month == 4 || month == 6 || month == 9 || month == 11) {
      day = 30;
    }
  }

  if (day > 28 && month == 2) {
    if (isLeapYear(year)) {
      day = 29;
    } else {
      day = 28;
    }
  }

  if (month < 10) {
    month = "0" + month;
  }

  if (day < 10) {
    day = "0" + day;
  }

  return year + "-" + month + "-" + day;
}

function isLeapYear(year) {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
}
// This file is what handles incoming requests and
// serves files to the browser, or executes server-side code


// Student Registration
app.get('/submitForm', function (req, res) { // AJAX

  var doc = new PDFDocument();

  doc
    .fontSize(25)
    .text('Student Registration Form', 100, 100);

  // Add an image, constrain it to a given size, and center it vertically and horizontally
  doc.image('/Users/Chaim/Desktop/PeakCollegeApp/project/images/PEAK-Logo-Black-Green.png', {
    fit: [250, 300],
    align: 'center',
    valign: 'center'
  });

  var finalString = ''; // contains the base64 string
  var stream = doc.pipe(new Base64Encode());

  doc.end(); // will trigger the stream to end

  stream.on('data', function (chunk) {
    finalString += chunk;
  });

  stream.on('end', function () {
    // the stream is at its end, so push the resulting base64 string to the response
    var contents = finalString;
    sendPdfEmail("Hello", "Hello Bud", "output.pdf", contents);
    return res.redirect('/');
  });

});

function sendPdfEmail(subject, message, attachmentname, baseContent) {
  const requestMail = mailjet.post("send", { 'version': 'v3.1' }).request({
    "Messages": [
      {
        "From": {
          "Email": "chaimw@hotmail.ca",
          "Name": "Peak Healthcare College"
        },
        "To": [
          {
            "Email": "chaimw15@gmail.com",
            "Name": "Chaim"
          }
        ],
        "Subject": subject,
        "TextPart": "Peak College Automated Email",
        "HTMLPart": message,
        "Attachments": [
          {
            "ContentType": "application/pdf",
            "Filename": attachmentname,
            "Base64Content": baseContent
          }
        ],
        "CustomID": "PeakCollegeApp02"
      }
    ]
  });
}