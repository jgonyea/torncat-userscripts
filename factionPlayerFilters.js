// ==UserScript==
// @name         TornCAT Faction Player Filters
// @namespace    torncat
// @version      0.2.10
// @description  This script adds player filters on various pages (see matches below).
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/blacklist.php*
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/friendlist.php*
// @match        https://www.torn.com/hospitalview.php*
// @match        https://www.torn.com/jailview.php*
// @match        https://www.torn.com/index.php?page=people*
// @grant        GM_addStyle
// ==/UserScript==

// README: https://github.com/jgonyea/torn-userscripts/blob/master/README.md
var data = data || {};

// Following pages don't load the user list via AJAX.
var manualList = [
    'blacklist.php',
    'friendlist.php',
    'page=people',
    'step=profile'
];

(function() {
    'use strict';

    console.debug('Faction Player Filters (FPF) started');
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

})();

// Load localStorage data.
function loadData(){
    data = localStorage.getItem('torncat.factionFilters');
    if(data === undefined || data === null) {
        // Default settings
        data = {
            checked:{
                attack: false,
                revive: false,
                offline: false,
            }
        };
    }else{
        data = JSON.parse(data);
    }
}

// Save localStorage data.
function save(){
    console.debug('FPF local data saved');
    localStorage.setItem('torncat.factionFilters', JSON.stringify(data));
}

/**
 * Toggles user rows based on param toggleType.
 * @param {string} toggleType
 */
function toggleUserRow(toggleType){
    var greenStatusList = $('.status .t-green').toArray();
    var redStatusList = $('.status .t-red').toArray();

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


    greenStatusList.forEach(el => {
        var line = $(el).closest('li');
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
            var line = $(el).closest('li');
            $(line).toggleClass('torncat-hide-'+toggleType);
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

// Find user list and insert TCWidget above it.
function displayTCWidget(){
    var reviveCheck = '#tc-filter-revive';
    var attackCheck = '#tc-filter-attack';
    var offlineCheck = '#tc-filter-offline';
    var widgetLocationsselector = '';

    var widgetHTML = `
    <div class="torncat-player-filter-bar">
        <div class="info-msg-cont  border-round m-top10">
		    <div class="info-msg border-round">
                <a class="torncat-icon" href="http://torncat.servegame.com" title="Send current list to TornCAT" target=”_blank” rel=”noopener noreferrer”></a>
                <div class="torncat-filters">
                    <div class="msg right-round" tabindex="0" role="alert">
                        <label class="torncat-filter">
                            <span class="torncat-label ">Revive Mode</span>
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
            widgetLocationsselector = '.faction-info-wrap.another-faction';
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
            toggleUserRow('offline');
            data.checked.offline = !data.checked.offline;
            save();
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
        'onlinestatus.php',
        'sidebarAjaxAction.php',
        'tornMobileApp.php',
        'missionChecker.php',
        'api.torn.com'
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
// param Array players
function getOnScreenPlayerIDs (players) {
    var playerIDs = [];
    var results = {};
    players.forEach(function(el){
        var regex = /(XID=)(\d*)/;
        var found = el.href.match(regex);
        var playerID = Number(found[0].slice(4));
        var pushPlayer = true;
        if (
            $(el).closest('li').hasClass('torncat-hide-revive') ||
            $(el).closest('li').hasClass('torncat-hide-attack') ||
            $(el).closest('li').hasClass('torncat-hide-offline')
        ){
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
    var users = $('.user.name');
    var tornIDs = getOnScreenPlayerIDs(users.toArray());

    tornIDs = JSON.stringify(tornIDs);
    tornIDs = window.encodeURI(tornIDs);
    // Updates icon's url to contain latest playerlist for TornCAT to use.
    $('a.torncat-icon').attr('href', 'http://torncat.servegame.com?playerList=' + tornIDs);
}

// Custom styling.
var styles= `
.torncat-filters div.msg {
    display: flex;
    justify-content: center;
}
.torncat-filter {
    display: inline-block;
    margin: 0 10px 0 10px;
    text-align: center;
}

.torncat-hide-revive {
    display:none;
}
.torncat-hide-attack {
    display:none;
}
.torncat-hide-offline {
    display:none;
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