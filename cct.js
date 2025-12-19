
// cct.js - CCT (Color Temperature) Button Module
window.CCTModule = (function () {
    'use strict';

    // Internal state
    let cctButtons = [];
    let currentCCT = null;
    let cctModal = null;
    let brightnessSlider = null;
    let temperatureSlider = null;
    let brightnessValue = null;
    let kelvinDisplay = null;
    let closeCCTBtn = null;
    let callbacks = {};
    let isEditMode = false;
    let isDragging = false;
    let longPressTimer = null;
    let dragStart = { x: 0, y: 0 };
    let dragThreshold = 10;

    // Create and inject CCT-specific styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* CCT Button Styles */
            .light-button.cct {
                background: white;
                border: 1px solid #ddd;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                cursor: pointer;
            }

            .light-button.cct .icon {
                color: #666;
            }

            .light-button.cct.on {
                box-shadow: 0 0 15px rgba(255, 200, 0, 0.8);
            }

            .light-button.cct.on .icon {
                color: #ffcc00;
            }

            .light-button.cct.off .icon {
                color: #666;
            }

            /* Edit mode for CCT */
            .edit-mode .light-button.cct {
                border: 2px dashed #4CAF50;
                background-color: rgba(255, 255, 255, 0.9);
                cursor: grab;
            }

            .edit-mode .light-button.cct:hover {
                border: 2px dashed #f44336;
            }

            .edit-mode .light-button.cct.dragging {
                z-index: 1000;
                border: 2px solid #f44336;
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
                cursor: grabbing;
            }

            /* CCT Modal Styles */
            .cct-modal {
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

            .cct-modal-content {
                background-color: rgba(255, 255, 255, var(--dimmer-content-opacity, 0.95));
                border-radius: 12px;
                width:500px;
                min-width: 300px;
                height: 400px;
                padding: 20px 15px;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 15px;

            }

            .cct-modal .close-modal {
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

            .cct-modal .close-modal:hover {
                color: #000000;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 50%;
            }

            .cct-sliders-container {
                width: 100%;
                height: 100%;
                min-width: 300px;
                margin-top: -15px;
                display: flex;
                justify-content: space-around;
                align-items: center;
            }

            .cct-slider-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                height: 100%;
                justify-content: center;
                margin-top: 20px;
            }

            .cct-slider-title {
                font-size: 14px;
                color: #000000;
                font-family: Arial, sans-serif;
                font-weight: 600;
            }

            .cct-wrapper {
                position: relative;
                height: 20rem;
                width: 3rem;
            }

            .cct-wrapper::before,
            .cct-wrapper::after {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99;
                color: black;
                font-size: 20px;
                font-weight: bold;
                pointer-events: none;
            }

            .cct-wrapper::before {
                content: "+";
                top: 20px;
            }

            .cct-wrapper::after {
                content: "−";
                bottom: 20px;
            }

            /* Brightness Slider for CCT */
            #cctBrightnessSlider {
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

            #cctBrightnessSlider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 0;
                box-shadow: -20rem 0 0 20rem rgba(0, 30, 255, 0.5);
            }

            #cctBrightnessSlider::-moz-range-thumb {
                width: 0;
                box-shadow: -20rem 0 0 20rem rgba(0, 30, 255, 0.5);
                border: none;
            }

            /* Temperature Slider for CCT */
            #cctTemperatureSlider {
                -webkit-appearance: none;
                background: linear-gradient(to right, 
                    #ffffff 0%, 
                    #f2d6a2 20%, 
                    #ffc561 40%, 
                    #f1ae3a 60%, 
                    #f1951d 80%, 
                    #f28900 100%);
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

            /* WIDER THUMB for needle effect */
            #cctTemperatureSlider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 6px;
                height: 3.5rem;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 0;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
                cursor: grab;
                padding: 3px;
                border-radius: 10px;
            }
            #cctTemperatureSlider::-moz-range-thumb {
                width: 6px;
                height: 3.5rem;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 0;
                border: none;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                cursor: grab;
            }

            #cctTemperatureSlider::-webkit-slider-thumb:hover {
                background: rgba(255, 255, 255, 0.9);
            }

            /* Brightness percentage display */
            .cct-brightness-percentage {
                margin-top: 5px;
                font-size: 14px;
                color: #000000;
                font-family: Arial, sans-serif;
            }

            /* Kelvin display */
            .cct-kelvin-display {
                margin-top: 5px;
                font-size: 14px;
                color: #000000;
                font-family: Arial, sans-serif;
            }
        `;
        document.head.appendChild(style);
    }

    // Create CCT modal HTML
    function createModal() {
        if (document.getElementById('cctModal')) return;

        const modalHTML = `
            <div class="cct-modal" id="cctModal">
                <div class="cct-modal-content">
                    <button class="close-modal" id="closeCCTBtn">&times;</button>
                    <div class="cct-sliders-container">
                        <!-- Brightness Slider -->
                        <div class="cct-slider-wrapper">
                            <div class="cct-slider-title">Brightness</div>
                            <div class="cct-wrapper">
                                <input type="range" min="0" max="100" value="50" 
                                       class="cct-brightness-slider" id="cctBrightnessSlider" />
                            </div>
                            <div class="cct-brightness-percentage" id="cctBrightnessValue">50%</div>
                        </div>

                        <!-- Temperature Slider -->
                        <div class="cct-slider-wrapper">
                            <div class="cct-slider-title">CCT</div>
                            <div class="cct-wrapper">
                                <input type="range" min="0" max="100" value="50" 
                                       class="cct-temperature-slider" id="cctTemperatureSlider" />
                            </div>
                            <div class="cct-kelvin-display" id="cctKelvinDisplay">3000K</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get references
        cctModal = document.getElementById('cctModal');
        brightnessSlider = document.getElementById('cctBrightnessSlider');
        temperatureSlider = document.getElementById('cctTemperatureSlider');
        brightnessValue = document.getElementById('cctBrightnessValue');
        kelvinDisplay = document.getElementById('cctKelvinDisplay');
        closeCCTBtn = document.getElementById('closeCCTBtn');
    }

    // Convert percentage to Kelvin (0% = 6500K, 100% = 2000K)
    function percentageToKelvin(percent) {
        return Math.round(6500 - (percent / 100) * (6500 - 2000));
    }

    // Update Kelvin display
    function updateKelvinDisplay(percent) {
        const kelvin = percentageToKelvin(percent);
        kelvinDisplay.textContent = `${kelvin}K`;
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

        // Load saved CCT buttons
        loadFromLocalStorage();

        console.log('CCT module initialized');
        return {
            create,
            enableEditMode,
            updatePositions,
            getCCTButtons,
            updateConfig,
            deleteButton,
            handleStateUpdate,
            openCCTModal,
            updateBrightness,
            updateTemperature
        };
    }

    // Load from localStorage
    function loadFromLocalStorage() {
        const saved = localStorage.getItem('cctButtons');
        if (saved) {
            try {
                cctButtons = JSON.parse(saved);
                restoreCCTButtons();
            } catch (e) {
                console.error('Error loading CCT buttons:', e);
                cctButtons = [];
            }
        }
    }

    // Save to localStorage
    function saveToLocalStorage() {
        const cleanCCTs = cctButtons.map(cct => ({
            id: cct.id,
            type: 'cct',
            entityId: cct.entityId || '',
            name: cct.name || 'CCT Light',
            iconClass: cct.iconClass || 'fa-lightbulb',
            position: {
                x: Number(cct.position.x.toFixed(4)),
                y: Number(cct.position.y.toFixed(4))
            },
            brightness: cct.brightness || 50,
            temperature: cct.temperature || 50,
            isOn: cct.isOn || false
        }));

        localStorage.setItem('cctButtons', JSON.stringify(cleanCCTs));
    }

    // Create a CCT button
    function create(config) {
        if (!config.id) {
            config.id = 'cct_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Set defaults
        config.type = 'cct';
        config.iconClass = config.iconClass || 'fa-lightbulb';
        config.name = config.name || 'CCT Light';
        config.brightness = config.brightness || 50;
        config.temperature = config.temperature || 50;
        config.isOn = config.isOn || false;
        config.position = config.position || { x: 0.5, y: 0.5 };

        // Add to array
        cctButtons.push(config);

        // Create DOM element
        createCCTButton(config);

        // Save
        saveToLocalStorage();

        return config.id;
    }

    // Create CCT button DOM element
    function createCCTButton(config) {
        // Remove existing if present
        const existing = document.getElementById(config.id);
        if (existing) existing.remove();

        const button = document.createElement('button');
        button.id = config.id;
        button.className = 'light-button cct';
        button.dataset.entityId = config.entityId;
        button.dataset.brightness = config.brightness;
        button.dataset.temperature = config.temperature;
        button.dataset.type = 'cct';

        // Simple button with just icon
        button.innerHTML = `<i class="icon fas ${config.iconClass}"></i>`;

        // Set initial state
        if (config.isOn && config.brightness > 0) {
            button.classList.add('on');
            button.classList.remove('off');
        } else {
            button.classList.remove('on');
            button.classList.add('off');
        }

        // Add event listeners
        setupCCTButtonEvents(button, config);

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

    // Setup CCT button events (drag and click)
    function setupCCTButtonEvents(button, config) {
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
                openCCTModal(config);
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
                const index = cctButtons.findIndex(b => b.id === config.id);
                if (index !== -1) {
                    cctButtons[index].position = {
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
        if (currentCCT) {
            const btn = document.getElementById(currentCCT.id);
            if (btn) btn.classList.remove('selected');
        }

        // Reset all CCT buttons cursor
        cctButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.classList.remove('dragging');
                btn.style.cursor = 'grab';
            }
        });
    }

// Show edit modal for CCT
function showEditModal(config) {
    console.log('CCT: Opening edit modal for:', config.id, 'type: cct');
    
    // Mark button as selected
    if (window.selectButtonForEdit) {
        window.selectButtonForEdit(config.id, 'cct');
    }
    
    // Fill the edit form
    const editEntityId = document.getElementById('editEntityId');
    const editName = document.getElementById('editName');
    const editIcon = document.getElementById('editIcon');
    
    if (editEntityId) editEntityId.value = config.entityId || '';
    if (editName) editName.value = config.name || 'CCT Light';
    if (editIcon) editIcon.value = config.iconClass || 'fa-lightbulb';
    
    // Store which button we're editing
    window.currentEditingButton = config.id;
    window.currentEditingType = 'cct';
    
    // Also set in buttons module
    if (window.buttons && window.buttons.setEditingButtonId) {
        window.buttons.setEditingButtonId(config.id);
    }
    
    // Show modal
    const modal = document.getElementById('buttonEditModal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('CCT: Modal displayed');
    } else {
        console.error('CCT: Edit modal not found');
    }
}

    // Update CCT button UI
    function updateCCTUI(button, brightness, isOn) {
        if (!button) return;

        button.dataset.brightness = brightness;

        if (isOn && brightness > 0) {
            button.classList.add('on');
            button.classList.remove('off');
        } else {
            button.classList.remove('on');
            button.classList.add('off');
        }
    }

    // Open CCT modal
    function openCCTModal(config) {
        currentCCT = config;

        // Get current brightness and temperature
        const button = document.getElementById(config.id);
        let currentBrightness = config.brightness || 50;
        let currentTemperature = config.temperature || 50;

        if (button) {
            if (button.dataset.brightness) {
                currentBrightness = parseInt(button.dataset.brightness);
            }
            if (button.dataset.temperature) {
                currentTemperature = parseInt(button.dataset.temperature);
            }
        }

        // Update modal with current values
        if (brightnessSlider && brightnessValue && temperatureSlider && kelvinDisplay) {
            brightnessSlider.value = currentBrightness;
            brightnessValue.textContent = `${currentBrightness}%`;
            temperatureSlider.value = currentTemperature;
            updateKelvinDisplay(currentTemperature);
        }

        // Show modal
        if (cctModal) {
            cctModal.style.display = 'flex';
            cctModal.style.alignItems = 'center';
            cctModal.style.justifyContent = 'center';
        }
    }

    // Close CCT modal
    function closeCCTModal() {
        if (cctModal) {
            cctModal.style.display = 'none';
        }
        currentCCT = null;
    }

    // Update brightness
    function updateBrightness(brightness) {
        if (!currentCCT) return;

        const button = document.getElementById(currentCCT.id);
        if (button) {
            updateCCTUI(button, brightness, brightness > 0);
        }

        // Update config
        const index = cctButtons.findIndex(b => b.id === currentCCT.id);
        if (index !== -1) {
            cctButtons[index].brightness = brightness;
            cctButtons[index].isOn = brightness > 0;
            saveToLocalStorage();
        }

        // Call callback
        if (callbacks.updateCCT) {
            callbacks.updateCCT(currentCCT.entityId, brightness, currentCCT.temperature, currentCCT.id);
        }
    }

    // Update temperature
    function updateTemperature(temperature) {
        if (!currentCCT) return;

        const button = document.getElementById(currentCCT.id);
        if (button) {
            button.dataset.temperature = temperature;
        }

        // Update config
        const index = cctButtons.findIndex(b => b.id === currentCCT.id);
        if (index !== -1) {
            cctButtons[index].temperature = temperature;
            saveToLocalStorage();
        }

        // Call callback
        if (callbacks.updateCCT) {
            callbacks.updateCCT(currentCCT.entityId, currentCCT.brightness, temperature, currentCCT.id);
        }

        // Update Kelvin display
        updateKelvinDisplay(temperature);
    }

    // Restore CCT buttons
    function restoreCCTButtons() {
        cctButtons.forEach(config => {
            createCCTButton(config);
        });
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close button
        if (closeCCTBtn) {
            closeCCTBtn.addEventListener('click', closeCCTModal);
        }

        // Close on overlay click
        if (cctModal) {
            cctModal.addEventListener('click', (e) => {
                if (e.target === cctModal) {
                    closeCCTModal();
                }
            });
        }

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cctModal && cctModal.style.display === 'flex') {
                closeCCTModal();
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
        }

        // Temperature slider - update display while dragging
        if (temperatureSlider) {
            temperatureSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                updateKelvinDisplay(value);
            });

            // Temperature slider - update when released
            temperatureSlider.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                updateTemperature(value);
            });
        }
    }

    // Toggle edit mode
    function enableEditMode(flag) {
        isEditMode = flag;

        cctButtons.forEach(config => {
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

        cctButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.style.left = `${config.position.x * imgWidth}px`;
                btn.style.top = `${config.position.y * imgHeight}px`;
            }
        });
    }

    // Get all CCT buttons
    function getCCTButtons() {
        return cctButtons;
    }

