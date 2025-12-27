// lock.js - Lock Module (Without localStorage - Save in save functionality only)
window.LockModule = (function () {
    'use strict';

    // Internal state
    let lockButtons = [];
    let currentLock = null;
    let lockModal = null;
    let lockToggle = null;
    let lockStatus = null;
    let closeLockBtn = null;
    let callbacks = {};
    let isEditMode = false;
    let isDragging = false;
    let longPressTimer = null;
    let dragStart = { x: 0, y: 0 };
    let dragThreshold = 10;

    // Create and inject Lock-specific styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Lock Button Styles */
            .light-button.lock {
                width: 40px;
                height: 40px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 0;
                position: absolute;
                z-index: 100;
            }

            .light-button.lock .icon {
                width: 24px;
                height: 24px;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .light-button.lock .svg-icon {
                width: 18px;
                height: 18px;
            }

            .light-button.lock.locked {
                box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
            }

            .light-button.lock.locked .svg-icon {
                fill: #33cc33 !important;
                color: #33cc33 !important;
                stroke: #33cc33 !important;
            }

            .light-button.lock.unlocked {
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.8);
            }

            .light-button.lock.unlocked .svg-icon {
                fill: #ff3333 !important;
                color: #ff3333 !important;
                stroke: #ff3333 !important;
            }

            /* Edit mode for Lock */
            .edit-mode .light-button.lock {
                border: 2px dashed #4CAF50;
                background-color: rgba(255, 255, 255, 0.9);
                cursor: grab;
            }

            .edit-mode .light-button.lock:hover {
                border: 2px dashed #f44336;
            }

            .edit-mode .light-button.lock.dragging {
                z-index: 1000;
                border: 2px solid #f44336;
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
                cursor: grabbing;
            }

            /* Lock Modal Styles */
            .lock-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }

            .lock-modal-content {
                
                background-color: rgba(255, 255, 255, var(--dimmer-content-opacity, 0.95));
                border-radius: 12px;
                width: 350px;
                height: 350px;
                padding: 20px 15px;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .lock-modal .close-modal {
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

            .lock-modal .close-modal:hover {
                color: #ff3333;
            }

            .lock-switch-container {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: -30px;
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

            /* Compact Lock switch styling */
            .lock-switch {
                width: 70px;
                height: 140px;
                display: block;
                position: relative;
                cursor: pointer;
            }
            
            .lock-switch input {
                display: none;
            }
            
            .lock-switch input + span {
                width: 70px;
                height: 140px;
                display: block;
                position: relative;
                vertical-align: middle;
                white-space: nowrap;
                transition: color 0.3s ease;
            }
            
            .lock-switch input + span:before,
            .lock-switch input + span:after {
                content: "";
                display: block;
                position: absolute;
                border-radius: 35px;
            }
            
            /* Base color - RED for UNLOCKED (unchecked) */
            .lock-switch input + span:before {
                top: 0;
                left: 0;
                width: 70px;
                height: 140px;
                border-radius: 8px;
                background: #ff9c9c;
                transition: all 0.3s ease;
            }
            
            /* GREEN for LOCKED (checked) */
            .lock-switch input:checked + span:before {
                background: #8eff98;
            }
            
            /* Handle position */
            .lock-switch input + span:after {
                width: 58px;
                height: 58px;
                background: #ffffff;
                border-radius: 8px;
                top: 76px;
                left: 6px;
                box-shadow: 0 3px 8px rgba(18, 22, 33, 0.2);
                transition: all 0.45s ease;
            }
            
            /* UP position - LOCKED (green) */
            .lock-switch input:checked + span:after {
                background: #fff;
                transform: translate(0, -70px);
            }
            
            /* Lock icon styling */
            .lock-switch input + span em {
                width: 24px;
                height: 20px;
                background: #f80000;
                position: absolute;
                left: 23px;
                bottom: 20px;
                border-radius: 6px;
                display: block;
                z-index: 1;
                transition: all 0.45s ease;
            }
            
            .lock-switch input + span em:before {
                content: "";
                width: 6px;
                height: 6px;
                border-radius: 3px;
                background: #ffffff;
                position: absolute;
                display: block;
                left: 50%;
                top: 50%;
                margin: -3px 0 0 -3px;
            }
            
            .lock-switch input + span em:after {
                content: "";
                display: block;
                border-top-left-radius: 12px;
                border-top-right-radius: 12px;
                border: 3px solid #f60000;
                border-bottom: 0;
                width: 18px;
                height: 12px;
                left: 3px;
                bottom: 17px;
                position: absolute;
                z-index: 1;
                transform-origin: 0 100%;
                transition: all 0.45s ease;
                transform: rotate(-35deg) translate(0, 3px);
            }
            
            /* GREEN for LOCKED */
            .lock-switch input:checked + span em {
                transform: translate(0, -70px);
                background: #02923c;
            }
            
            .lock-switch input:checked + span em:after {
                border-color: #02923c;
                transform: rotate(0deg) translate(0, 0);
            }
            
            .lock-switch :before,
            .lock-switch :after {
                box-sizing: border-box;
            }

            .lock-status {
                font-size: 14px;
                margin-top: 10px;
                color: #333;
                font-family: Arial, sans-serif;
                text-align: center;
                font-weight: bold;
                position: absolute;
                bottom: 15px;
                width: 100%;
                left: 0;
            }

            .lock-status.locked {
                color: #33cc33;
            }

            .lock-status.unlocked {
                color: #ff3333;
            }
        `;
        document.head.appendChild(style);
    }

    // Create Lock modal HTML
    function createModal() {
        if (document.getElementById('lockModal')) return;

        const modalHTML = `
            <div class="lock-modal" id="lockModal">
                <div class="lock-modal-content">
                    <div class="modal-title-text">Lock Control</div>
                    <button class="close-modal" id="closeLockBtn">&times;</button>
                    
                    <div class="lock-switch-container">
                        <label class="lock-switch" id="lockSwitch">
                            <input type="checkbox" id="lockToggle" />
                            <span>
                                <em></em>
                            </span>
                        </label>
                    </div>

                    <div class="lock-status" id="lockStatus">LOCKED</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get references
        lockModal = document.getElementById('lockModal');
        lockToggle = document.getElementById('lockToggle');
        lockStatus = document.getElementById('lockStatus');
        closeLockBtn = document.getElementById('closeLockBtn');
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

        console.log('Lock module initialized');
        return {
            create,
            enableEditMode,
            updatePositions,
            getLockButtons,
            updateConfig,
            deleteButton,
            handleStateUpdate,
            openLockModal,
            updateLockState,
            closeLockModal,
            saveAllLocks,  // NEW: Save functionality
            loadAllLocks   // NEW: Load functionality
        };
    }

    // Create a lock button
    function create(config) {
        if (!config.id) {
            config.id = 'lock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Set defaults
        config.type = 'lock';
        config.iconClass = config.iconClass || 'lock.svg';
        config.name = config.name || 'Lock';
        config.isLocked = config.isLocked !== undefined ? config.isLocked : true;
        config.position = config.position || { x: 0.5, y: 0.5 };

        // Add to array
        lockButtons.push(config);

        // Create DOM element
        createLockButton(config);

        return config.id;
    }

    function createLockButton(config) {
        // Remove existing if present
        const existing = document.getElementById(config.id);
        if (existing) existing.remove();

        const button = document.createElement('button');
        button.id = config.id;
        button.className = 'light-button lock';
        button.dataset.entityId = config.entityId || '';
        button.dataset.type = 'lock';
        button.dataset.icon = config.iconClass || 'lock.svg';
        button.dataset.name = config.name || 'Lock';
        button.title = config.name || 'Lock';

        // Create icon container
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon';
        button.appendChild(iconDiv);

        // Set SVG icon
        if (window.SVGIcons) {
            window.SVGIcons.setIconImmediately(button, config.iconClass || 'lock.svg');
        }

        // Set initial state
        updateLockUI(button, config.isLocked);

        // Add event listeners
        setupLockButtonEvents(button, config);

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

    // Setup lock button events (drag and click)
    function setupLockButtonEvents(button, config) {
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
                openLockModal(config);
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

            // Update config position
            const img = document.getElementById('viewImage');
            if (img) {
                const imgRect = img.getBoundingClientRect();
                const buttonRect = button.getBoundingClientRect();

                // Convert to relative position
                const relativeX = (buttonRect.left + buttonRect.width / 2 - imgRect.left) / imgRect.width;
                const relativeY = (buttonRect.top + buttonRect.height / 2 - imgRect.top) / imgRect.height;

                // Update config
                const index = lockButtons.findIndex(b => b.id === config.id);
                if (index !== -1) {
                    lockButtons[index].position = {
                        x: Math.max(0, Math.min(1, relativeX)),
                        y: Math.max(0, Math.min(1, relativeY))
                    };
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
        if (currentLock) {
            const btn = document.getElementById(currentLock.id);
            if (btn) btn.classList.remove('selected');
        }

        // Reset all lock buttons cursor
        lockButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.classList.remove('dragging');
                btn.style.cursor = 'grab';
            }
        });
    }

    // Show edit modal for lock
    function showEditModal(config) {
        console.log('Lock: Opening edit modal for:', config.id, 'type: lock');

        // Mark button as selected
        if (window.selectButtonForEdit) {
            window.selectButtonForEdit(config.id, 'lock');
        }

        // Fill the edit form
        const editEntityId = document.getElementById('editEntityId');
        const editName = document.getElementById('editName');
        const editIcon = document.getElementById('editIcon');

        if (editEntityId) editEntityId.value = config.entityId || '';
        if (editName) editName.value = config.name || 'Lock';
        if (editIcon) editIcon.value = config.iconClass || 'lock.svg';

        // Store which button we're editing
        window.currentEditingButton = config.id;
        window.currentEditingType = 'lock';

        // Show modal
        const modal = document.getElementById('buttonEditModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Lock: Modal displayed');
        } else {
            console.error('Lock: Edit modal not found');
        }
    }

    // Update lock UI
    function updateLockUI(button, isLocked) {
        if (!button) return;

        // Update button classes
        if (isLocked) {
            button.classList.remove('unlocked');
            button.classList.add('locked');
        } else {
            button.classList.remove('locked');
            button.classList.add('unlocked');
        }

        // Direct SVG color update
        const svgIcon = button.querySelector('.svg-icon');
        if (svgIcon) {
            if (isLocked) {
                // Green for locked
                svgIcon.style.fill = '#33cc33';
                svgIcon.style.color = '#33cc33';
                svgIcon.style.stroke = '#33cc33';
            } else {
                // Red for unlocked
                svgIcon.style.fill = '#ff3333';
                svgIcon.style.color = '#ff3333';
                svgIcon.style.stroke = '#ff3333';
            }
        }

        // Update modal checkbox if modal is open
        if (lockModal && lockModal.style.display === 'flex' && 
            currentLock && currentLock.id === button.id && lockToggle) {
            lockToggle.checked = isLocked;
            updateModalUI(isLocked);
        }
    }

    // Open lock modal
    function openLockModal(config) {
        currentLock = config;

        // Get current state
        const button = document.getElementById(config.id);
        let currentState = config.isLocked !== undefined ? config.isLocked : true;

        if (button) {
            currentState = button.classList.contains('locked');
        }

        // Update modal with current values
        if (lockToggle && lockStatus) {
            lockToggle.checked = currentState;
            updateModalUI(currentState);
        }

        // Show modal
        if (lockModal) {
            lockModal.style.display = 'flex';
        }
    }

    // Update modal UI
    function updateModalUI(isLocked) {
        if (isLocked) {
            lockStatus.textContent = "LOCKED";
            lockStatus.className = "lock-status locked";
        } else {
            lockStatus.textContent = "UNLOCKED";
            lockStatus.className = "lock-status unlocked";
        }
    }

    // Close lock modal
    function closeLockModal() {
        if (lockModal) {
            lockModal.style.display = 'none';
        }
        currentLock = null;
    }

    // Update lock state
    function updateLockState(isLocked) {
        if (!currentLock) return;

        const button = document.getElementById(currentLock.id);
        if (button) {
            updateLockUI(button, isLocked);
        }

        // Update config
        const index = lockButtons.findIndex(b => b.id === currentLock.id);
        if (index !== -1) {
            lockButtons[index].isLocked = isLocked;
        }

        // Call callback
        if (callbacks.updateLock) {
            callbacks.updateLock(currentLock.entityId, isLocked, currentLock.id);
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close button
        if (closeLockBtn) {
            closeLockBtn.addEventListener('click', closeLockModal);
        }

        // Close on overlay click
        if (lockModal) {
            lockModal.addEventListener('click', (e) => {
                if (e.target === lockModal) {
                    closeLockModal();
                }
            });
        }

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lockModal && lockModal.style.display === 'flex') {
                closeLockModal();
            }
        });

        // Lock toggle
        if (lockToggle) {
            const lockSwitch = document.getElementById('lockSwitch');

            lockToggle.addEventListener('change', (e) => {
                const isLocked = e.target.checked;
                updateLockState(isLocked);
                updateModalUI(isLocked);
            });

            // Handle click on switch label
            if (lockSwitch) {
                lockSwitch.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Toggle the checkbox state
                    lockToggle.checked = !lockToggle.checked;

                    // Trigger change event
                    lockToggle.dispatchEvent(new Event('change'));
                });
            }
        }
    }

    // Toggle edit mode
    function enableEditMode(flag) {
        isEditMode = flag;

        lockButtons.forEach(config => {
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

        lockButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.style.left = `${config.position.x * imgWidth}px`;
                btn.style.top = `${config.position.y * imgHeight}px`;
            }
        });
    }

    // Get all lock buttons
    function getLockButtons() {
        return lockButtons;
    }

    // Update button config
    function updateConfig(buttonId, newConfig) {
        const index = lockButtons.findIndex(b => b.id === buttonId);
        if (index === -1) return false;

        const btnData = lockButtons[index];
        const oldEntityId = btnData.entityId;

        // Update stored data
        Object.assign(btnData, newConfig);

        const btn = document.getElementById(buttonId);
        if (!btn) return false;

        // Update button properties
        if (newConfig.iconClass) {
            btn.dataset.icon = newConfig.iconClass;
            if (window.SVGIcons) {
                window.SVGIcons.setIconImmediately(btn, newConfig.iconClass);
                // Update color
                setTimeout(() => updateLockUI(btn, btnData.isLocked), 50);
            }
        }

        if (newConfig.name) {
            btn.dataset.name = newConfig.name;
            btn.title = newConfig.name;
        }

        if (newConfig.entityId && newConfig.entityId !== oldEntityId) {
            btn.dataset.entityId = newConfig.entityId;
            
            // Register with EntityButtons system
            if (!window.EntityButtons) window.EntityButtons = {};
            if (!window.EntityButtons[newConfig.entityId]) {
                window.EntityButtons[newConfig.entityId] = [];
            }
            
            // Remove from old entity
            if (oldEntityId && window.EntityButtons[oldEntityId]) {
                window.EntityButtons[oldEntityId] = window.EntityButtons[oldEntityId]
                    .filter(b => b.id !== buttonId);
            }
            
            // Add to new entity
            window.EntityButtons[newConfig.entityId].push({
                id: buttonId,
                type: 'lock',
                updateUI: (state) => handleStateUpdate(newConfig.entityId, state)
            });
        }

        return true;
    }

    // Delete button
    function deleteButton(buttonId) {
        const index = lockButtons.findIndex(b => b.id === buttonId);
        if (index !== -1) {
            lockButtons.splice(index, 1);

            const btn = document.getElementById(buttonId);
            if (btn) btn.remove();

            return true;
        }
        return false;
    }

    // Handle state update from Home Assistant
    function handleStateUpdate(entityId, state) {
        const isLocked = state === 'locked';
        console.log(`Lock module: State update for ${entityId}: ${state}, isLocked: ${isLocked}`);

        // Find all buttons with this entityId
        lockButtons.forEach(config => {
            if (config.entityId === entityId) {
                config.isLocked = isLocked;

                const btn = document.getElementById(config.id);
                if (btn) {
                    updateLockUI(btn, isLocked);
                }
            }
        });

        // Update modal if it's open for this entity
        if (lockModal && lockModal.style.display === 'flex' && 
            currentLock && currentLock.entityId === entityId && lockToggle) {
            console.log(`Updating modal checkbox for ${entityId} to ${isLocked}`);
            lockToggle.checked = isLocked;
            updateModalUI(isLocked);
        }
    }

    // NEW: Save all locks (called from save functionality)
    function saveAllLocks() {
        const cleanLocks = lockButtons.map(lock => ({
            id: lock.id,
            type: 'lock',
            entityId: lock.entityId || '',
            name: lock.name || 'Lock',
            iconClass: lock.iconClass || 'lock.svg',
            position: {
                x: Number(lock.position.x.toFixed(4)),
                y: Number(lock.position.y.toFixed(4))
            },
            isLocked: lock.isLocked || true
        }));

        return cleanLocks;
    }

    // NEW: Load all locks (called from load functionality)
    function loadAllLocks(savedLocks) {
        if (!Array.isArray(savedLocks)) return;

        // Clear existing
        lockButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) btn.remove();
        });

        lockButtons = [];

        // Create new locks from saved data
        savedLocks.forEach(config => {
            if (config.type === 'lock') {
                create(config);
            }
        });
    }

    // Public API
    return {
        init,
        create,
        enableEditMode,
        updatePositions,
        getLockButtons,
        updateConfig,
        deleteButton,
        handleStateUpdate,
        openLockModal,
        updateLockState,
        closeLockModal,
        saveAllLocks,  // Export save function
        loadAllLocks   // Export load function
    };
})();