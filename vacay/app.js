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
  //get the string of vacation from localStorage
  const data = window.localStorage.getItem(STORAGE_KEY);

  //if no vacations are stored, default to an empty array
  //otherwise, return the stored data (JSON string) as parsed JSON
  const vacations = data ? JSON.parse(data) : [];

  return vacations;
}//getAllStoredVacations

function renderPastVacations() {
  //get the parsed string of vacations or an empty array if there aren't any
  const vacations = getAllStoredVacation();

  //exit if there aren't any vacations
  if (vacations.length === 0) {
    return;
  }

  //clear the list of past vacations since we're going to re-render it
  pastVacationContainer.innerHTML = "";

  const pastVacationContainer = document.createElement("h2");
  pastVacationHeader.textContent = "Past Vacations";

  const pastVacationList = document.createElement("ul");

  //loop over all vacations and render them
  vacations.forEach((vacation)=>{
    const vacationEl = document.createElement("li");
    vacationEl.textContent = `From ${formatDate(vacation.startDate)}
      to ${formatDate(vacation.endDate)} `;
    pastVacationList.appendChild(vacationEl);
  });

  pastVacationContainer.appendChild(pastVacationHeader);
  pastVacationContainer.appendChild(pastVacationList);
}//renderPastVacations

function formatDate(dateString) {
  //convert the date string to a Date object
  const date = new Date(dateString);

  //format the date into a locale specific string
  //include your locale for a better user experience
  return date.toLocaleDateString("en-US", {timeZone: "UTC"});
}