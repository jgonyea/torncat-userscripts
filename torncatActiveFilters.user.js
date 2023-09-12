// ==UserScript==
// @name         TornCAT Active Filters
// @namespace    torncat
// @version      0.1.0
// @description  Adds player filters on various pages (see matches below).
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/hospitalview.php*
// @match        https://www.torn.com/jailview.php*
// @match        https://www.torn.com/index.php?page=people*
// @match        https://www.torn.com/friendlist.php*
// @match        https://www.torn.com/blacklist.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        none

// ==/UserScript==


'use strict';



// Global definitions:
/************************************** */
let apikey = '###PDA-APIKEY###';
let localStorageLocation = 'torncat.activeFilters';
let tornPdaMode = false;

// Need to check if script is running within TornPDA app.  App will replace `###PDA-APIKEY###` with its own key.
if (apikey.slice(-1) != '#') {
    tornPdaMode = true;
}

// Override the GM_addStyle function so it can be used within TornPDA.
let GM_addStyle = function(s)
{
    let style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = s;

    document.head.appendChild(style);
};


// Torn API query limit, to prevent flood protection rejections.
let apiQueryLimit = 60;

// Calculated values of checkboxes;
var reviveCheck = false;
var attackCheck = false;
var offlineCheck = false;

// Development flag.
let develCheck = false;

// Class declarations
/************************************** */
class PlayerIDQueue {
    constructor() {
        this.playerIDs = this.findPlayerIDs();
        this.queries = 0;
        this.start = new Date();
    }
    enqueue(el) {
        this.playerIDs.push(el);
    }
    dequeue() {
        return this.playerIDs.shift();
    }
    findPlayerIDs() {
        let users = $('.user.name');
        let players = users.toArray();
        let playerIDs = [];

        players.forEach(function(el){
            let regex = /(XID=)(\d*)/;
            let found = el.href.match(regex);
            let playerID = Number(found[0].slice(4));

            // Push to new array if not already present.
            if (playerIDs.indexOf(playerID) == -1){
                playerIDs.push(playerID);
            }
        });
        return playerIDs;
    }
    isEmpty() {
        return this.playerIDs.length == 0;
    }
    peek() {
        return !this.isEmpty() ? this.playerIDs[0] : undefined;
    }
    length() {
        return this.playerIDs.length;
    }
    requeue() {
        let element = this.peek();
        this.dequeue();
        this.enqueue(element);
    }
    clear() {
        if( !tornPdaMode && develCheck ) console.debug('API Cache Dump:', apiDataCache);
        this.playerIDs = [];
    }
}
// Player queue
let queue = new PlayerIDQueue();

// Local cache for api data.
let apiDataCache = {};
var data = data || {};


