$(document).ready(function () {
  getStudents();
  getNotifications();
  getEmailSettings();
  $("#add-email-form").hide();
  $("#show-more-notifications").hide();
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
  var enrolDate = $("#enrol-date").val();
  var nextPayment = getNearestPayDate(enrolDate);
  var tuition = $("#tuition-input").val();
  var tuitionMonths = $("#tuition-months").val();
  var downpayment = $("#downpayment").val();

  var isValid = validateEmail(email);
  if (isValid) {
    addStudent(firstName, lastName, email, enrolDate, nextPayment, tuition, tuitionMonths, downpayment);
    $("#email").css("border-color", "#e0e0e5");
  } else {
    $("#add-student-form").submit(function (e) {
      e.preventDefault();
    });
    $("#email").css("border-color", "red");
  }
}

function hyphenatedName(name) {
  var temp = name.split("-");
  name = "";
  for (var part in temp) {
    name = name + capitalize(temp[part]) + "-";
  }

  return name.slice(0, -1);
}

function addStudent(firstName, lastName, email, enrolDate, nextPayment, tuition, tuitionMonths, downpayment) {
  firstName = hyphenatedName(firstName);
  lastName = hyphenatedName(lastName);
  email = email.toLowerCase();

  tuition = parseFloat(tuition).toFixed(2);
  downpayment = parseFloat(downpayment).toFixed(2);

  var studentData = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    enrolDate: enrolDate,
    nextPayment: nextPayment,
    tuition: parseFloat(tuition),
    monthsLeft: parseInt(tuitionMonths),
    principal: parseFloat(downpayment),
    interest: 0
  };

  var database = firebase.database().ref("students");

  var newStudentRef = database.push();
  newStudentRef.set(studentData, (error) => {
    if (error) {
      alert("Writing error. Couldn't add student to database.");
    } else {
      // Data saved successfully!
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

    for (var studentKey in students) {
      var student = students[studentKey];
      $("#student-list").append(`<div><a class='studentButton' id='` + studentKey + `' onClick="openStudentTab('` + studentKey + `')">` + student.firstName + " " + student.lastName + "</a></div>");
    }
    $("#" + selectedStudent).addClass("selected");
  });
}

function openStudentTab(thisStudent) {
  firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    var studentTuition = document.getElementById('student-tuition');
    studentTuition.addEventListener('keyup', twoDecimals);

    for (var studentKey in students) {
      if (thisStudent.localeCompare(studentKey) == 0) {
        var student = students[studentKey];
        currentStudentKey = studentKey;

        var timeUntilDue = differenceInDays(student.nextPayment, getCurrentDate());
        $("#days-until-due #dueDays").remove();
        if (timeUntilDue == -1) {
          $("#days-until-due").append("<p id='dueDays'>(<span style='color:red'>" + Math.abs(timeUntilDue) + " day overdue</span>)</p>");
        } else if (timeUntilDue == 1) {
          $("#days-until-due").append("<p id='dueDays'>(in <span style='color:green'>" + timeUntilDue + " day</span>)</p>");
        } else if (timeUntilDue > 0) {
          $("#days-until-due").append("<p id='dueDays'>(in <span style='color:green'>" + timeUntilDue + " days</span>)</p>");
        } else if (timeUntilDue == 0) {
          $("#days-until-due").append("<p id='dueDays'>(due <span style='color:green'>today</span>)</p>");
        } else {
          $("#days-until-due").append("<p id='dueDays'>(<span style='color:red'>" + Math.abs(timeUntilDue) + " days overdue</span>)</p>");
        }

        var amountDue = 0;

        if (student.monthsLeft != null && student.monthsLeft > 0) {
          amountDue = (student.tuition - student.principal) / student.monthsLeft;
        }

        if (timeUntilDue < 0) {
          amountDue *= 1.03;
        }

        $("#student-name").text(student.firstName + " " + student.lastName);
        $("#student-email").val(student.email);
        $("#student-enrolDate").val(student.enrolDate);
        $("#student-tuition").val(student.tuition);
        $("#tuition-remaining").val(student.tuition - student.principal);
        $("#student-nextPayment").val(student.nextPayment);
        $("#student-amountDue").val(amountDue);
        $("#student-monthsLeft").val(student.monthsLeft);
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
  $("#student-enrolDate").attr("disabled", false);
  $("#student-nextPayment").attr("disabled", false);
  $("#student-tuition").attr("disabled", false);
  $("#student-monthsLeft").attr("disabled", false);
}

function enrolChange() {
  var enrolDate = $("#student-enrolDate").val();
  var nextPayment;

  if (differenceInDays(getCurrentDate(), enrolDate) > 0) {
    nextPayment = getNearestPayDate(enrolDate);
  } else {
    nextPayment = getNextPayDate(enrolDate, enrolDate);
  }

  var lastPaidDueDate = $(".payment-history-due-date").first().text();

  if (lastPaidDueDate != null && differenceInDays(lastPaidDueDate, getCurrentDate()) > 0 && differenceInDays(lastPaidDueDate, enrolDate) > 0) {
    nextPayment = getNextPayDate(lastPaidDueDate, enrolDate);
  }

  $("#student-nextPayment").val(nextPayment);
  var timeUntilDue = differenceInDays(nextPayment, getCurrentDate());
  if (timeUntilDue == -1) {
    $("#dueDays").html("(<span style='color:red'>" + Math.abs(timeUntilDue) + " day overdue</span>)");
  } else if (timeUntilDue == 1) {
    $("#dueDays").html("(in <span style='color:green'>" + timeUntilDue + " day</span>)");
  } else if (timeUntilDue > 0) {
    $("#dueDays").html("(in <span style='color:green'>" + timeUntilDue + " days</span>)");
  } else if (timeUntilDue == 0) {
    $("dueDays").html("(due <span id='daysEarly' style='color:green'>today)</span>");
  } else {
    $("#dueDays").html("(<span style='color:red'>" + Math.abs(timeUntilDue) + " days overdue</span>)");
  }
}

function nextPaymentChange() {
  var nextPayment = $("#student-nextPayment").val();
  var timeUntilDue = differenceInDays(nextPayment, getCurrentDate());
  if (timeUntilDue == -1) {
    $("#dueDays").html("(<span style='color:red'>" + Math.abs(timeUntilDue) + " day overdue</span>)");
  } else if (timeUntilDue == 1) {
    $("#dueDays").html("(in <span style='color:green'>" + timeUntilDue + " day</span>)");
  } else if (timeUntilDue > 0) {
    $("#dueDays").html("(in <span style='color:green'>" + timeUntilDue + " days</span>)");
  } else if (timeUntilDue == 0) {
    $("dueDays").html("(due <span id='daysEarly' style='color:green'>today)</span>");
  } else {
    $("#dueDays").html("(<span style='color:red'>" + Math.abs(timeUntilDue) + " days overdue</span>)");
  }
}

function saveEdit() {
  var email = $("#student-email").val();
  var enrolDate = $("#student-enrolDate").val();
  var nextPayment = $("#student-nextPayment").val();
  var tuition = $("#student-tuition").val();
  var tuitionLeft = $("#tuition-remaining").val();
  var monthsLeft = $("#student-monthsLeft").val();

  var paidToDate = tuition - tuitionLeft;

  var isValid = validateEmail(email);

  if (isValid) {
    var name = $("#student-name").text();
    var enrolDate = $("#student-enrolDate").val();

    $("#student-email").css("border-color", "#e0e0e5");

    $("#edit-student").css("visibility", "visible");
    $("#cancel-edit").css("visibility", "hidden");
    $("#save-edit").css("visibility", "hidden");
    $("#student-name").prop("contenteditable", false);
    $("#student-name").css("border", "none");
    $("#student-email").attr("disabled", true);
    $("#student-enrolDate").attr("disabled", true);
    $("#student-nextPayment").attr("disabled", true);
    $("#student-tuition").attr("disabled", true);
    $("#student-monthsLeft").attr("disabled", true);

    var split_names = name.split(" ");

    firstName = hyphenatedName(split_names[0]);
    lastName = hyphenatedName(split_names[1]);

    var studentData = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      enrolDate: enrolDate,
      nextPayment: nextPayment,
      tuition: parseFloat(tuition),
      monthsLeft: parseInt(monthsLeft)
    };

    var timeUntilDue = differenceInDays(nextPayment, getCurrentDate());
    var amountDue = 0;

    if (monthsLeft != null && monthsLeft > 0) {
      amountDue = (tuition - paidToDate) / monthsLeft;
    }

    if (timeUntilDue < 0) {
      amountDue *= 1.03;
    }

    $("#student-name").text(firstName + " " + lastName);
    $("#student-amountDue").val(parseFloat(amountDue).toFixed(2));
    $("#tuition-remaining").val(parseFloat(tuition - paidToDate).toFixed(2));

    firebase.database().ref("/students/" + currentStudentKey).update(studentData);

    getStudents();

  } else {
    $("#student-email").css("border-color", "red");
  }
}

function cancelEdit() {
  firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
    var student = snapshot.val();

    $("#student-name").text(student.firstName + " " + student.lastName);
    $("#student-email").val(student.email);
    $("#student-enrolDate").val(student.enrolDate);
    $("#student-nextPayment").val(student.nextPayment);
    $("#student-tuition").val(student.tuition);
    $("#student-monthsLeft").val(student.monthsLeft);

    $("#edit-student").css("visibility", "visible");
    $("#cancel-edit").css("visibility", "hidden");
    $("#save-edit").css("visibility", "hidden");
    $("#student-name").prop("contenteditable", false);
    $("#student-name").css("border", "none");
    $("#student-email").attr("disabled", true);
    $("#student-enrolDate").attr("disabled", true);
    $("#student-nextPayment").attr("disabled", true);
    $("#student-tuition").attr("disabled", true);
    $("#student-monthsLeft").attr("disabled", true);
  });
}

