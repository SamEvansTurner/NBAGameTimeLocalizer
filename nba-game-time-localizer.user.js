// ==UserScript==
// @name        NBA Game Time Localizer
// @license     MIT
// @namespace   https://github.com/SamEvansTurner
// @match       https://www.nba.com/games*
// @match       https://www.nba.com/game/*
// @grant       none
// @version     3.4
// @author      Sam Evans-Turner
// @description Convert NBA.com game times shown to local times
// @updateURL   https://samevansturner.github.io/NBAGameTimeLocalizer/nba-game-time-localizer.user.js
// @downloadURL https://samevansturner.github.io/NBAGameTimeLocalizer/nba-game-time-localizer.user.js
// @supportURL  https://github.com/SamEvansTurner/NBAGameTimeLocalizer/issues
// ==/UserScript==

let currentURL = window.location.href;
let gamesPageMutationTimeout;
let videoBoxMutationTimeout;
let videoPageMutationTimeout;
let gameStripMutationTimeout;
let jsBarMutationTimeout;

/**********************
 * Accessory Functions
 **********************/
function logMessage(...args) {
    console.log("[NBAGameTimeLocalizer]", new Date().toISOString(), ...args)
}

//This only works on positive, non-decimal numbers.
function padDigits(number, digits) {
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
}

function convertToOffset(dateDiff) {
    let number = dateDiff / 3600000;
    let value = Math.abs(number);
    let str = ''
    let numHours = Math.floor(value);
    let numMinutes = (value - numHours) * 60;
    let numHoursStr = padDigits(numHours, 2);
    let numMinutesStr = padDigits(numMinutes, 2);
    str = (number < 0 ? '-' : '') + numHoursStr + ':' + numMinutesStr;
    return str;
}

function TwelveHRtoTwentyFourHR(timeStr) {
  let hours = Number(timeStr.match(/^(\d+)/)[1]);
  let minutes = Number(timeStr.match(/:(\d+)/)[1]);
  let AMPM = timeStr.match(/\s(.*)$/)[1];
  if(AMPM.toLowerCase() == "pm" && hours<12) hours = hours+12;
  if(AMPM.toLowerCase() == "am" && hours==12) hours = hours-12;
  let hoursStr = padDigits(hours, 2);
  let minutesStr = padDigits(minutes, 2);
  return hoursStr + ":" + minutesStr;
}

function calculateDates(selectedDateText) {
  let localDate = new Date(selectedDateText);
  let newYorkDate = new Date(localDate.toLocaleString('en-US', {timeZone : 'America/New_York'}));
  let utcDate = new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000));
  let dateDiff = newYorkDate.getTime() - utcDate.getTime();
  let dateOffset = convertToOffset(dateDiff)
  let localTimeZone = new Date(selectedDateText).toLocaleTimeString(Navigator.language, {hour:'numeric', minute:'numeric', timeZoneName:'short', hour12:false}).split(' ')[1]

  return {dateOffset, localTimeZone}
}

function processItemTime(item, selectedDateText, dateOffset, localTimeZone) {
  let time = item.innerText.replace(' ET', '')
  let TFhrTime = TwelveHRtoTwentyFourHR(time)
  let nyTime = selectedDateText + "T" + TFhrTime + ":00.000" + dateOffset;
  let lDate = new Date(nyTime);
  let timeString = lDate.toLocaleTimeString(Navigator.language, {hour:'numeric', minute:'numeric', hour12:true})
  item.innerText = timeString + " " + localTimeZone;
}

/**********************
 * Updator Functions
 **********************/
function updateGamesPage() {
  logMessage("Updating Games Page")
  let currentday = document.querySelector("button[class*=DatePickerWeek_dayActive]");
  let selectedDate = currentday.attributes['data-content'];
  let selectedDateText = selectedDate.textContent;
  let {dateOffset, localTimeZone} = calculateDates(selectedDateText);

  let tags = document.querySelectorAll("p[class*=GameCardMatchupStatusText_]")

  tags.forEach(
    function(item, iterator) {
      if (/.*ET.*/.test(item.innerText)) {
        processItemTime(item, selectedDateText, dateOffset, localTimeZone);
      }
    }
  )

}

function updateJSBar() {
  logMessage("Updating JS Bar")
  let currentday = document.querySelector("select[class*=DropDown_select]");
  let selectedDateText = currentday.value;
  let {dateOffset, localTimeZone} = calculateDates(selectedDateText);

  let tags = document.querySelectorAll("div[class*=ScoreboardGame_gameStatusText]");
  tags.forEach(
  function(item, iterator){
    if (/.*ET.*/.test(item.innerText)) {
      processItemTime(item, selectedDateText, dateOffset, localTimeZone)
    }
  })
}

