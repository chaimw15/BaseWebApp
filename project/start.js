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

app.get('/dashboard', function (request, response) {
  response.render('pages/dashboard');
});
app.get('/register', function (request, response) {
  response.render('pages/register');
});
app.get('/registration-complete', function (request, response) {
  response.render('pages/registration-complete');
});

app.get('/thankyou', function (req, res) {
  var data = req.query;
  var student = data.student;
  var amountPaid = data.paid;
  var balance = data.balance;
  interest = data.interest;
  res.writeHead(200, { "Context-Type": "text\plain" });

  amountPaid = parseFloat(amountPaid).toFixed(2);
  balance = parseFloat(balance).toFixed(2);
  interest = parseFloat(interest).toFixed(2);

  var subject = "Peak College Payment Received";
  var message = "Dear " + student.firstName + ",<br><br>This is to confirm that your payment of $" + amountPaid + " was received successfully.<br>Your balance is now $" + balance + " with $" + interest + " interest.<br><br>Thank you,<br><br>Peak Admin";
  sendEmail(subject, message, student.email, student.firstName);
  res.write("sent");
  res.end();
});

app.listen(app.get('port'), function () {
  console.log('Peak College app is running on port', app.get('port'));
});

const cron = require('node-cron');
const { getMaxListeners } = require('pdfkit');
const { Base64Encode } = require('base64-stream');

