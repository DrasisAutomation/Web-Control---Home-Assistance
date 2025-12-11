// buttons.js - Button management module
window.buttons = (function () {
    // Internal state
    let lightButtons = [];
    let panElement = null;
    let getImageMetaFn = null;
    let callbacks = {};
    let isEditMode = false;
    let currentDraggingButton = null;
    let isDraggingButton = false;
    let dragStart = { x: 0, y: 0 };
    let panStart = { x: 0, y: 0 };
    let longPressTimer = null;
    let editingButtonId = null;
    let dragThreshold = 10; // Minimum movement to consider it a drag

    // Button types configuration
    const BUTTON_TYPES = {
        toggle: {
            name: 'Toggle Light',
            icon: 'fa-lightbulb',
            defaultName: 'Light',
            type: 'toggle'
        },
        scene: {
            name: 'Scene',
            icon: 'fa-palette',
            defaultName: 'Scene',
            type: 'scene'
        },
        dimmer: {
            name: 'Dimmer',
            icon: 'fa-sliders-h',
            defaultName: 'Dimmer',
            type: 'dimmer'
        }
    };

    // Initialize the module
    function init(panEl, imageMetaFn, cb) {
        panElement = panEl;
        getImageMetaFn = imageMetaFn;
        callbacks = cb || {};

        // Load saved positions from localStorage
        loadFromLocalStorage();
        setupModalListeners();

        return {
            enableEditMode,
            create,
            save,
            load,
            getButtons,
            updateButtonConfig,
            deleteButton,
            updateButtonPositions
        };
    }

    // Load from localStorage
    function loadFromLocalStorage() {
        const savedPositions = localStorage.getItem('lightPositions');
        if (savedPositions) {
            try {
                const saved = JSON.parse(savedPositions);
                lightButtons = saved;
                restoreButtons();
            } catch (e) {
                console.error("Error loading saved positions:", e);
                lightButtons = [];
            }
        } else {
            // Default button if nothing saved
            lightButtons = [{
                id: 'light1',
                entityId: 'light.row_1_2',
                name: 'Bed Light',
                position: { x: 0.3, y: 0.5 },
                iconClass: 'fa-lightbulb',
                type: 'toggle'
            }];
            restoreButtons();
        }
    }

    // Save to localStorage
    function saveToLocalStorage() {
        localStorage.setItem('lightPositions', JSON.stringify(lightButtons));
    }

    // Toggle edit mode
    function enableEditMode(flag) {
        isEditMode = flag;

        // Update all buttons' edit mode state
        lightButtons.forEach(button => {
            const btn = document.getElementById(button.id);
            if (btn) {
                if (flag) {
                    btn.classList.add('edit-mode');
                    btn.style.cursor = 'grab';
                } else {
                    btn.classList.remove('edit-mode');
                    btn.style.cursor = '';
                    saveToLocalStorage();
                }
            }
        });
    }

    // Create a new button
    function create(config) {
        // Generate unique ID if not provided
        if (!config.id) {
            config.id = 'button_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Ensure required properties
        config.type = config.type || 'toggle';
        config.iconClass = config.iconClass || BUTTON_TYPES[config.type]?.icon || 'fa-lightbulb';
        config.name = config.name || BUTTON_TYPES[config.type]?.defaultName || 'Button';

        // Add to array
        lightButtons.push(config);

        // Create DOM element
        createLightButton(config);

        // Update positions
        updateButtonPositions();

        return config.id;
    }

    // Save current state
    function save() {
        const imageMeta = getImageMetaFn ? getImageMetaFn() : {};
        return {
            meta: {
                savedAt: new Date().toISOString(),
                version: '1.0'
            },
            image: imageMeta.dataURL || imageMeta.src || '',
            buttons: lightButtons,
            transform: imageMeta.transform || {}
        };
    }

    // Load from data
    function load(data) {
        // Clear existing buttons
        lightButtons = [];
        document.querySelectorAll('.light-button').forEach(btn => btn.remove());

        // Load new buttons
        if (data.buttons && Array.isArray(data.buttons)) {
            lightButtons = data.buttons;
            restoreButtons();
        }

        // Update positions
        updateButtonPositions();

        // Save to localStorage
        saveToLocalStorage();
    }

    // Get all buttons
    function getButtons() {
        return lightButtons;
    }

    // Update button configuration
    function updateButtonConfig(buttonId, newConfig) {
        const index = lightButtons.findIndex(b => b.id === buttonId);
        if (index !== -1) {
            const oldEntityId = lightButtons[index].entityId;
            lightButtons[index] = { ...lightButtons[index], ...newConfig };

            // If entityId changed, update EntityButtons registry
            if (newConfig.entityId && newConfig.entityId !== oldEntityId) {
                // Remove from old entity group
                if (oldEntityId && window.EntityButtons && window.EntityButtons[oldEntityId]) {
                    const btnIndex = window.EntityButtons[oldEntityId].findIndex(btn => btn.id === buttonId);
                    if (btnIndex > -1) {
                        window.EntityButtons[oldEntityId].splice(btnIndex, 1);
                    }
                }
                
                // Add to new entity group
                if (!window.EntityButtons[newConfig.entityId]) {
                    window.EntityButtons[newConfig.entityId] = [];
                }
            }

            // Update DOM
            const btn = document.getElementById(buttonId);
            if (btn) {
                const icon = btn.querySelector('.icon');
                if (icon && newConfig.iconClass) {
                    icon.className = 'icon fas ' + newConfig.iconClass;
                }
                // Update entityId in dataset
                btn.dataset.entityId = newConfig.entityId || '';
            }

            saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Delete a button
    function deleteButton(buttonId) {
        const index = lightButtons.findIndex(b => b.id === buttonId);
        if (index !== -1) {
            const button = lightButtons[index];
            
            // Remove from EntityButtons registry
            if (button.entityId && window.EntityButtons && window.EntityButtons[button.entityId]) {
                const btnIndex = window.EntityButtons[button.entityId].findIndex(btn => btn.id === buttonId);
                if (btnIndex > -1) {
                    window.EntityButtons[button.entityId].splice(btnIndex, 1);
                }
            }
            
            lightButtons.splice(index, 1);
            const btn = document.getElementById(buttonId);
            if (btn) {
                btn.remove();
            }
            saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Update button positions
    function updateButtonPositions() {
        const imgMeta = getImageMetaFn ? getImageMetaFn() : null;
        if (!imgMeta || !imgMeta.naturalWidth) return;

        lightButtons.forEach(button => {
            const btn = document.getElementById(button.id);
            if (btn) {
                const imgX = button.position.x * imgMeta.naturalWidth;
                const imgY = button.position.y * imgMeta.naturalHeight;

                btn.style.left = `${imgX}px`;
                btn.style.top = `${imgY}px`;
            }
        });
    }

    // Restore all buttons
    function restoreButtons() {
        lightButtons.forEach(createLightButton);
    }

    // Create a light button DOM element
    function createLightButton(config) {
        // Remove existing button if present
        const existingBtn = document.getElementById(config.id);
        if (existingBtn) {
            existingBtn.remove();
        }

        const button = document.createElement('button');
        button.id = config.id;
        button.className = 'light-button';
        button.dataset.type = config.type || 'toggle';
        button.dataset.entityId = config.entityId || '';

        // Set icon
        const iconClass = config.iconClass || 'fa-lightbulb';
        button.innerHTML = `<i class="icon fas ${iconClass}"></i>`;

        // Add event listeners
        setupButtonEventListeners(button, config);

        panElement.appendChild(button);
        return button;
    }

    // Set up button event listeners
    function setupButtonEventListeners(button, config) {
        // Click handler
        button.addEventListener('click', (e) => {
            if (!isEditMode && callbacks.toggleLight) {
                e.stopPropagation();
                callbacks.toggleLight(config.entityId, config.id);
            }
        });

        // Mouse/touch down for drag and long press
        button.addEventListener('mousedown', (e) => startButtonInteraction(e, button, config));
        button.addEventListener('touchstart', (e) => startButtonInteraction(e, button, config));

        // Prevent context menu on long press
        button.addEventListener('contextmenu', (e) => {
            if (isEditMode) e.preventDefault();
            return false;
        });
    }

    // Start button interaction (drag or long press)
    function startButtonInteraction(e, button, config) {
        if (!isEditMode) return;

        e.stopPropagation();
        e.preventDefault();

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        // Store starting positions
        dragStart.x = clientX;
        dragStart.y = clientY;
        panStart.x = config.position.x;
        panStart.y = config.position.y;

        // Clear any existing timer
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }

        // Start long press timer
        longPressTimer = setTimeout(() => {
            // Only show edit modal if we haven't moved much
            const movedX = Math.abs(clientX - dragStart.x);
            const movedY = Math.abs(clientY - dragStart.y);
            
            if (movedX < dragThreshold && movedY < dragThreshold && !isDraggingButton) {
                showEditModal(config);
            }
            
            longPressTimer = null;
        }, 600); // 600ms for long press

        // Add mouse move listener to detect drag
        const mouseMoveHandler = (moveEvent) => {
            const moveClientX = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveClientY = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientY : moveEvent.clientY;
            
            const deltaX = Math.abs(moveClientX - dragStart.x);
            const deltaY = Math.abs(moveClientY - dragStart.y);
            
            // If movement exceeds threshold, start dragging
            if ((deltaX > dragThreshold || deltaY > dragThreshold) && longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
                startButtonDrag(moveEvent, button, config);
                
                // Remove this listener
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('touchmove', mouseMoveHandler);
            }
        };

        // Add temporary mouse move listeners
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('touchmove', mouseMoveHandler, { passive: false });

        // Clean up if mouse up occurs before long press
        const cleanup = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('touchmove', mouseMoveHandler);
            document.removeEventListener('mouseup', cleanup);
            document.removeEventListener('touchend', cleanup);
        };

        document.addEventListener('mouseup', cleanup);
        document.addEventListener('touchend', cleanup);
    }

    // Start button dragging
    function startButtonDrag(e, button, config) {
        isDraggingButton = true;
        currentDraggingButton = button;
        button.classList.add('dragging');
        button.style.cursor = 'grabbing';

        // Add global event listeners for dragging
        document.addEventListener('mousemove', doButtonDrag);
        document.addEventListener('touchmove', doButtonDrag, { passive: false });
        
        const stopDrag = () => {
            stopButtonDrag();
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
        };
        
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }

    // Handle button dragging
    function doButtonDrag(e) {
        if (!isDraggingButton || !currentDraggingButton) return;

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - dragStart.x;
        const deltaY = clientY - dragStart.y;

        const imgMeta = getImageMetaFn();
        if (!imgMeta) return;

        // Get REAL image display size
        const realW = document.getElementById("viewImage").clientWidth;
        const realH = document.getElementById("viewImage").clientHeight;

        // Convert to relative position
        const deltaXRel = deltaX / realW;
        const deltaYRel = deltaY / realH;

        const buttonId = currentDraggingButton.id;
        const buttonConfig = lightButtons.find(b => b.id === buttonId);

        if (buttonConfig) {
            buttonConfig.position.x = panStart.x + deltaXRel;
            buttonConfig.position.y = panStart.y + deltaYRel;

            // Clamp to image bounds
            buttonConfig.position.x = Math.max(0, Math.min(1, buttonConfig.position.x));
            buttonConfig.position.y = Math.max(0, Math.min(1, buttonConfig.position.y));

            updateButtonPositions();
        }

        if (e.preventDefault) e.preventDefault();
        e.stopPropagation();
    }

    // Stop button dragging
    function stopButtonDrag() {
        if (currentDraggingButton) {
            currentDraggingButton.classList.remove('dragging');
            currentDraggingButton.style.cursor = 'grab';
        }

        isDraggingButton = false;
        currentDraggingButton = null;

        // Remove global event listeners
        document.removeEventListener('mousemove', doButtonDrag);
        document.removeEventListener('touchmove', doButtonDrag);
        
        // Save position
        saveToLocalStorage();
    }

    // Show edit modal
    function showEditModal(config) {
        editingButtonId = config.id;

        // Fill form
        document.getElementById('editEntityId').value = config.entityId || '';
        document.getElementById('editName').value = config.name || '';
        document.getElementById('editIcon').value = config.iconClass || 'fa-lightbulb';

        // Show modal
        document.getElementById('buttonEditModal').style.display = 'flex';
    }

    // Set up modal listeners
    function setupModalListeners() {
        // Button picker modal close
        document.getElementById('closePickerBtn')?.addEventListener('click', () => {
            document.getElementById('buttonPickerModal').style.display = 'none';
        });

        // Button edit modal close
        document.getElementById('closeEditBtn')?.addEventListener('click', () => {
            document.getElementById('buttonEditModal').style.display = 'none';
            editingButtonId = null;
        });

        // Button type selection
        document.querySelectorAll('.button-type-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = item.dataset.type;
                const icon = item.dataset.icon;

                // Close picker modal
                document.getElementById('buttonPickerModal').style.display = 'none';

                // Prompt for entity ID
                const buttonType = BUTTON_TYPES[type];
                const entityId = prompt(`Enter Entity ID for ${buttonType.name}:`, 'light.');

                if (entityId && entityId.trim()) {
                    const name = prompt(`Enter name (optional):`, buttonType.defaultName) || buttonType.defaultName;
                    const position = { x: 0.5, y: 0.5 };

                    // If it's a dimmer, let the DimmerModule create it
                    if (type === 'dimmer' && window.DimmerModule && typeof DimmerModule.create === 'function') {
                        DimmerModule.create({
                            entityId: entityId.trim(),
                            name: name,
                            position: position,
                            iconClass: icon,
                            brightness: 50,
                            isOn: false,
                            type: 'dimmer'
                        });
                    } else {
                        // For toggle and scene buttons
                        create({
                            entityId: entityId.trim(),
                            name: name,
                            position: position,
                            iconClass: icon,
                            type: type
                        });
                    }
                }
            });
        });

        // Edit form submission - UPDATED FOR DIMMER SUPPORT
        const editForm = document.getElementById('buttonEditForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();

                if (editingButtonId) {
                    const newConfig = {
                        entityId: document.getElementById('editEntityId').value.trim(),
                        name: document.getElementById('editName').value.trim() || 'Light',
                        iconClass: document.getElementById('editIcon').value
                    };

                    if (!newConfig.entityId) {
                        alert('Entity ID is required');
                        return;
                    }

                    // Check if this is a dimmer button
                    const isDimmer = lightButtons.find(b => b.id === editingButtonId)?.type === 'dimmer';
                    
                    if (isDimmer && window.DimmerModule && DimmerModule.updateConfig) {
                        // Update dimmer via DimmerModule
                        DimmerModule.updateConfig(editingButtonId, newConfig);
                    } else {
                        // Update regular button
                        updateButtonConfig(editingButtonId, newConfig);
                    }

                    document.getElementById('buttonEditModal').style.display = 'none';
                    editingButtonId = null;
                }
            });
        }

        // Delete button - UPDATED FOR DIMMER SUPPORT
        document.getElementById('deleteBtn')?.addEventListener('click', () => {
            if (editingButtonId && confirm('Are you sure you want to delete this button?')) {
                // Check if this is a dimmer button
                const isDimmer = lightButtons.find(b => b.id === editingButtonId)?.type === 'dimmer';
                
                let deleted = false;
                if (isDimmer && window.DimmerModule && DimmerModule.deleteButton) {
                    deleted = DimmerModule.deleteButton(editingButtonId);
                } else {
                    deleted = deleteButton(editingButtonId);
                }
                
                if (deleted) {
                    document.getElementById('buttonEditModal').style.display = 'none';
                    editingButtonId = null;
                }
            }
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                    editingButtonId = null;
                }
            });
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(overlay => {
                    overlay.style.display = 'none';
                });
                editingButtonId = null;
            }
        });
    }

    // Public API
    return {
        init,
        enableEditMode,
        create,
        save,
        load,
        getButtons,
        updateButtonConfig,
        deleteButton,
        updateButtonPositions
    };
})();