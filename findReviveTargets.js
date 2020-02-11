// ==UserScript==
// @name         Hide Okay Status
// @namespace    torncat
// @version      0.1
// @description  This script hides players with 'Okay' status to find revive targets faster.
// @author       Wingmanjd[2127679]
// @match        https://www.torn.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const D = document;
    const $$ = (selector, startNode = D) => [...startNode.querySelectorAll(selector)];

    var statusList = $$('.status .t-green');
    statusList.forEach(el => {
        var line = $(el).closest('li');
        $(line).hide();
    });
})();
