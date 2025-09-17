import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getDatabase, ref, set, push, onValue, get, update
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

let chart;
let pinIP = document.getElementById("pin-input");
let showPIN = document.getElementById("show-pin");
let sendOTP = document.getElementById("btn");
let dispOTP = document.querySelector("#displayOTP");
const newPin = document.querySelector(".new-pin-c");
const enterNewPin = document.querySelector(".enter-new-pin-c");
const analysisPanel = document.getElementById("analysis-panel");
const logList = document.getElementById("log-list");
const settingsIcon = document.getElementById("settings-icon");
const settingsPanel = document.getElementById("settings-panel");
const analysisIcon = document.getElementById("analysis-icon");
const backBtn = document.getElementById("back-btn");
let mainBody = document.getElementById("main-body");
let doorStatus = document.getElementById("status-color");

///////////////////////////////
// Firebase configuration
///////////////////////////////

const firebaseConfig = {
  apiKey: "AIzaSyAViEXi8HIlC-2Vstvuvr8CMdxRQZtVa9Y",
  authDomain: "saaas-4a9bc.firebaseapp.com",
  databaseURL: "https://saaas-4a9bc-default-rtdb.firebaseio.com",
  projectId: "saaas-4a9bc",
  storageBucket: "saaas-4a9bc.firebasestorage.app",
  messagingSenderId: "715781599214",
  appId: "1:715781599214:web:cf5975c0a4b45c163368ff",
  measurementId: "G-0CCSFJBV6X"
};

////////////////////////////////
// Initializing Firebase
////////////////////////////////

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function sendMessage(otp) {
  set(ref(db, "esp8266/message"), otp)
    .then(() => console.log("OTP sent:", otp))
    .catch((error) => console.error("Error:", error));
}

document.addEventListener("DOMContentLoaded", () => {
  let pin = "";

  get(ref(db, "pin/value")).then(snapshot => {
    if (snapshot.exists()) {
      pin = snapshot.val();
      console.log("Current PIN from Firebase:", pin);
    } else {
      console.warn("No PIN set in database!");
    }
  });

  console.log("DOM fully loaded");
  console.log("showPIN =", showPIN);

  showPIN.addEventListener("change", function () {
    if (this.checked) {
      pinIP.type = "text";
    } else {
      pinIP.type = "password";
    }
  });

  //////////////////////////////////
  //Sending OTP
  /////////////////////////////////
  
  sendOTP.addEventListener("click", () => {
    if (pinIP.value === pin) {
      let rndNum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
      sendMessage(rndNum);
      dispOTP.innerText = rndNum;
      console.log(rndNum);
      const logRef = ref(db, "logs");
      const logEntry = {
        action: `OTP Sent: ${rndNum}`,
        mode: "Web App",
        timestamp: Date.now()
      };
      push(logRef, logEntry);
    } else {
      alert("Incorrect pin! Enter again.");
      pinIP.value = "";
      dispOTP.innerText = "";
    }
  });

  settingsIcon.addEventListener("click", () => {
    if (settingsPanel.style.display === "none" || settingsPanel.style.display === "") {
      settingsPanel.style.display = "block";
      settingsPanel.classList.add("s-panel");
      document.getElementById("app-box").style.display = "none";
    } else {
      settingsPanel.style.display = "none";
      document.getElementById("app-box").style.display = "flex";
    }
  });

  enterNewPin.addEventListener("click", () => {
    if (newPin.value.length === 0) {
      alert("Please enter a valid PIN.");
      return;
    }

    update(ref(db, "pin"), {
      value: newPin.value
    }).then(() => {
      pin = newPin.value;
      alert("New PIN saved!");
      settingsPanel.style.display = "none";
      document.getElementById("app-box").style.display = "flex";
    }).catch(err => {
      console.error("Failed to update PIN:", err);
      alert("Error updating PIN");
    });
  });

  analysisIcon.addEventListener("click", () => {
    mainBody.style.height = "100%";
    settingsPanel.style.display = "none";
    document.getElementById("app-box").style.display = "none";
    analysisPanel.style.display = "block";

    get(ref(db, "logs")).then(snapshot => {
      const logs = snapshot.val();
      if (!logs) {
        logList.innerHTML = "No logs found.";
        return;
      }

      const entries = Object.values(logs);
      let list = "";
      const hourlyAccess = {};

      entries.forEach(entry => {
        const time = new Date(entry.timestamp);
        const hour = `${time.getHours()}:00`;
        list += `<li><strong>${entry.action}</strong> at ${time.toLocaleString()} via ${entry.mode}</li>`;
        hourlyAccess[hour] = (hourlyAccess[hour] || 0) + 1;
      });

      logList.innerHTML = `<ul>${list}</ul>`;
      showBarChart(hourlyAccess);
    });
  });

  backBtn.addEventListener("click", () => {
    analysisPanel.style.display = "none";
    mainBody.style.height = "35rem";
    document.getElementById("app-box").style.display = "flex";
  });

  // Response from ESP8266
  onValue(ref(db, "esp8266/action"), snapshot => {
    const action = snapshot.val(); 
    if (!action) return;

    const logRef = ref(db, "logs");
    const logEntry = {
      action: action,
      mode: "ESP8266",
      timestamp: Date.now()
    };
    push(logRef, logEntry);
    console.log("Logged:", logEntry);

    if (action === "LOCKED") {
      doorStatus.style.backgroundColor = "red";
    } else if (action === "UNLOCKED") {
      doorStatus.style.backgroundColor = "green";
    }
  });
});

///////////////////////////////
// Chart display
///////////////////////////////

function showBarChart(dataObj) {
  const ctx = document.getElementById("accessChart").getContext("2d");
  const labels = Object.keys(dataObj);
  const data = Object.values(dataObj);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Accesses per Hour",
        data: data,
        backgroundColor: "rgba(54, 162, 235, 0.7)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}