const task = cron.schedule('15 11 * * *', () => {
  // console.log('Running...');

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
        var interest = returnData[3];

        var prettyDate = makeDateObject(dueDate);
        prettyDate = toNormalDate(prettyDate.getMonth(), prettyDate.getDate(), prettyDate.getFullYear());

        var daysLeft = differenceInDays(dueDate, getCurrentDate());

        if (amountDue > 0) {

          interest = interest.toFixed(2);

          var subject = "Peak College Tuition " + daysLeft + " Day Notice";
          var greeting = "<p>Dear " + student.firstName + ",<br><br>";
          var middleMessage = "This is a friendly reminder that your tuition payment is due on " + prettyDate + ".<br>Your tuition balance is $" + remainingBalance + " with $" + interest + " interest. Please make your monthly payment.<br>You will be charged a late fee of 3% interest if not paid on time.<br>";
          var endMessage = "To pay, send an e-transfer to <a href='mailto:yunny@peakcollege.ca'>yunny@peakcollege.ca<a><br>Please contact the school office if you have any questions.<br><br>Sincerely,<br>Peak Admin";
          var message = "";

          for (emailKeys in emails) {
            if (emails[emailKeys].days == daysLeft) {
              if (daysLeft < 0) {
                subject = "Peak College Tuition Overdue";
                if (remainingBalance > 500 && amountDue < 500) {
                  middleMessage = "Our records show that you have only paid $" + (500 - amountDue) + " of your full monthly payment of $500 due yesterday.<br>We would appreciate the rest of your payment as soon as possible.<br>";
                } else {
                  middleMessage = "Our records show that you didn't pay your monthly payment yesterday.<br>Your tuition balance is $" + remainingBalance + " with $" + interest + " interest.<br>We would appreciate your payment as soon as possible.<br>";
                }
              }
              message = greeting + middleMessage + endMessage;
              console.log("Prepping email to " + student.firstName + "...");
              console.log(message);
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
    // console.log(result.body)
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
      try {
        var skipMonth = student.skipMonth;
        var skipYear = student.skipYear;
        if (!(yearCounter <= skipYear || yearCounter == skipYear && monthCounter <= skipMonth)) {
          interest += dueThisMonth * 0.03;
        }
      } catch (e) {
        interest += dueThisMonth * 0.03;
      }
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

  if (differenceInDays(getCurrentDate(), getPreviousMonthPayDate(student.startDate)) == 1) {
    dueDate = getPreviousMonthPayDate(student.startDate);
  }

  if (differenceInDays(getNextMonthPayDate(student.startDate), getCurrentDate()) <= 3) {
    dueDate = getNextMonthPayDate(student.startDate);
  }

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

function getPreviousMonthPayDate(startDate) {
  var currentDate = new Date();
  var enrolArray = startDate.split("-");

  var year = currentDate.getFullYear();
  var month = currentDate.getMonth();
  var currentDay = currentDate.getDate();
  var day = parseInt(enrolArray[2]);

  if (month == 0) {
    month = 12;
    year = year - 1;
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

function getNextMonthPayDate(startDate) {
  var currentDate = new Date();
  var enrolArray = startDate.split("-");

  var year = currentDate.getFullYear();
  var month = currentDate.getMonth() + 2;
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
app.get('/register-student', function (req, res) { // AJAX
  console.log("registering...");
  var data = req.query;
  var allStudentData = data.allStudentData;
  // console.log(allStudentData);

  var pdf_path = __dirname + '/' + 'student' + '_registration_data.pdf';

  var doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdf_path)); // write to PDF
  doc.image(__dirname + '/images/PEAK-Logo-Black-Green.png', 240, 25, {
    fit: [100, 115.28],
    align: 'center'
  });
  console.log("writing doc...");
  doc.font('Helvetica-Bold').fontSize(20).text('Student Registration Form', {
    align: 'center'
  });


  var nameString = allStudentData.title + " " + allStudentData.firstName + " " + allStudentData.lastName;
  doc.moveDown().font('Helvetica-Bold').fontSize(12).text("Name", {
    align: 'left'
  }).font('Helvetica').text(`${nameString}`, {
    align: 'left'
  });

  var dobString = allStudentData.day + "/" + allStudentData.month + "/" + allStudentData.year;
  doc.moveDown().font('Helvetica-Bold').text("Date of Birth", {
    align: 'left'
  }).font('Helvetica').text(`${dobString}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica-Bold').text("Email", {
    align: 'left'
  }).font('Helvetica').text(`${allStudentData.email}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica-Bold').text("Phone Number", {
    align: 'left'
  }).font('Helvetica').text(`${allStudentData.phone}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica-Bold').text("Cell Number", {
    align: 'left'
  });
  if (allStudentData.cell != '') {
    doc.font('Helvetica').text(`${allStudentData.cell}`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`N/A`, {
      align: 'left'
    });
  }

  doc.moveDown().font('Helvetica-Bold').text("Program", {
    align: 'left'
  }).font('Helvetica').text(`${allStudentData.studentClass}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica-Bold').text("Mailing Address", {
    align: 'left'
  }).font('Helvetica').text(`${allStudentData.mailing_address}`, {
    align: 'left'
  });

  if (allStudentData.mailing_address2 != '') {
    doc.moveDown();
    doc.font('Helvetica').fontSize(11).fillColor('grey').text(`Address Line 2`, {
      align: 'left'
    }).fontSize(12).fillColor('black').text(`${allStudentData.mailing_address2}`, {
      align: 'left'
    });
  }

  doc.moveDown().font('Helvetica').fontSize(11).fillColor('grey').text(`City`, {
    align: 'left'
  }).fontSize(12).fillColor('black').text(`${allStudentData.mailing_city}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica').fontSize(11).fillColor('grey').text(`State/Province`, {
    align: 'left'
  }).fontSize(12).fillColor('black').text(`${allStudentData.mailing_state}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica').fontSize(11).fillColor('grey').text(`Postal Code`, {
    align: 'left'
  }).fontSize(12).fillColor('black').text(`${allStudentData.mailing_postal}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica').fontSize(11).fillColor('grey').text(`Country`, {
    align: 'left'
  }).fontSize(12).fillColor('black').text(`${allStudentData.mailing_country}`, {
    align: 'left'
  });

  doc.addPage();

  doc.moveDown().font('Helvetica-Bold').text("Permanent Address", {
    align: 'left'
  })
  if (allStudentData.perm_address != '') {
    doc.font('Helvetica').text(`${allStudentData.perm_address}`, {
      align: 'left'
    });

    if (allStudentData.perm_address2 != '') {
      doc.moveDown();
      doc.font('Helvetica').fontSize(11).fillColor('grey').text(`Address Line 2`, {
        align: 'left'
      }).fontSize(12).fillColor('black').text(`${allStudentData.perm_address2}`, {
        align: 'left'
      });
    }

    doc.moveDown().font('Helvetica').fontSize(11).fillColor('grey').text(`City`, {
      align: 'left'
    }).fontSize(12).fillColor('black').text(`${allStudentData.perm_city}`, {
      align: 'left'
    });

    doc.moveDown().font('Helvetica').fontSize(11).fillColor('grey').text(`State/Province`, {
      align: 'left'
    }).fontSize(12).fillColor('black').text(`${allStudentData.perm_state}`, {
      align: 'left'
    });

    doc.moveDown().font('Helvetica').fontSize(11).fillColor('grey').text(`Postal Code`, {
      align: 'left'
    }).fontSize(12).fillColor('black').text(`${allStudentData.perm_postal}`, {
      align: 'left'
    });

    doc.moveDown().font('Helvetica').fontSize(11).fillColor('grey').text(`Country`, {
      align: 'left'
    }).fontSize(12).fillColor('black').text(`${allStudentData.perm_country}`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`Same as mailing address`, {
      align: 'left'
    });
  }

  doc.moveDown().font('Helvetica-Bold').text("International Student?", {
    align: 'left'
  }).font('Helvetica').text(`${allStudentData.international}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica-Bold').text("Language of Instruction", {
    align: 'left'
  }).font('Helvetica').text(`${allStudentData.language}`, {
    align: 'left'
  });

  if (allStudentData.schedule != '') {
    doc.moveDown().font('Helvetica-Bold').text("Program Schedule", {
      align: 'left'
    }).font('Helvetica').text(`${allStudentData.schedule}`, {
      align: 'left'
    });
  }

  doc.moveDown().font('Helvetica-Bold').text("Admission Requirements", {
    align: 'left'
  });
  if (allStudentData.admission1 == 'true') {
    doc.font('Helvetica').text(`Has an Ontario Secondary School Diploma or equivalent: Yes`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`Has an Ontario Secondary School Diploma or equivalent: No`, {
      align: 'left'
    });
  }
  if (allStudentData.admission2 == 'true') {
    doc.font('Helvetica').text(`Criminal check record: Yes`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`Criminal check record: No`, {
      align: 'left'
    });
  }
  if (allStudentData.admission3 == 'true') {
    doc.font('Helvetica').text(`Is at least 18 years of age, and passed a Superintendent approved qualifying test: Yes`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`Is at least 18 years of age, and passed a Superintendent approved qualifying test: No`, {
      align: 'left'
    });
  }
  if (allStudentData.admission4 == 'true') {
    doc.font('Helvetica').text(`Standard First Aid Certificate and Basic Rescuer CPR Certificate: Yes`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`Standard First Aid Certificate and Basic Rescuer CPR Certificate: No`, {
      align: 'left'
    });
  }
  if (allStudentData.admission5 == 'true') {
    doc.font('Helvetica').text(`Medical Clearance Certificate: Yes`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`Medical Clearance Certificate: No`, {
      align: 'left'
    });
  }
  if (allStudentData.admission6 == 'true') {
    doc.font('Helvetica').text(`Proof of ID: Yes`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`Proof of ID: No`, {
      align: 'left'
    });
  }
  if (allStudentData.admission7 == 'true') {
    doc.font('Helvetica').text(`English or Literacy Test: Yes`, {
      align: 'left'
    });
  } else {
    doc.font('Helvetica').text(`English or Literacy Test: No`, {
      align: 'left'
    });
  }

  doc.moveDown().font('Helvetica-Bold').fontSize(12).text("SIN Number", {
    align: 'left'
  }).font('Helvetica').text(`${allStudentData.sin}`, {
    align: 'left'
  });

  doc.moveDown().font('Helvetica-Bold').fontSize(12).text("Nationality", {
    align: 'left'
  }).font('Helvetica').text(`${allStudentData.nationality}`, {
    align: 'left'
  });

  var finalString = ''; // contains the base64 string
  var stream = doc.pipe(new Base64Encode());

  doc.end(); // will trigger the stream to end

  stream.on('data', function (chunk) {
    finalString += chunk;
  });

  stream.on('end', function () {
    // the stream is at its end, so push the resulting base64 string to the response
    console.log("finished writing...");
    var contents = finalString;
    var message = "Hello,<br><br>Please see the attached document with " + allStudentData.firstName + " " + allStudentData.lastName + "'s data for registration.<br><br>Thank you,<br><br>Peak Online Services";
    var pdfName = allStudentData.firstName + "_Registration_Form.pdf"
    sendPdfEmail("Student Registration Submission", message, pdfName, contents);
    console.log("email sent");
    return res.redirect('/');
  });

});

function sendPdfEmail(subject, message, attachmentname, baseContent) {
  const requestMail = mailjet.post("send", { 'version': 'v3.1' }).request({
    "Messages": [
      {
        "From": {
          "Email": "chaim@peakcollege.ca",
          "Name": "Peak Online Services"
        },
        "To": [
          {
            "Email": "yunny@peakcollege.ca",
            "Name": "Yunny Lee"
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