function getNearestPayDate(enrolDate) {
  var currentDate = new Date();
  var enrolArray = enrolDate.split("-");

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

function makePayment() {
  firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
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
      };

      var nextPayment = getNextPayDate(student.nextPayment, student.enrolDate);
      $("#student-nextPayment").val(nextPayment);

      var timeUntilDue = differenceInDays(nextPayment, getCurrentDate());
      if (timeUntilDue == -1) {
        $("#dueDays").html("(<span style='color:red'>" + Math.abs(timeUntilDue) + " day overdue</span>)");
      } else if (timeUntilDue == 1) {
        $("#dueDays").html("(in <span style='color:green'>" + timeUntilDue + " day</span>)");
      } else if (timeUntilDue > 0) {
        $("#dueDays").html("(in <span style='color:green'>" + timeUntilDue + " days</span>)");
      } else if (timeUntilDue == 0) {
        $("dueDays").html("(due <span id='daysEarly' style='color:green'>today)</span>");
      } else {
        $("#dueDays").html("(<span style='color:red'>" + Math.abs(timeUntilDue) + " days overdue</span>)");
      }

      var studentData = {
        principal: student.principal + amount,
        interest: student.interest + interest,
        monthsLeft: parseInt(student.monthsLeft - 1),
        nextPayment: nextPayment
      };

      var tuitionRemaining = student.tuition - student.principal - amount;

      $("#tuition-remaining").val(tuitionRemaining);
      $("#student-monthsLeft").val(parseInt(student.monthsLeft - 1));

      var amountDue = 0;

      if ((student.monthsLeft - 1) > 0) {
        amountDue = tuitionRemaining / (student.monthsLeft - 1);
      }

      if (timeUntilDue < 0) {
        amountDue = amountDue * 1.03;
      }

      $("#student-amountDue").val(parseFloat(amountDue).toFixed(2));

      firebase.database().ref("/students/" + currentStudentKey).update(studentData);
      firebase.database().ref("/students/" + currentStudentKey + "/paymentHistory").push(newPayment);

      getPaymentHistory();
    } else {
      alert("This student has already paid off all of their tuition.");
    }
  });
}

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

      var nextPayment = getNextPayDate(student.nextPayment, student.enrolDate);

      var studentData = {
        principal: student.principal + amount,
        interest: student.interest + interest,
        monthsLeft: student.monthsLeft - 1,
        nextPayment: nextPayment
      };

      firebase.database().ref("/students/" + studentKey).update(studentData);
      firebase.database().ref("/students/" + studentKey + "/paymentHistory").push(newPayment);

      var days = differenceInDays(nextPayment, getCurrentDate());

      if (days == -1) {
        $("#" + studentKey).html(": <span style='color: red'>" + Math.abs(days) + " day overdue</span>.");
      } else if (days == 1) {
        $("#" + studentKey).html(": due in <span style='color: green'>" + days + " day</span>.");
      } else if (days > 0) {
        $("#" + studentKey).html(": due in <span style='color: green'>" + days + " days</span>.");
      } else if (days == 0) {
        $("#" + studentKey).html(": due <span style='color: green'>today</span>.");
      } else {
        $("#" + studentKey).html(": <span style='color: red'>" + Math.abs(days) + " days overdue.</span>");
      }
    } else {
      alert("This student has already paid off all of their tuition.");
    }
  });
}

