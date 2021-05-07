$(document).ready(function () {
  getStudents();
  getNotifications();
  getEmailSettings("hidden");
  $("#add-email-form").hide();
  $("#show-more-notifications").hide();
  $(".input").on("focus", addClass);
  $(".input").on("blur", removeClass);
});

var currentStudentKey = null;
var sorted = [];

function handleSignIn() {
  var provider = new firebase.auth.GoogleAuthProvider();

  firebase.auth()
    .signInWithPopup(provider)
    .then((result) => {
      /** @type {firebase.auth.OAuthCredential} */
      var credential = result.credential;

      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = credential.accessToken;
      // The signed-in user info.
      var user = result.user;
      console.log(user.email);
    }).catch((error) => {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
      // ...
    });
}

function handleAddStudentSubmit() {
  var firstName = $("#first-name").val();
  var lastName = $("#last-name").val();
  var email = $("#email").val();
  var startDate = $("#enrol-date").val();
  var tuition = $("#tuition-input").val();
  var downpayment = $("#downpayment").val();
  var studentClass = $('#student-class').find(":selected").text();
  var totalMonths = $("#tuition-months").val();

  email = email.trim();
  firstName = firstName.trim();
  lastName = lastName.trim();

  var split_names = firstName.split(" ");
  var middleName = "";

  if (split_names.length > 2) {
    for (var i = 1; i < split_names.length; i++) {
      middleName = middleName + " " + split_names[i];
    }
    middleName = formatName(middleName);
  }

  firstName = formatName(firstName);
  lastName = formatName(lastName);
  email = email.toLowerCase();

  var isValid = validateEmail(email);
  if (isValid) {
    $("#email").css("border-color", "#e0e0e5");
    addStudent(firstName, middleName, lastName, email, startDate, tuition, totalMonths, studentClass, downpayment);
  } else {
    $("#add-student-form").submit(function (e) {
      e.preventDefault();
    });
    $("#email").css("border-color", "red");
  }
}

function formatName(name) {
  name = name.trim();
  name = capitalize(name);
  if (name.indexOf("-") > 0) {
    var temp = name.split("-");
    name = "";
    for (var part in temp) {
      name = name + capitalize(temp[part]) + "-";
    }
    name = name.slice(0, -1);
  }

  if (name.indexOf(" ") > 0) {
    var temp = name.split(" ");
    name = "";
    for (var part in temp) {
      name = name + capitalize(temp[part]) + " ";
    }
    name = name.slice(0, -1);
  }

  return name;
}

function addStudent(firstName, middleName, lastName, email, startDate, tuition, totalMonths, studentClass, downpayment) {
  tuition = parseFloat(tuition).toFixed(2);
  downpayment = parseFloat(downpayment).toFixed(2);

  var studentData = {
    firstName: firstName,
    middleName: middleName,
    lastName: lastName,
    email: email,
    startDate: startDate,
    tuition: parseFloat(tuition),
    totalMonths: parseInt(totalMonths),
    studentClass: studentClass,
    remainingBalance: parseFloat(tuition),
    downpayment: parseFloat(downpayment)
  };

  var database = firebase.database().ref("students");

  var newStudentRef = database.push();

  newStudentRef.set(studentData, (error) => {
    if (error) {
      alert("Writing error. Couldn't add student to database.");
    } else {
      getStudents();
    }
  });

}

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function getStudents() {
  var selectedStudent = $(".selected").attr('id');

  $('#student-list .studentButton').remove();

  return firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    var tempArray = [];

    for (var studentKey in students) {
      var studentObject = {
        student: students[studentKey],
        studentKey: studentKey
      }
      tempArray.push(studentObject);
    }

    tempArray.sort(function (a, b) {
      if (a.student.lastName.localeCompare(b.student.lastName) < 0) { return -1; }
      if (a.student.lastName.localeCompare(b.student.lastName) >= 0) { return 1; }
      return 0;
    });

    for (var tempKey in tempArray) {
      var student = tempArray[tempKey];
      $("#student-list").append(`<div><a class='studentButton' id='` + student.studentKey + `' onClick="openStudentTab('` + student.studentKey + `')">` + student.student.firstName + " " + student.student.lastName + "</a></div>");
    }
    $("#" + selectedStudent).addClass("selected");
  });
}

