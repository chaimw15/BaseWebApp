$(document).ready(function () {
  getStudents();
});

var currentStudentKey = null;

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

  var isValid = validateEmail(email);
  if (isValid) {
    addStudent(firstName, lastName, email, enrolDate, nextPayment);
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

function addStudent(firstName, lastName, email, enrolDate, nextPayment) {
  firstName = hyphenatedName(firstName);
  lastName = hyphenatedName(lastName);
  email = email.toLowerCase();

  var studentData = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    enrolDate: enrolDate,
    nextPayment: nextPayment
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
  $('#student-list .line-break').remove();

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
    for (var studentKey in students) {
      if (thisStudent.localeCompare(studentKey) == 0) {
        var student = students[studentKey];
        currentStudentKey = studentKey;

        var timeUntilDue = differenceInDays(student.nextPayment, getCurrentDate());
        $("#days-until-due #dueDays").remove();
        if (timeUntilDue > 0) {
          $("#days-until-due").append("<p id='dueDays'>in <span id='daysEarly' style='color:green'>" + timeUntilDue + " days.</span></p>");
        } else {
          $("#days-until-due").append("<p id='dueDays'><span id='daysLate' style='color:red'>" + Math.abs(timeUntilDue) + " ago.</span></p>");
        }

        $("#student-name").text(student.firstName + " " + student.lastName);
        $("#student-email").val(student.email);
        $("#student-enrolDate").val(student.enrolDate);
        $("#student-nextPayment").val(student.nextPayment);
        $(".cd-panel").addClass("cd-panel--is-visible");
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
}

function editStudent() {
  $("#edit-student").css("visibility", "hidden");
  $("#cancel-edit").css("visibility", "visible");
  $("#save-edit").css("visibility", "visible");
  $("#student-name").prop("contenteditable", true);
  $("#student-name").css("border", "1px solid #e0e0e5");
  $("#student-email").attr("disabled", false);
  $("#student-enrolDate").attr("disabled", false);
}

function saveEdit() {
  var email = $("#student-email").val();

  var isValid = validateEmail(email);

  if (isValid) {
    var name = $("#student-name").text();
    var enrolDate = $("#student-enrolDate").val();
    var nextPayment = getNearestPayDate(enrolDate);
    $("#student-nextPayment").val(nextPayment);
    $("#student-email").css("border-color", "#e0e0e5");

    $("#edit-student").css("visibility", "visible");
    $("#cancel-edit").css("visibility", "hidden");
    $("#save-edit").css("visibility", "hidden");
    $("#student-name").prop("contenteditable", false);
    $("#student-name").css("border", "none");
    $("#student-email").attr("disabled", true);
    $("#student-enrolDate").attr("disabled", true);

    var split_names = name.split(" ");

    firstName = hyphenatedName(split_names[0]);
    lastName = hyphenatedName(split_names[1]);

    var studentData = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      enrolDate: enrolDate,
      nextPayment: nextPayment
    };

    $("#student-name").text(firstName + " " + lastName);

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

  });

  $("#edit-student").css("visibility", "visible");
  $("#cancel-edit").css("visibility", "hidden");
  $("#save-edit").css("visibility", "hidden");
  $("#student-name").prop("contenteditable", false);
  $("#student-name").css("border", "none");
  $("#student-email").attr("disabled", true);
  $("#student-enrolDate").attr("disabled", true);
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

    var newPayment = {
      dueDate: student.nextPayment,
      payDate: getCurrentDate()
    }
    console.log(newPayment);

    var nextPayment = getNextPayDate(student.nextPayment, student.enrolDate);
    $("#student-nextPayment").val(nextPayment);

    var timeUntilDue = differenceInDays(nextPayment, getCurrentDate());
    if(timeUntilDue > 0) {
      $("#daysEarly").text(timeUntilDue + " days.");
    } else {
      $("#daysLate").text(timeUntilDue + " days ago.");
    }

    var studentData = {
      nextPayment: nextPayment
    };

    firebase.database().ref("/students/" + currentStudentKey).update(studentData);
    firebase.database().ref("/students/" + currentStudentKey + "/paymentHistory").push(newPayment);
    getPaymentHistory();
  });
}

$("#search-student").submit(function (e) {
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

        if (daysDifference > 0) {
          $("#payment-history").prepend("<p class='payments'>" + toNormalDate(payment.dueDate) + " payment paid on " + toNormalDate(payment.payDate) + " <span style='color: green'>" + daysDifference + " days early.</span></p>");
        } else {
          $("#payment-history").prepend("<p class='payments'>" + toNormalDate(payment.dueDate) + " payment paid on " + toNormalDate(payment.payDate) + " <span style='color: red'>" + Math.abs(daysDifference) + " days late.</span></p>");
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
  console.log(date1);
  console.log(date2);
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