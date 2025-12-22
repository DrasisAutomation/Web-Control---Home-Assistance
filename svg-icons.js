// svg-icons.js - COMPLETE FIXED SVG Icon Management
window.SVGIcons = (function () {
    'use strict';

    const svgPath = './src/svg/';
    const iconCache = new Map();

    // Default fallback SVG (simplified)
    const fallbackSVG = `<svg viewBox="0 0 24 24" fill="currentColor" class="svg-icon">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>`;

    // Clean SVG content - remove width/height attributes and add currentColor
    function cleanSVGContent(svgText) {
        try {
            // Parse the SVG
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, 'image/svg+xml');
            const svg = doc.documentElement;

            // Check for parsing errors
            const parserError = svg.querySelector('parsererror');
            if (parserError) {
                console.warn('SVG parsing error, using fallback');
                return fallbackSVG;
            }

            // Remove width and height attributes (let CSS control size)
            svg.removeAttribute('width');
            svg.removeAttribute('height');

            // Set viewBox if not present
            if (!svg.hasAttribute('viewBox')) {
                svg.setAttribute('viewBox', '0 0 24 24');
            }

            // Add class for styling
            svg.classList.add('svg-icon');

            // Remove any hardcoded colors and set to currentColor
            const allElements = svg.querySelectorAll('*');
            allElements.forEach(el => {
                // Handle fill attribute
                if (el.hasAttribute('fill')) {
                    const fillValue = el.getAttribute('fill');
                    // Only replace non-transparent, non-gradient fills
                    if (fillValue && fillValue !== 'none' && !fillValue.startsWith('url') &&
                        !fillValue.startsWith('#') && fillValue !== 'transparent') {
                        el.setAttribute('fill', 'currentColor');
                    }
                }

                // Handle stroke attribute
                if (el.hasAttribute('stroke')) {
                    const strokeValue = el.getAttribute('stroke');
                    // Only replace non-transparent, non-gradient strokes
                    if (strokeValue && strokeValue !== 'none' && !strokeValue.startsWith('url') &&
                        !strokeValue.startsWith('#') && strokeValue !== 'transparent') {
                        el.setAttribute('stroke', 'currentColor');
                    }
                }
            });

            // Ensure the main SVG element uses currentColor
            svg.setAttribute('fill', 'currentColor');

            return svg.outerHTML;
        } catch (error) {
            console.error('Error cleaning SVG:', error);
            return fallbackSVG;
        }
    }

    // Load and clean SVG
    async function loadSVG(iconName) {
        if (iconCache.has(iconName)) {
            return iconCache.get(iconName);
        }

        try {
            const response = await fetch(`${svgPath}${iconName}`);
            if (!response.ok) {
                console.warn(`SVG not found: ${iconName}, using fallback`);
                iconCache.set(iconName, fallbackSVG);
                return fallbackSVG;
            }

            const svgText = await response.text();
            const cleanedSVG = cleanSVGContent(svgText);
            iconCache.set(iconName, cleanedSVG);
            return cleanedSVG;
        } catch (error) {
            console.error('Error loading SVG:', iconName, error);
            iconCache.set(iconName, fallbackSVG);
            return fallbackSVG;
        }
    }

    // Set SVG icon on button (CORE FIX - COMPLETE REPLACEMENT)
    function setIconImmediately(button, iconName) {
        if (!button || !button.parentNode) return; // Skip if button doesn't exist in DOM

        // Get or create icon container
        let iconContainer = button.querySelector('.icon');
        if (!iconContainer) {
            iconContainer = document.createElement('div');
            iconContainer.className = 'icon';
            button.appendChild(iconContainer);
        }

        // CRITICAL FIX: COMPLETELY CLEAR container
        iconContainer.innerHTML = '';

        // Store icon name on button
        button.dataset.icon = iconName;

        // Get SVG content from cache or fallback
        const svgContent = iconCache.get(iconName) || fallbackSVG;

        try {
            // Create SVG element
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svg = doc.documentElement;

            // Ensure SVG is properly configured
            if (!svg.classList.contains('svg-icon')) {
                svg.classList.add('svg-icon');
            }

            // Remove any width/height that might cause issues
            svg.removeAttribute('width');
            svg.removeAttribute('height');

            // Ensure viewBox exists
            if (!svg.hasAttribute('viewBox')) {
                svg.setAttribute('viewBox', '0 0 24 24');
            }

            // Set fill to currentColor for proper coloring
            svg.setAttribute('fill', 'currentColor');

            // Apply any button state colors
            applyIconColors(svg, button);

            // Append to container
            iconContainer.appendChild(svg);

        } catch (error) {
            console.error('Error parsing SVG for button:', button.id, error);
            // Set fallback directly
            iconContainer.innerHTML = fallbackSVG;
        }
    }

    // Apply proper colors based on button state
    function applyIconColors(svgElement, button) {
        // Reset all colors first
        svgElement.setAttribute('fill', 'currentColor');

        // Apply state-based coloring
        if (button.classList.contains('on')) {
            // Active state - yellow/gold
            svgElement.style.color = '#ffcc00';
            svgElement.style.fill = '#ffcc00';
        } else {
            // Inactive state - gray
            svgElement.style.color = '#666666';
            svgElement.style.fill = '#666666';
        }
    }

    // Update icon color based on button state
    function updateIconColor(button) {
        const svg = button.querySelector('.icon .svg-icon');
        if (!svg) {
            // If no SVG exists, reload the icon
            const iconName = button.dataset.icon || 'light-bulb-1.svg';
            setIconImmediately(button, iconName);
            return;
        }

        if (button.classList.contains('on')) {
            svg.style.color = '#ffcc00';
            svg.style.fill = '#ffcc00';
        } else {
            svg.style.color = '#666666';
            svg.style.fill = '#666666';
        }

        // Also update child elements
        const childElements = svg.querySelectorAll('*');
        childElements.forEach(el => {
            if (el.hasAttribute('fill') && el.getAttribute('fill') !== 'none') {
                if (button.classList.contains('on')) {
                    el.style.fill = '#ffcc00';
                } else {
                    el.style.fill = '#666666';
                }
            }
            if (el.hasAttribute('stroke') && el.getAttribute('stroke') !== 'none') {
                if (button.classList.contains('on')) {
                    el.style.stroke = '#ffcc00';
                } else {
                    el.style.stroke = '#666666';
                }
            }
        });
    }

    // Clear ALL icons from a button (FIXED)
    function clearButtonIcons(button) {
        if (!button) return;

        const iconContainer = button.querySelector('.icon');
        if (iconContainer) {
            // Remove ALL child nodes
            while (iconContainer.firstChild) {
                iconContainer.removeChild(iconContainer.firstChild);
            }
        }

        // Also remove any FontAwesome icons that might be lingering
        const faIcons = button.querySelectorAll('.fas, .fa, .far, .fal, .fad, .fab, .fa-solid, .fa-regular');
        faIcons.forEach(icon => {
            if (icon.parentNode) {
                icon.parentNode.removeChild(icon);
            }
        });
    }

    // Preload icons
    async function preloadIcons(iconNames) {
        const promises = iconNames.map(iconName => loadSVG(iconName));
        await Promise.all(promises);
        console.log(`Preloaded ${iconNames.length} icons`);
    }

    // Fix ALL buttons in the entire application
    function fixAllButtonIcons() {
        console.log('Fixing ALL button icons in the application...');

        const allButtons = document.querySelectorAll('.light-button');
        let fixedCount = 0;

        allButtons.forEach(button => {
            // Remove any FontAwesome icons
            const fontAwesomeIcons = button.querySelectorAll('.fas, .fa, .far, .fal, .fad, .fab, .fa-solid, .fa-regular');
            fontAwesomeIcons.forEach(icon => {
                if (icon.parentNode) {
                    icon.parentNode.removeChild(icon);
                }
            });

            // Ensure we have an icon container
            let iconContainer = button.querySelector('.icon');
            if (!iconContainer) {
                iconContainer = document.createElement('div');
                iconContainer.className = 'icon';
                button.insertBefore(iconContainer, button.firstChild);
            }

            // Clear container completely
            iconContainer.innerHTML = '';

            // Get icon name and reload
            const iconName = button.dataset.icon || 'light-bulb-1.svg';
            setIconImmediately(button, iconName);

            fixedCount++;
        });

        console.log(`Fixed ${fixedCount} button icons`);

        // Force a repaint to ensure icons display correctly
        setTimeout(() => {
            document.querySelectorAll('.svg-icon').forEach(svg => {
                svg.style.display = 'inline-block';
            });
        }, 50);
    }

    // Initialize SVG icons on page load
    function initialize() {
        // Preload common icons
        const commonIcons = [
            // AC
            'ac-1.svg', 'ac-2.svg', 'ac-3.svg',

            // Alarm & Sensors
            'alarm.svg', 'person-fall-1.svg', 'person-fall-2.svg', 'walk-1.svg',
            'sensor-presence1.svg', 'sensor-presense.svg',

            // Arrows
            'arrow-up.svg', 'arrow-up1.svg', 'arrow-up2.svg',
            'arrow-down.svg', 'arrow-down1.svg', 'arrow-down2.svg',
            'arrow-left.svg', 'arrow-left1.svg', 'arrow-left2.svg',
            'arrow-right.svg', 'arrow-right1.svg', 'arrow-right2.svg',

            // Navigation & UI
            'back.svg', 'exit.svg', 'home.svg', 'menu1.svg', 'menu2.svg',
            'ok.svg', 'navigate.svg', 'reload.svg', 'power.svg',
            'setting1.svg', 'setting2.svg', 'info.svg',

            // Lighting
            'light-bulb-1.svg', 'light-bulb-2.svg', 'light-bulb-3.svg', 'light-bulb-4.svg',
            'ceiling-light.svg', 'table-light-1.svg', 'table-light-2.svg',
            'chandelier-1.svg', 'chandelier-2.svg', 'chandelier-3.svg',
            'candle.svg', 'dimmer.svg', 'dimmer-1.svg', 'dimmer-3.svg',

            // Climate & Fans
            'fan.svg', 'climate.svg',

            // Doors, Curtains & Blinds
            'door-opened.svg', 'door-closed.svg',
            'curtain1.svg', 'curtain2.svg', 'blind.svg',

            // Security
            'lock.svg', 'lock-open.svg', 'camera.svg',

            // Media Devices
            'tv.svg', 'tv2.svg', 'remote.svg', 'remote2.svg', 'remote4.svg',
            'projector.svg', 'hdmi.svg', 'cast.svg',

            // Media Controls
            'play.svg', 'pause.svg', 'stop.svg', 'mute.svg',
            'volume-up.svg', 'volume-down.svg', 'volume-min.svg', 'volume-max.svg',
            'skip-forward1.svg', 'skip-forward2.svg',
            'skip-backward1.svg', 'skip-backward2.svg',

            // Streaming Apps
            'youtube.svg', 'netflix.svg', 'prime.svg', 'hotstar.svg', 'kodi.svg',

            // Network
            'wifi-on.svg', 'wifi-off.svg', 'bluetooth.svg', 'signal.svg', 'satellite.svg',

            // System / Misc
            'printer1.svg', 'printer2.svg', 'presentation.svg',
            'file-search.svg', 'data.svg', 'human.svg', 'drop.svg',
            'cross.svg', 'minus.svg', 'remove3.svg', 'source.svg',
            'vibrate-on.svg', 'vibrate-off.svg', 'film.svg', 'movie.svg'
        ];


        // Start preloading but don't wait for it
        preloadIcons(commonIcons);

        // Fix all icons after a short delay
        setTimeout(fixAllButtonIcons, 500);

        // Also fix icons when DOM is fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(fixAllButtonIcons, 1000);
        });

        // Monitor for new buttons being added
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.classList && node.classList.contains('light-button')) {
                            // Fix icon for newly added button
                            const iconName = node.dataset.icon || 'light-bulb-1.svg';
                            setTimeout(() => setIconImmediately(node, iconName), 100);
                        }
                    });
                }
            });
        });

        // Start observing the document
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('SVG Icons module initialized');
    }

    // Public API
    return {
        setIconImmediately,
        preloadIcons,
        loadSVG,
        clearButtonIcons,
        fixAllButtonIcons,
        updateIconColor,
        initialize
    };
})();

// Auto-initialize when loaded
if (window.SVGIcons && window.SVGIcons.initialize) {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.SVGIcons.initialize();
        }, 100);
    });
}