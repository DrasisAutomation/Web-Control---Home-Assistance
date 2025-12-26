// rgb.js - RGB Button Module (COMPLETE FIXED VERSION)
window.RGBModule = (function () {
    'use strict';

    // Internal state
    let rgbButtons = [];
    let currentRGB = null;
    let rgbModal = null;
    let brightnessSlider = null;
    let colorSlider = null;
    let brightnessValue = null;
    let closeRGBBtn = null;
    let callbacks = {};
    let isEditMode = false;
    let isDragging = false;
    let longPressTimer = null;
    let dragStart = { x: 0, y: 0 };
    let dragThreshold = 10;

    // Create and inject RGB-specific styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* RGB Button Styles */
            .light-button.rgb {
                background: white;
                border: 1px solid #ddd;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                cursor: pointer;
            }

            .light-button.rgb .icon {
                color: #666;
            }

            .light-button.rgb.on {
                box-shadow: 0 0 15px rgba(255, 200, 0, 0.8);
            }

            .light-button.rgb.on .icon {
                color: #ffcc00;
            }

            .light-button.rgb.off .icon {
                color: #666;
            }

            /* Edit mode for RGB */
            .edit-mode .light-button.rgb {
                border: 2px dashed #4CAF50;
                background-color: rgba(255, 255, 255, 0.9);
                cursor: grab;
            }

            .edit-mode .light-button.rgb:hover {
                border: 2px dashed #f44336;
            }

            .edit-mode .light-button.rgb.dragging {
                z-index: 1000;
                border: 2px solid #f44336;
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
                cursor: grabbing;
            }

            /* RGB Modal Styles */
            .rgb-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: transparent;
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }

            .rgb-modal-content {
                background-color: rgba(255, 255, 255, var(--dimmer-content-opacity, 0.95));
                border-radius: 12px;
                width: 500px;
                min-width:300px;
                height: 400px;
                padding: 20px 15px;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: auto;
                margin:15px;
            }

            .rgb-modal .close-modal {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #000000;
                z-index: 1001;
                width: 30px;
                height: 30px;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .rgb-modal .close-modal:hover {
                color: #000000;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 50%;
            }

            .rgb-sliders-container {
                width: 100%;
                height: 100%;
                min-width: 300px;
                margin-top: -15px;
                display: flex;
                justify-content: space-around;
                align-items: center;
            }

            .rgb-slider-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                height: 100%;
                justify-content: center;
                margin-top: 20px;
            }

            .rgb-slider-title {
                font-size: 14px;
                color: #000000;
                font-family: Arial, sans-serif;
                margin-bottom: 10px;
                font-weight: 600;
            }

            .rgb-wrapper {
                position: relative;
                height: 20rem;
                width: 3rem;
            }

            .rgb-wrapper::before,
            .rgb-wrapper::after {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99;
                color: black;
                font-size: 20px;
                font-weight: bold;
                pointer-events: none;
            }

            .rgb-wrapper::before {
                content: "+";
                top: 20px;
            }

            .rgb-wrapper::after {
                content: "−";
                bottom: 20px;
            }

            /* Hide + and - signs only for the color slider wrapper */
            .rgb-slider-wrapper:last-child .rgb-wrapper::before,
            .rgb-slider-wrapper:last-child .rgb-wrapper::after {
                display: none;
            }

            /* Brightness Slider for RGB */
            #rgbBrightnessSlider {
                -webkit-appearance: none;
                background-color: rgba(0, 0, 0, 0.1);
                position: absolute;
                top: 50%;
                left: 50%;
                width: 18rem;
                height: 3.5rem;
                transform: translate(-50%, -50%) rotate(-90deg);
                border-radius: 1rem;
                overflow: hidden;
                cursor: pointer;
            }

            #rgbBrightnessSlider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 0;
                box-shadow: -20rem 0 0 20rem rgba(0, 30, 255, 0.5);
            }

            #rgbBrightnessSlider::-moz-range-thumb {
                width: 0;
                box-shadow: -20rem 0 0 20rem rgba(0, 30, 255, 0.5);
                border: none;
            }

            /* RGB Color Slider */
            #rgbColorSlider {
                -webkit-appearance: none;
                background: linear-gradient(to right, 
                    #ff0000 0%,    /* Red */
                    #ffff00 16.66%, /* Yellow */
                    #00ff00 33.33%, /* Green */
                    #00ffff 50%,    /* Cyan */
                    #0000ff 66.66%, /* Blue */
                    #ff00ff 83.33%, /* Magenta */
                    #ff0000 100%    /* Back to Red */
                );
                position: absolute;
                top: 50%;
                left: 50%;
                width: 18rem;
                height: 3.5rem;
                transform: translate(-50%, -50%) rotate(-90deg);
                border-radius: 1rem;
                overflow: hidden;
                cursor: pointer;
            }

            /* WIDER THUMB for needle effect - WHITE COLOR for contrast */
            #rgbColorSlider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 6px;
                height: 3.5rem;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 0;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
                cursor: grab;
                padding: 3px;
                border-radius: 10px;
                border: 1px solid rgba(0, 0, 0, 0.3);
            }

            #rgbColorSlider::-moz-range-thumb {
                width: 6px;
                height: 3.5rem;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 0;
                border: 1px solid rgba(0, 0, 0, 0.3);
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                cursor: grab;
            }

            #rgbColorSlider::-webkit-slider-thumb:hover {
                background: rgba(255, 255, 255, 1);
                border: 1px solid rgba(0, 0, 0, 0.5);
            }

            /* Brightness percentage display */
            .rgb-brightness-percentage {
                margin-top: 5px;
                font-size: 14px;
                color: #000000;
                font-family: Arial, sans-serif;
            }

            /* Color display */
            .rgb-color-display {
                margin-top: 5px;
                font-size: 14px;
                color: #000000;
                font-family: Arial, sans-serif;
            }
        `;
        document.head.appendChild(style);
    }

    // Create RGB modal HTML
    function createModal() {
        if (document.getElementById('rgbModal')) return;

        const modalHTML = `
            <div class="rgb-modal" id="rgbModal">
                <div class="rgb-modal-content">
                    <button class="close-modal" id="closeRGBBtn">&times;</button>
                    <div class="rgb-sliders-container">
                        <!-- Brightness Slider -->
                        <div class="rgb-slider-wrapper">
                            <div class="rgb-slider-title">Brightness</div>
                            <div class="rgb-wrapper">
                                <input type="range" min="0" max="100" value="50" 
                                       class="rgb-brightness-slider" id="rgbBrightnessSlider" />
                            </div>
                            <div class="rgb-brightness-percentage" id="rgbBrightnessValue">50%</div>
                        </div>

                        <!-- Color Slider -->
                        <div class="rgb-slider-wrapper">
                            <div class="rgb-slider-title">Color</div>
                            <div class="rgb-wrapper">
                                <input type="range" min="0" max="360" value="180" 
                                       class="rgb-color-slider" id="rgbColorSlider" />
                            </div>
                            <div class="rgb-color-display">RGB</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get references
        rgbModal = document.getElementById('rgbModal');
        brightnessSlider = document.getElementById('rgbBrightnessSlider');
        colorSlider = document.getElementById('rgbColorSlider');
        brightnessValue = document.getElementById('rgbBrightnessValue');
        closeRGBBtn = document.getElementById('closeRGBBtn');
    }

    // Initialize the module
    function init(cb) {
        callbacks = cb || {};

        // Inject styles
        injectStyles();

        // Create modal
        createModal();

        // Setup event listeners
        setupEventListeners();

        // Load saved RGB buttons
        loadFromLocalStorage();

        console.log('RGB module initialized');
        return {
            create,
            enableEditMode,
            updatePositions,
            getRGBButtons,
            updateConfig,
            deleteButton,
            handleStateUpdate,
            openRGBModal,
            updateBrightness,
            updateColor
        };
    }

    // Load from localStorage
    function loadFromLocalStorage() {
        const saved = localStorage.getItem('rgbButtons');
        if (saved) {
            try {
                rgbButtons = JSON.parse(saved);
                restoreRGBButtons();
            } catch (e) {
                console.error('Error loading RGB buttons:', e);
                rgbButtons = [];
            }
        }
    }

    // Save to localStorage
    function saveToLocalStorage() {
        const cleanRGBs = rgbButtons.map(rgb => ({
            id: rgb.id,
            type: 'rgb',
            entityId: rgb.entityId || '',
            name: rgb.name || 'RGB Light',
            iconClass: rgb.iconClass || 'light-bulb-1.svg',
            position: {
                x: Number(rgb.position.x.toFixed(4)),
                y: Number(rgb.position.y.toFixed(4))
            },
            brightness: rgb.brightness || 50,
            hue: rgb.hue || 180,
            isOn: rgb.isOn || false
        }));

        localStorage.setItem('rgbButtons', JSON.stringify(cleanRGBs));
    }

    // Create an RGB button
    function create(config) {
        if (!config.id) {
            config.id = 'rgb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Set defaults
        config.type = 'rgb';
        config.iconClass = config.iconClass || 'light-bulb-1.svg';
        config.name = config.name || 'RGB Light';
        config.brightness = config.brightness || 50;
        config.hue = config.hue || 180;
        config.isOn = config.isOn || false;
        config.position = config.position || { x: 0.5, y: 0.5 };

        // Add to array
        rgbButtons.push(config);

        // Create DOM element
        createRGBButton(config);

        // Save
        saveToLocalStorage();

        return config.id;
    }

    function createRGBButton(config) {
        // Remove existing if present
        const existing = document.getElementById(config.id);
        if (existing) existing.remove();

        const button = document.createElement('button');
        button.id = config.id;
        button.className = 'light-button rgb';
        button.dataset.entityId = config.entityId;
        button.dataset.brightness = config.brightness;
        button.dataset.hue = config.hue;
        button.dataset.type = 'rgb';
        button.dataset.icon = config.iconClass || 'light-bulb-1.svg';

        // Create icon container
        button.innerHTML = `<div class="icon"></div>`;

        // Set SVG icon
        if (window.SVGIcons) {
            window.SVGIcons.setIconImmediately(button, config.iconClass || 'light-bulb-1.svg');
        }

        // Set initial state
        if (config.isOn && config.brightness > 0) {
            button.classList.add('on');
            button.classList.remove('off');
        } else {
            button.classList.remove('on');
            button.classList.add('off');
        }

        // Update icon color based on state
        if (window.SVGIcons && window.SVGIcons.updateIconColor) {
            window.SVGIcons.updateIconColor(button);
        }

        // Add event listeners
        setupRGBButtonEvents(button, config);

        // Append to pan layer
        const panLayer = document.getElementById('panLayer');
        if (panLayer) {
            panLayer.appendChild(button);

            // Position button
            const img = document.getElementById('viewImage');
            if (img) {
                const imgWidth = img.clientWidth;
                const imgHeight = img.clientHeight;

                button.style.left = `${config.position.x * imgWidth}px`;
                button.style.top = `${config.position.y * imgHeight}px`;
            }
        }

        return button;
    }

    // Setup RGB button events (drag and click)
    function setupRGBButtonEvents(button, config) {
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        // Mouse down handler
        button.addEventListener('mousedown', (e) => {
            if (!isEditMode) {
                // In normal mode, just prevent default
                e.stopPropagation();
                e.preventDefault();
                return;
            }

            // In edit mode
            e.stopPropagation();
            e.preventDefault();

            startX = e.clientX;
            startY = e.clientY;

            // Get current position
            const rect = button.getBoundingClientRect();
            startLeft = parseFloat(button.style.left) || rect.left;
            startTop = parseFloat(button.style.top) || rect.top;

            // Clear any existing timer
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            // Start long press timer
            longPressTimer = setTimeout(() => {
                // Check if we haven't moved much
                const movedX = Math.abs(e.clientX - startX);
                const movedY = Math.abs(e.clientY - startY);

                if (movedX < dragThreshold && movedY < dragThreshold && !isDragging) {
                    showEditModal(config);
                }

                longPressTimer = null;
            }, 600);

            // Add mouse move listener to detect drag
            const mouseMoveHandler = (moveEvent) => {
                const moveX = Math.abs(moveEvent.clientX - startX);
                const moveY = Math.abs(moveEvent.clientY - startY);

                // If movement exceeds threshold, start dragging
                if ((moveX > dragThreshold || moveY > dragThreshold) && longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                    startDrag(moveEvent, button, config);

                    // Remove this listener
                    document.removeEventListener('mousemove', mouseMoveHandler);
                }
            };

            // Add temporary mouse move listener
            document.addEventListener('mousemove', mouseMoveHandler);

            // Clean up if mouse up occurs
            const cleanup = () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', cleanup);
            };

            document.addEventListener('mouseup', cleanup);
        });

        // Click handler (non-edit mode only)
        button.addEventListener('click', (e) => {
            if (isEditMode) {
                e.stopPropagation();
                e.preventDefault();
                return;
            }

            if (config.entityId && !isDragging) {
                e.stopPropagation();
                e.preventDefault();
                openRGBModal(config);
            }
        });

        // Touch events
        button.addEventListener('touchstart', (e) => {
            if (!isEditMode) return;

            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;

            // Get current position
            const rect = button.getBoundingClientRect();
            startLeft = parseFloat(button.style.left) || rect.left;
            startTop = parseFloat(button.style.top) || rect.top;

            e.stopPropagation();
            e.preventDefault();
        });

        button.addEventListener('touchmove', (e) => {
            if (!isEditMode) return;

            const touch = e.touches[0];
            const moveX = Math.abs(touch.clientX - startX);
            const moveY = Math.abs(touch.clientY - startY);

            // If movement exceeds threshold, start dragging
            if (moveX > dragThreshold || moveY > dragThreshold) {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                startDrag(e, button, config);
            }

            e.preventDefault();
        });

        button.addEventListener('touchend', () => {
            if (isEditMode) {
                // Check if it was a long press (no drag)
                if (longPressTimer && !isDragging) {
                    clearTimeout(longPressTimer);
                    showEditModal(config);
                    longPressTimer = null;
                }

                if (isDragging) {
                    stopDrag();
                }
            }
        });

        // Prevent context menu
        button.addEventListener('contextmenu', (e) => {
            if (isEditMode) e.preventDefault();
            return false;
        });
    }

    // Start dragging
    function startDrag(e, button, config) {
        isDragging = true;
        button.classList.add('dragging');
        button.style.cursor = 'grabbing';

        const startDragX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const startDragY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        const originalLeft = parseFloat(button.style.left);
        const originalTop = parseFloat(button.style.top);

        // Drag move handler
        const dragMoveHandler = (moveEvent) => {
            if (!isDragging) return;

            const clientX = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const clientY = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const deltaX = clientX - startDragX;
            const deltaY = clientY - startDragY;

            // Update position
            button.style.left = `${originalLeft + deltaX}px`;
            button.style.top = `${originalTop + deltaY}px`;

            moveEvent.preventDefault();
        };

        // Drag end handler
        const dragEndHandler = () => {
            if (!isDragging) return;

            isDragging = false;
            button.classList.remove('dragging');
            button.style.cursor = 'grab';

            // Save new position
            const img = document.getElementById('viewImage');
            if (img) {
                const imgRect = img.getBoundingClientRect();
                const buttonRect = button.getBoundingClientRect();

                // Convert to relative position
                const relativeX = (buttonRect.left + buttonRect.width / 2 - imgRect.left) / imgRect.width;
                const relativeY = (buttonRect.top + buttonRect.height / 2 - imgRect.top) / imgRect.height;

                // Update config
                const index = rgbButtons.findIndex(b => b.id === config.id);
                if (index !== -1) {
                    rgbButtons[index].position = {
                        x: Math.max(0, Math.min(1, relativeX)),
                        y: Math.max(0, Math.min(1, relativeY))
                    };
                    saveToLocalStorage();
                }
            }

            // Remove event listeners
            document.removeEventListener('mousemove', dragMoveHandler);
            document.removeEventListener('touchmove', dragMoveHandler);
            document.removeEventListener('mouseup', dragEndHandler);
            document.removeEventListener('touchend', dragEndHandler);
        };

        // Add drag event listeners
        document.addEventListener('mousemove', dragMoveHandler);
        document.addEventListener('touchmove', dragMoveHandler, { passive: false });
        document.addEventListener('mouseup', dragEndHandler);
        document.addEventListener('touchend', dragEndHandler);
    }

    // Stop dragging
    function stopDrag() {
        isDragging = false;

        // Clear selection when drag ends
        if (currentRGB) {
            const btn = document.getElementById(currentRGB.id);
            if (btn) btn.classList.remove('selected');
        }

        // Reset all RGB buttons cursor
        rgbButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.classList.remove('dragging');
                btn.style.cursor = 'grab';
            }
        });
    }

    // Show edit modal for RGB
    function showEditModal(config) {
        console.log('RGB: Opening edit modal for:', config.id, 'type: rgb');

        // Mark button as selected
        if (window.selectButtonForEdit) {
            window.selectButtonForEdit(config.id, 'rgb');
        }

        // Fill the edit form
        const editEntityId = document.getElementById('editEntityId');
        const editName = document.getElementById('editName');
        const editIcon = document.getElementById('editIcon');

        if (editEntityId) editEntityId.value = config.entityId || '';
        if (editName) editName.value = config.name || 'RGB Light';
        if (editIcon) editIcon.value = config.iconClass || 'light-bulb-1.svg';

        // Store which button we're editing
        window.currentEditingButton = config.id;
        window.currentEditingType = 'rgb';

        // Also set in buttons module
        if (window.buttons && window.buttons.setEditingButtonId) {
            window.buttons.setEditingButtonId(config.id);
        }

        // Show modal
        const modal = document.getElementById('buttonEditModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('RGB: Modal displayed');
        } else {
            console.error('RGB: Edit modal not found');
        }
    }

    // Update RGB button UI
    function updateRGBUI(button, brightness, isOn) {
        if (!button) return;

        button.dataset.brightness = brightness;

        if (isOn && brightness > 0) {
            button.classList.add('on');
            button.classList.remove('off');
        } else {
            button.classList.remove('on');
            button.classList.add('off');
        }

        // Update icon color
        if (window.SVGIcons && window.SVGIcons.updateIconColor) {
            window.SVGIcons.updateIconColor(button);
        }
    }

    // Open RGB modal
    function openRGBModal(config) {
        currentRGB = config;

        // Get current brightness and hue
        const button = document.getElementById(config.id);
        let currentBrightness = config.brightness || 50;
        let currentHue = config.hue || 180;

        if (button) {
            if (button.dataset.brightness) {
                currentBrightness = parseInt(button.dataset.brightness);
            }
            if (button.dataset.hue) {
                currentHue = parseInt(button.dataset.hue);
            }
        }

        // Update modal with current values
        if (brightnessSlider && brightnessValue && colorSlider) {
            brightnessSlider.value = currentBrightness;
            brightnessValue.textContent = `${currentBrightness}%`;
            colorSlider.value = currentHue;
        }

        // Show modal
        if (rgbModal) {
            rgbModal.style.display = 'flex';
            rgbModal.style.alignItems = 'center';
            rgbModal.style.justifyContent = 'center';
        }
    }

    // Close RGB modal
    function closeRGBModal() {
        if (rgbModal) {
            rgbModal.style.display = 'none';
        }
        currentRGB = null;
    }

    // Update brightness
    function updateBrightness(brightness) {
        if (!currentRGB) return;

        const button = document.getElementById(currentRGB.id);
        if (button) {
            updateRGBUI(button, brightness, brightness > 0);
        }

        // Update config
        const index = rgbButtons.findIndex(b => b.id === currentRGB.id);
        if (index !== -1) {
            rgbButtons[index].brightness = brightness;
            rgbButtons[index].isOn = brightness > 0;
            saveToLocalStorage();
        }

        // Call callback
        if (callbacks.updateRGB) {
            callbacks.updateRGB(currentRGB.entityId, brightness, currentRGB.hue, currentRGB.id);
        }
    }

    // Update color
    function updateColor(hue) {
        if (!currentRGB) return;

        const button = document.getElementById(currentRGB.id);
        if (button) {
            button.dataset.hue = hue;
        }

        // Update config
        const index = rgbButtons.findIndex(b => b.id === currentRGB.id);
        if (index !== -1) {
            rgbButtons[index].hue = hue;
            saveToLocalStorage();
        }

        // Call callback
        if (callbacks.updateRGB) {
            callbacks.updateRGB(currentRGB.entityId, currentRGB.brightness, hue, currentRGB.id);
        }
    }

    // Restore RGB buttons
    function restoreRGBButtons() {
        rgbButtons.forEach(config => {
            createRGBButton(config);
        });
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close button
        if (closeRGBBtn) {
            closeRGBBtn.addEventListener('click', closeRGBModal);
        }

        // Close on overlay click
        if (rgbModal) {
            rgbModal.addEventListener('click', (e) => {
                if (e.target === rgbModal) {
                    closeRGBModal();
                }
            });
        }

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && rgbModal && rgbModal.style.display === 'flex') {
                closeRGBModal();
            }
        });

        // Brightness slider - update display while dragging
        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (brightnessValue) {
                    brightnessValue.textContent = `${value}%`;
                }
            });

            // Brightness slider - update when released
            brightnessSlider.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                updateBrightness(value);
            });

            // FIXED TOUCH EVENTS for brightness slider (RGB)
            brightnessSlider.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                const touch = e.touches[0];
                const rect = brightnessSlider.getBoundingClientRect();
                const relativeY = touch.clientY - rect.top;
                const percent = relativeY / rect.height;
                const value = Math.round((1 - percent) * 100); // INVERT HERE
                const clampedValue = Math.max(0, Math.min(100, value));

                brightnessSlider.value = clampedValue;
                if (brightnessValue) {
                    brightnessValue.textContent = `${clampedValue}%`;
                }
            }, { passive: false });

            brightnessSlider.addEventListener('touchmove', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                const rect = brightnessSlider.getBoundingClientRect();
                const relativeY = touch.clientY - rect.top;
                const percent = relativeY / rect.height;
                const value = Math.round((1 - percent) * 100); // INVERT HERE
                const clampedValue = Math.max(0, Math.min(100, value));

                brightnessSlider.value = clampedValue;
                if (brightnessValue) {
                    brightnessValue.textContent = `${clampedValue}%`;
                }
            }, { passive: false });

            brightnessSlider.addEventListener('touchend', (e) => {
                const value = parseInt(brightnessSlider.value);
                updateBrightness(value);
            }, { passive: true });
        }

        // Color slider - update when released
        if (colorSlider) {
            colorSlider.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                updateColor(value);
            });

            // Add input event for real-time display updates
            colorSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                // You might want to update a color display here
                if (window.updateColorDisplay) {
                    window.updateColorDisplay(value);
                }
            });

            // FIXED TOUCH EVENTS for color slider (RGB)
            colorSlider.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                const touch = e.touches[0];
                const rect = colorSlider.getBoundingClientRect();
                const relativeY = touch.clientY - rect.top;
                const percent = relativeY / rect.height;
                const value = Math.round((1 - percent) * 360); // INVERT HERE (0-360 range)
                const clampedValue = Math.max(0, Math.min(360, value));

                colorSlider.value = clampedValue;
                // Update color display if function exists
                if (window.updateColorDisplay) {
                    window.updateColorDisplay(clampedValue);
                }
            }, { passive: false });

            colorSlider.addEventListener('touchmove', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                const rect = colorSlider.getBoundingClientRect();
                const relativeY = touch.clientY - rect.top;
                const percent = relativeY / rect.height;
                const value = Math.round((1 - percent) * 360); // INVERT HERE (0-360 range)
                const clampedValue = Math.max(0, Math.min(360, value));

                colorSlider.value = clampedValue;
                // Update color display if function exists
                if (window.updateColorDisplay) {
                    window.updateColorDisplay(clampedValue);
                }
            }, { passive: false });

            colorSlider.addEventListener('touchend', (e) => {
                const value = parseInt(colorSlider.value);
                updateColor(value);
            }, { passive: true });
        }
    }

    // Toggle edit mode
    function enableEditMode(flag) {
        isEditMode = flag;

        rgbButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                if (flag) {
                    btn.classList.add('edit-mode');
                    btn.style.cursor = 'grab';
                } else {
                    btn.classList.remove('edit-mode');
                    btn.style.cursor = '';
                }
            }
        });

        if (!flag) {
            saveToLocalStorage();
        }
    }

    // Update positions (called when image zooms/pans)
    function updatePositions() {
        const img = document.getElementById('viewImage');
        if (!img) return;

        const imgWidth = img.clientWidth;
        const imgHeight = img.clientHeight;

        rgbButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.style.left = `${config.position.x * imgWidth}px`;
                btn.style.top = `${config.position.y * imgHeight}px`;
            }
        });
    }

    // Get all RGB buttons
    function getRGBButtons() {
        return rgbButtons;
    }

    // Update button config
    function updateConfig(buttonId, newConfig) {
        const index = rgbButtons.findIndex(b => b.id === buttonId);
        if (index === -1) return false;

        const btnData = rgbButtons[index];
        const oldEntityId = btnData.entityId;

        // UPDATE STORED DATA
        Object.assign(btnData, newConfig);

        const btn = document.getElementById(buttonId);
        if (!btn) return false;

        // ICON UPDATE
        if (newConfig.iconClass) {
            // Clear and set new icon
            if (window.SVGIcons) {
                window.SVGIcons.clearButtonIcons(btn);
                window.SVGIcons.setIconImmediately(btn, newConfig.iconClass);
            }
            btn.dataset.icon = newConfig.iconClass;
        }

        // NAME UPDATE
        if (newConfig.name) {
            btn.dataset.name = newConfig.name;
            btn.title = newConfig.name;
        }

        // ENTITY SYNC
        if (newConfig.entityId && newConfig.entityId !== oldEntityId) {
            // remove from old entity
            if (oldEntityId && window.EntityButtons?.[oldEntityId]) {
                window.EntityButtons[oldEntityId] =
                    window.EntityButtons[oldEntityId].filter(b => b.id !== buttonId);
            }

            // add to new entity
            if (!window.EntityButtons) window.EntityButtons = {};
            if (!window.EntityButtons[newConfig.entityId]) {
                window.EntityButtons[newConfig.entityId] = [];
            }

            const entityButton = {
                id: buttonId,
                entityId: newConfig.entityId,
                isOn: false,
                updateUI() {
                    const el = document.getElementById(this.id);
                    if (!el) return;
                    el.classList.toggle('on', this.isOn);
                    if (window.SVGIcons && window.SVGIcons.updateIconColor) {
                        window.SVGIcons.updateIconColor(el);
                    }
                },
                handleStateUpdate(state) {
                    this.isOn = state === 'on';
                    this.updateUI();
                }
            };

            window.EntityButtons[newConfig.entityId].push(entityButton);
            btn.dataset.entityId = newConfig.entityId;
        }

        saveToLocalStorage();
        return true;
    }

    // Delete button
    function deleteButton(buttonId) {
        const index = rgbButtons.findIndex(b => b.id === buttonId);
        if (index !== -1) {
            rgbButtons.splice(index, 1);

            const btn = document.getElementById(buttonId);
            if (btn) btn.remove();

            saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Handle state update from Home Assistant
    function handleStateUpdate(entityId, state, brightness, hsColor) {
        const isOn = state === 'on';
        const brightnessPercent = brightness || 0;

        rgbButtons.forEach(config => {
            if (config.entityId === entityId) {
                config.isOn = isOn;
                config.brightness = brightnessPercent;

                if (hsColor && hsColor.length >= 1) {
                    config.hue = Math.round(hsColor[0]);
                }

                const btn = document.getElementById(config.id);
                if (btn) {
                    updateRGBUI(btn, brightnessPercent, isOn);
                    if (hsColor && hsColor.length >= 1) {
                        btn.dataset.hue = config.hue;
                    }
                }
            }
        });
    }

    // Public API
    return {
        init,
        create,
        enableEditMode,
        updatePositions,
        getRGBButtons,
        updateConfig,
        deleteButton,
        handleStateUpdate,
        openRGBModal,
        updateBrightness,
        updateColor
    };
})();