$("#search-student").submit(function (e) {
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
  firebase.database().ref("/students/" + currentStudentKey + "/paymentHistory").once('value').then((snapshot) => {
    var paymentHistory = snapshot.val();
    $("#payment-history .payments").remove();
    $("#payment-history  #history-default").remove();

    if (paymentHistory != null) {
      for (var paymentKey in paymentHistory) {
        var payment = paymentHistory[paymentKey];
        var daysDifference = differenceInDays(payment.dueDate, payment.payDate);
        var amountPaid = parseFloat(payment.amount).toFixed(2);

        if (daysDifference == -1) {
          $("#payment-history").prepend("<p class='payments'><span class='payment-history-due-date'>$" + amountPaid + "</span> paid on " + payment.payDate + ", <span style='color: red'>" + Math.abs(daysDifference) + " day overdue.</span></p>");
        } else if (daysDifference == 1) {
          $("#payment-history").prepend("<p class='payments'><span class='payment-history-due-date'>$" + amountPaid + "</span> paid on " + payment.payDate + ", <span style='color: green'>" + daysDifference + " day early.</span></p>");
        } else if (daysDifference > 0) {
          $("#payment-history").prepend("<p class='payments'><span class='payment-history-due-date'>$" + amountPaid + "</span> paid on " + payment.payDate + ", <span style='color: green'>" + daysDifference + " days early.</span></p>");
        } else if (daysDifference == 0) {
          $("#payment-history").prepend("<p class='payments'><span class='payment-history-due-date'>$" + amountPaid + "</span> paid on " + payment.payDate + ", <span style='color: green'>right on time.</span></p>");
        } else {
          $("#payment-history").prepend("<p class='payments'><span class='payment-history-due-date'>$" + amountPaid + "</span> paid on " + payment.payDate + ", <span style='color: red'>" + Math.abs(daysDifference) + " days overdue.</span></p>");
        }
      }
    } else {
      $("#payment-history").append('<p id="history-default">No payments yet.</p>');
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

function differenceInDays(date1, date2) {
  var Difference_In_Time = makeDateObject(date1).getTime() - makeDateObject(date2).getTime();

  return Math.ceil(Difference_In_Time / (1000 * 3600 * 24));
}

function makeDateObject(dateString) {
  var temp = dateString.split("-");

  return new Date(parseInt(temp[0]), parseInt(temp[1]) - 1, parseInt(temp[2]));
}

function toNormalDate(inputDate) {
  var temp = inputDate.split("-");
  var year = temp[0];
  var month = temp[1];
  var day = temp[2];

  switch (month) {
    case "01":
      month = "Jan."
      break;
    case "02":
      month = "Feb."
      break;
    case "03":
      month = "Mar."
      break;
    case "04":
      month = "Apr."
      break;
    case "05":
      month = "May"
      break;
    case "06":
      month = "Jun."
      break;
    case "07":
      month = "Jul."
      break;
    case "08":
      month = "Aug."
      break;
    case "09":
      month = "Sep."
      break;
    case "10":
      month = "Oct."
      break;
    case "11":
      month = "Nov."
      break;
    case "12":
      month = "Dec."
      break;

    default:
      break;
  }

  return month + " " + day + ", " + year;
}

function getNotifications() {
  $(".notification-wrapper").remove();
  return firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    var studentArray = [];
    var i = 0;

    for (var studentKey in students) {
      var student = students[studentKey];
      var days = differenceInDays(student.nextPayment, getCurrentDate());

      if (student.tuition > student.principal) {
        studentArray[i] = { days: days, student: student, studentKey: studentKey };
        i++;
      }
    }

    if (studentArray.length > 0) {

      sorted = quickSort(studentArray, 0, studentArray.length - 1);

      (function myLoop(index) {
        setTimeout(function () {
          var amountDue = 0;

          if (sorted[index].student.monthsLeft != null && sorted[index].student.monthsLeft > 0) {
            amountDue = (sorted[index].student.tuition - sorted[index].student.principal) / sorted[index].student.monthsLeft;
          }

          if (sorted[index].days < 0) {
            amountDue *= 1.03;
          }

          amountDue = amountDue.toFixed(2);

          if (sorted[index].days == -1) {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " is <span style='color: red'>" + Math.abs(sorted[index].days) + " day overdue</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Log Payment</button><div></div>").hide().fadeIn(250));
          } else if (sorted[index].days == 1) {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " due in <span style='color: green'>" + sorted[index].days + " day</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Log Payment</button></div></div>").hide().fadeIn(250));
          } else if (sorted[index].days > 0) {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " due in <span style='color: green'>" + sorted[index].days + " days</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Log Payment</button></div></div>").hide().fadeIn(250));
          } else if (sorted[index].days == 0) {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " due <span style='color: green'>today</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Log Payment</button><div></div>").hide().fadeIn(250));
          } else {
            $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " is <span style='color: red'>" + Math.abs(sorted[index].days) + " days overdue</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Log Payment</button><div></div>").hide().fadeIn(250));
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
      var amountDue = 0;

      if (sorted[index].student.monthsLeft != null && sorted[index].student.monthsLeft > 0) {
        amountDue = (sorted[index].student.tuition - sorted[index].student.principal) / sorted[index].student.monthsLeft;
      }

      if (sorted[index].days < 0) {
        amountDue *= 1.03;
      }

      amountDue = amountDue.toFixed(2);

      if (sorted[index].days == -1) {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p class='note-timing'>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " is <span style='color: red'>" + Math.abs(sorted[index].days) + " day overdue</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Mark As Paid</button><div></div>").hide().fadeIn(250));
      } else if (sorted[index].days == 1) {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p class='note-timing'>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " due in <span style='color: green'>" + sorted[index].days + " day</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Mark As Paid</button></div></div>").hide().fadeIn(250));
      } else if (sorted[index].days > 0) {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p class='note-timing'>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " due in <span style='color: green'>" + sorted[index].days + " days</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Mark As Paid</button></div></div>").hide().fadeIn(250));
      } else if (sorted[index].days == 0) {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p class='note-timing'>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " due <span style='color: green'>today</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Mark As Paid</button><div></div>").hide().fadeIn(250));
      } else {
        $("#notification-center").append($("<div class='notification-wrapper'><div class='notification-text-wrapper'><p class='note-timing'>" + sorted[index].student.firstName + " " + sorted[index].student.lastName + "<span id='" + sorted[index].studentKey + "'>: $" + amountDue + " is <span style='color: red'>" + Math.abs(sorted[index].days) + " days overdue</span>.</span></p></div><div class='button-wrapper'><button id='make-payment' onClick='makePaymentHome(`" + sorted[index].studentKey + "`)'>Mark As Paid</button><div></div>").hide().fadeIn(250));
      }

      if (sorted[index + 1] == null) {
        $("#show-more-notifications").remove();
        return;
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
      getEmailSettings();
    }
  });

  $("#days-to-email").val('');
  $("#add-email-form").fadeOut(200);
}

