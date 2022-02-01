// ==UserScript==
// @name        NBA Game Time Localizer
// @license     MIT
// @namespace   https://github.com/SamEvansTurner
// @match       https://www.nba.com/games*
// @match       https://www.nba.com/game/*
// @grant       none
// @version     1.0
// @author      Sam Evans-Turner
// @description Convert NBA.com game times shown to local times
// @updateURL   https://raw.githubusercontent.com/SamEvansTurner/NBAGameTimeLocalizer/master/nba-game-time-localizer.user.js
// @downloadURL https://raw.githubusercontent.com/SamEvansTurner/NBAGameTimeLocalizer/master/nba-game-time-localizer.user.js
// @supportURL  https://github.com/SamEvansTurner/NBAGameTimeLocalizer/issues
// ==/UserScript==

var currentURL = window.location.href;

//This only works on positive, non-decimal numbers.
function padDigits(number, digits) {
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
}


function convertToOffset(dateDiff) {
    var number = dateDiff / 3600000;
    var value = Math.abs(number);
    var str = ''
    var numHours = Math.floor(value);
    var numMinutes = (value - numHours) * 60;
    var numHoursStr = padDigits(numHours, 2);
    var numMinutesStr = padDigits(numMinutes, 2);
    str = (number < 0 ? '-' : '') + numHoursStr + ':' + numMinutesStr;
    return str;
}

function TwelveHRtoTwentyFourHR(timeStr) {
  var hours = Number(timeStr.match(/^(\d+)/)[1]);
  var minutes = Number(timeStr.match(/:(\d+)/)[1]);
  var AMPM = timeStr.match(/\s(.*)$/)[1];
  if(AMPM.toLowerCase() == "pm" && hours<12) hours = hours+12;
  if(AMPM.toLowerCase() == "am" && hours==12) hours = hours-12;
  var hoursStr = padDigits(hours, 2);
  var minutesStr = padDigits(minutes, 2);
  return hoursStr + ":" + minutesStr;
}

var mutationTimeout;

function mutationFunc(mutationsList, observer) {
  if(mutationTimeout){
    clearTimeout(mutationTimeout);
  }
  mutationTimeout = setTimeout(updateGamesPage, 400);
  console.log("div changed")
}

function loadGamesPageHook() {
  fullFrame = document.querySelector("div[class*=MaxWidthContainer_mwc]");
  flexFrame = fullFrame.querySelector("div[class*=relative]");
  const config = { attributes: true, childList: true, subtree: true };
  obs = new MutationObserver(mutationFunc);
  obs.observe(flexFrame, config);

  updateGamesPage();
}

function updateGamesPage() {
  console.log("Updating Games Page")
  var currentday = document.querySelector("button[class*=DatePickerWeek_dayActive]");
  var selectedDate = currentday.attributes['data-content'];
  var localDate = new Date(selectedDate.textContent);
  var newYorkDate = new Date(localDate.toLocaleString('en-US', {timeZone : 'America/New_York'}));
  var utcDate = new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000));
  var dateDiff = newYorkDate.getTime() - utcDate.getTime();
  var dateOffset = convertToOffset(dateDiff)
  var fullDate = selectedDate.textContent + "T00:00:00.000" + dateOffset;
  var selectedRealDate = new Date(fullDate);
  var localTimeZone = new Date().toLocaleTimeString(Navigator.language, {hour:'numeric', minute:'numeric', timeZoneName:'short', hour12:false}).split(' ')[1]
  var tags = document.querySelectorAll("p.h9.text-xs")

  tags.forEach(
    function(item, iterator) { 
      if (/.*ET.*/.test(item.innerText)) {
        var time = item.innerText.replace(' ET', '')
        var TFhrTime = TwelveHRtoTwentyFourHR(time)
        var nyTime = selectedDate.textContent + "T" + TFhrTime + ":00.000" + dateOffset;
        var lDate = new Date(nyTime);
        var timeString = lDate.toLocaleTimeString(Navigator.language, {hour:'numeric', minute:'numeric', hour12:true})
        item.innerText = timeString + " " + localTimeZone;
      }
    }
  )
  
}

function updateJSBar() {
  console.log("Updating JS Bar")
  var currentday = document.querySelector("select[class*=DropDown_select]");
  var selectedDate = currentday.value;
  var localDate = new Date(selectedDate);
  var newYorkDate = new Date(localDate.toLocaleString('en-US', {timeZone : 'America/New_York'}));
  var utcDate = new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000));
  var dateDiff = newYorkDate.getTime() - utcDate.getTime();
  var dateOffset = convertToOffset(dateDiff)
  var fullDate = selectedDate.textContent + "T00:00:00.000" + dateOffset;
  var selectedRealDate = new Date(fullDate);
  var localTimeZone = new Date().toLocaleTimeString(Navigator.language, {hour:'numeric', minute:'numeric', timeZoneName:'short', hour12:false}).split(' ')[1]
  var tags = document.querySelectorAll("div[class*=ScoreboardGame_gameStatusText]")
  tags.forEach(
  function(item, iterator){
    if (/.*ET.*/.test(item.innerText)) {
      var time = item.innerText.replace(' ET', '')
      var TFhrTime = TwelveHRtoTwentyFourHR(time)
      var nyTime = selectedDate + "T" + TFhrTime + ":00.000" + dateOffset;
      var lDate = new Date(nyTime);
      var timeString = lDate.toLocaleTimeString(Navigator.language, {hour:'numeric', minute:'numeric', hour12:true})
      item.innerText = timeString + " " + localTimeZone;
    }
  })
}

function JSBarUpdateFunction() {
  var myTimeout = setTimeout(updateJSBar);
}

function loadJSBarHook() {
  var currentday = document.querySelector("select[class*=DropDown_select]");
  buttons = document.querySelectorAll("button[class*=CarouselButton_btn]");
  currentday.addEventListener("change", JSBarUpdateFunction);
  buttons.forEach(
    function(item, iterator){
      item.addEventListener("click", JSBarUpdateFunction);
    });
  updateJSBar();
}

if (/.*\/games.*/.test(currentURL)) {
  loadGamesPageHook();
} else if (/.*\/game\/.*/.test(currentURL)) {
  loadJSBarHook();
}
