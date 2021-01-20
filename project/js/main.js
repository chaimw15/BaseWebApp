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

  addStudent(firstName, lastName, email, enrolDate);
}

function addStudent(firstName, lastName, email, enrolDate) {
  var studentData = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    enrolDate: enrolDate,
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
  return firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();

    for (var studentKey in students) {
      var student = students[studentKey];
      $("#student-list").append(`<div><button onClick="openStudentTab('` + studentKey + `')">` + student.lastName + ", " + student.firstName + "</button></div>");
    }
  });
}

function getWeather(cityName) {
  var url = "https://api.openweathermap.org/data/2.5/weather?q=" + cityName + "&units=metric&APPID=" + apiKey;

  $.ajax(url, {
    success: function (data) {
      console.log(data);
      $(".city").text(data.name);
      $(".temp").text(data.main.temp);
      $(".error-message").text("");
    }, error: function (error) {
      $(".error-message").text("Sorry, we couldn't find that city.");
      $(".city").text("");
      $(".temp").text("");
    }
  });
}

function searchWeather() {
  var searchQuery = $(".search").val();

  getWeather(searchQuery);
}

function showPicture() {
  // use jQuery ($ is shorthand) to find the div on the page and then change the html
  // 'rounded-circle' is a bootstrap thing! Check out more here: http://getbootstrap.com/css/
  $("#image").append('<img class="rounded-circle" src="images/high-five.gif"/>');
  $("p").html("High five! You're building your first web app!");

  // jQuery can do a lot of crazy stuff, so make sure to Google around to find out more

}

function openStudentTab(thisStudent) {
  console.log(thisStudent);
  return firebase.database().ref("students").once('value').then((snapshot) => {
    var students = snapshot.val();
    console.log("hi");
    for (var studentKey in students) {
      console.log(studentKey);
      if (thisStudent.localeCompare(studentKey) == 0) {
        console.log("we're in");
        var student = students[studentKey];
        currentStudentKey = studentKey;
        $("#student-name").text(student.firstName + " " + student.lastName);
        $("#student-email").text("Email: " + student.email);
        $("#student-enrolDate").text("Enrol Date: " + student.enrolDate);
        $("#student-paid").text("Paid: " + student.paid);
        document.getElementById("studentTab").style.width = "250px";
        break;
      }
    }
  });
}

function closeStudentTab() {
  document.getElementById("studentTab").style.width = "0";
}

function editStudent() {

}

function submitEdit() {
  var name = $("#student-name").val();
  var email = $("#student-email").val();
  var enrolDate = $("#student-enrolDate").val();

  var split_names = name.split(" ");

  var studentData = {
    firstName: split_names[0],
    lastName: split_names[1],
    email: email,
    enrolDate: enrolDate
  };

  var updates = {};
  updates['/students/' + currentStudentKey] = studentData;
  return firebase.database().ref().update(updates);
}

function sendEmail() {
  const mailjet = require('node-mailjet').connect('6f9416b727cffc0d89dec6b4a24b83ab', 'bce7eb357dbe5795e238a0f098f13c4e');
  const request = mailjet.post("send", { 'version': 'v3.1' }).request({
      "Messages": [
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
    });
  request.then((result) => {
      console.log(result.body)
    }).catch((err) => {
      console.log(err.statusCode)
    });
}