function openStudentTab(thisStudent) {
  firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    for (var studentKey in students) {
      if (thisStudent.localeCompare(studentKey) == 0) {
        var student = students[studentKey];
        currentStudentKey = studentKey;

        var returnData = calculateAmountDue3(student);
        var amountDue = returnData[0];
        var dueDate = returnData[1];
        var remainingBalance = returnData[2];
        var interest = returnData[3];

        var timeUntilDue = differenceInDays(dueDate, getCurrentDate());

        amountDue = parseFloat(amountDue);

        if (amountDue > 0) {
          $("label[for='student-amountDue']").text("Amount Due");
          $("#days-until-due #dueDays").remove();
          if (timeUntilDue == -1) {
            $("#days-until-due").append("<p id='dueDays'>(<span >" + Math.abs(timeUntilDue) + " day ago</span>)</p>");
          } else if (timeUntilDue == 1) {
            $("#days-until-due").append("<p id='dueDays'>(in <span >" + timeUntilDue + " day</span>)</p>");
          } else if (timeUntilDue > 0) {
            $("#days-until-due").append("<p id='dueDays'>(in <span >" + timeUntilDue + " days</span>)</p>");
          } else if (timeUntilDue == 0) {
            $("#days-until-due").append("<p id='dueDays'>(due <span >today</span>)</p>");
          } else {
            $("#days-until-due").append("<p id='dueDays'>(<span >" + Math.abs(timeUntilDue) + " days ago</span>)</p>");
          }
        } else if (amountDue < 0) {
          $("#days-until-due #dueDays").remove();
          $("label[for='student-amountDue']").text("Required Refund");
          amountDue = Math.abs(amountDue);
        } else {
          amountDue = Math.abs(amountDue);
          $("#days-until-due #dueDays").remove();
        }

        $("#student-name").text(student.firstName + " " + student.middleName + " " + student.lastName);
        $("#student-email").val(student.email);
        $("#student-startDate").val(student.startDate);
        $("#student-tuition").val(student.tuition.toFixed(2));
        $("#tuition-remaining").val(remainingBalance.toFixed(2));
        $("#student-nextPayment").val(dueDate);
        $("#student-amountDue").val(amountDue.toFixed(2));
        $("#student-monthsLeft").val(student.totalMonths);
        $("#student-interest").val(interest.toFixed(2));
        $(".cd-panel").addClass("cd-panel--is-visible");
        $(".close-pane").addClass("close-plane-visible");
        $("#" + studentKey).addClass("selected");
        getPaymentHistory();
        break;
      }
    }
  });
}

function closeStudentTab() {
  $(".cd-panel").removeClass("cd-panel--is-visible");
  $(".selected").removeClass("selected");
  $(".close-pane").removeClass("close-plane-visible");
}

function editStudent() {
  $("#edit-student").css("visibility", "hidden");
  $("#cancel-edit").css("visibility", "visible");
  $("#save-edit").css("visibility", "visible");
  $("#student-name").prop("contenteditable", true);
  $("#student-name").css("border", "1px solid #e0e0e5");
  $("#student-email").attr("disabled", false);
  $("#student-startDate").attr("disabled", false);
  $("#student-tuition").attr("disabled", false);
  $("#student-monthsLeft").attr("disabled", false);

  var studentTuition = document.getElementById('student-tuition');
  studentTuition.addEventListener('keyup', twoDecimals);

}

function enrolChange() {
  var startDate = $("#student-startDate").val();
  var nextPayment;

  if (differenceInDays(getCurrentDate(), startDate) > 0) {
    nextPayment = getNearestPayDate(startDate);
  } else {
    nextPayment = getNextPayDate(startDate, startDate);
  }

  var lastPaidDueDate = $(".payment-history-due-date").first().text();

  if (lastPaidDueDate != null && differenceInDays(lastPaidDueDate, getCurrentDate()) > 0 && differenceInDays(lastPaidDueDate, startDate) > 0) {
    nextPayment = getNextPayDate(lastPaidDueDate, startDate);
  }

  $("#student-nextPayment").val(nextPayment);
  var timeUntilDue = differenceInDays(nextPayment, getCurrentDate());
  if (timeUntilDue == -1) {
    $("#dueDays").html("(<span >" + Math.abs(timeUntilDue) + " day ago</span>)");
  } else if (timeUntilDue == 1) {
    $("#dueDays").html("(in <span >" + timeUntilDue + " day</span>)");
  } else if (timeUntilDue > 0) {
    $("#dueDays").html("(in <span >" + timeUntilDue + " days</span>)");
  } else if (timeUntilDue == 0) {
    $("dueDays").html("(due <span id='daysEarly' >today)</span>");
  } else {
    $("#dueDays").html("(<span >" + Math.abs(timeUntilDue) + " days ago</span>)");
  }
}

