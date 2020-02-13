// ==UserScript==
// @name         TornCAT Faction Player Filters
// @namespace    torncat
// @version      0.2.1
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
    <div class="torncat-widgets torncat-widgets--top top-round">
        <article class="torncat-widget ">
            <header class="torncat-widget__header ">
                <h3>TornCAT Filters</h3>
                <span class="torncat-widget__title "></span>
                <label>
                    <span class="torncat-label ">Revive Mode</span>
                    <input class="torncat-checkbox" id="tc-filter-revive" type="checkbox">
                </label>
                <label>
                <span class="torncat-label">Attack Mode</span>
                <input class="torncat-checkbox" id="tc-filter-attack" type="checkbox">
            </label>

            </header>
        </article>
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
`;
// eslint-disable-next-line no-undef
GM_addStyle(styles);