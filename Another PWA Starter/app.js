//register service worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
        .register("sw.js")
        .then((registration) => {
            console.log("Service worker registered with scope:", registration.scope);
        })
        .catch((error) => {
            console.log("Service worker registered failed:", error);
        });
    });
  }

  const pastJokesContainer = document.getElementById('allJokes');

//open or create the database
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
    }
  );
};
