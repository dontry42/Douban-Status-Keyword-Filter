// ==UserScript==
// @name         Douban Status Keyword Filter
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Hides Douban status posts containing specified keywords, adds a context menu to add keywords, and provides a UI to manage keywords
// @author       Grok
// @match        https://www.douban.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // Load keywords from persistent storage or use default
    let keywordString = GM_getValue('keywordString', "");
    let keywords = keywordString.replace(/'/g, '').split(',').filter(k => k.trim());

    // Function to save keywords to persistent storage
    function saveKeywords() {
        keywordString = `'${keywords.join("','")}'`;
        GM_setValue('keywordString', keywordString);
    }

    // Function to check if text contains any keyword
    function containsKeyword(text) {
        if (!text) return false;
        return keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
    }

    // Function to hide status elements with keywords
    function hideStatusElements() {
        const statuses = document.querySelectorAll('div.new-status.status-wrapper:not([data-checked])');
        statuses.forEach(status => {
            status.setAttribute('data-checked', 'true');
            const textElements = status.querySelectorAll('span.reshared_by, div.text, div.content p, div.content a, blockquote p, blockquote a');
            const allText = Array.from(textElements).map(el => el.textContent).join(' ');
            if (containsKeyword(allText)) {
                status.style.display = 'none'; // Hide status, next status moves up
            }
        });
    }

    // Debounce function to limit processing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Create debounced version of hideStatusElements
    const debouncedHideStatusElements = debounce(hideStatusElements, 200);

    // Function to create keyword management UI
    function createKeywordManager() {
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '10px';
        panel.style.right = '10px';
        panel.style.backgroundColor = '#fff';
        panel.style.border = '1px solid #ccc';
        panel.style.padding = '10px';
        panel.style.zIndex = '9999';
        panel.style.fontFamily = 'Arial, sans-serif';
        panel.style.fontSize = '14px';
        panel.style.color = '#000';
        panel.style.maxWidth = '300px';
        panel.style.maxHeight = '400px';
        panel.style.overflowY = 'auto';
        panel.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        document.body.appendChild(panel);

        // Toggle button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Keywords';
        toggleButton.style.position = 'fixed';
        toggleButton.style.top = '50px';
        toggleButton.style.right = '10px';
        toggleButton.style.zIndex = '10000';
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.backgroundColor = '#007bff';
        toggleButton.style.color = '#fff';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '3px';
        toggleButton.style.cursor = 'pointer';
        document.body.appendChild(toggleButton);

        // Initially hide the panel
        panel.style.display = 'none';

        toggleButton.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // Add new keyword input
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter new keyword';
        input.style.width = '100%';
        input.style.marginBottom = '10px';
        input.style.padding = '5px';
        panel.appendChild(input);

        const addButton = document.createElement('button');
        addButton.textContent = 'Add Keyword';
        addButton.style.width = '100%';
        addButton.style.padding = '5px';
        addButton.style.backgroundColor = '#28a745';
        addButton.style.color = '#fff';
        addButton.style.border = 'none';
        addButton.style.borderRadius = '3px';
        addButton.style.cursor = 'pointer';
        addButton.style.marginBottom = '10px';
        panel.appendChild(addButton);

        // Keyword list
        const keywordList = document.createElement('ul');
        keywordList.style.listStyle = 'none';
        keywordList.style.padding = '0';
        panel.appendChild(keywordList);

        function updateKeywordList() {
            keywordList.innerHTML = '';
            keywords.forEach(keyword => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.marginBottom = '5px';

                const text = document.createElement('span');
                text.textContent = keyword;
                li.appendChild(text);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.style.padding = '2px 5px';
                deleteButton.style.backgroundColor = '#dc3545';
                deleteButton.style.color = '#fff';
                deleteButton.style.border = 'none';
                deleteButton.style.borderRadius = '3px';
                deleteButton.style.cursor = 'pointer';
                deleteButton.addEventListener('click', () => {
                    keywords = keywords.filter(k => k !== keyword);
                    saveKeywords();
                    updateKeywordList();
                    debouncedHideStatusElements();
                });
                li.appendChild(deleteButton);

                keywordList.appendChild(li);
            });
        }

        addButton.addEventListener('click', () => {
            const newKeyword = input.value.trim();
            if (newKeyword && !keywords.includes(newKeyword.toLowerCase())) {
                keywords.push(newKeyword.toLowerCase());
                saveKeywords();
                updateKeywordList();
                input.value = '';
                debouncedHideStatusElements();
            }
        });

        updateKeywordList();
    }

    // Function to add a custom context menu item
    function addContextMenu() {
        document.addEventListener('contextmenu', (event) => {
            const selection = window.getSelection().toString().trim();
            if (selection) {
                const existingMenu = document.getElementById('custom-context-menu');
                if (existingMenu) existingMenu.remove();

                const menu = document.createElement('div');
                menu.id = 'custom-context-menu';
                menu.style.position = 'absolute';
                menu.style.left = `${event.pageX + 50}px`; // Increased offset to 20px
                menu.style.top = `${event.pageY + 50}px`; // Increased offset to 20px
                menu.style.backgroundColor = '#fff';
                menu.style.border = '1px solid #ccc';
                menu.style.padding = '5px';
                menu.style.zIndex = '10000';
                menu.style.fontFamily = 'Arial, sans-serif';
                menu.style.fontSize = '14px';
                menu.style.cursor = 'pointer';
                menu.textContent = `Add "${selection}" as Block Keyword`;
                document.body.appendChild(menu);

                menu.addEventListener('click', () => {
                    if (selection && !keywords.includes(selection.toLowerCase())) {
                        keywords.push(selection.toLowerCase());
                        saveKeywords();
                        debouncedHideStatusElements();
                    }
                    menu.remove();
                });

                document.addEventListener('click', () => menu.remove(), { once: true });
            }
        });
    }

    // Initialize script
    debouncedHideStatusElements();
    addContextMenu();
    createKeywordManager();

    // Observe changes in the DOM for new statuses
    const observer = new MutationObserver((mutations) => {
        if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
            debouncedHideStatusElements();
        }
    });

    const targetNode = document.querySelector('div.stream-items') || document.body;
    observer.observe(targetNode, {
        childList: true,
        subtree: true
    });
})();