function nextPaymentChange() {
  var nextPayment = $("#student-nextPayment").val();
  var timeUntilDue = differenceInDays(nextPayment, getCurrentDate());
  if (timeUntilDue == -1) {
    $("#dueDays").html("(<span >" + Math.abs(timeUntilDue) + " day ago</span>)");
  } else if (timeUntilDue == 1) {
    $("#dueDays").html("(in <span >" + timeUntilDue + " day</span>)");
  } else if (timeUntilDue > 0) {
    $("#dueDays").html("(in <span >" + timeUntilDue + " days</span>)");
  } else if (timeUntilDue == 0) {
    $("dueDays").html("(due <span id='daysEarly' >today)</span>");
  } else {
    $("#dueDays").html("(<span >" + Math.abs(timeUntilDue) + " days ago</span>)");
  }
}

function saveEdit() {
  var email = $("#student-email").val();
  var isValid = validateEmail(email);

  if (isValid) {
    $("#student-email").css("border-color", "#e0e0e5");

    $("#edit-student").css("visibility", "visible");
    $("#cancel-edit").css("visibility", "hidden");
    $("#save-edit").css("visibility", "hidden");
    $("#student-name").prop("contenteditable", false);
    $("#student-name").css("border", "none");
    $("#student-email").attr("disabled", true);
    $("#student-startDate").attr("disabled", true);
    $("#student-nextPayment").attr("disabled", true);
    $("#student-tuition").attr("disabled", true);
    $("#student-monthsLeft").attr("disabled", true);

    var startDate = $("#student-startDate").val();
    var tuition = parseFloat($("#student-tuition").val());
    var totalMonths = parseInt($("#student-monthsLeft").val());

    var name = $("#student-name").text();

    var split_names = name.split(" ");

    var lastName = formatName(split_names[split_names.length - 1]);
    var firstName = formatName(split_names[0]);
    var middleName = "";

    if (split_names.length > 2) {
      for (var i = 1; i < split_names.length - 1; i++) {
        middleName = middleName + " " + split_names[i];
      }
      middleName = formatName(middleName);
    }

    var studentData = {
      firstName: firstName,
      lastName: lastName,
      middleName: middleName,
      email: email,
      startDate: startDate,
      tuition: parseFloat(tuition.toFixed(2)),
      totalMonths: parseInt(totalMonths)
    };

    firebase.database().ref("/students/" + currentStudentKey).update(studentData);

    firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
      var student = snapshot.val();

      var returnData = calculateAmountDue3(student);
      var amountDue = returnData[0];
      var dueDate = returnData[1];
      var remainingBalance = returnData[2];

      $("#student-name").text(firstName + " " + student.middleName + " " + lastName);
      $("#student-tuition").val(tuition.toFixed(2));
      $("#student-amountDue").val(amountDue.toFixed(2));
      $("#tuition-remaining").val(remainingBalance.toFixed(2));
      $("#student-nextPayment").val(dueDate);

    });
    getStudents();

  } else {
    $("#student-email").css("border-color", "red");
  }
}

function cancelEdit() {
  firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
    var student = snapshot.val();

    $("#student-name").text(student.firstName + " " + student.middleName + " " + student.lastName);
    $("#student-email").val(student.email);
    $("#student-startDate").val(student.startDate);
    $("#student-tuition").val(student.tuition);
    $("#student-monthsLeft").val(student.totalMonths);

    $("#edit-student").css("visibility", "visible");
    $("#cancel-edit").css("visibility", "hidden");
    $("#save-edit").css("visibility", "hidden");
    $("#student-name").prop("contenteditable", false);
    $("#student-name").css("border", "none");
    $("#student-email").attr("disabled", true);
    $("#student-startDate").attr("disabled", true);
    $("#student-nextPayment").attr("disabled", true);
    $("#student-tuition").attr("disabled", true);
    $("#student-monthsLeft").attr("disabled", true);
  });
}

