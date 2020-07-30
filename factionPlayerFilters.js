// ==UserScript==
// @name         TornCAT Faction Player Filters (DEV)
// @namespace    torncat
// @version      0.3.8
// @description  This script adds player filters on various pages (see matches below).
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/hospitalview.php*
// @match        https://www.torn.com/jailview.php*
// @match        https://www.torn.com/index.php?page=people*
// @match        https://www.torn.com/*list.php*
// @grant        GM_addStyle
// ==/UserScript==

'use strict';
var data = data || {};
var devel = false;
var maxQueries = 60;
var queryDelay = 200;
var apiDataCache = {};


// Following pages don't load the user list via AJAX.
var manualList = [
    'page=people',
    'step=profile'
];

(function() {
    'use strict';

    console.log('Faction Player Filters (FPF) started');
    loadData();
    save();

    // Automatically display widget for pages that load user lists via AJAX.
    $( document ).ajaxComplete(function( event, xhr, settings ) {
        if (hideAjaxUrl(settings.url) == false) {
            displayTCWidget();
        }
    });

    // Manually display the filter widget if current url matches an item in the manualList array.
    manualList.forEach(el =>{
        if (window.location.href.match(el)){
            displayTCWidget();
        }
    });

    // Disable filters on Hospital/ Jail pages.
    if (
        window.location.href.startsWith('https://www.torn.com/hospital') ||
        window.location.href.startsWith('https://www.torn.com/jail')
    ){
        $('#tc-filter-revive').parent().hide();
        $('#tc-filter-attack').parent().hide();
    }

})();

// Load localStorage data.
function loadData(){
    data = localStorage.getItem('torncat.factionFilters');

    if(data == undefined || data == null) {
        // Default settings
        data = {
            checked: {
                attack: false,
                revive: false,
                offline: false,
                refresh: false
            },
            apiKey : ''
        };
    } else {
        data = JSON.parse(data);
    }
}

// Save localStorage data.
function save(){
    console.log('FPF local data saved');
    localStorage.setItem('torncat.factionFilters', JSON.stringify(data));
}

function apiKeyPrompt(forceCheck){
    if (forceCheck != true || data.apiKey !== ''){
        return;
    }

    var button = '<button id="JApiKeyBtn" class ="torncat-icon-button"></button>';
    var input = '<input type="text" id="JApiKeyInput" style="';
    input += 'border-radius: 8px 0 0 8px;';
    input += 'margin: 4px 0px;';
    input += 'padding: 5px;';
    input += 'font-size: 16px;height: 20px';
    input += '" placeholder="  API Key"></input>';

    var block = '<div class="api-key-prompt profile-wrapper medals-wrapper m-top10">';
    block += '<div class="menu-header">TornCAT - Player Filters</div>';
    block += '<div class="profile-container"><div class="profile-container-description" style="padding: 10px">';
    block += 'In order to use this script you need to enter your Torn Api Key, which you can '+
        'get on your <a href="http://www.torn.com/preferences.php">preferences page</a> and under the \'API Key\' tab.<br />';
    block += input;
    block += button;
    block += '</div></div></div>';
    setTimeout(()=>{
        if ($('.api-key-prompt').length != 1){
            $(block).insertAfter('.torncat-player-filter-bar');

            $('#JApiKeyBtn').click(function(){
                data.apiKey = $('#JApiKeyInput').val();
                save();
                $('.api-key-prompt').remove();
                console.log('FPF: Starting Autorefresh');
                refreshInit();
            });
        }
    }, 1500);

}