/*
*  Main Script
*/
(function() {
    console.debug('TornCAT Active Filters (TCAF) started...');

    // New Array prototype method.
    Array.prototype.unique = function() {
        var a = this.concat();
        for(var i=0; i<a.length; ++i) {
            for(var j=i+1; j<a.length; ++j) {
                if(a[i] === a[j])
                    a.splice(j--, 1);
            }
        }

        return a;
    };


    let widgetLocationsSelector = '';

    // Set userlist based on page.
    if (window.location.href.match('factions.php')){
        widgetLocationsSelector = '.members-list';
    } else {
        widgetLocationsSelector = '.users-list-title';
    }

    waitForElm(widgetLocationsSelector).then((elm) => {
        console.debug('TCAF playerlist element is ready');
        loadData();
        saveData();
        renderFilterBar(elm);
    });

    /**
     * Waits for element to appear in DOM.
     * @param {*} selector
     * @returns
    */
    function waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    /**
     * Renders HTML filter elements above the user list.
     * @param {*} elm Userlist parent element
     */
    function renderFilterBar(elm) {
        // Generate HTMl.
        let reviveCheck = '#tc-filter-revive';
        let attackCheck = '#tc-filter-attack';
        let offlineCheck = '#tc-filter-offline';
        let refreshCheck = '#tc-refresh';

        let widgetHTML = `
            <div class="torncat-player-filter-bar">
                <div class="info-msg-cont border-round m-top10">
                    <div class="info-msg border-round">
                        <a class="torncat-icon" title="Open Settings"></a>
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
                            </div>
                        </div>
                    </div>
                </div>
                <hr class="page-head-delimiter m-top10 m-bottom10 ">
            </div>
        `;
        let filterBar = $('.torncat-player-filter-bar');

        // Only insert if there isn't already a filter bar on the page.

        if ($(filterBar).length != 1){

            var widgetLocationsLength = $(elm).length;
            $(widgetHTML).insertBefore($(elm)[widgetLocationsLength - 1]);

            // Scroll mobile view.
            if ($(window).width() < 1000 && data.hideFactionDescription ) {
                setTimeout(() => {
                    document.querySelector('.torncat-player-filter-bar').scrollIntoView({
                        behavior: 'smooth'
                    });
                },2000);
            }

            /* Add event listeners. */
            $('.torncat-player-filter-bar a.torncat-icon').click(function () {
                $('.api-key-prompt').toggle();
            });

            // Disable filters on Hospital/ Jail pages.
            if (
                window.location.href.startsWith('https://www.torn.com/hospital') ||
                window.location.href.startsWith('https://www.torn.com/jail')
            ){
                $('#tc-filter-revive').prop('checked', true);
                $('#tc-filter-revive').parent().hide();
                $('#tc-filter-attack').parent().hide();
            }

            // Watch for event changes on the revive mode checkbox.
            $(reviveCheck).change(() => {
                toggleUserRow('revive');
                if ($(attackCheck).prop('checked')){
                    $(attackCheck).prop('checked', false);
                    toggleUserRow('attack');
                }
            });

            // Watch for event changes on the attack mode checkbox.
            $(attackCheck).change(() =>  {
                loadData();
                toggleUserRow('attack');
                if ($(reviveCheck).prop('checked')){
                    $(reviveCheck).prop('checked', false);
                    toggleUserRow('revive');
                }
            });

            // Watch for event changes on the Hide Offline mode checkbox.
            $(offlineCheck).change(() => {
                loadData();
                toggleUserRow('offline');
            });

            // Watch for event changes on the Auto-refresh checkbox.
            $('#tc-refresh').change(() => {
                if ($(refreshCheck).prop('checked')) {
                    console.log('TornCAT Active Filters: Starting auto-refresh');
                    let queue = new PlayerIDQueue();
                    processRefreshQueue(queue);
                } else {
                    console.log('TornCAT Active Filters: Stopped processing queue. Queue cleared');
                    loadData();
                    if( !tornPdaMode && develCheck ) console.debug(data);
                    queue.clear();
                }


            });
        }

        if ($('.api-key-prompt').length != 1){
            renderSettings();
        }

    }

    /**
     * Renders API key and other filter settings.
     */
    function renderSettings(forceCheck) {
        // Generate HTMl.
        let saveAPIKeyButton = '<button class="torn-btn" id="JApiKeyBtn">Save</button>';
        let hideFactionDescription = '<br/><input class="torncat-checkbox" id="tc-hideFactionDescription" type="checkbox"> <span class="torncat-label">Hide Faction Description</span><br /><br />';
        let devButton = '<input class="torncat-checkbox" id="tc-devmode" type="checkbox"> <span class="torncat-label">Devel Mode </span><br /><br />';
        let clearAPIKeyButton = '<button class="torn-btn" onclick="localStorage.removeItem(\'torncat.factionFilters\');location.reload();">Clear API Key</button><br /><br />';
        let input = '<input type="text" id="JApiKeyInput" style="';
        input += 'border-radius: 8px 0 0 8px;';
        input += 'margin: 4px 0px;';
        input += 'padding: 5px;';
        input += 'font-size: 16px;height: 20px';
        input += '" placeholder="  API Key"></input><br/><br/>';

        let delayOption = '<label for="tc-delay">Delay time between API calls (ms):</label>';
        delayOption += '<select name="tc-delay" id="tc-delay">';
        switch (data.apiQueryDelay){

        case '100':
            delayOption += '  <option value="100" selected="selected">Short (100)</option>';
            delayOption += '  <option value="250">Medium (250)</option>';
            delayOption += '  <option value="500">Long (500)</option>';
            break;
        case '250':
            delayOption += '  <option value="100">Short (100)</option>';
            delayOption += '  <option value="250" selected="selected">Medium (250)</option>';
            delayOption += '  <option value="500">Long (500)</option>';
            break;
        case '500':
            delayOption += '  <option value="100">Short (100)</option>';
            delayOption += '  <option value="250">Medium (250)</option>';
            delayOption += '  <option value="500" selected="selected">Long (500)</option>';
            break;
        default:
            // If for some reason, data.apiQueryDelay isn't set, this will set a sane value.
            data.apiQueryDelay = 500;
            saveData();
            delayOption += '  <option value="100">Short (100)</option>';
            delayOption += '  <option value="250">Medium (250)</option>';
            delayOption += '  <option value="500" selected="selected">Long (500)</option>';
        }
        delayOption += '</select><br/>';

        let block = '<div class="api-key-prompt profile-wrapper medals-wrapper m-top10">';
        block += '<div class="menu-header">TornCAT - Player Filters</div>';
        block += '<div class="profile-container"><div class="profile-container-description" style="padding: 10px">';
        block += '<p><strong>Click the black icon in the filter row above to toggle this pane.</strong></p><br />';
        if (!tornPdaMode) {
            block += '<p>Auto Refresh requires a <a href="https://www.torn.com/preferences.php#tab=api">Torn API</a> key.  It will never be transmitted anywhere outside of Torn</p>';
            block += input;
        }
        block += delayOption;
        block += hideFactionDescription;
        if (!tornPdaMode) {
            block += devButton;
            block += saveAPIKeyButton + ' | ';
            block += clearAPIKeyButton;
        }
        block += '</div></div></div>';
        setTimeout(()=>{
            if ($('.api-key-prompt').length != 1){
                $(block).insertAfter('.torncat-player-filter-bar');

                // Re-enter saved data.
                if (data.apiKey != ''){
                    $('#JApiKeyInput').val(data.apiKey);
                }

                if (data.hideFactionDescription) {
                    $('#tc-hideFactionDescription').prop('checked', true);
                    $('.faction-description').hide();
                }

                // Add event listeners.

                $('#JApiKeyBtn').click(function(){
                    data.apiKey = $('#JApiKeyInput').val();
                    saveData();
                    $('.api-key-prompt').toggle();
                });

                $('#tc-delay').change(()=>{
                    data.apiQueryDelay = $('#tc-delay').val();
                    saveData();
                    if( !tornPdaMode && develCheck ) console.debug('Changed apiQueryDelay to ' + data.apiQueryDelay + 'ms');
                });


                $('#tc-devmode').change(() => {
                    loadData();
                    if (!tornPdaMode){
                        console.debug('TCAF Devel mode set to ' + develCheck);
                        console.debug('data:', data);
                        console.debug('apiDataCache', apiDataCache);
                        console.debug('queue', queue);
                    }
                });

                $('#tc-hideFactionDescription').change(()=>{
                    data.hideFactionDescription = $('#tc-hideFactionDescription').attr('checked') ? true : false;
                    saveData();
                    if (data.hideFactionDescription){
                        $('.faction-description').hide();
                    } else {
                        $('.faction-description').show();
                    }
                    document.querySelector('.torncat-player-filter-bar').scrollIntoView({
                        behavior: 'smooth'
                    });
                });
            }

            if (forceCheck == true){
                $('.api-key-prompt').show();
            } else {
                $('.api-key-prompt').hide();
            }
        }, 500);

    }

    /**
     * Toggles classes on user rows based on toggleType.
     * @param {string} toggleType
     */
    function toggleUserRow(toggleType){
        var selector = {
            'abroad': 'span.user-red-status:contains("Abroad")',
            'fallen': 'span.user-red-status:contains("Fallen")',
            'federal': 'span.user-red-status:contains("Federal")',
            'hospital': 'span.user-red-status:contains("Hospital")',
            'idle': 'li [id^="icon62_"]',
            'traveling': '.user-blue-status',
            'offline': 'li [id^="icon2_"]',
            'okay': '.user-green-status'
        };

        if (window.location.href.match('factions.php')) {
            selector = {
                'abroad': '.ellipsis.abroad',
                'fallen': '.ellipsis.fallen',
                'federal': '.ellipsis.federal',
                'hospital': '.ellipsis.hospital',
                'idle': 'li [id*="idle-user"]',
                'traveling': '.ellipsis.traveling',
                'offline': 'li [id*="offline-user"]',
                'okay': '.ellipsis.okay'
            };
        }

        if (toggleType == 'offline') {
            var idleList = $(selector.idle).toArray();
            var offlineList = $(selector.offline).toArray();

            var awayList = idleList.concat(offlineList);
            awayList.forEach(el =>{
                $(el).parent().closest('li').toggleClass('torncat-hide-' + toggleType);
            });

            // Stop processing other toggles.
            return;
        }

        var greenStatusList = $(selector.okay).toArray();
        var blueStatusList = $(selector.abroad).toArray()
            .concat($(selector.traveling).toArray())
            .unique();
        var redStatusList = $(selector.fallen).toArray()
            .concat($(selector.federal).toArray())
            .concat($(selector.hospital).toArray())
            .unique();

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
                'Fallen',
                'Federal'
            ];

            if (toggleType == 'attack') {
                var line = $(el).parent().closest('li');
                $(line).toggleClass('torncat-hide-' + toggleType);
            } else {
                matches.forEach(match => {
                    if ($(el).html().trim().endsWith(match)) {
                        var line = $(el).closest('li');
                        $(line).toggleClass('torncat-hide-' + toggleType);
                    }
                });
            }
        });
    }

    /**
     * Async loop for processing next item in player queue.
     *
     * @param {PlayerIDQueue} queue
     */
    async function processRefreshQueue(queue) {
        let refreshCheck = '#tc-refresh';
        let limited = false;
        while (!queue.isEmpty()){
            if( !tornPdaMode && develCheck ) console.debug('Current API calls: ' + data.queries);
            loadData();
            let playerID = queue.peek();
            // Call cache, if API queries threshold not hit.
            let now = new Date();

            if  ( now.getMinutes() != data.start ){
                console.log('TCAF: Reset API call limit.  Highwater mark: ' + data.queries + ' API calls.');
                data.queries = 0;
                data.start = now.getMinutes();
                queue.start = now;
                saveData();
            }

            if (data.queries > apiQueryLimit && limited == false){
                let delay = (60 - now.getSeconds());
                console.log('Hit local API query limit of (' + apiQueryLimit + '). Waiting ' + delay + 's');
                limited = true;
                // Disable queue.
                queue.clear();
                $('#tc-refresh').attr('disabled', true);
                setInterval(()=>{
                    // Reinitiate queue.
                    $('#tc-refresh').prop('checked', false);
                    $('#tc-refresh').attr('disabled', false);
                    queue.clear();
                    console.log('TCAF: Restarting auto-refresh');
                    queue = new PlayerIDQueue();
                    $('#tc-refresh').prop('checked', true);
                    processRefreshQueue(queue);
                }, delay * 1000);

                continue;
            } else if (!limited){
                limited = false;
                try{
                    let playerData = await callCache(playerID);
                    // Find player row in userlist.
                    let selector = $('a.user.name[href$="' + playerID + '"]').parent().closest('li');

                    updatePlayerContent(selector, playerData);
                    // Update player row data.
                    if(!queue.isEmpty() && ($('#tc-refresh').prop('checked') == true)) {
                        queue.requeue();
                    } else {
                        queue.clear();
                    }
                }
                catch(err){
                    queue.clear();
                    $(refreshCheck).prop('checked', false);
                    renderSettings(true);
                    console.error(err);
                }
            }
        }
    }

    /**
    * Returns cached player data, calling Torn API if cache hit is missed.
    *
    * @param {string} playerID
    */
    async function callCache(playerID, recurse = false){
        let factionData = {};
        let playerData = {};
        let faction_id = 0;

        if (!(playerID in apiDataCache) || recurse == true){
            if( !tornPdaMode && develCheck ) console.debug('Missed cache for ' + playerID);
            // Call faction API endpoint async, if applicable.
            if (window.location.href.startsWith('https://www.torn.com/factions.php')){
                let searchParams = new URLSearchParams(window.location.search);
                if (searchParams.has('ID')){
                    faction_id = (searchParams.get('ID'));
                }
                factionData = await callTornAPI('faction', faction_id, 'basic,timestamp');
                saveCacheData(factionData);
            }

            // Call user API endpoint async
            playerData = await callTornAPI('user', playerID, 'basic,profile,timestamp');
        } else {
            if( !tornPdaMode && develCheck ) console.debug('Cache hit for ' + apiDataCache[playerID].name + ' (' + playerID + ')');
            let now = new Date();
            playerData = apiDataCache[playerID];

            // Check timestamp for old data.
            let delta = (Math.round(now / 1000) - playerData.timestamp);
            if (delta > 30){
                if( !tornPdaMode && develCheck ) console.debug('Cache expired for ' + apiDataCache[playerID].name + ' (' + playerID + ')');
                playerData = await callCache(playerID, true);
            }
        }

        saveCacheData(playerData);

        return new Promise((resolve) => {
            setTimeout(()=>{
                resolve(playerData);
            }, data.apiQueryDelay);
        });
    }

    /**
      * Calls Torn API Endpoints.
      *
      * @param {string} type
      * @param {string} id
      * @param {string} selections
      */
    function callTornAPI(type, id = '', selections=''){
        loadData();
        return new Promise((resolve, reject ) => {
            setTimeout(async () => {
                let baseURL = 'https://api.torn.com/';
                let streamURL = baseURL + type + '/' + id + '?selections=' + selections + '&key=' + data.apiKey + '&comment=TornCat';
                if( !tornPdaMode && develCheck ) console.debug('Making an API call to ' + streamURL);

                // Reject if key isn't set.
                if (data.apiKey == undefined || data.apiKey == '') {
                    let error = {
                        code: 1,
                        error: 'Key is empty'
                    };
                    reject(error);
                }

                $.getJSON(streamURL)
                    .done((result) => {
                        if (result.error != undefined){
                            reject(result.error);
                        } else {
                            data.queries++;
                            saveData();
                            resolve(result);
                        }
                    })
                    .fail(function( jqxhr, textStatus, error ) {
                        var err = textStatus + ', ' + error;
                        reject(err);
                    });

            }, data.apiQueryDelay);
        });
    }

    /**
      * Saves Torn API data to local cache.
      *
      * @param {Object} data
      */
    function saveCacheData(response){
        let playerData = {};
        if ('members' in response){
            // Process faction members' data.
            let keys = Object.keys(response.members);
            keys.forEach(playerID =>{
                playerData = response.members[playerID];
                playerData.timestamp = response.timestamp;
                apiDataCache[playerID] = playerData;
            });
        } else {
            // Process single player data.
            apiDataCache[response.player_id] = response;
        }
    }

    /**
     * Updates a player's row content with API data.
     */
    function updatePlayerContent(selector, playerData){
        let statusColor = playerData.status.color;
        let offlineCheck = $('#tc-filter-offline').prop('checked');
        // Apply highlight.
        $(selector).toggleClass('torncat-update');

        // Remove highlight after a delay.
        setTimeout(()=>{
            $(selector).toggleClass('torncat-update');
        }, data.apiQueryDelay * 2);

        // Update row HTML.
        let newHtml = '<span class="d-hide bold">Status:</span><span class="t-' + statusColor + '">' + playerData.status.state + '</span>';
        $(selector).find('div.status').html(newHtml);
        $(selector).find('div.status').css('color', statusColor);

        // Update status icon.
        switch (playerData.last_action.status) {
        case 'Offline':
            $(selector).find('ul#iconTray.singleicon').find('li').first().attr('id','icon2_');
            if (offlineCheck && !($(selector).first().hasClass('torncat-hide-offline'))){
                $(selector).first().addClass('torncat-hide-offline');
                if( !tornPdaMode && develCheck ) console.log('TCAF: ' + playerData.name + ' went offline');
            }
            break;
        case 'Online':
            $(selector).find('ul#iconTray.singleicon').find('li').first().attr('id','icon1_');
            if (offlineCheck && ($(selector).first().hasClass('torncat-hide-offline'))){
                $(selector).first().removeClass('torncat-hide-offline');
                if( !tornPdaMode && develCheck ) console.log('TCAF: ' + playerData.name + ' came online');
            }
            break;
        case 'Idle':
            $(selector).find('ul#iconTray.singleicon').find('li').first().attr('id','icon62_');
            if (offlineCheck && !($(selector).first().hasClass('torncat-hide-offline'))){
                $(selector).first().addClass('torncat-hide-offline');
                if( !tornPdaMode && develCheck ) console.log('TCAF: ' + playerData.name + ' became idle');
            }
            break;
        }

        // Update HTML classes to show/ hide row.
        if ($('#tc-filter-revive').prop('checked')) {
            // Hide traveling
            if (playerData.status.color == 'blue') {
                if (!($(selector).first().hasClass('torncat-hide-revive'))){
                    $(selector).first().addClass('torncat-hide-revive');
                    if( !tornPdaMode && develCheck ) console.debug('TCAF: ' + playerData.name + ' is now travelling');
                }
            }
            // Hide Okay
            if (playerData.status.color == 'green') {
                if (!($(selector).first().hasClass('torncat-hide-revive'))){
                    $(selector).first().addClass('torncat-hide-revive');
                    if( !tornPdaMode && develCheck ) console.debug('TCAF: ' + playerData.name + ' is Okay and no longer a revivable target.');
                }
            }
            return;
        }

        if ($('#tc-filter-attack').prop('checked')) {
            // Hide traveling
            if (playerData.status.color == 'blue') {
                if (!($(selector).first().hasClass('torncat-hide-attack'))){
                    $(selector).first().addClass('torncat-hide-attack');
                    if( !tornPdaMode && develCheck ) console.debug('TCAF: ' + playerData.name + ' is now travelling');
                }
            }
            // Hide anyone else not OK
            if (playerData.status.color == 'red') {
                if (!($(selector).first().hasClass('torncat-hide-revive'))){
                    $(selector).first().addClass('torncat-hide-revive');
                    if( !tornPdaMode && develCheck ) console.debug('TCAF: ' + playerData.name + ' is no longer an attackable target.');
                }
            }
        }
    }


})();

/**
 * Load localStorage data.
 */
function loadData(){
    data = localStorage.getItem(localStorageLocation);

    if(data == null) {
        // Default settings
        data = {
            apiKey : apikey,
            apiQueryDelay : 250,
            hideFactionDescription: false,
            queries: 0,
            start: '0'
        };
    } else {
        data = JSON.parse(data);
        if (data.apiQueryDelay == undefined){
            data.apiQueryDelay = 250;
        }
    }


    // Calculate values of checkboxes.

    // eslint-disable-next-line no-undef
    reviveCheck = $('#tc-filter-revive').prop('checked');
    attackCheck = $('#tc-filter-attack').prop('checked');
    offlineCheck = $('#tc-filter-offline').prop('checked');
    develCheck = $('#tc-devmode').prop('checked');

}

/**
 * Save localStorage data.
 */
function saveData(){
    console.log('TCAF local data saved');
    localStorage.setItem(localStorageLocation, JSON.stringify(data));
}



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

`;
// eslint-disable-next-line no-undef
GM_addStyle(styles);
