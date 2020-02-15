// ==UserScript==
// @name         TornCAT Faction Player Filters
// @namespace    torncat
// @version      0.2.4
// @description  This script adds player filters on faction pages.
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/factions.php*
// @grant        GM_addStyle
// ==/UserScript==


var data = data || {};
var timerRunning = false;

(function() {
    'use strict';

    console.debug('Faction Player Filters (FPF) started');
    loadData();
    save();
    // Some pages load user lists via AJAX.  This reloads the event attaching to the new list.
    $( document ).ajaxComplete(function( event, xhr, settings ) {
        if (hideAjaxUrl(settings.url) == false) {
            displayTCWidget();
        }
    });

    // Some pages don't load the user list via AJAX.  Need to call the event attaching manually.
    if (window.location.href.match('step=profile') || window.location.href.match('jailview.php')){
        displayTCWidget();
    }

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
                online: false,
                autorefresh: false
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
    const D = document;
    const $$ = (selector, startNode = D) => [...startNode.querySelectorAll(selector)];
    var greenStatusList = $$('.status .t-green');
    var redStatusList = $$('.status .t-red');

    if (toggleType == 'offline') {
        var idleList = $$('li #icon62');
        var offlineList = $$('li #icon2');
        var awayList = idleList.concat(offlineList);
        awayList.forEach(el =>{
            $(el).parent().closest('li').toggleClass('torncat-hide-' + toggleType);
        });
        return;
    }


    greenStatusList.forEach(el => {
        var line = $(el).closest('li');
        if(toggleType == 'revive'){
            $(line).toggleClass('torncat-hide-' + toggleType);
        }
    });

    redStatusList.forEach(el => {
        if ($(el).html() == 'Traveling' || $(el).html() == 'Fallen' || (toggleType == 'attack')) {
            var line = $(el).closest('li');
            $(line).toggleClass('torncat-hide-'+toggleType);
        }
    });

}


// Find user list and insert TCWidget above it.
function displayTCWidget(){
    var reviveCheck = '#tc-filter-revive';
    var attackCheck = '#tc-filter-attack';
    var offlineCheck = '#tc-filter-offline';
    var autorefreshCheck = '#tc-filter-autorefresh';

    var widgetHTML = `
    <div class="msg-info-wrap">
        <div class="info-msg-cont  border-round m-top10">
		    <div class="info-msg border-round">
                <a class="torncat-icon" href="http://torncat.servegame.com" title="TornCAT" target=”_blank” rel=”noopener noreferrer”></a>
                <div class="delimiter torncat-filters">
                    <div class="msg right-round" tabindex="0" role="alert">
                        <label class="torncat-filter">
                            <span class="torncat-label ">Revive Mode</span>
                            <input class="torncat-checkbox" id="tc-filter-revive" type="checkbox">
                        </label>
                        <label class="torncat-filter torncat-filter-middle">
                            <span class="torncat-label">Attack Mode</span>
                            <input class="torncat-checkbox" id="tc-filter-attack" type="checkbox">
                        </label>
                        <label class="torncat-filter torncat-filter-middle">
                            <span class="torncat-label">Hide Offline</span>
                            <input class="torncat-checkbox" id="tc-filter-offline" type="checkbox">
                        </label>
                        <label class="torncat-filter torncat-filter-last">
                            <span class="torncat-label">Auto-Refresh</span>
                            <input class="torncat-checkbox" id="tc-filter-autorefresh" type="checkbox">
                        </label>
                    </div>
                </div>
            </div>
        </div>
        <hr class="page-head-delimiter m-top10 m-bottom10 ">
    </div>

    `;
    var widgetLocationsLength = $('.faction-info-wrap.another-faction').length;
    $(widgetHTML).insertBefore($('.faction-info-wrap.another-faction')[widgetLocationsLength - 1]);

    // Load cached logic between page refreshes.
    if (data.checked.attack == true){
        $(attackCheck).prop('checked', true);
        toggleUserRow('attack');
    }
    if (data.checked.revive == true){
        $(reviveCheck).prop('checked', true);
        toggleUserRow('revive');
    }

    if (data.checked.autorefresh == true){
        $(autorefreshCheck).prop('checked', true);
        startTimer();
    }

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

    // Watch for event changes on the Online only mode checkbox.
    $(offlineCheck).change(function() {
        toggleUserRow('offline');
        data.checked.online = !data.checked.online;
        save();
    });

    // Watch for event changes on the autorefresh checkbox.
    $(autorefreshCheck).change(function() {
        data.checked.autorefresh = !data.checked.autorefresh;
        save();
        startTimer();

    });
}

function startTimer(){
    var autorefreshCheck = '#tc-filter-autorefresh';
    if ($(autorefreshCheck).prop('checked') == true && timerRunning == false){
        var timerLeft = 30;
        timerRunning = true;
        var refreshInterval = setInterval(function(){
            timerLeft--;
            if (timerLeft < 1) {
                clearInterval(refreshInterval);
                location.reload();
            }
            if (timerLeft < 10) {
                $('.torncat-filter-last span.torncat-label').toggleClass('t-red');
            }
            $('.torncat-filter-last span.torncat-label').html('Auto-Refresh (' + timerLeft + ')');
            if (!timerRunning){
                clearInterval(refreshInterval);
            }
        }, 1000);
    } else {
        clearInterval(refreshInterval);
        timerRunning = false;
    }

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

    // Known valid AJAX URl's.
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

// Custom styling.
var styles= `
.torncat-filters div.msg {
    display: flex;
    justify-content: center;
    background-color: DodgerBlue;
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
.torncat-widget__header label {
    margin-left: 10px;
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