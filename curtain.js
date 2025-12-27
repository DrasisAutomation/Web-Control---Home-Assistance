// curtain.js - Curtain Module (Fixed to show actual entity value)
window.CurtainModule = (function () {
    'use strict';

    // Internal state
    let curtainButtons = [];
    let currentCurtain = null;
    let curtainModal = null;
    let positionSlider = null;
    let positionValue = null;
    let closeCurtainBtn = null;
    let callbacks = {};
    let isEditMode = false;
    let isDragging = false;
    let longPressTimer = null;
    let dragStart = { x: 0, y: 0 };
    let dragThreshold = 10;

    // Create and inject Curtain-specific styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Curtain Button Styles */
            .light-button.curtain {
                background: white;
                border: 1px solid #ddd;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                cursor: pointer;
            }

            .light-button.curtain .icon {
                color: #666;
            }

            .light-button.curtain.on {
                box-shadow: 0 0 15px rgba(0, 123, 255, 0.8);
            }

            .light-button.curtain.on .icon {
                color: #007bff;
            }

            .light-button.curtain.off .icon {
                color: #666;
            }

            /* Edit mode for Curtain */
            .edit-mode .light-button.curtain {
                border: 2px dashed #4CAF50;
                background-color: rgba(255, 255, 255, 0.9);
                cursor: grab;
            }

            .edit-mode .light-button.curtain:hover {
                border: 2px dashed #f44336;
            }

            .edit-mode .light-button.curtain.dragging {
                z-index: 1000;
                border: 2px solid #f44336;
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
                cursor: grabbing;
            }

            /* Curtain Modal Styles */
            .curtain-modal {
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

            .curtain-modal-content {
                background-color: rgba(255, 255, 255, var(--dimmer-content-opacity, 0.95));
                border-radius: 12px;
                width: 400px;
                height: 400px;
                padding: 20px 15px;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: auto;
                margin: 15px;
            }

            .curtain-modal .close-modal {
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

            .curtain-modal .close-modal:hover {
                color: #000000;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 50%;
            }

            .curtain-container {
                width: 100%;
                height: 100%;
                margin-top: -15px;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .curtain-wrapper {
                position: relative;
                height: 20rem;
                width: 3rem;
            }

            /* No plus and minus signs */
            .curtain-wrapper::before,
            .curtain-wrapper::after {
                display: none;
            }

            input[type="range"].curtain-position-slider {
                -webkit-appearance: none;
                background-color: rgba(0, 123, 255, 0.3);
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

            .curtain-position-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 0;
                box-shadow: -20rem 0 0 20rem rgba(0, 123, 255, 0.7);
            }

            .curtain-position-slider::-moz-range-thumb {
                width: 0;
                box-shadow: -20rem 0 0 20rem rgba(0, 123, 255, 0.7);
                border: none;
            }

            /* Position percentage display at bottom */
            .curtain-position-percentage {
                position: absolute;
                bottom: 10px;
                left: 0;
                width: 100%;
                text-align: center;
                color: #000000;
                font-size: 15px;
                font-family: Arial, sans-serif;
            }

            .modal-title-text {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
                color: black;
                font-family: Arial, sans-serif;
                width: 100%;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }

    // Create Curtain modal HTML - FIXED: Remove hardcoded 50%
    function createModal() {
        if (document.getElementById('curtainModal')) return;

        const modalHTML = `
            <div class="curtain-modal" id="curtainModal">
                <div class="curtain-modal-content">
                    <div class="modal-title-text" id="curtainModalTitle">Curtain Controls</div>
                    <button class="close-modal" id="closeCurtainBtn">&times;</button>
                    
                    <div class="curtain-container">
                        <div class="curtain-wrapper">
                            <input type="range" min="0" max="100"  
                                   class="curtain-position-slider" id="curtainPositionSlider" />
                        </div>
                    </div>

                    <div class="curtain-position-percentage" id="curtainPositionValue"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get references
        curtainModal = document.getElementById('curtainModal');
        positionSlider = document.getElementById('curtainPositionSlider');
        positionValue = document.getElementById('curtainPositionValue');
        closeCurtainBtn = document.getElementById('closeCurtainBtn');

        // Initialize to empty (will be set by entity value)
        if (positionValue) {
            positionValue.textContent = '';
        }
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

        console.log('Curtain module initialized');

        // 🔁 Request initial HA state sync
        setTimeout(() => {
            curtainButtons.forEach(cfg => {
                if (cfg.entityId) {
                    // Request state from HA
                    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
                        window.ws.send(JSON.stringify({
                            id: Date.now(),
                            type: "get_states"
                        }));
                    }
                }
            });
        }, 500);

        return {
            create,
            enableEditMode,
            updatePositions,
            getCurtainButtons,
            updateConfig,
            deleteButton,
            handleStateUpdate,
            openCurtainModal,
            updatePosition
        };
    }

    // Create a curtain button - FIXED VERSION
    function create(config) {
        if (!config.id) {
            config.id = 'curtain_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Set defaults - Use actual position from entity or 0
        config.type = 'curtain';
        config.iconClass = config.iconClass || 'curtain1.svg';
        config.name = config.name || 'Curtain';

        // IMPORTANT: Use entity value if provided, otherwise 0
        config.currentPosition = typeof config.currentPosition === 'number'
            ? config.currentPosition
            : 0; // Changed from 50 to 0

        config.isOpen = config.currentPosition > 0; // Correctly set isOpen based on position
        config.position = config.position || { x: 0.5, y: 0.5 };

        // Add to array
        curtainButtons.push(config);

        // Create DOM element
        createCurtainButton(config);

        return config.id;
    }

    function createCurtainButton(config) {
        // Remove existing if present
        const existing = document.getElementById(config.id);
        if (existing) existing.remove();

        const button = document.createElement('button');
        button.id = config.id;
        button.className = 'light-button curtain';
        button.dataset.entityId = config.entityId;
        button.dataset.position = config.currentPosition || 0;
        button.dataset.type = 'curtain';
        button.dataset.icon = config.iconClass || 'curtain1.svg';
        button.title = config.name || 'Curtain';

        // Create icon container
        button.innerHTML = `<div class="icon"></div>`;

        // Set SVG icon
        if (window.SVGIcons) {
            window.SVGIcons.setIconImmediately(button, config.iconClass || 'curtain1.svg');
        }

        // Set initial state - Use actual position
        const initialPosition = config.currentPosition || 0;
        updateCurtainUI(button, initialPosition, initialPosition > 0);

        // Add event listeners
        setupCurtainButtonEvents(button, config);

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
    // Fix existing curtains with position 50
    function fixExistingCurtains() {
        curtainButtons.forEach(config => {
            if (config.currentPosition === 50 && !config.entityId) {
                // This is likely a default value, set to 0
                config.currentPosition = 0;
                config.isOpen = false;

                const btn = document.getElementById(config.id);
                if (btn) {
                    updateCurtainUI(btn, 0, false);
                }
            }
        });
    }

    // Call this after initialization
    setTimeout(fixExistingCurtains, 1000);

    // Setup curtain button events (drag and click)
    function setupCurtainButtonEvents(button, config) {
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

                if ((moveX > dragThreshold || moveY > dragThreshold) && longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                    startDrag(moveEvent, button, config);

                    document.removeEventListener('mousemove', mouseMoveHandler);
                }
            };

            document.addEventListener('mousemove', mouseMoveHandler);

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
                openCurtainModal(config);
            }
        });

        // Touch events
        button.addEventListener('touchstart', (e) => {
            if (!isEditMode) return;

            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;

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

        const dragMoveHandler = (moveEvent) => {
            if (!isDragging) return;

            const clientX = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const clientY = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const deltaX = clientX - startDragX;
            const deltaY = clientY - startDragY;

            button.style.left = `${originalLeft + deltaX}px`;
            button.style.top = `${originalTop + deltaY}px`;

            moveEvent.preventDefault();
        };

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

                const relativeX = (buttonRect.left + buttonRect.width / 2 - imgRect.left) / imgRect.width;
                const relativeY = (buttonRect.top + buttonRect.height / 2 - imgRect.top) / imgRect.height;

                const index = curtainButtons.findIndex(b => b.id === config.id);
                if (index !== -1) {
                    curtainButtons[index].position = {
                        x: Math.max(0, Math.min(1, relativeX)),
                        y: Math.max(0, Math.min(1, relativeY))
                    };
                }
            }

            document.removeEventListener('mousemove', dragMoveHandler);
            document.removeEventListener('touchmove', dragMoveHandler);
            document.removeEventListener('mouseup', dragEndHandler);
            document.removeEventListener('touchend', dragEndHandler);
        };

        document.addEventListener('mousemove', dragMoveHandler);
        document.addEventListener('touchmove', dragMoveHandler, { passive: false });
        document.addEventListener('mouseup', dragEndHandler);
        document.addEventListener('touchend', dragEndHandler);
    }

    // Stop dragging
    function stopDrag() {
        isDragging = false;

        if (currentCurtain) {
            const btn = document.getElementById(currentCurtain.id);
            if (btn) btn.classList.remove('selected');
        }

        curtainButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.classList.remove('dragging');
                btn.style.cursor = 'grab';
            }
        });
    }

    // Show edit modal for curtain
    function showEditModal(config) {
        console.log('Curtain: Opening edit modal for:', config.id, 'type: curtain');

        if (window.selectButtonForEdit) {
            window.selectButtonForEdit(config.id, 'curtain');
        }

        const editEntityId = document.getElementById('editEntityId');
        const editName = document.getElementById('editName');
        const editIcon = document.getElementById('editIcon');

        if (editEntityId) editEntityId.value = config.entityId || '';
        if (editName) editName.value = config.name || 'Curtain';
        if (editIcon) editIcon.value = config.iconClass || 'curtain1.svg';

        window.currentEditingButton = config.id;
        window.currentEditingType = 'curtain';

        if (window.buttons && window.buttons.setEditingButtonId) {
            window.buttons.setEditingButtonId(config.id);
        }

        const modal = document.getElementById('buttonEditModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Curtain: Modal displayed');
        } else {
            console.error('Curtain: Edit modal not found');
        }
    }

    // Update curtain button UI
    function updateCurtainUI(button, position, isOpen) {
        if (!button) return;

        button.dataset.position = position;

        if (isOpen && position > 0) {
            button.classList.add('on');
            button.classList.remove('off');
        } else {
            button.classList.remove('on');
            button.classList.add('off');
        }

        if (window.SVGIcons && window.SVGIcons.updateIconColor) {
            window.SVGIcons.updateIconColor(button);
        }
    }

// Open curtain modal - UPDATED WITH HARD OVERRIDE
function openCurtainModal(config) {
    currentCurtain = config;

    // Get current position from config
    let currentPosition = config.currentPosition || 0;
    
    // HARD OVERRIDE - If position is 0, keep it at 0
    if (currentPosition === 0) {
        currentPosition = 0;
    }
    
    console.log('Opening curtain modal with hard override - position:', currentPosition);

    // Also check button dataset as backup
    const button = document.getElementById(config.id);
    if (button && button.dataset.position) {
        const buttonPos = parseInt(button.dataset.position, 10);
        if (!isNaN(buttonPos)) {
            currentPosition = buttonPos;
            // HARD OVERRIDE AGAIN
            if (currentPosition === 0) currentPosition = 0;
        }
    }

    // ABSOLUTE HARD OVERRIDE - NEVER use 50 when it should be 0
    if (currentPosition === 50 && config.currentPosition === 0) {
        currentPosition = 0;
        console.log('Hard override: 50 changed to 0');
    }

    // Update modal with HARD OVERRIDE values
    if (positionSlider) {
        positionSlider.value = currentPosition;
        console.log('Slider initially set to:', currentPosition);
    }
    if (positionValue) {
        positionValue.textContent = `${currentPosition}%`;
    }

    // Update modal title
    const modalTitle = document.getElementById('curtainModalTitle');
    if (modalTitle) {
        modalTitle.textContent = `${config.name || 'Curtain'} Controls`;
    }

    // Show modal
    if (curtainModal) {
        curtainModal.style.display = 'flex';
        curtainModal.style.alignItems = 'center';
        curtainModal.style.justifyContent = 'center';
    }

    // Request fresh state from HA
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({
            id: Date.now(),
            type: "get_states"
        }));
    }
}


    // Close curtain modal
    function closeCurtainModal() {
        if (curtainModal) {
            curtainModal.style.display = 'none';
        }
        currentCurtain = null;
    }

    function updatePosition(position) {
        if (!currentCurtain) return;

        console.log('Curtain updatePosition called with:', position);

        // HARD OVERRIDE FOR ZERO - If position is 0, force it to stay 0
        const validPosition = (parseInt(position) === 0) ? 0 : Math.max(0, Math.min(100, parseInt(position) || 0));

        console.log('Hard override - final position:', validPosition);

        const button = document.getElementById(currentCurtain.id);
        const isOpen = validPosition > 0;

        if (button) {
            updateCurtainUI(button, validPosition, isOpen);
        }

        // Update config
        const index = curtainButtons.findIndex(b => b.id === currentCurtain.id);
        if (index !== -1) {
            curtainButtons[index].currentPosition = validPosition;
            curtainButtons[index].isOpen = isOpen;
        }

        // FORCE SLIDER TO MATCH THE VALUE
        if (positionSlider) {
            positionSlider.value = validPosition;
            console.log('Slider forced to:', validPosition);
        }
        if (positionValue) {
            positionValue.textContent = `${validPosition}%`;
        }

        // Call callback to update Home Assistant entity
        if (callbacks.updateCurtain) {
            callbacks.updateCurtain(currentCurtain.entityId, validPosition, currentCurtain.id);
        }
    }


function setupEventListeners() {
    // Close button
    if (closeCurtainBtn) {
        closeCurtainBtn.addEventListener('click', closeCurtainModal);
    }

    // Close on overlay click
    if (curtainModal) {
        curtainModal.addEventListener('click', (e) => {
            if (e.target === curtainModal) {
                closeCurtainModal();
            }
        });
    }

    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && curtainModal && curtainModal.style.display === 'flex') {
            closeCurtainModal();
        }
    });

    // Position slider - update display while dragging WITH HARD OVERRIDE
    if (positionSlider) {
        positionSlider.addEventListener('input', (e) => {
            const rawValue = parseInt(e.target.value);
            // HARD OVERRIDE - if value is exactly 0, keep it as 0
            const value = (rawValue === 0) ? 0 : rawValue;
            
            if (positionValue) {
                positionValue.textContent = `${value}%`;
            }
            console.log('Slider input - value:', value);
        });

        // Position slider - update when released WITH HARD OVERRIDE
        positionSlider.addEventListener('change', (e) => {
            const rawValue = parseInt(e.target.value);
            // HARD OVERRIDE - if value is exactly 0, keep it as 0
            const value = (rawValue === 0) ? 0 : rawValue;
            
            console.log('Slider change - calling updatePosition with:', value);
            updatePosition(value);
        });

        // FIXED TOUCH EVENTS for position slider WITH HARD OVERRIDE
        positionSlider.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            const touch = e.touches[0];
            const rect = positionSlider.getBoundingClientRect();
            const relativeY = touch.clientY - rect.top;
            const percent = relativeY / rect.height;

            // Calculate value
            const rawValue = Math.round((1 - percent) * 100);
            // HARD OVERRIDE - if value is exactly 0, keep it as 0
            const value = (rawValue === 0) ? 0 : Math.max(0, Math.min(100, rawValue));

            console.log('Curtain touchstart - calculated value:', value);

            // Set the actual calculated value with HARD OVERRIDE
            positionSlider.value = value;
            if (positionValue) {
                positionValue.textContent = `${value}%`;
            }
        }, { passive: false });

        positionSlider.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            const rect = positionSlider.getBoundingClientRect();
            const relativeY = touch.clientY - rect.top;
            const percent = relativeY / rect.height;

            const rawValue = Math.round((1 - percent) * 100);
            // HARD OVERRIDE - if value is exactly 0, keep it as 0
            const value = (rawValue === 0) ? 0 : Math.max(0, Math.min(100, rawValue));

            // Set the actual calculated value with HARD OVERRIDE
            positionSlider.value = value;
            if (positionValue) {
                positionValue.textContent = `${value}%`;
            }
        }, { passive: false });

        positionSlider.addEventListener('touchend', (e) => {
            const rawValue = parseInt(positionSlider.value);
            // HARD OVERRIDE - if value is exactly 0, keep it as 0
            const value = (rawValue === 0) ? 0 : rawValue;
            
            console.log('Curtain touchend - sending value with override:', value);
            updatePosition(value);
        }, { passive: true });
        
        // ADD LOAD EVENT TO ENSURE INITIAL VALUE IS CORRECT
        window.addEventListener('load', function() {
            if (currentCurtain && positionSlider) {
                const currentPos = currentCurtain.currentPosition || 0;
                // HARD OVERRIDE ON LOAD
                if (currentPos === 0) {
                    positionSlider.value = 0;
                    if (positionValue) {
                        positionValue.textContent = '0%';
                    }
                }
            }
        });
    }
}

    // Toggle edit mode
    function enableEditMode(flag) {
        isEditMode = flag;

        curtainButtons.forEach(config => {
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
    }

    // Update positions (called when image zooms/pans)
    function updatePositions() {
        const img = document.getElementById('viewImage');
        if (!img) return;

        const imgWidth = img.clientWidth;
        const imgHeight = img.clientHeight;

        curtainButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.style.left = `${config.position.x * imgWidth}px`;
                btn.style.top = `${config.position.y * imgHeight}px`;
            }
        });
    }

    // Get all curtain buttons
    function getCurtainButtons() {
        return curtainButtons;
    }

    // Update button config
    function updateConfig(buttonId, newConfig) {
        const index = curtainButtons.findIndex(b => b.id === buttonId);
        if (index === -1) return false;

        const btnData = curtainButtons[index];
        const oldEntityId = btnData.entityId;

        Object.assign(btnData, newConfig);

        const btn = document.getElementById(buttonId);
        if (!btn) return false;

        // ICON UPDATE
        if (newConfig.iconClass) {
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
                type: 'curtain',
                handleStateUpdate: function (state, position) {
                    // This will be called when HA state updates
                }
            };

            window.EntityButtons[newConfig.entityId].push(entityButton);
            btn.dataset.entityId = newConfig.entityId;
        }

        return true;
    }

    // Delete button
    function deleteButton(buttonId) {
        const index = curtainButtons.findIndex(b => b.id === buttonId);
        if (index !== -1) {
            const button = curtainButtons[index];

            if (button.entityId && window.EntityButtons?.[button.entityId]) {
                window.EntityButtons[button.entityId] =
                    window.EntityButtons[button.entityId].filter(b => b.id !== buttonId);
            }

            curtainButtons.splice(index, 1);

            const btn = document.getElementById(buttonId);
            if (btn) btn.remove();

            return true;
        }
        return false;
    }

    function handleStateUpdate(entityId, state, position) {
        console.log('Curtain HA state update:', entityId, 'position:', position, 'state:', state);

        // HARD OVERRIDE - If position is 0 or state is 'closed', force position to 0
        let currentPosition = 0;
        if (typeof position === 'number') {
            currentPosition = (position === 0) ? 0 : Math.max(0, Math.min(100, position));
        }

        // Additional check based on state string
        if (state === 'closed' || state === 'off') {
            currentPosition = 0;
        }

        const isOpen = currentPosition > 0 || state === 'open' || state === 'on';

        console.log('Hard override applied - final position:', currentPosition);

        curtainButtons.forEach(config => {
            if (config.entityId === entityId) {
                // ALWAYS update from HA state with hard override
                config.currentPosition = currentPosition;
                config.isOpen = isOpen;

                const btn = document.getElementById(config.id);
                if (btn) {
                    updateCurtainUI(btn, currentPosition, isOpen);

                    // If this curtain's modal is open, update the slider with HARD OVERRIDE
                    if (curtainModal &&
                        curtainModal.style.display === 'flex' &&
                        currentCurtain &&
                        currentCurtain.entityId === entityId) {
                        if (positionSlider) {
                            // FORCE the slider to show the actual value (0 if 0)
                            positionSlider.value = currentPosition;
                            console.log('Modal slider forced to:', currentPosition);
                        }
                        if (positionValue) {
                            positionValue.textContent = `${currentPosition}%`;
                        }
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
        getCurtainButtons,
        updateConfig,
        deleteButton,
        handleStateUpdate,
        openCurtainModal,
        updatePosition
    };
})();