function getNearestPayDate(startDate) {
  var currentDate = new Date();
  var enrolArray = startDate.split("-");

  var year = currentDate.getFullYear();
  var month = currentDate.getMonth() + 1;
  var currentDay = currentDate.getDate();
  var day = parseInt(enrolArray[2]);

  if (currentDay > day) {
    month = month + 1;
  }

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

function getNextPayDate(lastPayDate, startDate) {
  var lastPayArray = lastPayDate.split("-");
  var enrolArray = startDate.split("-");

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

function studentTabPayment() {
  var amountPaid = parseFloat($("#payment-input").val());
  var payDate = $("#payment-date").val();
  makePayment(amountPaid, payDate, function () {
    firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
      var student = snapshot.val();

      var returnData = calculateAmountDue3(student);
      var amountDue = returnData[0];
      var dueDate = returnData[1];
      var remainingBalance = returnData[2];
      var interest = returnData[3];

      if (amountDue >= 0) {
        var timeUntilDue = differenceInDays(dueDate, getCurrentDate());

        if (timeUntilDue == -1) {
          $("#dueDays").html("(<span >" + Math.abs(timeUntilDue) + " day ago</span>)");
        } else if (timeUntilDue == 1) {
          $("#dueDays").html("(in <span >" + timeUntilDue + " day</span>)");
        } else if (timeUntilDue > 0) {
          $("#dueDays").html("(in <span >" + timeUntilDue + " days</span>)");
        } else if (timeUntilDue == 0) {
          $("dueDays").html("(due <span id='daysEarly' >today)</span>");
        } else {
          $("#dueDays").html("(<span >" + Math.abs(timeUntilDue) + " days ago</span>)");
        }

        $("#student-nextPayment").val(dueDate);
        $("#tuition-remaining").val(remainingBalance.toFixed(2));
        $("#student-interest").val(interest.toFixed(2));
        $("#student-amountDue").val(amountDue.toFixed(2));
      } else {
        $("#dueDays").remove();
        $("#student-nextPayment").val(null);
        $("#tuition-remaining").val(remainingBalance.toFixed(2));
        $("#student-interest").val(interest.toFixed(2));
        $("#student-amountDue").val(Math.abs(amountDue).toFixed(2));
        $("label[for='student-amountDue']").text("Required Refund");
      }
      $("#payment-input").val(0);
      getPaymentHistory();
      getNotifications();
      sendThankYou(student, amountPaid, remainingBalance, interest);
    });
  });
}

function makePayment(amountPaid, payDate, _callback) {
  firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
    var student = snapshot.val();

    var payments = student.payments;
    if (payments != null) {
      var newPayments = new Map();
      var i = 0;
      var added = 0;
      var newPayment = {};
      newPayment.amount = amountPaid;
      newPayment.amountLeft = 0;
      newPayment.payDate = payDate;

      for (var paymentKey in payments) {
        var payment = payments[paymentKey];
        var tempPayment = {};
        tempPayment.amount = payment.amount;
        tempPayment.amountLeft = 0;
        tempPayment.payDate = payment.payDate;
        if (differenceInDays(payment.payDate, payDate) > 0 && added == 0) {
          newPayments.set("p" + i, newPayment);
          i++;
          newPayments.set("p" + i, tempPayment);
          added = 1;
        } else {
          newPayments.set("p" + i, tempPayment);
        }
        i++;
      }

      if (added == 0) {
        newPayments.set("p" + i, newPayment);
      }

      const newPaymentsObject = Object.fromEntries(newPayments);

      var studentData = {
        payments: newPaymentsObject
      }

      firebase.database().ref("/students/" + currentStudentKey).update(studentData).then(function () {
        _callback();
      });
    } else {
      var newPayment = {
        amount: amountPaid,
        amountLeft: 0,
        payDate: payDate
      };

      firebase.database().ref("/students/" + currentStudentKey + "/payments").push(newPayment).then(function () {
        _callback();
      });
    }
  });
}