function updateGameStrip() {
  logMessage("Updating gamestrip")
  let currentday = document.querySelector("select[class*=DropDown_select]");
  let selectedDateText = currentday.value;
  let {dateOffset, localTimeZone} = calculateDates(selectedDateText);

  let gameStrip = document.querySelector("div[id*=games-carousel]");
  if (gameStrip != null) {
    let tags = gameStrip.querySelectorAll("span[class*=game-start]");
    tags.forEach(
      function(item, iterator){
        if (/.*ET.*/.test(item.innerText)) {
          processItemTime(item, selectedDateText, dateOffset, localTimeZone)
        }
      })
  }
}

/**********************
 * Mutation Functions
 **********************/
function JSBarUpdateFunction() {
  setTimeout(updateJSBar);
}

function gamesPageMutation(mutationsList, observer) {
  if(gamesPageMutationTimeout){
    clearTimeout(gamesPageMutationTimeout);
  }
  gamesPageMutationTimeout = setTimeout(updateGamesPage, 400);
  logMessage("div changed")
}

function videoBoxMutation(mutationsList, observer) {
  if(videoBoxMutationTimeout){
    logMessage("videobox timeout")
    clearTimeout(videoBoxMutationTimeout);
  }
  let gameStrip = document.querySelector("div[id*=games-carousel]");
  if (gameStrip) {
    loadGameStripHook();
    clearTimeout(videoBoxMutationTimeout);
    observer.disconnect();
    logMessage("found gameStrip. Unloading videoBox mutationobserver")
  } else {
    logMessage("videoBox changed")
  }

}

function videoPageMutation(mutationsList, observer) {
  if(videoPageMutationTimeout){
    logMessage("videopage timeout")
    clearTimeout(videoPageMutationTimeout);
  }
  let videoBox = document.querySelector("div[class*=GameHero_video]");
  if (videoBox) {
    loadVideoHook();
    clearTimeout(videoPageMutationTimeout);
    observer.disconnect();
    logMessage("found videoBox. Unloading videoPage mutationobserver")
  } else {
    logMessage("videoPage changed. ")
  }
}

function jsBarMutation(mutationsList, observer) {
  logMessage("jsBar changed.")
  JSBarUpdateFunction()
}

function gameStripMutation(mutationsList, observer) {
  if(gameStripMutationTimeout){
    logMessage("unloading mutationobserver for gamestrip")
    observer.disconnect();
    clearTimeout(gameStripMutationTimeout);
  }
  gameStripMutationTimeout = setTimeout(updateGameStrip, 400);
  logMessage("gameStrip changed")
}

/**********************
 * Hook Functions
 **********************/
function loadGameStripHook() {
  let gameStrip = document.querySelector("div[id*=games-carousel]");
  const config = { attributes: true, childList: true, subtree: true };
  let obs3 = new MutationObserver(gameStripMutation);
  obs3.observe(gameStrip, config);
}

function loadVideoHook() {
  let videoContainer = document.querySelector("div[class*=GameHero_video]");
  const config = { attributes: true, childList: true, subtree: true };
  logMessage("creating video hook" + videoContainer)
  let obs2 = new MutationObserver(videoBoxMutation);
  obs2.observe(videoContainer, config);
}

function loadVideoPageHook() {
  let gameContainer = null;
  gameContainer = document.querySelector("section[class*=GameHero_container]");
  if(gameContainer != null) {
    const config = { attributes: true, childList: true, subtree: true };
    logMessage("creating video page hook " + gameContainer)
    let obs4 = new MutationObserver(videoPageMutation);
    obs4.observe(gameContainer, config);
  }

}

function loadJSBarHook() {
  let jsBar = document.querySelector("div[class*=Scoreboard_content]");
  if (jsBar != null) {
    const config = { attributes: true, childList: true, subtree: true };
    logMessage("creating jsBar hook " + jsBar)
    let obs5 = new MutationObserver(jsBarMutation);
    obs5.observe(jsBar, config);
  }
}

function loadGamesPageHook() {
  let fullFrame = document.querySelector("div[class*=MaxWidthContainer_mwc]");
  const config = { attributes: true, childList: true, subtree: true };
  let obs = new MutationObserver(gamesPageMutation);
  obs.observe(fullFrame, config);

  updateGamesPage();
}

/**********************
 * Entry Point
 **********************/
if (/.*\/games.*/.test(currentURL)) {
  loadGamesPageHook();
} else if (/.*\/game\/.*/.test(currentURL)) {
  loadVideoPageHook();
  loadJSBarHook();

}
