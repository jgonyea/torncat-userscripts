// ==UserScript==
// @name         Torn User Peek
// @namespace    torncat
// @version      0.1
// @description  Adds new tooltip with user details on user badges.
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/*
// @require      https://code.jquery.com/jquery-3.4.1.min.js
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
    console.debug(data);
    saveOwnData();
    const HoverDelay = 1000;
    $(document).on('click', '.content', function(){
        $(document).ready(function(){
        // Wait for intent to prevent spamming API.
            $('.user.name').hover(function() {
                console.debug('TUP: hover intent detection started');
                var player = this;
                addTooltip(player);
                var t = setTimeout(function() {
                    console.debug('TUP: hover intent detected');
                    var url = 'https://api.torn.com/user/' + findPlayerID(player) + '?selections=&key=' + data.apikey;
                    apiCall(url, (d) => { 
                        replaceTooltip(d, player);
                    });

                //callTorn(player);
                }, HoverDelay);
                $(this).data('timeout', t);
            }, function() {
                clearTimeout($(this).data('timeout'));
            });
        });
    });
})();

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
    if ($(parent).has('div.jdtooltiptext').length != 1) {
        $(parent).closest('div').addClass('jdtooltip');
        var tooltipHtml = '<div class="jdtooltiptext jdtooltip-right">Loading...</div>';
        parent.append(tooltipHtml);
    }
}

function replaceTooltip(response, player) {
    console.debug('Response', response);
    if(response.error) {
        getApiKey(true);
    } else {
        var replacementText = '';
        replacementText += 'Life: ' + response.life.current + '/' + response.life.maximum + '</br>';
        replacementText += 'Level: ' + response.level + '</br>';
        replacementText += 'Age: ' + response.age + '</br>';
        replacementText += 'Last Action: ' + response.last_action.relative + '</br>';
        console.debug(replacementText);
        var tooltip = $(player).siblings('.jdtooltiptext');
        console.debug(tooltip);
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
//var styles ='.jdtooltip{position:relative;display:inline-block;border-bottom:1px dotted #000}.jdtooltip .jdtooltiptext{visibility:hidden;width:160px;background-color:#555;color:#fff;text-align:left;border-radius:6px;padding:5px 5px 5px 15px;position:absolute;z-index:1;bottom:125%;left:120%;margin-left:-60px;opacity:0;transition:opacity 0.3s;box-shadow:20px 20px 50px 15px grey}.jdtooltip .jdtooltiptext::after{content:"";position:absolute;top:100%;left:120%;margin-left:-5px;padding-left:10px;border-width:5px;border-style:solid;border-color:#555 transparent transparent transparent;z-index:1000}.jdtooltip:hover .jdtooltiptext{visibility:visible;opacity:1}';
var styles=`
.jdtooltip {
    position: relative;
    display: inline-block;
  }

  .jdtooltip .jdtooltiptext {
    visibility: hidden;
    width: 160px;
    background-color: #555;
    color: #fff;
    text-align: left;
    border-radius: 6px;
    padding: 5px 5px 5px 15px;
    position: absolute;
    z-index: 1000;
    bottom: 25%;
    left: 120%;
    margin-left: -60px;
    opacity: 0;
    transition: opacity .3s;
    box-shadow: 20px 20px 50px 15px grey
  }

  .jdtooltip .jdtooltiptext::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    padding-left: 10px;
    border-width: 5px;
    border-style: solid;
    border-color: #555 transparent transparent transparent;
    z-index: 100000;
  }

  .jdtooltip:hover .jdtooltiptext {
    visibility: visible;
    opacity: 1;
    z-index: auto;
  }
`;


GM_addStyle(styles);
GM_addStyle(GM_getResourceText('fa'));

// stub for replicating tampermonkey scripting.
function GM_addStyle(style) {
    var styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = style;
    document.head.appendChild(styleSheet);
}