function updateConfig(buttonId, newConfig) {
    const index = cctButtons.findIndex(b => b.id === buttonId);
    if (index === -1) return false;

    const btnData = cctButtons[index];
    const oldEntityId = btnData.entityId;

    // ✅ UPDATE STORED DATA (CRITICAL)
    Object.assign(btnData, newConfig);

    const btn = document.getElementById(buttonId);
    if (!btn) return false;

    // ✅ ICON
    if (newConfig.iconClass) {
        const icon = btn.querySelector('.icon');
        icon.className = `icon fas ${newConfig.iconClass}`;
    }

    // ✅ NAME
    if (newConfig.name) {
        btn.dataset.name = newConfig.name;
        btn.title = newConfig.name;
    }

    // ✅ ENTITY SYNC (same as toggle)
    if (newConfig.entityId && newConfig.entityId !== oldEntityId) {

        if (oldEntityId && window.EntityButtons?.[oldEntityId]) {
            window.EntityButtons[oldEntityId] =
                window.EntityButtons[oldEntityId].filter(b => b.id !== buttonId);
        }

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
        const index = cctButtons.findIndex(b => b.id === buttonId);
        if (index !== -1) {
            cctButtons.splice(index, 1);

            const btn = document.getElementById(buttonId);
            if (btn) btn.remove();

            saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Handle state update from Home Assistant
    function handleStateUpdate(entityId, state, brightness, colorTemp) {
        const isOn = state === 'on';
        const brightnessPercent = brightness || 0;

        cctButtons.forEach(config => {
            if (config.entityId === entityId) {
                config.isOn = isOn;
                config.brightness = brightnessPercent;

                if (colorTemp !== undefined) {
                    // Convert mireds to percentage
                    const minMireds = 153;  // 6500K
                    const maxMireds = 500;  // 2000K
                    config.temperature = Math.round(((colorTemp - minMireds) / (maxMireds - minMireds)) * 100);
                }

                const btn = document.getElementById(config.id);
                if (btn) {
                    updateCCTUI(btn, brightnessPercent, isOn);
                    if (colorTemp !== undefined) {
                        btn.dataset.temperature = config.temperature;
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
        getCCTButtons,
        updateConfig,
        deleteButton,
        handleStateUpdate,
        openCCTModal,
        updateBrightness,
        updateTemperature
    };
})();