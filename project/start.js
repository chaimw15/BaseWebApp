// Turn on Kaffeine at http://kaffeine.herokuapp.com/ to start app

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

const task = cron.schedule('05 17 * * *', () => {
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

        var returnData = calculateAmountDue2(student);
        var amountDue = returnData[0];
        var dueDate = returnData[1];
        var remainingBalance = returnData[2];

        var daysLeft = differenceInDays(dueDate, getCurrentDate());

        if (amountDue > 0) {


          amountDue = amountDue.toFixed(2);

          var subject = "Peak College Tuition " + daysLeft + " Day Notice";
          var startMessage = "<p>Dear " + student.firstName + ",<br><br>" + "Your Peak College tuition payment of $" + amountDue + " is <strong>"
          var endMessage = " Please send an e-transfer to <a href='mailto:yunny@peakcollege.ca'>yunny@peakcollege.ca</a> to pay. Your remaining balance is $" + remainingBalance + ".<br><br>If you have any questions about your payment, please respond to this email.<br><br>Best regards,<br><br>Peak College Student Services</p>";
          var message = startMessage + "due in " + daysLeft + " days.</strong>" + endMessage;

          for (emailKeys in emails) {
            if (emails[emailKeys].days == daysLeft) {
              if (daysLeft == 1) {
                message = startMessage + "due tomorrow.</strong> If your payment is late a charge of 3% interest will be added to your bill." + endMessage;

              } else if (daysLeft == 0) {
                subject = "Peak College Tuition Due Today";
                message = startMessage + "due today.</strong> If your payment is late a charge of 3% interest will be added to your bill." + endMessage;

              } else if (daysLeft == -1) {
                subject = "Peak College Tuition 1 Day Overdue";
                message = startMessage + "1 day overdue.</strong> This bill includes 3% interest on your unpaid balance." + endMessage;

              } else if (daysLeft < -1) {
                subject = "Peak College Tuition " + Math.abs(daysLeft) + " Days Overdue";
                message = startMessage + Math.abs(daysLeft) + " overdue.</strong> This bill includes 3% interest on your unpaid balance." + endMessage;

              } else if (daysLeft <= -14) {
                subject = "Peak College Tuition " + Math.abs(daysLeft) + " Days Overdue";
                message = startMessage + Math.abs(daysLeft) + " overdue.</strong> This bill includes 3% interest on your unpaid balance." + endMessage;
              }
              console.log("Prepping email to " + student.firstName + "...");
              console.log("Amount due: $" + amountDue);
              console.log("Sending email...");
              //sendEmail(subject, message, student.email, student.firstName);
            }
          }
        }
      }
    });
  });
});

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