// Find user list and insert TCWidget above it.
function displayTCWidget(){
    var reviveCheck = '#tc-filter-revive';
    var attackCheck = '#tc-filter-attack';
    var offlineCheck = '#tc-filter-offline';
    var refreshCheck = '#tc-refresh';
    var widgetLocationsselector = '';

    var widgetHTML = `
        <div class="torncat-player-filter-bar">
            <div class="info-msg-cont border-round m-top10">
                <div class="info-msg border-round">
                    <a class="torncat-icon" href="http://torncat.servegame.com" title="Send current list to TornCAT" target=”_blank” rel=”noopener noreferrer”></a>
                    <div class="torncat-filters">
                        <div class="msg right-round" tabindex="0" role="alert">
                            <label class="torncat-filter">
                                <span class="torncat-label">Revive Mode</span>
                                <input class="torncat-checkbox" id="tc-filter-revive" type="checkbox">
                            </label>
                            <label class="torncat-filter">
                                <span class="torncat-label">Attack Mode</span>
                                <input class="torncat-checkbox" id="tc-filter-attack" type="checkbox">
                            </label>
                            <label class="torncat-filter">
                                <span class="torncat-label">Hide Offline</span>
                                <input class="torncat-checkbox" id="tc-filter-offline" type="checkbox">
                            </label>
                            <label class="torncat-filter">
                                <span class="torncat-label">Auto Refresh (API)</span>
                                <input class="torncat-checkbox" id="tc-refresh" type="checkbox">
                            </label>
                            <button class="torn-btn" onclick="localStorage.removeItem('torncat.factionFilters');location.reload();">Clear Key</button>
                        </div>
                    </div>
                </div>
            </div>
            <hr class="page-head-delimiter m-top10 m-bottom10 ">
        </div>
    `;

    // Only insert if there isn't already a filter bar on the page.
    if ($('.torncat-player-filter-bar').length != 1){

        if (window.location.href.match('factions.php')){
            widgetLocationsselector = '#faction-info-members';
        } else {
            widgetLocationsselector = '.users-list-title';
        }

        var widgetLocationsLength = $(widgetLocationsselector).length;
        $(widgetHTML).insertBefore($(widgetLocationsselector)[widgetLocationsLength - 1]);
        // Watch for event changes on the revive mode checkbox.
        $(reviveCheck).change(function() {
            toggleUserRow('revive');
            if ($(attackCheck).prop('checked')){
                $(attackCheck).prop('checked', false);
                toggleUserRow('attack');
                data.checked.attack = false;
            }
            data.checked.revive = !data.checked.revive;
            save();
        });

        // Watch for event changes on the attack mode checkbox.
        $(attackCheck).change(function() {
            toggleUserRow('attack');
            if ($(reviveCheck).prop('checked')){
                $(reviveCheck).prop('checked', false);
                toggleUserRow('revive');
                data.checked.revive = false;
            }
            data.checked.attack = !data.checked.attack;
            save();
        });

        // Watch for event changes on the Hide Offline mode checkbox.
        $(offlineCheck).change(function() {
            // Stop auto-refresh.
            toggleUserRow('offline');
            data.checked.offline = !data.checked.offline;
            save();
        });

        $(refreshCheck).change(function() {
            if ($(refreshCheck).prop('checked')) {
                console.log('FPF: Starting Autorefresh');
                refreshInit();
            } else {
                console.log('FPF: Stopped processing queue. Queue cleared');
                queue.clear();
            }


        });
    }

    // Load cached logic between page refreshes.
    if (data.checked.attack == true){
        $(attackCheck).prop('checked', true);
        toggleUserRow('attack');
    }
    if (data.checked.revive == true){
        $(reviveCheck).prop('checked', true);
        toggleUserRow('revive');
    }
    if (data.checked.offline == true){
        $(offlineCheck).prop('checked', true);
        toggleUserRow('offline');
    }
    updateTCURL();

}

// Only returns if the AJAX URL is on the known list.
function hideAjaxUrl(url) {
    // Known AJAX URL's to ignore.
    var hideURLList = [
        'api.torn.com',
        'autocompleteHeaderAjaxAction.php',
        'competition.php',
        'missionChecker.php',
        'onlinestatus.php',
        'revive.php',
        'sidebarAjaxAction.php',
        'tornMobileApp.php',
        'websocket.php'
    ];

    // Known valid AJAX URl's, saved here for my own notes.
    // eslint-disable-next-line no-unused-vars
    var validURLList = [
        'userlist.php',
        'factions.php'
    ];

    for (let el of hideURLList) {
        if (url.match(el)) {
            return true;
        }
    }
    return false;
}

// Returns list of all unique playerIDs currently onscreen, formatted for TornCAT.
function getOnScreenPlayerIDs (offline = false) {
    var users = $('.user.name');
    var players = users.toArray();
    var playerIDs = [];

    var results = {};
    players.forEach(function(el){
        var regex = /(XID=)(\d*)/;
        var found = el.href.match(regex);
        var playerID = Number(found[0].slice(4));
        var pushPlayer = true;
        if ((
            $(el).closest('li').hasClass('torncat-hide-revive') ||
            $(el).closest('li').hasClass('torncat-hide-attack') ||
            $(el).closest('li').hasClass('torncat-hide-offline')
        ) && !(offline)){
            pushPlayer = false;
        }
        // Push to new array if not already present.
        if (playerIDs.indexOf(playerID) == -1 && pushPlayer != false){
            playerIDs.push(playerID);
        }
    });

    results.player_id = playerIDs;
    return results;
}

