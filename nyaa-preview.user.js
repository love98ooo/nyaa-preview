// ==UserScript==
// @name         Nyaa Preview
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Load largest images from foreign links on nyaa.si
// @author       Love98
// @match        https://sukebei.nyaa.si/view/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sukebei.nyaa.si
// @connect      *
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    function findLargestImage(htmlText, baseUrl) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const images = doc.querySelectorAll('img');

        let largestImg = null;
        let maxSize = 0;

        images.forEach(img => {
            const width = parseInt(img.getAttribute('width')) || 0;
            const height = parseInt(img.getAttribute('height')) || 0;
            const size = width * height;

            if (size > maxSize) {
                maxSize = size;
                largestImg = img;
            }
        });

        if (largestImg) {
            let imgSrc = largestImg.src || largestImg.getAttribute('data-src') || largestImg.getAttribute('data-original');
            if (imgSrc) {
                if (imgSrc.startsWith('//')) {
                    imgSrc = 'https:' + imgSrc;
                } else if (imgSrc.startsWith('/')) {
                    const url = new URL(baseUrl);
                    imgSrc = url.origin + imgSrc;
                } else if (!imgSrc.startsWith('http')) {
                    const url = new URL(baseUrl);
                    imgSrc = url.origin + '/' + imgSrc;
                }
                return imgSrc;
            }
        }

        const ogImage = doc.querySelector('meta[property="og:image"]');
        if (ogImage) {
            let imgSrc = ogImage.getAttribute('content');
            if (imgSrc) {
                if (imgSrc.startsWith('//')) {
                    imgSrc = 'https:' + imgSrc;
                } else if (imgSrc.startsWith('/')) {
                    const url = new URL(baseUrl);
                    imgSrc = url.origin + imgSrc;
                } else if (!imgSrc.startsWith('http')) {
                    const url = new URL(baseUrl);
                    imgSrc = url.origin + '/' + imgSrc;
                }
                return imgSrc;
            }
        }

        return null;
    }

    function processLink(link) {
        const loadingDiv = document.createElement('div');
        loadingDiv.style.marginTop = '5px';
        loadingDiv.style.color = '#888';
        loadingDiv.textContent = 'Loading image...';
        link.parentNode.insertBefore(loadingDiv, link.nextSibling);

        GM_xmlhttpRequest({
            method: 'GET',
            url: link.href,
            onload: function(response) {
                const imgSrc = findLargestImage(response.responseText, link.href);

                if (imgSrc) {
                    const img = document.createElement('img');
                    img.src = imgSrc;
                    img.style.maxWidth = '100%';
                    img.style.marginTop = '10px';
                    img.style.border = '1px solid #ddd';
                    img.style.borderRadius = '4px';
                    img.style.display = 'block';

                    img.onerror = function() {
                        loadingDiv.textContent = 'Failed to load image';
                        loadingDiv.style.color = '#f00';
                    };

                    img.onload = function() {
                        loadingDiv.remove();
                    };

                    link.parentNode.insertBefore(img, loadingDiv.nextSibling);
                } else {
                    loadingDiv.textContent = 'No image found';
                    loadingDiv.style.color = '#f00';
                }
            },
            onerror: function() {
                loadingDiv.textContent = 'Failed to load page';
                loadingDiv.style.color = '#f00';
            }
        });
    }

    function init() {
        const descriptionElement = document.getElementById('torrent-description');
        if (!descriptionElement) {
            console.log('torrent-description element not found');
            return;
        }

        const links = descriptionElement.querySelectorAll('a');
        links.forEach(link => {
            if (link.hostname !== window.location.hostname) {
                processLink(link);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