function getEmailSettings() {
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
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>" + Math.abs(emailDays[j]) + " day <span style='color: red;'>after</span> the due date.</p></div><div style='float:right; padding-left: 16px;'><a onclick='deleteEmail(`" + emailDays[j] + "`)'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      } else if (emailDays[j] == 1) {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>" + emailDays[j] + " day <span style='color: green;'>before</span> the due date.</p></div><div style='float:right; padding-left: 16px;'><a onclick='deleteEmail(`" + emailDays[j] + "`)'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      } else if (emailDays[j] > 0) {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>" + emailDays[j] + " days <span style='color: green;'>before</span> the due date.</p></div><div style='float:right; padding-left: 16px;'><a onclick='deleteEmail(`" + emailDays[j] + "`)'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      } else if (emailDays[j] == 0) {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>On the due date.</p></div><div style='float:right; padding-left: 16px;'><a onclick='deleteEmail(`" + emailDays[j] + "`)'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      } else {
        $("#email-settings").append($("<div class='email-info-wrapper' style='display:inline-block'><div style='float:left'><p class='email-info'>" + Math.abs(emailDays[j]) + " days <span style='color: red;'>after</span> the due date.</p></div><div style='float:right; padding-left: 16px;'><a onclick='deleteEmail(`" + emailDays[j] + "`)'><i class='far fa-trash-alt'></i></a></div></div>").hide().fadeIn(250));
      }
    }
  });
}

function showAddEmail() {
  $("#add-email-form").fadeIn(500);
}

function cancelAddEmail() {
  $("#days-to-email").val('');
  $("#add-email-form").fadeOut(200);
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
