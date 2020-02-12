// ==UserScript==
// @name         Torn User Peek
// @namespace    torncat
// @version      0.1.0
// @description  Adds new tooltip with user details on user badges.
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/userlist.php*
// @match        https://www.torn.com/jailview.php*
// @resource     fa https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

var data = {};
var asked = false;

(function() {
    'use strict';
    console.debug('Torn User Peek (TUP) started');
    loadData();
    data.me = {'empty': true};
    saveOwnData();
    // Some pages load user lists via ajax.  This reloads the event attaching to the new list.
    $( document ).ajaxComplete(function( event, xhr, settings ) {
        if (hideAjaxUrl(settings.url) == false) {
            // Wait for intent to prevent spamming API.
            attachEvent();
        }
    });

    // Some pages don't load the user list via ajax.  Need to call the event attaching manually.
    if (window.location.href.match('step=profile') || window.location.href.match('jailview.php')){
        console.debug('Fired manual event attachment');
        attachEvent();
    }
})();

function attachEvent(){
    const HoverDelay = 1000;
    $('.user.name').hover(function() {
        var player = this;
        addTooltip(player);
        var t = setTimeout(function() {
            var url = 'https://api.torn.com/user/' + findPlayerID(player) + '?selections=&key=' + data.apikey;
            apiCall(url, (d) => {
                replaceTooltip(d, player);
            });
        }, HoverDelay);
        $(this).data('timeout', t);
    }, function() {
        clearTimeout($(this).data('timeout'));
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



// Load localStorage data.
function loadData(){
    data = localStorage.getItem('torncat.tornPeek');
    if(data === undefined || data === null){
        // Default settings
        data = {
            profileview:{
                show: true,
                display: ['xantaken','logins','refills','useractivity']
            }
        };
    }else{
        data = JSON.parse(data);
    }

    if(data.apikey === undefined || data.apikey === ''){
        getApiKey(true);
    }
}

// Loads own player data to local storage, if missing.
function saveOwnData(){
    if(typeof data.me === 'undefined' || !('me' in data) || !('id' in data.me) || data.me.id < 1){
        var url = 'https://api.torn.com/user/'+data.me.id+'?selections=basic&key='+data.apikey;
        apiCall(url, function(d) {
            var id = d.player_id;
            data.me = {'id': id};
            save();
        });
    }
}

// Save localStorage data.
function save(){
    localStorage.setItem('torncat.tornPeek', JSON.stringify(data));
}

// Adds html for torn API key prompt.
function getApiKey(forceAsk){
    if(asked && forceAsk != true) return; asked = true;


    var button = '<button id="JApiKeyBtn" style="';
    button += 'background-color: #282828;';
    button += 'border: none;';
    button += 'border-radius: 0 8px 8px 0;';
    button += 'color: white;';
    button += 'padding: 5px 5px 5px 6px;';
    button += 'text-align: center;';
    button += 'text-decoration: none;';
    button += 'display: inline-block;';
    button += 'font-size: 16px;';
    button += 'margin: 4px 0px;';
    button += 'cursor: pointer;';
    button += '"><i class="fa fa-floppy-o" aria-hidden="true"></i></button>';

    var input = '<input type="text" id="JApiKeyInput" style="';
    input += 'border-radius: 8px 0 0 8px;';
    input += 'margin: 4px 0px;';
    input += 'padding: 5px;';
    input += 'font-size: 16px;';
    input += '" placeholder="ApiKey"></input>';

    var block = '<div class="profile-wrapper medals-wrapper m-top10">';
    block += '<div class="menu-header">Torn User Peek Settings</div>';
    block += '<div class="profile-container"><div class="profile-container-description">';
    block += 'In order to use this script you need to enter your Torn Api Key, which you can '+
        'get on your <a href="http://www.torn.com/preferences.php">preferences page</a> and under the \'API Key\' tab.<br />';
    block += input;
    block += button;
    block += '</div></div></div>';

    $(block).insertAfter('.content-title');

    $('#JApiKeyBtn').click(function(){
        var key = $('#JApiKeyInput').val();
        if(!('me' in data)) data.me = {};
        data.apikey = key;
        save();
        location.reload();
    });

}

// Calls torn API.
function apiCall(url, cb){
    console.log('TUP: making request \''+url+'\'');
    $.ajax({
        url: url,
        type: 'GET',
        success: function(data) {
            cb(data);
        }
    });
}

// Adds html to page for tooltip at currently hovered user badge.
function addTooltip(player) {
    var parent =  $(player).parent();
    if ($(parent).has('div.tup-tooltiptext').length != 1) {
        $(parent).closest('div').addClass('tup-tooltip');
        var tooltipHtml = '<div class="tup-tooltiptext tup-tooltip-right"><ul><li>Loading...</li></ul></div>';
        parent.append(tooltipHtml);
    }
}

function replaceTooltip(response, player) {
    if(response.error) {
        getApiKey(true);
    } else {
        var replacementText = '<ul>';
        if (response.status.state == 'Okay') {
            replacementText += '<li class="tup-button"><a href="https://www.torn.com/loader.php?sid=attack&user2ID='+ response.player_id + '"> Attack </a></li>';
        } else if (response.status.state == 'Hospital') {
            replacementText += '<li class="tup-button"><a href="https://www.torn.com/profiles.php?XID=' + response.player_id + '">&nbsp;Revive&nbsp;</a></li>';
        } else if (response.status.state == 'Jail') {
            replacementText += '<li class="tup-button"><a href="https://www.torn.com/profiles.php?XID=' + response.player_id + '">&nbsp;Bust/ Buy&nbsp;</a></li>';
        } 
        replacementText += '<li><strong>Life:</strong> ' + response.life.current + '/' + response.life.maximum + '</li>';
        replacementText += '<li><strong>Level:</strong> ' + response.level + '</li>';
        replacementText += '<li><strong>Age:</strong> ' + response.age + '</li>';
        replacementText += '<li><strong>Last Action:</strong> ' + response.last_action.relative + '</li>';
        replacementText += '</ul>';
        var tooltip = $(player).siblings('.tup-tooltiptext');
        $(tooltip[0]).html(replacementText);
    }
}


// Finds the playerID from the href property.
function findPlayerID(userElement) {
    var regex = /(XID\=)(\d*)/;
    var found = userElement.href.match(regex);
    var playerID = Number(found[0].slice(4));
    return playerID;
}

// Custom styling.
//var styles ='.tup-tooltip{position:relative;display:inline-block;border-bottom:1px dotted #000}.tup-tooltip .tup-tooltiptext{visibility:hidden;width:160px;background-color:#555;color:#fff;text-align:left;border-radius:6px;padding:5px 5px 5px 15px;position:absolute;z-index:1;bottom:125%;left:120%;margin-left:-60px;opacity:0;transition:opacity 0.3s;box-shadow:20px 20px 50px 15px grey}.tup-tooltip .tup-tooltiptext::after{content:"";position:absolute;top:100%;left:120%;margin-left:-5px;padding-left:10px;border-width:5px;border-style:solid;border-color:#555 transparent transparent transparent;z-index:1000}.tup-tooltip:hover .tup-tooltiptext{visibility:visible;opacity:1}';
var styles=`
.tup-tooltip {
    display: inline-block;
    position: relative;
  }

  .tup-tooltip .tup-tooltiptext {
    background-color: #555;
    border-radius: 6px;
    bottom: 25%;
    box-shadow: 20px 20px 50px 15px grey
    color: #fff;
    left: 120%;
    margin-left: -60px;
    opacity: 0;
    padding: 5px 5px 5px 15px;
    position: absolute;
    text-align: left;
    transition: opacity .3s;
    visibility: hidden;
    width: 160px;
    z-index: 1000;

  }

  .tup-tooltip .tup-tooltiptext::after {
    border-color: #555 transparent transparent transparent;
    border-style: solid;
    border-width: 5px;
    content: "";
    left: 50%;
    margin-left: -5px;
    padding-left: 10px;
    position: absolute;
    top: 100%;
    z-index: 1000;
  }


  .tup-tooltip:hover .tup-tooltiptext {
    opacity: 1;
    visibility: visible;
  }

  .tup-tooltiptext ul li {
    color: #fff;
    background-image: none !important;
    font-size: 12px;
 }
 .tup-tooltiptext ul li a {
    color: #fff;
    text-decoration: underline;
}

.tup-tooltiptext .tup-button {
    background: #fff;
    color: #555;
}

.tup-button {

}


`;


// eslint-disable-next-line no-undef
GM_addStyle(styles);
// eslint-disable-next-line no-undef
GM_addStyle(GM_getResourceText('fa'));