function notificationCenterPayment(studentKey) {
  console.log("paying");
  currentStudentKey = studentKey;
  var amountPaid = parseFloat($("#payment-input-" + studentKey).val());
  var payDate = $("#payment-date-" + studentKey).val();

  console.log(amountPaid);
  console.log(payDate);

  makePayment(amountPaid, payDate, function () {
    firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
      var student = snapshot.val();

      var returnData = calculateAmountDue3(student);
      var amountDue = returnData[0];
      var dueDate = returnData[1];
      var remainingBalance = returnData[2];
      var interest = returnData[3];

      var days = differenceInDays(dueDate, getCurrentDate());

      if (days == -1) {
        $("#" + studentKey).html(": $" + amountDue + " due <span style='color: red'>" + Math.abs(days) + " day ago</span>.");
      } else if (days == 1) {
        $("#" + studentKey).html(": $" + amountDue + " due in <span style='color: green'>" + days + " day</span>.");
      } else if (days > 0) {
        $("#" + studentKey).html(": $" + amountDue + " due in <span style='color: green'>" + days + " days</span>.");
      } else if (days == 0) {
        $("#" + studentKey).html(": $" + amountDue + " due <span style='color: green'>today</span>.");
      } else {
        $("#" + studentKey).html(": $" + amountDue + " due <span style='color: red'>" + Math.abs(days) + " days ago</span>.");
      }

      sendThankYou(student, amountPaid, remainingBalance, interest);
    });
  });
  closeLogPayments("payment-" + studentKey);
}
/**
function makePaymentHome(studentKey) {
  firebase.database().ref("/students/" + studentKey).once('value').then((snapshot) => {
    var student = snapshot.val();

    if (student.monthsLeft > 0) {
      var amount = (student.tuition - student.principal) / student.monthsLeft;
      var interest = 0;

      if (differenceInDays(student.nextPayment, getCurrentDate()) < 0) {
        interest = amount * 0.03;
      }

      amount = parseFloat(amount.toFixed(2));
      interest = parseFloat(interest.toFixed(2));

      var newPayment = {
        dueDate: student.nextPayment,
        payDate: getCurrentDate(),
        amount: amount + interest
      }

      var nextPayment = getNextPayDate(student.nextPayment, student.startDate);

      var studentData = {
        principal: student.principal + amount,
        interestPaid: student.interest + interest,
        monthsLeft: student.monthsLeft - 1,
        nextPayment: nextPayment
      };

      firebase.database().ref("/students/" + studentKey).update(studentData);
      firebase.database().ref("/students/" + studentKey + "/paymentHistory").push(newPayment);

      var days = differenceInDays(nextPayment, getCurrentDate());

      if (days == -1) {
        $("#" + studentKey).html(": $" + amount + " due <span style='color: red'>" + Math.abs(days) + " day ago</span>.");
      } else if (days == 1) {
        $("#" + studentKey).html(": $" + amount + " due in <span style='color: green'>" + days + " day</span>.");
      } else if (days > 0) {
        $("#" + studentKey).html(": $" + amount + " due in <span style='color: green'>" + days + " days</span>.");
      } else if (days == 0) {
        $("#" + studentKey).html(": $" + amount + " due <span style='color: green'>today</span>.");
      } else {
        $("#" + studentKey).html(": $" + amount + " due <span style='color: red'>" + Math.abs(days) + " days ago</span>.");
      }
    } else {
      alert("This student has already paid off all of their tuition.");
    }
  });
}
*/

$("#search-student").submit(function (e) {
  e.preventDefault();
});

$("#add-payment-form").submit(function (e) {
  e.preventDefault();
});

$("#add-email-form").submit(function (e) {
  e.preventDefault();
});

$(document).ready(function () {
  $(".search-field").on("input", function () {
    // Declare variables
    var input, filter, a, i;
    input = $(this).val();
    filter = input.toUpperCase();
    $list = $(".studentButton");

    // Loop through all list items, and hide those who don't match the search query
    for (i = 0; i < $list.length; i++) {
      a = $list.eq(i).html();
      if (a.toUpperCase().indexOf(filter) > -1) {
        $list.eq(i).show();
      } else {
        $list.eq(i).hide();
      }
    }
  });
});

function manualEmail() {
  window.location.href = "mailto:" + $("#student-email").val();
}

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function deleteStudent() {
  if (confirm('Delete ' + $("#student-name").text() + '?')) {
    firebase.database().ref("/students/" + currentStudentKey).remove();
    getStudents();
    closeStudentTab();
  }
}

function getPaymentHistory() {
  firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
    var student = snapshot.val();
    var paymentHistory = student.payments;
    $("#payment-history .payments").remove();
    $("#payment-history  #history-default").remove();

    if (paymentHistory != null) {
      for (var paymentKey in paymentHistory) {
        var payment = paymentHistory[paymentKey];
        var amountPaid = parseFloat(payment.amount).toFixed(2);

        $("#payment-history").prepend("<p class='payments'><span class='payment-history-due-date'>$" + amountPaid + "</span> paid on " + payment.payDate + ".</p>");
      }
      if (student.downpayment > 0) {
        $("#payment-history").append("<p class='payments'><span class='payment-history-due-date'>$" + student.downpayment + "</span> downpayment.</p>");
      }
    } else {
      if (student.downpayment > 0) {
        $("#payment-history").append("<p class='payments'><span class='payment-history-due-date'>$" + student.downpayment + "</span> downpayment.</p>");
      } else {
        $("#payment-history").append('<p id="history-default">No payments yet.</p>');
      }
    }

  });
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

function differenceInDays(laterDate, earlierDate) {
  var Difference_In_Time = makeDateObject(laterDate).getTime() - makeDateObject(earlierDate).getTime();

  return Math.ceil(Difference_In_Time / (1000 * 3600 * 24));
}

