// dimmer.js - Complete dimmer module with fixed icon handling
window.DimmerModule = (function () {
    'use strict';

    // Internal state
    let dimmerButtons = [];
    let currentDimmer = null;
    let dimmerModal = null;
    let brightnessSlider = null;
    let brightnessValue = null;
    let closeDimmerBtn = null;
    let modalTitle = null;
    let callbacks = {};
    let isEditMode = false;
    let isDragging = false;
    let longPressTimer = null;
    let dragStart = { x: 0, y: 0 };
    let dragThreshold = 10;

    // Create and inject dimmer-specific styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Dimmer Button Styles */
            .light-button.dimmer {
                background: white;
                border: 1px solid #ddd;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                cursor: pointer;
            }

            .light-button.dimmer .icon {
                color: #666;
            }

            .light-button.dimmer.on {
                box-shadow: 0 0 15px rgba(255, 200, 0, 0.8);
            }

            .light-button.dimmer.on .icon {
                color: #ffcc00;
            }

            .light-button.dimmer.off .icon {
                color: #666;
            }

            /* Edit mode for dimmer */
            .edit-mode .light-button.dimmer {
                border: 2px dashed #4CAF50;
                background-color: rgba(255, 255, 255, 0.9);
                cursor: grab;
            }

            .edit-mode .light-button.dimmer:hover {
                border: 2px dashed #f44336;
            }

            .edit-mode .light-button.dimmer.dragging {
                z-index: 1000;
                border: 2px solid #f44336;
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
                cursor: grabbing;
            }
        `;
        document.head.appendChild(style);
    }

    // Create dimmer modal HTML
    function createModal() {
        if (document.getElementById('dimmerModal')) return;

        const modalHTML = `
            <div class="dimmer-modal" id="dimmerModal">
                <div class="dimmer-modal-content">
                    <div class="dimmer-modal-title-text">Brightness</div>
                    <button class="close-modal" id="closeDimmerBtn">&times;</button>
                    <div class="dimmer-brightness-container">
                        <div class="dimmer-wrapper">
                            <input type="range" min="0" max="100" value="50" 
                                   class="dimmer-brightness-slider" id="dimmerBrightnessSlider" />
                        </div>
                    </div>
                    <div class="dimmer-brightness-percentage" id="dimmerBrightnessValue">50%</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get references
        dimmerModal = document.getElementById('dimmerModal');
        brightnessSlider = document.getElementById('dimmerBrightnessSlider');
        brightnessValue = document.getElementById('dimmerBrightnessValue');
        closeDimmerBtn = document.getElementById('closeDimmerBtn');
        modalTitle = dimmerModal.querySelector('.dimmer-modal-title-text');
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

        // Load saved dimmers
        loadFromLocalStorage();

        console.log('Dimmer module initialized');
        return {
            create,
            enableEditMode,
            updatePositions,
            getDimmerButtons,
            updateConfig,
            deleteButton,
            handleStateUpdate,
            openDimmerModal,
            updateBrightness
        };
    }

    // Load from localStorage
    function loadFromLocalStorage() {
        const saved = localStorage.getItem('dimmerButtons');
        if (saved) {
            try {
                dimmerButtons = JSON.parse(saved);
                restoreDimmerButtons();
            } catch (e) {
                console.error('Error loading dimmers:', e);
                dimmerButtons = [];
            }
        }
    }

    // Save to localStorage
    function saveToLocalStorage() {
        const cleanDimmers = dimmerButtons.map(dimmer => ({
            id: dimmer.id,
            type: 'dimmer',
            entityId: dimmer.entityId || '',
            name: dimmer.name || 'Dimmer',
            iconClass: dimmer.iconClass || 'dimmer.svg',
            position: {
                x: Number(dimmer.position.x.toFixed(4)),
                y: Number(dimmer.position.y.toFixed(4))
            }
        }));

        localStorage.setItem('dimmerButtons', JSON.stringify(cleanDimmers));
    }

    // Create a dimmer button
    function create(config) {
        if (!config.id) {
            config.id = 'dimmer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Set defaults
        config.type = 'dimmer';
        config.iconClass = config.iconClass || 'dimmer.svg';
        config.name = config.name || 'Dimmer';
        config.brightness = config.brightness || 50;
        config.isOn = config.isOn || false;
        config.position = config.position || { x: 0.5, y: 0.5 };

        // Add to array
        dimmerButtons.push(config);

        // Create DOM element
        createDimmerButton(config);

        // Save
        saveToLocalStorage();

        return config.id;
    }

    function createDimmerButton(config) {
        // Remove existing if present
        const existing = document.getElementById(config.id);
        if (existing) existing.remove();

        const button = document.createElement('button');
        button.id = config.id;
        button.className = 'light-button dimmer';
        button.dataset.entityId = config.entityId;
        button.dataset.brightness = config.brightness;
        button.dataset.type = 'dimmer';
        button.dataset.icon = config.iconClass || 'dimmer.svg';

        // Create icon container
        button.innerHTML = `<div class="icon"></div>`;

        // Set SVG icon
        if (window.SVGIcons) {
            window.SVGIcons.setIconImmediately(button, config.iconClass || 'dimmer.svg');
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
        setupDimmerButtonEvents(button, config);

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

    // Setup dimmer button events (drag and click)
    function setupDimmerButtonEvents(button, config) {
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        // Mouse down handler
        button.addEventListener('mousedown', (e) => {
            if (!isEditMode) {
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
                openDimmerModal(config);
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
                const index = dimmerButtons.findIndex(b => b.id === config.id);
                if (index !== -1) {
                    dimmerButtons[index].position = {
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
    }

    // Show edit modal for dimmer
    function showEditModal(config) {
        console.log('Dimmer: Opening edit modal for:', config.id, 'type: dimmer');

        // Mark button as selected
        if (window.selectButtonForEdit) {
            window.selectButtonForEdit(config.id, 'dimmer');
        }

        // Fill the edit form
        const editEntityId = document.getElementById('editEntityId');
        const editName = document.getElementById('editName');
        const editIcon = document.getElementById('editIcon');

        if (editEntityId) editEntityId.value = config.entityId || '';
        if (editName) editName.value = config.name || 'Dimmer';
        if (editIcon) editIcon.value = config.iconClass || 'dimmer.svg';

        // Store which button we're editing
        window.currentEditingButton = config.id;
        window.currentEditingType = 'dimmer';

        // Also set in buttons module
        if (window.buttons && window.buttons.setEditingButtonId) {
            window.buttons.setEditingButtonId(config.id);
        }

        // Show modal
        const modal = document.getElementById('buttonEditModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Dimmer: Modal displayed');
        } else {
            console.error('Dimmer: Edit modal not found');
        }
    }

    // Update dimmer button UI
    function updateDimmerUI(button, brightness, isOn) {
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

    // Open dimmer modal
    function openDimmerModal(config) {
        currentDimmer = config;

        // Get current brightness
        const button = document.getElementById(config.id);
        let currentBrightness = config.brightness || 50;

        if (button && button.dataset.brightness) {
            currentBrightness = parseInt(button.dataset.brightness);
        }

        // Update modal with current brightness
        if (brightnessSlider && brightnessValue) {
            brightnessSlider.value = currentBrightness;
            brightnessValue.textContent = `${currentBrightness}%`;
        }

        // Show modal
        if (dimmerModal) {
            dimmerModal.style.display = 'flex';
            dimmerModal.style.alignItems = 'center';
            dimmerModal.style.justifyContent = 'center';
        }
    }

    // Close dimmer modal
    function closeDimmerModal() {
        if (dimmerModal) {
            dimmerModal.style.display = 'none';
        }
        currentDimmer = null;
    }

    // Update brightness
    function updateBrightness(brightness) {
        if (!currentDimmer) return;

        const button = document.getElementById(currentDimmer.id);
        if (button) {
            updateDimmerUI(button, brightness, brightness > 0);
        }

        // Update config
        const index = dimmerButtons.findIndex(b => b.id === currentDimmer.id);
        if (index !== -1) {
            dimmerButtons[index].brightness = brightness;
            dimmerButtons[index].isOn = brightness > 0;
            saveToLocalStorage();
        }

        // Call callback
        if (callbacks.updateBrightness) {
            callbacks.updateBrightness(currentDimmer.entityId, brightness, currentDimmer.id);
        }
    }

    // Restore dimmer buttons
    function restoreDimmerButtons() {
        dimmerButtons.forEach(config => {
            createDimmerButton(config);
        });
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close button
        if (closeDimmerBtn) {
            closeDimmerBtn.addEventListener('click', closeDimmerModal);
        }

        // Close on overlay click
        if (dimmerModal) {
            dimmerModal.addEventListener('click', (e) => {
                if (e.target === dimmerModal) {
                    closeDimmerModal();
                }
            });
        }

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dimmerModal && dimmerModal.style.display === 'flex') {
                closeDimmerModal();
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

            // FIXED TOUCH EVENTS for brightness slider (Dimmer)
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
    }

    // Toggle edit mode
    function enableEditMode(flag) {
        isEditMode = flag;

        dimmerButtons.forEach(config => {
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

        dimmerButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.style.left = `${config.position.x * imgWidth}px`;
                btn.style.top = `${config.position.y * imgHeight}px`;
            }
        });
    }

    // Get all dimmer buttons
    function getDimmerButtons() {
        return dimmerButtons;
    }

    // Update button config
    function updateConfig(buttonId, newConfig) {
        const index = dimmerButtons.findIndex(b => b.id === buttonId);
        if (index === -1) return false;

        const btnData = dimmerButtons[index];
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
        const index = dimmerButtons.findIndex(b => b.id === buttonId);
        if (index !== -1) {
            dimmerButtons.splice(index, 1);

            const btn = document.getElementById(buttonId);
            if (btn) btn.remove();

            saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Handle state update from Home Assistant
    function handleStateUpdate(entityId, state, brightness) {
        const brightnessPercent = brightness || 0;
        const isOn = state === 'on';

        dimmerButtons.forEach(config => {
            if (config.entityId === entityId) {
                config.isOn = isOn;
                config.brightness = brightnessPercent;

                const btn = document.getElementById(config.id);
                if (btn) {
                    updateDimmerUI(btn, brightnessPercent, isOn);
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
        getDimmerButtons,
        updateConfig,
        deleteButton,
        handleStateUpdate,
        openDimmerModal,
        updateBrightness
    };
})();