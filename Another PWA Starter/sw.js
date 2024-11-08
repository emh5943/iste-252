const VERSION = "v2";

//offline resource list
const APP_STATIC_RESOURCES = [
    "index.html",
    "style.css",
    "app.js",
    "joketracker.json",
    "assets/icons/icon-512x512.png",
];

const CACHE_NAME = `joke-tracker-${VERSION}`;

/* handle the install event and  retrieve and store the file listed for the
    cache */
self.addEventListener("install",(event)=>{
    event.waitUntil(
        (async ()=>{
            const cache = await caches.open(CACHE_NAME);
            cache.addAll(APP_STATIC_RESOURCES);
        })()
    );
});

/* use the activate event to delete any old caches so we don't run out 
    of space. We're going to delete all but the current one. Then set
    the service worker as the controller for our app (PWA). */

self.addEventListener("activate", (event)=>{
    event.waitUntil(
        (async ()=>{
            //get names of existing caches
            const names = await caches.keys();

            /* iterate through the list and check each one to see if it is
                the current cache and delete if not */
            await Promise.all(
                names.map((name)=>{
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            ); //promise all

            /* use the claim() method of client's interface to
                enable our service worker as the controller */
            await clients.claim();
        })()
    ); //waitUntil
});

/* use the fetch event to intercept requests to the server so we can
    serve up our cached pages or respond with an error or 404 */
self.addEventListener("fetch", (event)=>{
    event.respondWith((async () => {
        //try to get the resource from the cache
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }

        //if not in the cache, try to fetch from the network
        try {
            const networkResponse = await fetch(event.request);

            //cache the new response for future use
            cache.put(event.request, networkResponse.clone());

            return networkResponse;
        } catch(error) {

            console.error("Fetch failed; returning offline page instead.",
                error);

            //if request if for the page, return index.html as a fallback
            if (event.request.mode === "navigate") {
                return cache.match("/index.html");
            }

            /* for everything else, we're just going to throw an error.
                You might want to return a default offline asset instead*/
            throw error;

        }
        })()
    ); //respond with
}); //fetch

//create a broadcast channel - name here needs to match the same in the sw
const channel = new BroadcastChannel("sw_channel");

//listen for messages
channel.onmessage = (event) => {
  console.log("Recived message in Service Worker:", event.data);
  
  if (event.data === "fetch-jokes") {
    console.log("Fetching Jokes...")
    fetchJokes();
  }
};

function fetchJokes() {
    fetch("https://v2.jokeapi.dev/joke/Programming?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=twopart&amount=5"
    )
    .then((response) => response.json() )
    .then((data) => {
        console.log("Got jokes:", data);
        return addDataToIndexedDB(data);
    })
    .then(()=>{
        //notify PWA that data's been updated
        channel.postMessage("data-updated");
    })
    .catch((error)=>{
        console.error("Error fetching jokes:", error);
        //optionally notify the PWA about the error
        channel.postMessage("fetch-error");
    })
} //fetchJokes

function addDataToIndexedDB(data) {
    return new Promise((resolve,reject) => {
        //open or create the db
        const request = indexedDB.open("JokesDatabase",1);

        request.onerror = (event) => {
            reject("IndexedDB error: "+ event.targer.error);
        };

        request.onsuccess = (event) => {
            //create our transaction

            //add each joke to the store

            //finish the transaction
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore("jokeData", { keyPath: "id" });
        };
    });
} //add data to db