function differenceInMonths(laterDate, earlierDate) {
  laterDate = makeDateObject(laterDate);
  earlierDate = makeDateObject(earlierDate);

  year1 = parseInt(laterDate.getFullYear());
  year2 = parseInt(earlierDate.getFullYear());
  month1 = parseInt(laterDate.getMonth());
  month2 = parseInt(earlierDate.getMonth());

  var counter = 0;

  while (year2 < year1) {
    if (month2 == 11) {
      year2++;
      month2 = -1;
    }
    month2++;
    counter++;
  }
  counter += month1 - month2;

  return counter;
}

function makeDateObject(dateString) {
  var temp = dateString.split("-");

  return new Date(parseInt(temp[0]), parseInt(temp[1]) - 1, parseInt(temp[2]));
}

function toNormalDate(month, year) {
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

  return month + " " + year;
}

function getNotifications() {
  $(".notification-wrapper").remove();

  firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();
    var studentArray = [];
    var i = 0;

    for (var studentKey in students) {
      var student = students[studentKey];
      currentStudentKey = studentKey;

      var returnData = calculateAmountDue3(student);
      var amountDue = returnData[0];
      var dueDate = returnData[1];
      var remainingBalance = returnData[2];

      var days = differenceInDays(dueDate, getCurrentDate());
      if (amountDue > 0) {
        studentArray[i] = { days: days, student: student, studentKey: studentKey, amountDue: amountDue.toFixed(2) };
        i++;
      }
    }

    if (studentArray.length > 0) {

      sorted = quickSort(studentArray, 0, studentArray.length - 1);

      (function myLoop(index) {
        setTimeout(function () {

          if (sorted[index].days == -1) {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due <span style='color: red'>" + Math.abs(sorted[index].days) + " day ago</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "<div></div>").hide().fadeIn(250));
          } else if (sorted[index].days == 1) {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due in <span style='color: green'>" + sorted[index].days + " day</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "</div></div>").hide().fadeIn(250));
          } else if (sorted[index].days > 0) {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due in <span style='color: green'>" + sorted[index].days + " days</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "</div></div>").hide().fadeIn(250));
          } else if (sorted[index].days == 0) {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due <span style='color: green'>today</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "<div></div>").hide().fadeIn(250));
          } else {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due <span style='color: red'>" + Math.abs(sorted[index].days) + " days ago</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "<div></div>").hide().fadeIn(250));
          }

          if (sorted[index + 1] == null) {
            $("#show-more-notifications").remove();
            return;
          }

          if (index + 1 == 5) {
            $("#show-more-notifications").fadeIn(100);
          }

          index++;
          if (index < 5) myLoop(index);
        }, 20)
      })(0);
    } else {
      $("#notification-center").append($("<p style='font-size:16px; margin:0px;'>No notifications at this time.</p>"));
      $("#show-more-notifications").remove();
    }
  });
}

function updateNotifications() {
  var numItems = $('.notification-wrapper').length;

  (function myLoop(index) {
    setTimeout(function () {
      if (sorted[index].days == -1) {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due <span style='color: red'>" + Math.abs(sorted[index].days) + " day ago</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "<div></div>").hide().fadeIn(250));
      } else if (sorted[index].days == 1) {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due in <span style='color: green'>" + sorted[index].days + " day</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "</div></div>").hide().fadeIn(250));
      } else if (sorted[index].days > 0) {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due in <span style='color: green'>" + sorted[index].days + " days</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "</div></div>").hide().fadeIn(250));
      } else if (sorted[index].days == 0) {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due <span style='color: green'>today</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "<div></div>").hide().fadeIn(250));
      } else {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + sorted[index].amountDue + " due <span style='color: red'>" + Math.abs(sorted[index].days) + " days ago</span>.</span></p></div><div class='button-wrapper'>" + paymentButton(sorted[index].studentKey) + "<div></div>").hide().fadeIn(250));
      }

      if (sorted[index + 1] == null) {
        $("#show-more-notifications").remove();
        return;
      }
      if ((index + 1) % 5 == 0) {
        $("#show-more-notifications").fadeIn(100);
      }

      index++;
      if (index < numItems + 5) myLoop(index);
    }, 20)
  })(numItems);
}

function swap(items, leftIndex, rightIndex) {
  var temp = items[leftIndex];
  items[leftIndex] = items[rightIndex];
  items[rightIndex] = temp;
}