function updateTCURL() {
    let url = 'https://www.torncat.com';
    if (devel == true){
        url = 'http://localhost:8080';
    }

    var tornIDs = getOnScreenPlayerIDs();
    tornIDs = JSON.stringify(tornIDs);
    tornIDs = window.encodeURI(tornIDs);
    // Updates icon's url to contain latest playerlist for TornCAT to use.
    $('a.torncat-icon').attr('href', url + '?playerList=' + tornIDs);
}

/**
 * Toggles user rows based on param toggleType.
 * @param {string} toggleType
 */
function toggleUserRow(toggleType){
    var greenStatusList = $('.status .t-green').toArray();
    var redStatusList = $('.status .t-red').toArray();
    var blueStatusList = $('.status .t-blue').toArray();

    if (toggleType == 'offline') {
        var idleList = $('li [id^=icon62_').toArray();
        var offlineList = $('li [id^=icon2_]').toArray();

        var awayList = idleList.concat(offlineList);
        awayList.forEach(el =>{
            $(el).parent().closest('li').toggleClass('torncat-hide-' + toggleType);
        });
        updateTCURL();
        return;
    }

    blueStatusList.forEach(el => {
        var line = $(el).parent().closest('li');
        $(line).toggleClass('torncat-hide-' + toggleType);
    });


    greenStatusList.forEach(el => {
        var line = $(el).parent().closest('li');
        if(toggleType == 'revive'){
            $(line).toggleClass('torncat-hide-' + toggleType);
        }
    });

    redStatusList.forEach(el => {
        var matches = [
            'Traveling',
            'Fallen',
            'Federal'
        ];

        if (toggleType == 'attack') {
            var line = $(el).parent().closest('li');
            $(line).toggleClass('torncat-hide-' + toggleType);
        } else {
            matches.forEach(match => {
                if ($(el).html().endsWith(match) || $(el).html().endsWith(match + ' ')) {
                    var line = $(el).closest('li');
                    $(line).toggleClass('torncat-hide-'+toggleType);
                }
            });
        }
    });
    updateTCURL();

}

function refreshInit(){
    // Find players
    if (!('apiKey' in data) || data.apiKey == ''){
        apiKeyPrompt(true);
        return;
    }

    let players = getOnScreenPlayerIDs(true);
    // Assign queue
    players.player_id.forEach((id) => {
        queue.enqueue(id);
    });

    // Process queue
    let processingQueue = setInterval(
        () => {
            if (queue.isEmpty()){
                clearInterval(processingQueue);
            } else {
                processAutoRefreshQueue(queue);
                queue.requeue();
            }
        }, queryDelay
    );

}

/**
 *
 * @param {Queue} queue
 */
function processAutoRefreshQueue(queue){
    let now = new Date();
    if  (now - queue.start > 60000){
        queue.queries = 0;
        queue.start = now;
        console.log('FPF: Reset API call limit');
    }

    let playerID = queue.peek();
    // Process next queue item.
    (async () => {
        if (queue.queries < maxQueries){

            // Call player cache
            let playerData = await cacheCall(playerID).catch((error) => {
                console.error(error);
                queue.clear();
                apiKeyPrompt(true);
                return;
            });

            // Find player on page
            let selector = 'a[href$="' + playerID + '"]';

            // Update content
            updatePlayerIcon(selector, playerData);
            updatePlayerContent(selector, playerData);


            // CSS timeout for theming.
            setTimeout(()=>{
                $(selector).parent().closest('li').toggleClass('torncat-update');
            }, queryDelay * 2);
        } else {
            let delay = 60 - Math.round((now - queue.start) / 1000);
            console.log('Local API limit hit. Waiting ' + delay + 's');
        }
    })();
}

/**
 * Caches entire faction members' status.
 * @param {string} faction_id
 */
