const VERSION = "v2";

//offline resource list
const APP_STATIC_RESOURCES = [
    "index.html",
    "style.css",
    "app.js",
    "vacationtracker.json",
    "assets/icons/icon-512x512.png",
];

const CACHE_NAME = `vacation-tracker-${VERSION}`;

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

// //send a message to the client - we will use to update data later
// function sendMessageToPWA(message) {
//     self.clients.matchAll().then((clients) => {
//         clients.forEach(client => {
//             client.postMessage(message);
//         });
//     });
// }

// //send a message every 10 seconds
// setInterval(()=>{
//     sendMessageToPWA({type: "update", data: "New update avalible"});
// }, 10000);

// //listen for messages from the app
// self.addEventListener("message", (event)=>{
//     console.log("Service worker recieved a message", event.data);

//     //you can respond back if needed
//     event.source.postMessage({
//         type: "response",
//         data: "Message recieved"
//     })
// })

//create a broadcast channel - name here needs to match the same in the sw
const channel = new BroadcastChannel("sw_channel");

//listen for messages
channel.onmessage = (event) => {
  console.log("Recived message in Service Worker:", event.data);
  channel.postMessage("Service Worker received:" + event.data);
};

//send a message when the button is clicked
document.getElementById("sendButton").addEventListener("click", ()=>{
  const message = "Hello from SW!";
  channel.postMessage(message);
  console.log("Sent message from SW:", message);
});

//open or create the database
let db;
const dbName = "SyncDatabase";
const request = indexedDB.open(dbName, 1); //name and version needs to match app.js

request.onerror = function (event) {
  console.error("Database error: " + event.target.error);
};

request.onsuccess = function (event) {
  //now we actually have our db
  db = event.target.result;
  console.log("Database opened successfully in service worker");
};

self.addEventListener("sync", function(event){
  if(event.tag === "send-data") {
    event.waitUntil(sendDataToServer());
  }  
})

function sendDataToServer() {

} //sendDataToServer