function partition(items, left, right) {
  var pivot = items[Math.floor((right + left) / 2)].days, //middle element
    i = left, //left pointer
    j = right; //right pointer
  while (i <= j) {
    while (items[i].days < pivot) {
      i++;
    }
    while (items[j].days > pivot) {
      j--;
    }
    if (i <= j) {
      swap(items, i, j); //sawpping two elements
      i++;
      j--;
    }
  }
  return i;
}

function quickSort(items, left, right) {
  var index;
  if (items.length > 1) {
    index = partition(items, left, right); //index returned from partition
    if (left < index - 1) { //more elements on the left side of the pivot
      quickSort(items, left, index - 1);
    }
    if (index < right) { //more elements on the right side of the pivot
      quickSort(items, index, right);
    }
  }
  return items;
}

function addNewEmail() {
  var days = Math.ceil($("#days-to-email").val());
  var when = $('input[name="when"]:checked').val();

  if (when.localeCompare("after") == 0) {
    days = days * -1;
  }

  var emailData = {
    days: days
  };

  var database = firebase.database().ref("email-settings");

  var newEmailRef = database.push();
  newEmailRef.set(emailData, (error) => {
    if (error) {
      alert("Writing error. Couldn't add email to database.");
    } else {
      getEmailSettings("visible");
    }
  });

  $("#days-to-email").val('');
  $("#add-email-form").fadeOut(200);
  $("#add-new-email-button").show();
}

function getEmailSettings(isvisible) {
  $('.email-info-wrapper').remove();

  return firebase.database().ref("email-settings").once('value').then((snapshot) => {
    var emails = snapshot.val();
    var emailDays = [];
    var i = 0;

    for (var emailKey in emails) {
      emailDays[i] = emails[emailKey].days;
      i++;
    }

    emailDays.sort(function (a, b) {
      return b - a;
    });

    for (var j in emailDays) {
      if (emailDays[j] == -1) {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>" + Math.abs(emailDays[j]) + " day <span style='color: red;'>after</span> the due date.</p></div><div style='float:right; padding-left: 16px;'><a class='trash-email' onclick='deleteEmail(`" + emailDays[j] + "`)' style='visibility: " + isvisible + "'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      } else if (emailDays[j] == 1) {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>" + emailDays[j] + " day <span style='color: green;'>before</span> the due date.</p></div><div style='float:right; padding-left: 16px;'><a class='trash-email' onclick='deleteEmail(`" + emailDays[j] + "`)' style='visibility: " + isvisible + "'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      } else if (emailDays[j] > 0) {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>" + emailDays[j] + " days <span style='color: green;'>before</span> the due date.</p></div><div style='float:right; padding-left: 16px;'><a class='trash-email' onclick='deleteEmail(`" + emailDays[j] + "`)' style='visibility: " + isvisible + "'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      } else if (emailDays[j] == 0) {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>On the due date.</p></div><div style='float:right; padding-left: 16px;' ><a class='trash-email' onclick='deleteEmail(`" + emailDays[j] + "`)' style='visibility: " + isvisible + "'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      } else {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>" + Math.abs(emailDays[j]) + " days <span style='color: red;'>after</span> the due date.</p></div><div style='float:right; padding-left: 16px;'><a class='trash-email' onclick='deleteEmail(`" + emailDays[j] + "`)' style='visibility: " + isvisible + "'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      }
    }
  });
}

function showAddEmail() {
  $("#add-email-form").fadeIn(500);
  $("#add-new-email-button").hide();
}

function cancelAddEmail() {
  $("#days-to-email").val('');
  $("#add-email-form").hide();
  $("#add-new-email-button").show();
}

function deleteEmail(days) {
  return firebase.database().ref("email-settings").once('value').then((snapshot) => {
    var emails = snapshot.val();

    for (var emailKey in emails) {
      if (days == emails[emailKey].days) {
        firebase.database().ref("/email-settings/" + emailKey).remove();
        break;
      }
    }
    getEmailSettings();
  });
}

function twoDecimals(e) {
  var val = this.value;
  var re = /^([0-9]+[\.]?[0-9]?[0-9]?|[0-9]+)$/g;
  var re1 = /^([0-9]+[\.]?[0-9]?[0-9]?|[0-9]+)/g;
  if (re.test(val)) {
    //do something here

  } else {
    val = re1.exec(val);
    if (val) {
      this.value = val[0];
    } else {
      this.value = "";
    }
  }
}

