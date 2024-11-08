//register the service worker
if ("serviceWork" in navigator) {
  window.addEventListener("load",()=>{
      navigator.serviceWorker
      .register("sw.js")
      .then((registration)=>{
        console.log("Service worker registered with scope: ", registration.scope);
      })
      .catch((error)=>{
        console.error("Service worker registration failed", error);
      });
  }); 
}

const pastJokesContainer = document.getElementById("allJokes");

let db;
const dbName = "JokesDatabase";
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
});
};
//create any new object stores for our db or delete any old ones from a previous version
const objectStore = db.createObjectStore("jokeData", 
  {
    keyPath: "id",
});

//create a broadcast channel - name here needs to match the name in the sw
const channel = new BroadcastChannel("jokes_channel");

//listen for messages
channel.onmessage = (event) => {
console.log("Received a message in PWA: ", event.data);

if (event.data === "data-updated") {
  //update the UI or perform other actions
  console.log("Data Updated!");
  renderPastJokes();
}
};

//refresh the UI
renderPastJokes();

//make sure the DOM is fully loaded before trying to access it
document.addEventListener("DOMContentLoaded",()=>{
const sendButton = document.getElementById("sendButton");

if (sendButton) {
  sendButton.addEventListener("click", requestJokes);
} else {
  console.error("Button with ID 'sendButton' not found");
}
});

function getAllJokes() {
return new Promise((resolve, reject) => {
  const request = indexedDB.open(dbName);

  request.onerror = (event) => {
    reject(`Database error: ${event.target.error}`);
  };
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction("jokeData", "readonly");
    const objectStore = transaction.objectStore("jokeData");

    const objects = [];
    objectStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        //add each object to our array
        objects.push(cursor.value);
        cursor.continue();
      } else {
        //no more objects to iterate, resolve the promise
        resolve(objects);
      }
    };
    transaction.oncomplete = () => {
      db.close();
    };
  };
});
} //getAllJokes

function renderPastJokes() {

getAllJokes()
  .then((jokes)=>{

    console.log("All objects: ", jokes);
    if (jokes.length > 0) {
      const jokeList = document.getElementById("allJokes");
      //clear the list of past jokes since we're going to re-render it
      jokeList.innerHTML = "";

      const pastJokesHeader = document.createElement("h2");
      pastJokesHeader.textContent = "Saved Jokes";

      const pastJokesList = document.createElement("ul");
      pastJokesList.id = "jokeList";

      //loop over each joke and render it
      jokes.forEach((joke)=>{
        const jokeEl = document.createElement("li");
        jokeEl.innerHTML = `<div>
          <span class="title">Setup: </span>${joke.setup}<br />
          <span class="title">Delivery: </span>${joke.delivery}
        </div>`;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("delete-btn");
        deleteButton.addEventListener("click", ()=>{
          deleteJoke(joke.id);
        });
        jokeEl.appendChild(deleteButton);
        pastJokesList.appendChild(jokeEl);
      });
      jokeList.appendChild(pastJokesHeader);
      jokeList.appendChild(pastJokesList);
    }

  })
  .catch((error)=>{
    console.error("Error retrieving objects: ", error);
  })

}//renderPastJokes

function deleteJoke(id) {
  const transaction = db.transaction(["jokeData"], "readWrite");
  const objectStore = transaction.objectStore("jokeData");
  const request = objectStore.delete(id);

  request.onsuccess = function (event) {
      console.log("Joke was deleted successfully");
      renderPastJokes();
  };

  request.onerror = function (event) {
      console.log("Error deleting joke: "+ event.target.error);
  };
}

function requestJokes() {
  channel.postMessage("fetch-jokes");
  console.log("Requested jokes from service worker")
}