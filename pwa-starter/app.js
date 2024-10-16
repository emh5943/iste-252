//create constants for the form and form controls
const newVacationFormEl = document.getElementsByTagName("form")[0];
const startDateInputEl = document.getElementById("start-date");
const endDateInputEl = document.getElementById("end-date");
const pastVacationContainer = document.getElementById("past-vacations");

//listen to form submissions
newVacationFormEl.addEventListener("submit", (event) => {
  //prevent the form from submitting to the server
  //since we're doing everything on the client side
  event.preventDefault();

  //get the dates from the form
  const startDate = startDateInputEl.value;
  const endDate = endDateInputEl.value;

  //check if the dates are invalid
  if (checkDatesInvalid(startDate, endDate)) {
    return; //don't "submit" the form, just exit
  }

  //store the new vacation in our client-side storage
  storeNewVacation(startDate, endDate);

  //refresh the UI
  renderPastVacations();

  //reset the form
  newVacationFormEl.reset();
});

function checkDatesInvalid(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    //should do error message, etc here
    //we're just going to clear the form if anything is invalid
    newVacationFormEl.reset();

    return true; //something is invalid
  } else {
    return false; //everything is good
  }
}

//add the storage key as an app-wide constant
const STORAGE_KEY = "vaca_tracker";

function storeNewVacation(startDate, endDate) {
  //get data from storage
  const vacations = getAllStoredVacations(); //returns an array of objects

  //add the new vacation at the end of the array
  vacations.push({ startDate, endDate });

  //sort the array so newest to oldest vacations
  vacations.sort((a, b) => {
    return new Date(b.startDate) - new Date(a.startDate);
  });

  //store the new array back in storage
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vacations));
} //storeNewVaction


function getAllStoredVacations() {
  //get string of vacation from localStorage
  const data = window.localStorage.getItem(STORAGE_KEY);

  //if no vacations are stored, default to an empty array
  //otherwise, return the stored data (JSON string) as parsed JSON
  const vacations = data ? JSON.parse(data) : [];

  return vacations;
} //getAllStoredVacations

function renderPastVacations() {
  //get the parsed string of vacations or an empty array if there aren't any
  const vacations = getAllStoredVacations();

  //exit if there aren't any vacations
  if (vacations.length === 0) {
    return;
  }

  //clear the list of past vacations since we're gonna re-render it
  pastVacationContainer.innerHTML = "";

  const pastVacationHeader = document.createElement("h2");
  pastVacationHeader.textContent = "Past Vacations";

  const pastVacationList = document.createElement("ul");

  //loop over all vacations and render them
  vacations.forEach((vacation)=>{
    const vacationEl = document.createElement("li");
    vacationEl.textContent = `From ${formatDate(vacation.startDate)} 
      to ${formatDate(vacation.endDate)}`;
    pastVacationList.appendChild(vacationEl);
  });

  pastVacationContainer.appendChild(pastVacationHeader);
  pastVacationContainer.appendChild(pastVacationList);
} //renderPastVacations

function formatDate(dateString) {
  //convert
  const date = new Date(dateString);

  //format the date into a locale specific string.
  //include your locale for a better user experience
  return date.toLocaleDateString("en-US",{timeZone: "UTC"});
} //formatDate

//start the app by rendering the past vacations on load, if any
renderPastVacations();

//register
if ("serviceWork" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((registration) => {
      console.log("Service worker registered with scope:", registration.scope);
    })
    .catch((error) => {
      console.log("Service worker registered failed:", error);
    });
}

// //listen for messages from the service worker
// navigator.serviceWorker.addEventListener("message", (event) => {
//   console.log("Recieved a message from service worker:", event.data);

//   //handle different message types
//   if (event.data.type === "update") {
//     console.log("Update recieved:", event.data.data);
//     //update your UI or perform some action
//   }
// });

// //function to send a message to the service worker
// function sendMessageToSW(message) {
//   if (navigator.serviceWorker.controller) {
//     navigator.serviceWorker.controller.postMessage(message);
//   }
// }

// document.getElementById("sendButton").addEventListener("click", ()=>{
//   sendMessageToSW({type: "action", data: "Button clicked"});
// });

//create a broadcast channel - name here needs to match the same in the sw
const channel = new BroadcastChannel("pwa_channel");

//listen for messages
channel.onmessage = (event) => {
  console.log("Recived message in PWA:", event.data);
  document
    .getElementById("messages")
    .insertAdjacentHTML("beforeend", `<p>Received: ${event.data}</p>`);
};

//send a message when the button is clicked
document.getElementById("sendButton").addEventListener("click", ()=>{
  const message = "Hello from PWA!";
  channel.postMessage(message);
  console.log("Sent message from PWA:", message);
});

//open or create the database
let db;
const dbName = "SyncDatabase";
const request = indexedDB.open(dbName, 1);

request.onerror = function (event) {
  console.error("Database error: " + event.target.error);
};

request.onsuccess = function (event) {
  //now we actually have our db
  db = event.target.result;
  console.log("Database opened successfully");
};

request.onupgradeneeded = function (event) {
  db = event.target.result;

  //create any new object stores for our db or delete any old ones from a previous version
  const objectStore = db.createObjectStore("pendingData",
    {
      keyPath: "id",
      autoIncrement: true
    }
  );
};

//add data to our db, we need a transaction to accomplish it
function addDataToIndexedDB(data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pendingData"], "readWrite");
    const objectStore = transaction.objectStore("pendingData");
    const request = objectStore.add({data: data});

    request.onsuccess = function (event) {
      resolve();
    };
    request.onerror = function (event) {
      reject("Error storing data: " +event.target.error);
    }
  }); //promise
}

//Handle form submission
document.getElementById("dataForm").addEventListener("submit", function (event) {
  event.preventDefault(); //don't send to server now

  //get our data
  const data = document.getElementById("dataInput").value;

  //we need to check to see if both serviceWorker and the SyncManager avalible
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    //we're good to add data into db for offline persistence
    addDataToIndexedDB(data)
      .then(()=> navigator.serviceWorker.ready) //wait for sw to be ready
      .then((registration)=>{
        //registers a sync event for when device comes online
        return registration.sync.register("send-data");
      })
      .then(()=>{
        //update the UI for successful registration
        document.getElementById("status").textContent = "Sync registered. Data will be send when online.";
      })
      .catch((error) => {
        console.error("Error: ", error);
      });
  } else {
    //background sync isn't supported, try to send immediately
    sendData(data)
      .then((result)=>{
        //update UI
        document.getElementById("status").textContent = result;
      })
      .catch((error)=>{
        //update UI
        document.getElementById("status").textContent = error.message;
      })
  }
}); //event listener

//simulate sendinf data
function sendData(data) {
  console.log("Attempting to send data: ", data);

  return new Promise((resolve, reject) => {
    setTimeout(()=>{
      if (Math.random() > 0.5) {
        resolve("Data sent successfully");
      } else {
        rejext(new Error("Failed to send data"));
      }
    }, 1000);
  })
}