function editEmails() {
  $("#add-new-email-button").css('visibility', 'visible');
  $(".trash-email").css('visibility', 'visible');
  $("#edit-emails").css('visibility', 'hidden');
  $("#done-editing-emails").css('visibility', 'visible');
}

function finishEmailEdit() {
  $("#add-new-email-button").css('visibility', 'hidden');
  $(".trash-email").css('visibility', 'hidden');
  $("#edit-emails").css('visibility', 'visible');
  $("#done-editing-emails").css('visibility', 'hidden');
}

$(document).on('change', '#filter-class', function () {
  return firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    var filter, a, i, studentClass;
    filter = $(this).find(":selected").text();
    $list = $(".studentButton");

    if (filter.localeCompare("All") == 0) {
      for (i = 0; i < $list.length; i++) {
        $list.eq(i).show();
      }
    } else {
      for (i = 0; i < $list.length; i++) {
        a = $list.eq(i).attr('id');
        studentClass = students[a].studentClass;
        if (studentClass.indexOf(filter) > -1) {
          $list.eq(i).show();
        } else {
          $list.eq(i).hide();
        }
      }
    }
  });
});

function openLogPayment() {
  if ($(".log-payment").attr('class').localeCompare("log-payment") == 0) {
    $(".log-payment").addClass("expand");
    $("#payment-date").val(getCurrentDate());
    $("#payment-input").val($("#student-amountDue").val());

    var studentPayment = document.getElementById('payment-input');
    studentPayment.addEventListener('keyup', twoDecimals);
  }
}

function openHomeLogPayment(id) {
  if ($("#" + id).attr("class").localeCompare("log-payment") == 0) {
    $("#" + id).addClass("expand");
    $("#payment-date").val(getCurrentDate());
    $("#payment-input").val(0);

    var studentPayment = document.getElementById('payment-input');
    studentPayment.addEventListener('keyup', twoDecimals);
  }
}
/*
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
*/
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

// Tabs code
$(function () {
  // Reference the tab links.
  const tabLinks = $('#tab-links li a');

  // Handle link clicks.
  tabLinks.click(function (event) {
    var $this = $(this);

    // Prevent default click behaviour.
    event.preventDefault();

    // Remove the active class from the active link and section.
    $('#tab-links a.active, section.active').removeClass('active');

    // Add the active class to the current link and corresponding section.
    $this.addClass('active');
    $($this.attr('href')).addClass('active');
  });
});

//Signin Page
function handleAdminSignIn() {
  var password = $("#admin-password").val();
  password = password.trim();
  password = password.toLowerCase();
  if (password.localeCompare("judy") == 0) {
    window.location.href = "dashboard";
  } else {
    $("#admin-password").val("");
    $(".input").blur();
  }
}

function addClass() {
  let parent = $(this.parentNode.parentNode);
  parent.addClass("focus");
}

function removeClass() {
  let parent = $(this.parentNode.parentNode);
  if (this.value == "") {
    parent.removeClass("focus");
  }
}

//Student Registration
function handleStudentRegistration() {
  window.location.href = "submitForm";
}

// thank you email
function sendThankYou(student, paid, balance, interest) {
  $.ajax({
    type: 'GET',
    url: '/thankyou',
    data: { student: student, paid: paid, balance: balance, interest: interest },
    success: function (response) {
    },
    error: function (xhr, status, err) {
    }
  });
}

function paymentButton(studentKey) {
  return `<div class="log-payment" id="payment-` + studentKey + `" onclick="openHomeLogPayment('payment-` + studentKey + `')"><div class="from"><div class="from-contents"><div class="log-payment-label">LOG PAYMENT</div></div></div><div class="to"><div class="to-contents"><div class="top"><div class="avatar-large me"></div><div class="name-large">LOG PAYMENT</div><div class="x-touch" onclick="closeLogPayments('payment-` + studentKey + `')"><div class="x"><div class="line1"></div><div class="line2"></div></div></div></div><div class="bottom"><form id="add-payment-form" onsubmit="notificationCenterPayment('` + studentKey + `');return false"><label for="payment-input-` + studentKey + `">Amount</label><div class="margin-med"><span id="dollar-sign">$</span><input class="payment-input" id="payment-input-` + studentKey + `" type="number" step="0.01" placeholder="500" required></div><label for="payment-date-` + studentKey + `">Payment Date</label><br><input class="payment-date" id="payment-date-` + studentKey + `" type="date" placeholder="yyyy-mm-dd" required><br><button id="add-payment-submit">Submit</button></form></div></div></div></div>`

}

function closeLogPayments(id) {
  $("#" + id).removeClass("expand");
  event.stopPropagation();
}