async function processFactionPage(){

    let faction_id = null;
    // Preload cache if on a faction page.
    if (window.location.href.startsWith('https://www.torn.com/factions.php')){
        let searchParams = new URLSearchParams(window.location.search);
        if (searchParams.has('ID')){
            faction_id = (searchParams.get('ID'));
        } else {
            faction_id = 0;
        }
    }

    if (faction_id == null) {
        return;
    }


    let url = 'https://api.torn.com/faction/' + faction_id + '?selections=basic,timestamp&key=' + data.apiKey;
    apiCall(url, function (d) {
        if ('error' in d){
            console.error(d.error.error);
            return;
        }
        let keys = Object.keys(d.members);
        keys.forEach((player_id)=>{
            let player = d.members[player_id];
            player.timestamp = d.timestamp;
            apiDataCache[player_id] = player;
        });
    });
}

function cacheCall(player_id){
    return new Promise((resolve, reject ) => {
        setTimeout(async () => {
            let playerData = {};
            let callFlag = false;
            let now = new Date();
            let nowEpoch = Math.round(now.getTime() / 1000);
            // check if player is in cache
            if (!(player_id in apiDataCache)){
                callFlag = true;
            } else {
                let player = apiDataCache[player_id];
                if ((!('timestamp' in player) === true) || player.timestamp < (nowEpoch - 30)) {
                    callFlag = true;
                } else {
                    if (devel) console.log('FPF: Cache hit for player ' + player_id);
                    playerData = player;
                }
            }


            if (callFlag) {
                await processFactionPage();
                let url = 'https://api.torn.com/user/' + player_id + '?selections=basic,profile,timestamp&key=' + data.apiKey;
                apiCall(url, function (d) {
                    if ('error' in d){
                        reject(d.error.error);
                    }
                    apiDataCache[player_id] = d;
                    resolve(d);
                });

            } else {
                resolve(playerData);
            }
        },500);

    });

}

// Calls torn API.
function apiCall(url, cb){
    queue.queries = queue.queries + 1;
    console.log('FPF: API Queries: ' + queue.queries);
    $.ajax({
        url: url,
        type: 'GET',
        success: function(data) {
            cb(data);
        }
    });
}

function updatePlayerIcon(selector, playerData){
    switch (playerData.last_action.status) {
    case 'Offline':
        $(selector).parent().closest('li').find('ul#iconTray.singleicon').find('li').first().attr('id','icon2_');
        if (data.checked.offline && !($(selector).parent().closest('li').first().hasClass('torncat-hide-offline'))){
            $(selector).parent().closest('li').first().addClass('torncat-hide-offline');
        }
        break;
    case 'Online':
        $(selector).parent().closest('li').find('ul#iconTray.singleicon').find('li').first().attr('id','icon1_');
        if (data.checked.offline && ($(selector).parent().closest('li').first().hasClass('torncat-hide-offline'))){
            $(selector).parent().closest('li').first().removeClass('torncat-hide-offline');
        }
        break;
    case 'Idle':
        $(selector).parent().closest('li').find('ul#iconTray.singleicon').find('li').first().attr('id','icon62_');
        if (data.checked.offline && !($(selector).parent().closest('li').first().hasClass('torncat-hide-offline'))){
            $(selector).parent().closest('li').first().addClass('torncat-hide-offline');
        }
        break;
    }
}

function updatePlayerContent(selector, playerData){
    // Row highlight.
    $(selector).parent().closest('li').toggleClass('torncat-update');
    
    let statusColor = playerData.status.color;

    // New status text and color.
    let newHtml = '<span class="d-hide bold">Status:</span><span class="t-' + statusColor + '">' + playerData.status.state + '</span>';
    $(selector).parent().closest('li').find('div.status').html(newHtml);
    $(selector).parent().closest('li').find('div.status').css('color', statusColor);
    

    // Apply filters, if checked.
    if (data.checked.revive) {
        // Hide traveling
        if ($(selector).parent().closest('li').find('div.status').find('span.t-blue').length) {
            if (!($(selector).parent().closest('li').first().hasClass('torncat-hide-revive'))){
                $(selector).parent().closest('li').first().addClass('torncat-hide-revive');
            }
        }
        // Hide Okay
        if ($(selector).parent().closest('li').find('div.status').find('span.t-green').length) {
            if (!($(selector).parent().closest('li').first().hasClass('torncat-hide-revive'))){
                $(selector).parent().closest('li').first().addClass('torncat-hide-revive');
            }
        }
    }
        
    if (data.checked.attack) {
        // Hide traveling
        if ($(selector).parent().closest('li').find('div.status').find('span.t-blue').length) {
            if (!($(selector).parent().closest('li').first().hasClass('torncat-hide-attack'))){
                $(selector).parent().closest('li').first().addClass('torncat-hide-attack');
            }
        }
        // Hide anyone else not OK
        if ($(selector).parent().closest('li').find('div.status').find('span.t-red').length) {
            if (!($(selector).parent().closest('li').first().hasClass('torncat-hide-revive'))){
                $(selector).parent().closest('li').first().addClass('torncat-hide-revive');
            }
        }
    }


}

