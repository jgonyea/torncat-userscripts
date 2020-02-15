// ==UserScript==
// @name         TornCAT Faction Player Filters
// @namespace    torncat
// @version      0.2.2
// @description  This script adds player filters on faction pages.
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/factions.php*
// @grant        GM_addStyle
// ==/UserScript==


var data = data || {};

(function() {
    'use strict';

    console.debug('Find Revive Targets (FRT) started');
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
                revive: false
            }
        };
    }else{
        data = JSON.parse(data);
    }
}

// Save localStorage data.
function save(){
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

    var widgetHTML = `
    <div class="msg-info-wrap">
        <div class="info-msg-cont  border-round m-top10">
		    <div class="info-msg border-round">
                <a class="torncat-icon" href="http://torncat.servegame.com" title="TornCAT" target=”_blank” rel=”noopener noreferrer”></a>
                <div class="delimiter">
                    <div class="msg right-round" tabindex="0" role="alert">
                        <span class="torncat-widget__title "></span>
                        <label class="torncat-filter">
                            <span class="torncat-label ">Revive Mode</span>
                            <input class="torncat-checkbox" id="tc-filter-revive" type="checkbox">
                        </label>
                        <label class="torncat-filter torncat-filter-middle">
                            <span class="torncat-label">Attack Mode</span>
                            <input class="torncat-checkbox" id="tc-filter-attack" type="checkbox">
                        </label>
                        <label class="torncat-filter torncat-filter-last">
                            <span class="torncat-label">Auto-Refresh (30s)</span>
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
}

function dynamicClickCheck(selector){
    $(selector).click();
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
.torncat-widgets {
    margin: 10px 0;
    background: repeating-linear-gradient(90deg,#242424,#242424 2px,#2e2e2e 0,#2e2e2e 4px);
    color: #fff;
}
.torncat-filter {
    display: inline-block;
    width: 33%;
}
.torncat-filter-middle {
    text-align: center;
}
.torncat-filter-last {
    text-align: right;
}

.torncat-widgets article {
    padding: 10px;
}
.torncat-widgets h3 {
    margin-top: 10px;
    text-align: center;
    font-size: 16px;
}
.torncat-hide-revive {
    display:none;
}
.torncat-hide-attack {
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