function calculateAmountDue2(student) {
  var months = {};
  var nextPayment = student.startDate;
  var paymentCounter = student.tuition - student.downpayment;

  // Intitialize Months
  var i;
  for (i = 0; i < student.totalMonths; i++) {
    var month = {};
    nextPayment = getNextPayDate(nextPayment, student.startDate);
    month.dueDate = nextPayment;
    month.paidThisMonth = 0;
    if (paymentCounter > Math.max(student.tuition / student.totalMonths, 500)) {
      month.dueThisMonth = Math.max(student.tuition / student.totalMonths, 500);
    } else {
      month.dueThisMonth = paymentCounter;
    }
    paymentCounter = paymentCounter - month.dueThisMonth;
    if (differenceInDays(month.dueDate, getCurrentDate()) < 0) {
      month.interest = month.dueThisMonth * 0.03;
    } else {
      month.interest = 0;
    }
    months[i] = month;
  }

  var payments = student.payments;
  var excessPayment = 0;

  if (payments != null) {
    //cycle through payments
    for (var paymentKey in payments) {
      payment = payments[paymentKey];
      payment.amountLeft = payment.amount;
      //cycle through months
      for (var monthKey in months) {
        var month = months[monthKey];
        if (month.paidThisMonth < month.dueThisMonth) {
          //if payment is before due date
          if (differenceInDays(month.dueDate, payment.payDate) >= 0) {
            if (monthKey > 0 && differenceInDays(months[monthKey - 1].dueDate, payment.payDate) >= 0) {
              for (var j = i - 1; j > monthKey - 1; j--) {
                var lastMonth = months[j];
                var dueInLastMonth = lastMonth.dueThisMonth;
                if (dueInLastMonth > payment.amountLeft) {
                  lastMonth.dueThisMonth = lastMonth.dueThisMonth - payment.amountLeft;
                  payment.amountLeft = 0
                  break;
                } else if (dueInLastMonth == 0) {
                  continue;
                } else {
                  lastMonth.dueThisMonth = 0;
                  payment.amountLeft = payment.amountLeft - dueInLastMonth;
                }
              }
              break;
            }
            //if payment is more than the remaining balance this month
            if (payment.amountLeft > month.dueThisMonth - month.paidThisMonth) {
              payment.amountLeft = payment.amountLeft - (month.dueThisMonth - month.paidThisMonth);
              month.paidThisMonth = month.dueThisMonth;
              month.interest = 0;

              //if payment is less than the remaining balance this month
            } else {
              month.paidThisMonth = month.paidThisMonth + payment.amountLeft;
              month.interest = month.interest - 0.03 * payment.amountLeft;
              payment.amountLeft = 0;
              break;
            }
            //if payment is after due date
          } else {
            // if payment is more than the interst due this month
            if (payment.amountLeft > month.interest) {
              if (payment.amountLeft > month.dueThisMonth - month.paidThisMonth + month.interest) {
                payment.amountLeft = payment.amountLeft - month.interest - (month.dueThisMonth - month.paidThisMonth);
                month.paidThisMonth = month.dueThisMonth;
                month.interest = 0;

              } else {
                month.paidThisMonth = month.paidThisMonth + payment.amountLeft - month.interest;
                month.interest = 0;
                payment.amountLeft = 0;
                break;
              }
              // if payment is less than the interst due this month
            } else {
              month.interest = month.interest - payment.amountLeft;
              payment.amountLeft = 0;
              break;
            }
          }
        }
      }
      excessPayment = excessPayment + payment.amountLeft;
    }
  }

  var amountDue = 0;
  var amountPaid = excessPayment;
  var tuitionAdjusted = 0;
  var dueDate = "";

  for (var monthKey in months) {
    tuitionAdjusted = tuitionAdjusted + months[monthKey].dueThisMonth;
  }

  for (var monthKey in months) {
    var month = months[monthKey];
    amountPaid = amountPaid + month.paidThisMonth;
    if (month.dueThisMonth - month.paidThisMonth > 0) {
      if (differenceInDays(month.dueDate, getCurrentDate()) >= 0) {
        amountDue = amountDue + month.dueThisMonth - month.paidThisMonth;
        dueDate = month.dueDate;
        break;
      } else if (differenceInDays(month.dueDate, getCurrentDate()) >= -14) {
        amountDue = amountDue + month.dueThisMonth - month.paidThisMonth + month.interest;
        dueDate = month.dueDate;
        break;
      } else {
        amountDue = amountDue + month.dueThisMonth - month.paidThisMonth + month.interest;
      }
    }
  }

  var remainingBalance = tuitionAdjusted - amountPaid;


  if (remainingBalance < 0) {
    amountDue = remainingBalance;
  }

  return [amountDue, dueDate, remainingBalance];
}

function getNextPayDate(lastPayDate, enrolDate) {
  var lastPayArray = lastPayDate.split("-");
  var enrolArray = enrolDate.split("-");

  var year = parseInt(lastPayArray[0]);
  var month = parseInt(lastPayArray[1]);
  var day = parseInt(enrolArray[2]);

  var month = month + 1;

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