// Queue constructor and methods
class Queue {
    constructor() {
        this.elements = [];
        this.queries = 0;
        this.start = new Date();
    }
    enqueue(el) {
        this.elements.push(el);
    }
    dequeue() {
        return this.elements.shift();
    }
    isEmpty() {
        return this.elements.length == 0;
    }
    peek() {
        return !this.isEmpty() ? this.elements[0] : undefined;
    }
    length() {
        return this.elements.length;
    }
    requeue() {
        let element = this.peek();
        this.dequeue();
        this.enqueue(element);
    }
    clear() {
        if(devel) console.debug('API Cache Dump:', apiDataCache);
        this.elements = [];
    }
}
var queue = new Queue();
// Custom styling.
var styles= `
.torncat-filters div.msg {
    display: flex;
    justify-content: center;
}

.torncat-filters {
    width: 100%
}

.torncat-filter {
    display: inline-block;
    margin: 0 10px 0 10px;
    text-align: center;
}
.torncat-update {
    background: rgba(76, 200, 76, 0.2) !important;
}
.torncat-hide-revive {
    display:none !important;
}
.torncat-hide-attack {
    display:none !important
}
.torncat-hide-offline {
    display:none !important
}

.torncat-icon {
    background-image: url("data:image/svg+xml,%3Csvg data-v-fde0c5aa='' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300' class='icon'%3E%3C!----%3E%3Cdefs data-v-fde0c5aa=''%3E%3C!----%3E%3C/defs%3E%3C!----%3E%3C!----%3E%3Cdefs data-v-fde0c5aa=''%3E%3C!----%3E%3C/defs%3E%3Cg data-v-fde0c5aa='' id='761e8856-1551-45a8-83d8-eb3e49301c32' fill='black' stroke='none' transform='matrix(2.200000047683716,0,0,2.200000047683716,39.999999999999986,39.99999999999999)'%3E%3Cpath d='M93.844 43.76L52.389 70.388V85.92L100 55.314zM0 55.314L47.611 85.92V70.384L6.174 43.718zM50 14.08L9.724 39.972 50 65.887l40.318-25.888L50 14.08zm0 15.954L29.95 42.929l-5.027-3.228L50 23.576l25.077 16.125-5.026 3.228L50 30.034z'%3E%3C/path%3E%3C/g%3E%3C!----%3E%3C/svg%3E");
    background-position: center center;
    background-repeat: no-repeat;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    display: inline-block;
    width: 32px;
}
.torncat-icon-button {
    background-image: url("data:image/svg+xml,%3Csvg data-v-fde0c5aa='' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300' class='icon'%3E%3C!----%3E%3Cdefs data-v-fde0c5aa=''%3E%3C!----%3E%3C/defs%3E%3C!----%3E%3C!----%3E%3Cdefs data-v-fde0c5aa=''%3E%3C!----%3E%3C/defs%3E%3Cg data-v-fde0c5aa='' id='761e8856-1551-45a8-83d8-eb3e49301c32' fill='black' stroke='none' transform='matrix(2.200000047683716,0,0,2.200000047683716,39.999999999999986,39.99999999999999)'%3E%3Cpath d='M93.844 43.76L52.389 70.388V85.92L100 55.314zM0 55.314L47.611 85.92V70.384L6.174 43.718zM50 14.08L9.724 39.972 50 65.887l40.318-25.888L50 14.08zm0 15.954L29.95 42.929l-5.027-3.228L50 23.576l25.077 16.125-5.026 3.228L50 30.034z'%3E%3C/path%3E%3C/g%3E%3C!----%3E%3C/svg%3E");
    background-position: center center;
    background-repeat: no-repeat;
    border-bottom-right-radius: 5px;
    border-top-right-radius: 5px;
    height: 30px;
    width: 40px;
    vertical-align: super;
}

`;
// eslint-disable-next-line no-undef
GM_addStyle(styles);