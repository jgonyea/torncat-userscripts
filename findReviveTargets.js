// ==UserScript==
// @name         Find Revive Targets
// @namespace    torncat
// @version      0.1.6
// @description  This script hides players with 'Okay', 'Traveling', and 'Fallen' statuses to find revive targets faster.
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/factions.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Some pages load user lists via ajax.  This reloads the event attaching to the new list.
    $( document ).ajaxComplete(function( event, xhr, settings ) {
        if (hideAjaxUrl(settings.url) == false) {
            console.debug('Fired ajax event attachment');
            hideUserRow();
        }
    });

    // Some pages don't load the user list via ajax.  Need to call the event attaching manually.
    if (window.location.href.match('step=profile') || window.location.href.match('jailview.php')){
        console.debug('Fired manual event attachment');
        hideUserRow();
    }
    

})();

function hideUserRow(){
    const D = document;
    const $$ = (selector, startNode = D) => [...startNode.querySelectorAll(selector)];
    var greenStatusList = $$('.status .t-green');
    var redStatusList = $$('.status .t-red');
    greenStatusList.forEach(el => {
        var line = $(el).closest('li');
        $(line).hide();
    });

    redStatusList.forEach(el => {
        if ($(el).html() == 'Traveling' || $(el).html() == 'Fallen') {
            var line = $(el).closest('li');
            $(line).hide();
        }
    });

}

function hideAjaxUrl(url) {
    var hideURLList = [
        'onlinestatus.php',
        'sidebarAjaxAction.php',
        'tornMobileApp.php',
        'missionChecker.php',
        'api.torn.com'
    ];

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