$(document).ready(function () {
  getStudents();
})

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
  var nextPayment = getNextPayDate(enrolDate, enrolDate);

  addStudent(firstName, lastName, email, enrolDate, nextPayment);
}

function addStudent(firstName, lastName, email, enrolDate, nextPayment) {

  var studentData = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    enrolDate: enrolDate,
    nextPayment: nextPayment,
    paid: true
  };

  var database = firebase.database().ref("students");

  var newStudentRef = database.push();
  newStudentRef.set(studentData, (error) => {
    if (error) {
      // The write failed...
    } else {
      // Data saved successfully!
      window.location.reload();
    }
  });

}

function getStudents() {
  var selectedStudent = $(".selected").attr('id');

  $('#student-list .student-button-wrapper').remove();
  $('#student-list .line-break').remove();

  return firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    for (var studentKey in students) {
      var student = students[studentKey];
      $("#student-list").append(`<div><a class='studentButton' id='`+ studentKey +`' onClick="openStudentTab('` + studentKey + `')">` + student.firstName + " " + student.lastName + "</a></div>");
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
        $("#student-name").text(student.firstName + " " + student.lastName);
        $("#student-email").text(student.email);
        $("#student-enrolDate").val(student.enrolDate);
        $("#student-nextPayment").val(student.nextPayment);
        $("#student-paid").text(student.paid);
        $(".cd-panel").addClass("cd-panel--is-visible");
        $("#" + studentKey).addClass("selected");
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
  $("#student-email").prop("contenteditable", true);
  $("#student-enrolDate").attr("readonly", false);
  $("#student-nextPayment").attr("readonly", false);
}

function saveEdit() {
  var name = $("#student-name").text();
  var email = $("#student-email").text();
  var enrolDate = $("#student-enrolDate").val();
  var nextPayment = $("#student-nextPayment").val();

  $("#edit-student").css("visibility", "visible");
  $("#cancel-edit").css("visibility", "hidden");
  $("#save-edit").css("visibility", "hidden");
  $("#student-name").prop("contenteditable", false);
  $("#student-email").prop("contenteditable", false);
  $("#student-enrolDate").attr("readonly", true);
  $("#student-nextPayment").attr("readonly", true);

  var split_names = name.split(" ");

  var studentData = {
    firstName: split_names[0],
    lastName: split_names[1],
    email: email,
    enrolDate: enrolDate,
    nextPayment: nextPayment
  };

  console.log(split_names[1]);

  firebase.database().ref("/students/" + currentStudentKey).update(studentData);

  getStudents();
}

function cancelEdit() {
  firebase.database().ref("/students/" + currentStudentKey).once('value').then((snapshot) => {
    var student = snapshot.val();

    $("#student-name").text(student.firstName + " " + student.lastName);
    $("#student-email").text(student.email);
    $("#student-enrolDate").val(student.enrolDate);
    $("#student-nextPayment").val(student.nextPayment);
    $("#student-paid").text(student.paid);

  });

  $("#edit-student").css("visibility", "visible");
  $("#cancel-edit").css("visibility", "hidden");
  $("#save-edit").css("visibility", "hidden");
  $("#student-name").prop("contenteditable", false);
  $("#student-email").prop("contenteditable", false);
  $("#student-enrolDate").attr("readonly", true);
  $("#student-nextPayment").attr("readonly", true);
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