// remote.js - Remote Button Module (COMPLETE VERSION)
window.RemoteModule = (function () {
    'use strict';

    // Internal state
    let remoteButtons = [];
    let currentRemote = null;
    let remoteModal = null;
    let editRemoteBtn = null;
    let closeRemoteBtn = null;
    let callbacks = {};
    let isEditMode = false;
    let isDragging = false;
    let longPressTimer = null;
    let dragStart = { x: 0, y: 0 };
    let dragThreshold = 10;
    
    // Home Assistant WebSocket connection
    let ws = null;
    let wsId = 1;
    const WS_URL = "wss://demo.lumihomepro1.com/api/websocket";
    const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIzNGNlNThiNDk1Nzk0NDVmYjUxNzE2NDA0N2Q0MGNmZCIsImlhdCI6MTc2NTM0NzQ5MSwiZXhwIjoyMDgwNzA3NDkxfQ.Se5PGwx0U9aqyVRnD1uwvCv3F-aOE8H53CKA5TqsV7U";

    // Common icons for remote buttons
    const commonIcons = [
        'fas fa-power-off', 'fas fa-tv', 'fas fa-volume-up', 'fas fa-volume-mute',
        'fas fa-home', 'fas fa-arrow-left', 'fas fa-arrow-right', 'fas fa-arrow-up',
        'fas fa-arrow-down', 'fas fa-circle', 'fas fa-bars', 'fas fa-cog',
        'fas fa-lightbulb', 'fas fa-plug', 'fas fa-play', 'fas fa-pause',
        'fas fa-stop', 'fas fa-forward', 'fas fa-backward', 'fas fa-redo',
        'fas fa-undo', 'fas fa-sun', 'fas fa-moon', 'fas fa-fan',
        'fas fa-thermometer-half', 'fas fa-door-closed', 'fas fa-lock',
        'fas fa-unlock', 'fas fa-camera', 'fas fa-microphone', 'fas fa-music',
        'fas fa-power-off', 'fas fa-power-on', 'fas fa-toggle-on', 'fas fa-toggle-off',
        'fas fa-plug-circle-plus', 'fas fa-plug-circle-minus', 'fas fa-bolt',
        'fas fa-wifi', 'fas fa-bluetooth', 'fas fa-satellite-dish',
        'fas fa-gamepad', 'fas fa-keyboard', 'fas fa-mouse', 'fas fa-headphones',
        'fas fa-microphone-alt', 'fas fa-video', 'fas fa-desktop', 'fas fa-laptop',
        'fas fa-tablet', 'fas fa-mobile', 'fas fa-phone', 'fas fa-rss',
        'fas fa-broadcast-tower', 'fas fa-signal', 'fas fa-wifi-strong'
    ];

    // Create and inject remote-specific styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Remote Button Styles */
            .light-button.remote {
                background: white;
                border: 1px solid #ddd;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                cursor: pointer;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 5px;
                min-width: 60px;
                min-height: 60px;
            }

            .light-button.remote .icon {
                font-size: 20px;
                color: #333;
                margin-bottom: 3px;
            }

            .light-button.remote .remote-label {
                font-size: 10px;
                color: #333;
                text-align: center;
                font-weight: bold;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-family: Arial, sans-serif;
            }

            .light-button.remote.on {
                box-shadow: 0 0 15px rgba(0, 122, 255, 0.8);
                border-color: #007aff;
            }

            .light-button.remote.on .icon {
                color: #007aff;
            }

            .light-button.remote.on .remote-label {
                color: #007aff;
            }

            /* Edit mode for remote */
            .edit-mode .light-button.remote {
                border: 2px dashed #4CAF50;
                background-color: rgba(255, 255, 255, 0.9);
                cursor: grab;
            }

            .edit-mode .light-button.remote:hover {
                border: 2px dashed #f44336;
            }

            .edit-mode .light-button.remote.dragging {
                z-index: 1000;
                border: 2px solid #f44336;
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
                cursor: grabbing;
            }

            /* Remote Modal Styles */
            .remote-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.8);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }

            .remote-modal-content {
                background: #ffffff;
                border-radius: 15px;
                width: 450px;
                max-height: 600px;
                overflow-y: auto;
                padding: 25px;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }

            .remote-modal .close-modal {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: rgb(0, 0, 0);
                z-index: 1001;
                width: 35px;
                height: 35px;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .remote-modal .close-modal:hover {
                background-color: rgba(0, 0, 0, 0.1);
            }

            .remote-modal .edit-button {
                position: absolute;
                top: 15px;
                left: 15px;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: rgb(0, 0, 0);
                z-index: 1001;
                width: 35px;
                height: 35px;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .remote-modal .edit-button:hover {
                background-color: rgba(0, 122, 255, 0.1);
            }

            .remote-container {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .modal-title {
                color: rgb(0, 0, 0);
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
                font-family: Arial, sans-serif;
                text-align: center;
            }

            .modal-subtitle {
                color: #aaa;
                font-size: 14px;
                margin-bottom: 25px;
                font-family: Arial, sans-serif;
                text-align: center;
            }

            .remote-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(auto-fit, minmax(70px, 1fr));
                gap: 15px;
                width: 100%;
                max-width: 350px;
                margin: 20px;
            }

            .remote-btn {
                background: linear-gradient(145deg, #ffffff, #ffffff);
                border: none;
                border-radius: 10px;
                color: rgb(0, 0, 0);
                font-size: 18px;
                font-weight: bold;
                height: 70px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            }

            .remote-btn:hover {
                background: linear-gradient(145deg, #e8e8e8, #d0d0d0);
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
            }

            .remote-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .remote-btn.power {
                background: linear-gradient(145deg, #ff3b30, #cc0000);
                color: white;
            }

            .remote-btn.power:hover {
                background: linear-gradient(145deg, #ff5c52, #ff3b30);
                color: white;
            }

            .remote-btn.function {
                background: linear-gradient(145deg, #007aff, #0056cc);
                color: white;
            }

            .remote-btn.function:hover {
                background: linear-gradient(145deg, #3395ff, #007aff);
                color: white;
            }

            .btn-icon {
                font-size: 22px;
                margin-bottom: 5px;
            }

            .btn-label {
                font-size: 12px;
                opacity: 0.9;
                max-width: 90%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .empty-state {
                grid-column: 1 / -1;
                text-align: center;
                padding: 40px 20px;
                color: #666;
                font-size: 14px;
            }

            .empty-state i {
                font-size: 32px;
                margin-bottom: 10px;
                opacity: 0.5;
            }

            /* Edit Form Styles */
            .edit-form {
                width: 100%;
                display: none;
            }

            .form-group {
                margin-bottom: 15px;
                width: 100%;
            }

            .form-label {
                display: block;
                margin-bottom: 5px;
                color: #333;
                font-weight: bold;
                font-size: 14px;
            }

            .form-input,
            .form-select {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 14px;
                box-sizing: border-box;
            }

            .form-input:focus,
            .form-select:focus {
                outline: none;
                border-color: #007aff;
            }

            .color-picker-container {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .color-picker {
                width: 50px;
                height: 50px;
                border: 1px solid #ddd;
                border-radius: 5px;
                cursor: pointer;
            }

            .color-value {
                font-family: monospace;
                font-size: 14px;
                color: #666;
            }

            .button-preview {
                width: 100%;
                height: 70px;
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                margin: 15px 0;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }

            .button-preview-icon {
                font-size: 22px;
                margin-bottom: 5px;
            }

            .button-preview-label {
                font-size: 12px;
                font-weight: bold;
            }

            .form-buttons {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }

            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
            }

            .btn-primary {
                background: linear-gradient(145deg, #007aff, #0056cc);
                color: white;
            }

            .btn-primary:hover {
                background: linear-gradient(145deg, #3395ff, #007aff);
            }

            .btn-secondary {
                background: #f0f0f0;
                color: #333;
            }

            .btn-secondary:hover {
                background: #e0e0e0;
            }

            .btn-danger {
                background: linear-gradient(145deg, #ff3b30, #cc0000);
                color: white;
            }

            .btn-danger:hover {
                background: linear-gradient(145deg, #ff5c52, #ff3b30);
            }

            /* Icon grid */
            .icon-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 10px;
                max-height: 150px;
                overflow-y: auto;
                padding: 10px;
                background: rgba(0, 0, 0, 0.05);
                border-radius: 10px;
                margin-top: 10px;
            }

            .icon-option {
                width: 40px;
                height: 40px;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 18px;
                color: #666;
                background: white;
                border: 2px solid transparent;
            }

            .icon-option:hover {
                background: #e3f2fd;
                color: #007aff;
            }

            .icon-option.selected {
                background: #007aff;
                color: white;
                border-color: #0056cc;
            }

            /* Delete confirmation */
            .delete-confirmation {
                text-align: center;
                padding: 20px;
                display: none;
            }

            .delete-confirmation p {
                margin-bottom: 20px;
                color: #333;
                font-size: 16px;
            }

            /* Context menu */
            .context-menu {
                position: absolute;
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                z-index: 2000;
                min-width: 150px;
                display: none;
                overflow: hidden;
            }

            .context-menu-item {
                padding: 10px 15px;
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                transition: background 0.2s;
                border-bottom: 1px solid #f0f0f0;
            }

            .context-menu-item:last-child {
                border-bottom: none;
            }

            .context-menu-item:hover {
                background: #f5f5f5;
            }

            .context-menu-item i {
                width: 20px;
                text-align: center;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }

    // Create remote modal HTML
    function createModal() {
        if (document.getElementById('remoteModal')) return;

        const modalHTML = `
            <div class="remote-modal" id="remoteModal">
                <div class="remote-modal-content">
                    <button class="edit-button" id="editRemoteBtn" title="Edit Remote">
                        <i class="fas fa-edit"></i>
                    </button>

                    <button class="close-modal" id="closeRemoteBtn">&times;</button>

                    <div class="modal-title" id="modalTitle">Remote Control</div>
                    <div class="modal-subtitle" id="modalSubtitle">Smart Controller</div>

                    <div class="remote-container">
                        <div class="remote-grid" id="remoteGrid">
                            <div class="empty-state" id="emptyState">
                                <i class="fas fa-plus-circle"></i><br>
                                No buttons yet. Click the edit button to add your first button.
                            </div>
                        </div>
                    </div>

                    <!-- Edit Form -->
                    <div class="edit-form" id="editForm">
                        <div class="form-group">
                            <label class="form-label">Button Icon</label>
                            <input type="text" class="form-input" id="buttonIcon" placeholder="fas fa-power-off"
                                value="fas fa-plus">
                            <div class="icon-grid" id="iconGrid">
                                <!-- Icons will be populated dynamically -->
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Button Text</label>
                            <input type="text" class="form-input" id="buttonText" placeholder="Enter button label"
                                value="New Button">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Entity Type</label>
                            <select class="form-select" id="entityType">
                                <option value="remote">Remote Control</option>
                                <option value="switch">Switch</option>
                            </select>
                        </div>

                        <div id="remoteConfig" class="form-group">
                            <label class="form-label">Remote Entity ID</label>
                            <input type="text" class="form-input" id="remoteEntity" placeholder="remote.living_room_tv">

                            <label class="form-label" style="margin-top: 10px;">Remote Service</label>
                            <select class="form-select" id="remoteService">
                                <option value="">Select service...</option>
                                <option value="remote.send_command">remote.send_command</option>
                                <option value="remote.turn_on">remote.turn_on</option>
                                <option value="remote.turn_off">remote.turn_off</option>
                            </select>

                            <div class="form-group" id="commandContainer" style="margin-top: 10px; display: none;">
                                <label class="form-label">Command</label>
                                <input type="text" class="form-input" id="remoteCommand" placeholder="power, volume_up, etc.">
                            </div>
                        </div>

                        <div id="switchConfig" class="form-group" style="display: none;">
                            <label class="form-label">Switch Entity ID</label>
                            <input type="text" class="form-input" id="switchEntity" placeholder="switch.living_room_lamp">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Text Color</label>
                            <div class="color-picker-container">
                                <input type="color" class="color-picker" id="textColor" value="#000000">
                                <span class="color-value" id="textColorValue">#000000</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Background Color</label>
                            <div class="color-picker-container">
                                <input type="color" class="color-picker" id="bgColor" value="#ffffff">
                                <span class="color-value" id="bgColorValue">#ffffff</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Button Preview</label>
                            <div class="button-preview" id="buttonPreview">
                                <i class="fas fa-plus button-preview-icon"></i>
                                <span class="button-preview-label">New Button</span>
                            </div>
                        </div>

                        <div class="form-buttons">
                            <button class="btn btn-danger" id="deleteRemoteButton" style="display: none;">Delete Button</button>
                            <button class="btn btn-secondary" id="cancelEdit">Cancel</button>
                            <button class="btn btn-primary" id="saveRemoteButton">Save Button</button>
                        </div>
                    </div>

                    <!-- Delete Confirmation -->
                    <div class="delete-confirmation" id="deleteConfirmation">
                        <h3 style="color: #ff3b30; margin-bottom: 15px;">Delete Button</h3>
                        <p>Are you sure you want to delete this button? This action cannot be undone.</p>
                        <div class="form-buttons">
                            <button class="btn btn-secondary" id="cancelDelete">Cancel</button>
                            <button class="btn btn-danger" id="confirmDelete">Delete</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Context Menu -->
            <div class="context-menu" id="contextMenu">
                <div class="context-menu-item" id="editContext">
                    <i class="fas fa-edit"></i>
                    <span>Edit</span>
                </div>
                <div class="context-menu-item" id="deleteContext">
                    <i class="fas fa-trash"></i>
                    <span>Delete</span>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get references
        remoteModal = document.getElementById('remoteModal');
        editRemoteBtn = document.getElementById('editRemoteBtn');
        closeRemoteBtn = document.getElementById('closeRemoteBtn');
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

        // Load saved remote buttons
        loadFromLocalStorage();

        // Connect to Home Assistant
        connectHA();

        console.log('Remote module initialized');
        return {
            create,
            enableEditMode,
            updatePositions,
            getRemoteButtons,
            updateConfig,
            deleteButton,
            handleStateUpdate,
            openRemoteModal
        };
    }

    // Connect to Home Assistant WebSocket
    function connectHA() {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log("Remote: HA WebSocket connected");
            ws.send(JSON.stringify({
                type: "auth",
                access_token: TOKEN
            }));
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "auth_ok") {
                console.log("Remote: HA WebSocket authenticated");
            } else if (msg.type === "auth_invalid") {
                console.error("Remote: HA WebSocket authentication failed");
            }
        };

        ws.onerror = (e) => console.error("Remote: WebSocket error", e);
        ws.onclose = () => console.log("Remote: WebSocket closed");
    }

    // Send command to Home Assistant
    function sendToHomeAssistant(button) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn("Remote: HA WebSocket not ready");
            if (callbacks.sendCommand) {
                callbacks.sendCommand(button);
            }
            return;
        }

        let serviceData = {
            entity_id: button.entityId
        };

        if (button.service === "remote.send_command") {
            serviceData.command = button.command;
        } else if (button.service === "remote.turn_on") {
            if (button.command) {
                serviceData.activity = button.command;
            }
        }

        const [domain, service] = button.service.split(".");

        ws.send(JSON.stringify({
            id: wsId++,
            type: "call_service",
            domain,
            service,
            service_data: serviceData
        }));

        console.log("Remote: Sent command to HA", { button, serviceData });
    }

    // Load from localStorage
    function loadFromLocalStorage() {
        const saved = localStorage.getItem('remoteButtons');
        if (saved) {
            try {
                remoteButtons = JSON.parse(saved);
                restoreRemoteButtons();
            } catch (e) {
                console.error('Remote: Error loading remote buttons:', e);
                remoteButtons = [];
            }
        }
    }

    // Save to localStorage
    function saveToLocalStorage() {
        const cleanRemotes = remoteButtons.map(btn => ({
            id: btn.id,
            type: 'remote',
            entityId: btn.entityId || '',
            entityType: btn.entityType || 'remote',
            name: btn.name || 'Remote Button',
            icon: btn.icon || 'fas fa-tv',
            text: btn.text || 'Button',
            textColor: btn.textColor || '#000000',
            bgColor: btn.bgColor || '#ffffff',
            service: btn.service || '',
            command: btn.command || '',
            position: {
                x: Number(btn.position.x.toFixed(4)),
                y: Number(btn.position.y.toFixed(4))
            },
            isOn: btn.isOn || false
        }));
        
        localStorage.setItem('remoteButtons', JSON.stringify(cleanRemotes));
    }

    // Create a remote button
    function create(config) {
        if (!config.id) {
            config.id = 'remote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Set defaults
        config.type = 'remote';
        config.icon = config.icon || 'fas fa-tv';
        config.text = config.text || 'Remote';
        config.name = config.name || 'Remote Button';
        config.textColor = config.textColor || '#000000';
        config.bgColor = config.bgColor || '#ffffff';
        config.entityType = config.entityType || 'remote';
        config.service = config.service || '';
        config.command = config.command || '';
        config.isOn = config.isOn || false;
        config.position = config.position || { x: 0.5, y: 0.5 };

        // Add to array
        remoteButtons.push(config);

        // Create DOM element
        createRemoteButton(config);

        // Save
        saveToLocalStorage();

        return config.id;
    }

    function createRemoteButton(config) {
        // Remove existing if present
        const existing = document.getElementById(config.id);
        if (existing) existing.remove();

        const button = document.createElement('button');
        button.id = config.id;
        button.className = 'light-button remote';
        button.dataset.entityId = config.entityId;
        button.dataset.entityType = config.entityType;
        button.dataset.service = config.service;
        button.dataset.command = config.command;
        button.dataset.type = 'remote';
        button.dataset.icon = config.icon;
        button.dataset.text = config.text;
        button.dataset.textColor = config.textColor;
        button.dataset.bgColor = config.bgColor;

        // Create button content
        button.innerHTML = `
            <i class="${config.icon} icon"></i>
            <div class="remote-label">${config.text || config.name}</div>
        `;

        // Apply colors
        button.style.color = config.textColor;
        button.style.backgroundColor = config.bgColor;

        // Set initial state
        if (config.isOn) {
            button.classList.add('on');
        } else {
            button.classList.add('off');
        }

        // Add event listeners
        setupRemoteButtonEvents(button, config);

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

    // Setup remote button events
    function setupRemoteButtonEvents(button, config) {
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

            // Start long press timer for edit modal
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
                
                // Send command to Home Assistant
                sendToHomeAssistant(config);
                
                // Update button state
                button.classList.toggle('on');
                button.classList.toggle('off');
                
                // Update config
                const index = remoteButtons.findIndex(b => b.id === config.id);
                if (index !== -1) {
                    remoteButtons[index].isOn = !remoteButtons[index].isOn;
                    saveToLocalStorage();
                }
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
                const index = remoteButtons.findIndex(b => b.id === config.id);
                if (index !== -1) {
                    remoteButtons[index].position = {
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
        if (currentRemote) {
            const btn = document.getElementById(currentRemote.id);
            if (btn) btn.classList.remove('selected');
        }
        
        // Reset all remote buttons cursor
        remoteButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.classList.remove('dragging');
                btn.style.cursor = 'grab';
            }
        });
    }

    // Show edit modal for remote
    function showEditModal(config) {
        console.log('Remote: Opening edit modal for:', config.id, 'type: remote');
        
        // Mark button as selected
        if (window.selectButtonForEdit) {
            window.selectButtonForEdit(config.id, 'remote');
        }
        
        // Fill the edit form
        const editEntityId = document.getElementById('editEntityId');
        const editName = document.getElementById('editName');
        const editIcon = document.getElementById('editIcon');
        
        if (editEntityId) editEntityId.value = config.entityId || '';
        if (editName) editName.value = config.name || 'Remote Button';
        if (editIcon) editIcon.value = config.icon || 'fas fa-tv';
        
        // Store which button we're editing
        window.currentEditingButton = config.id;
        window.currentEditingType = 'remote';
        
        // Also set in buttons module
        if (window.buttons && window.buttons.setEditingButtonId) {
            window.buttons.setEditingButtonId(config.id);
        }
        
        // Show modal
        const modal = document.getElementById('buttonEditModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Remote: Modal displayed');
        } else {
            console.error('Remote: Edit modal not found');
        }
    }

    // Open remote modal
    function openRemoteModal(config) {
        currentRemote = config;

        // Update modal with current values
        updateRemoteModalContent();

        // Show modal
        if (remoteModal) {
            remoteModal.style.display = 'flex';
        }
    }

    // Update remote modal content
    function updateRemoteModalContent() {
        const remoteGrid = document.getElementById('remoteGrid');
        const emptyState = document.getElementById('emptyState');
        const editForm = document.getElementById('editForm');
        const deleteConfirmation = document.getElementById('deleteConfirmation');

        // Clear existing buttons
        remoteGrid.querySelectorAll('.remote-btn').forEach(btn => btn.remove());

        // Show empty state if no buttons
        if (remoteButtons.length === 0) {
            emptyState.style.display = 'block';
            editForm.style.display = 'none';
            deleteConfirmation.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        editForm.style.display = 'none';
        deleteConfirmation.style.display = 'none';

        // Create buttons for the modal
        remoteButtons.forEach((button, index) => {
            const btnElement = document.createElement('button');
            btnElement.className = 'remote-btn';
            btnElement.dataset.index = index;

            // Apply colors
            btnElement.style.color = button.textColor || '#000';
            if (!button.bgColor || button.bgColor.toLowerCase() === '#ffffff') {
                btnElement.style.background = '#ffffff';
            } else {
                btnElement.style.background = `linear-gradient(145deg, ${button.bgColor}, ${darkenColor(button.bgColor, 20)})`;
            }

            btnElement.innerHTML = `
                <i class="${button.icon} btn-icon"></i>
                <span class="btn-label">${button.text || button.name}</span>
            `;

            // Click to send command
            btnElement.addEventListener('click', () => {
                if (isEditMode) return;
                sendToHomeAssistant(button);
            });

            // Long press for edit (in modal)
            let longPressTimerModal = null;
            btnElement.addEventListener('mousedown', (e) => {
                if (!isEditMode) return;
                
                longPressTimerModal = setTimeout(() => {
                    editButtonInModal(index);
                }, 700);
            });

            btnElement.addEventListener('mouseup', () => {
                if (longPressTimerModal) {
                    clearTimeout(longPressTimerModal);
                    longPressTimerModal = null;
                }
            });

            btnElement.addEventListener('mouseleave', () => {
                if (longPressTimerModal) {
                    clearTimeout(longPressTimerModal);
                    longPressTimerModal = null;
                }
            });

            remoteGrid.appendChild(btnElement);
        });
    }

    // Edit button in modal
    function editButtonInModal(index) {
        const button = remoteButtons[index];
        currentRemote = button;

        // Populate edit form
        document.getElementById('buttonIcon').value = button.icon || 'fas fa-tv';
        document.getElementById('buttonText').value = button.text || button.name || '';
        document.getElementById('entityType').value = button.entityType || 'remote';
        document.getElementById('textColor').value = button.textColor || '#000000';
        document.getElementById('bgColor').value = button.bgColor || '#ffffff';
        document.getElementById('textColorValue').textContent = button.textColor || '#000000';
        document.getElementById('bgColorValue').textContent = button.bgColor || '#ffffff';

        // Entity specific fields
        if (button.entityType === 'remote') {
            document.getElementById('remoteEntity').value = button.entityId || '';
            document.getElementById('remoteService').value = button.service || '';
            if (button.command) {
                document.getElementById('remoteCommand').value = button.command;
                document.getElementById('commandContainer').style.display = 'block';
            }
        } else if (button.entityType === 'switch') {
            document.getElementById('switchEntity').value = button.entityId || '';
        }

        // Update UI
        handleEntityTypeChange();
        updateButtonPreview();
        populateIconGrid();

        // Show delete button
        document.getElementById('deleteRemoteButton').style.display = 'block';

        // Show edit form
        document.getElementById('editForm').style.display = 'block';
        document.getElementById('remoteGrid').style.visibility = 'hidden';
        document.getElementById('modalTitle').textContent = 'Edit Remote';
        document.getElementById('modalSubtitle').textContent = 'Modify button';
    }

    // Close remote modal
    function closeRemoteModal() {
        if (remoteModal) {
            remoteModal.style.display = 'none';
        }
        currentRemote = null;
        isEditMode = false;
        
        // Reset UI
        document.getElementById('editForm').style.display = 'none';
        document.getElementById('deleteConfirmation').style.display = 'none';
        document.getElementById('remoteGrid').style.visibility = 'visible';
        document.getElementById('modalTitle').textContent = 'Remote Control';
        document.getElementById('modalSubtitle').textContent = 'Smart Controller';
        document.getElementById('editRemoteBtn').innerHTML = '<i class="fas fa-edit"></i>';
    }

    // Restore remote buttons
    function restoreRemoteButtons() {
        remoteButtons.forEach(config => {
            createRemoteButton(config);
        });
    }

    // Setup event listeners for modal
    function setupEventListeners() {
        // Close button
        if (closeRemoteBtn) {
            closeRemoteBtn.addEventListener('click', closeRemoteModal);
        }

        // Edit button
        if (editRemoteBtn) {
            editRemoteBtn.addEventListener('click', toggleEditModeInModal);
        }

        // Close on overlay click
        if (remoteModal) {
            remoteModal.addEventListener('click', (e) => {
                if (e.target === remoteModal) {
                    closeRemoteModal();
                }
            });
        }

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && remoteModal && remoteModal.style.display === 'flex') {
                closeRemoteModal();
            }
        });

        // Edit form buttons
        document.getElementById('saveRemoteButton')?.addEventListener('click', saveRemoteButton);
        document.getElementById('cancelEdit')?.addEventListener('click', cancelEditInModal);
        document.getElementById('deleteRemoteButton')?.addEventListener('click', showDeleteConfirmationInModal);
        
        // Delete confirmation buttons
        document.getElementById('cancelDelete')?.addEventListener('click', cancelDeleteInModal);
        document.getElementById('confirmDelete')?.addEventListener('click', confirmDeleteInModal);

        // Form inputs
        document.getElementById('buttonIcon')?.addEventListener('input', updateButtonPreview);
        document.getElementById('buttonText')?.addEventListener('input', updateButtonPreview);
        document.getElementById('textColor')?.addEventListener('input', updateButtonPreview);
        document.getElementById('bgColor')?.addEventListener('input', updateButtonPreview);
        document.getElementById('entityType')?.addEventListener('change', handleEntityTypeChange);
        document.getElementById('remoteService')?.addEventListener('change', handleServiceChange);

        // Color picker value display
        const textColor = document.getElementById('textColor');
        const bgColor = document.getElementById('bgColor');
        
        if (textColor) {
            textColor.addEventListener('input', (e) => {
                document.getElementById('textColorValue').textContent = e.target.value;
            });
        }
        
        if (bgColor) {
            bgColor.addEventListener('input', (e) => {
                document.getElementById('bgColorValue').textContent = e.target.value;
            });
        }
    }

    // Toggle edit mode in modal
    function toggleEditModeInModal() {
        if (isEditMode) {
            exitEditModeInModal();
        } else {
            isEditMode = true;
            enterEditModeInModal();
        }
    }

    function enterEditModeInModal() {
        document.getElementById('editForm').style.display = 'block';
        document.getElementById('remoteGrid').style.visibility = 'hidden';
        document.getElementById('modalTitle').textContent = 'Edit Remote';
        document.getElementById('modalSubtitle').textContent = 'Add or modify buttons';
        document.getElementById('editRemoteBtn').innerHTML = '<i class="fas fa-times"></i>';
        document.getElementById('deleteConfirmation').style.display = 'none';

        // Reset form for new button
        if (currentRemote === null) {
            resetEditFormInModal();
        }

        // Populate icon grid
        populateIconGrid();
    }

    function exitEditModeInModal() {
        document.getElementById('editForm').style.display = 'none';
        document.getElementById('deleteConfirmation').style.display = 'none';
        document.getElementById('remoteGrid').style.visibility = 'visible';
        document.getElementById('modalTitle').textContent = 'Remote Control';
        document.getElementById('modalSubtitle').textContent = 'Smart Controller';
        document.getElementById('editRemoteBtn').innerHTML = '<i class="fas fa-edit"></i>';

        isEditMode = false;
        currentRemote = null;

        updateRemoteModalContent();
    }

    function resetEditFormInModal() {
        currentRemote = null;

        document.getElementById('buttonIcon').value = 'fas fa-plus';
        document.getElementById('buttonText').value = 'New Button';
        document.getElementById('entityType').value = 'remote';
        document.getElementById('textColor').value = '#000000';
        document.getElementById('bgColor').value = '#ffffff';
        document.getElementById('textColorValue').textContent = '#000000';
        document.getElementById('bgColorValue').textContent = '#ffffff';
        document.getElementById('remoteEntity').value = '';
        document.getElementById('remoteService').value = '';
        document.getElementById('remoteCommand').value = '';
        document.getElementById('switchEntity').value = '';
        document.getElementById('commandContainer').style.display = 'none';

        // Hide delete button
        document.getElementById('deleteRemoteButton').style.display = 'none';

        updateButtonPreview();
    }

    function saveRemoteButton() {
        const icon = document.getElementById('buttonIcon').value.trim();
        const text = document.getElementById('buttonText').value.trim();
        const entityType = document.getElementById('entityType').value;
        const textColor = document.getElementById('textColor').value;
        const bgColor = document.getElementById('bgColor').value;

        let entityId = '';
        let service = '';
        let command = '';

        // Get entity-specific values
        if (entityType === 'remote') {
            entityId = document.getElementById('remoteEntity').value.trim();
            service = document.getElementById('remoteService').value;
            if (service === 'remote.send_command' || service === 'remote.turn_on') {
                command = document.getElementById('remoteCommand').value.trim();
            }
        } else if (entityType === 'switch') {
            entityId = document.getElementById('switchEntity').value.trim();
            service = 'switch.toggle';
        }

        // Validation
        if (!text) {
            alert('Please enter button text');
            return;
        }

        if (entityType === 'remote' && (!entityId || !service)) {
            alert('Please enter remote entity ID and select service');
            return;
        }

        if (entityType === 'remote' && service === 'remote.send_command' && !command) {
            alert('Please enter command for remote.send_command');
            return;
        }

        if (entityType === 'switch' && !entityId) {
            alert('Please enter switch entity ID');
            return;
        }

        const buttonData = {
            icon: icon || 'fas fa-tv',
            text,
            name: text,
            entityType,
            textColor,
            bgColor,
            entityId,
            service,
            command
        };

        if (currentRemote) {
            // Update existing button
            const index = remoteButtons.findIndex(b => b.id === currentRemote.id);
            if (index !== -1) {
                Object.assign(remoteButtons[index], buttonData);
                
                // Update DOM button
                const btn = document.getElementById(currentRemote.id);
                if (btn) {
                    btn.innerHTML = `
                        <i class="${icon} icon"></i>
                        <div class="remote-label">${text}</div>
                    `;
                    btn.style.color = textColor;
                    btn.style.backgroundColor = bgColor;
                    btn.dataset.icon = icon;
                    btn.dataset.text = text;
                    btn.dataset.textColor = textColor;
                    btn.dataset.bgColor = bgColor;
                    btn.dataset.entityId = entityId;
                    btn.dataset.service = service;
                    btn.dataset.command = command;
                }
            }
        } else {
            // Add new button
            buttonData.id = 'remote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            buttonData.type = 'remote';
            buttonData.isOn = false;
            buttonData.position = { x: 0.5, y: 0.5 };
            
            remoteButtons.push(buttonData);
            createRemoteButton(buttonData);
        }

        // Save to localStorage
        saveToLocalStorage();

        // Exit edit mode and refresh display
        exitEditModeInModal();
    }

    function cancelEditInModal() {
        exitEditModeInModal();
    }

    function showDeleteConfirmationInModal() {
        document.getElementById('editForm').style.display = 'none';
        document.getElementById('deleteConfirmation').style.display = 'block';
    }

    function cancelDeleteInModal() {
        document.getElementById('deleteConfirmation').style.display = 'none';
        if (currentRemote !== null) {
            document.getElementById('editForm').style.display = 'block';
        }
    }

    function confirmDeleteInModal() {
        if (currentRemote) {
            const index = remoteButtons.findIndex(b => b.id === currentRemote.id);
            if (index !== -1) {
                const buttonId = remoteButtons[index].id;
                remoteButtons.splice(index, 1);

                // Remove from DOM
                const btn = document.getElementById(buttonId);
                if (btn) btn.remove();

                // Save to localStorage
                saveToLocalStorage();
            }
        }

        // Exit edit mode and refresh display
        exitEditModeInModal();
    }

    // Form handlers
    function handleEntityTypeChange() {
        const entityType = document.getElementById('entityType').value;

        // Hide all config sections
        document.getElementById('remoteConfig').style.display = 'none';
        document.getElementById('switchConfig').style.display = 'none';

        // Show selected config section
        if (entityType === 'remote') {
            document.getElementById('remoteConfig').style.display = 'block';
        } else if (entityType === 'switch') {
            document.getElementById('switchConfig').style.display = 'block';
        }
    }

    function handleServiceChange() {
        const service = document.getElementById('remoteService').value;
        const commandContainer = document.getElementById('commandContainer');
        const label = commandContainer.querySelector('.form-label');
        const input = document.getElementById('remoteCommand');

        if (service === 'remote.send_command') {
            label.textContent = 'Command';
            input.placeholder = 'HOME, POWER, VOLUME_UP';
            commandContainer.style.display = 'block';
        } else if (service === 'remote.turn_on') {
            label.textContent = 'URL / App';
            input.placeholder = 'https://youtube.com or app id';
            commandContainer.style.display = 'block';
        } else {
            commandContainer.style.display = 'none';
            input.value = '';
        }
    }

    function populateIconGrid() {
        const grid = document.getElementById('iconGrid');
        if (!grid) return;

        // Clear existing icons
        grid.innerHTML = '';

        commonIcons.forEach(iconClass => {
            const iconElement = document.createElement('div');
            iconElement.className = 'icon-option';
            iconElement.innerHTML = `<i class="${iconClass}"></i>`;
            iconElement.title = iconClass;

            iconElement.addEventListener('click', () => {
                // Remove selection from all icons
                grid.querySelectorAll('.icon-option').forEach(icon => {
                    icon.classList.remove('selected');
                });

                // Select this icon
                iconElement.classList.add('selected');

                // Update the icon input
                document.getElementById('buttonIcon').value = iconClass;
                updateButtonPreview();
            });

            grid.appendChild(iconElement);
        });
    }

    function updateButtonPreview() {
        const preview = document.getElementById('buttonPreview');
        if (!preview) return;

        const icon = document.getElementById('buttonIcon')?.value || 'fas fa-plus';
        const text = document.getElementById('buttonText')?.value || 'New Button';
        const textColor = document.getElementById('textColor')?.value || '#000000';
        const bgColor = document.getElementById('bgColor')?.value || '#ffffff';

        // Update preview icon
        const iconElement = preview.querySelector('.button-preview-icon');
        if (iconElement) {
            iconElement.className = `${icon} button-preview-icon`;
        }

        // Update preview text
        const labelElement = preview.querySelector('.button-preview-label');
        if (labelElement) {
            labelElement.textContent = text;
        }

        // Update preview colors
        preview.style.color = textColor;
        preview.style.background = `linear-gradient(145deg, ${bgColor}, ${darkenColor(bgColor, 20)})`;
    }

    // Utility function to darken color
    function darkenColor(color, percent) {
        if (color.startsWith('#')) {
            let r = parseInt(color.slice(1, 3), 16);
            let g = parseInt(color.slice(3, 5), 16);
            let b = parseInt(color.slice(5, 7), 16);

            r = Math.max(0, Math.floor(r * (100 - percent) / 100));
            g = Math.max(0, Math.floor(g * (100 - percent) / 100));
            b = Math.max(0, Math.floor(b * (100 - percent) / 100));

            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    }

    // Toggle edit mode for positioning
    function enableEditMode(flag) {
        isEditMode = flag;

        remoteButtons.forEach(config => {
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

        remoteButtons.forEach(config => {
            const btn = document.getElementById(config.id);
            if (btn) {
                btn.style.left = `${config.position.x * imgWidth}px`;
                btn.style.top = `${config.position.y * imgHeight}px`;
            }
        });
    }

    // Get all remote buttons
    function getRemoteButtons() {
        return remoteButtons;
    }

    // Update button config
    function updateConfig(buttonId, newConfig) {
        const index = remoteButtons.findIndex(b => b.id === buttonId);
        if (index === -1) return false;

        const btnData = remoteButtons[index];

        // UPDATE STORED DATA
        Object.assign(btnData, newConfig);

        const btn = document.getElementById(buttonId);
        if (!btn) return false;

        // Update button UI
        if (newConfig.icon) {
            const iconElement = btn.querySelector('.icon');
            if (iconElement) {
                iconElement.className = `${newConfig.icon} icon`;
            }
            btn.dataset.icon = newConfig.icon;
        }

        if (newConfig.text || newConfig.name) {
            const labelElement = btn.querySelector('.remote-label');
            if (labelElement) {
                labelElement.textContent = newConfig.text || newConfig.name;
            }
            btn.dataset.text = newConfig.text || newConfig.name;
        }

        if (newConfig.textColor) {
            btn.style.color = newConfig.textColor;
            btn.dataset.textColor = newConfig.textColor;
        }

        if (newConfig.bgColor) {
            btn.style.backgroundColor = newConfig.bgColor;
            btn.dataset.bgColor = newConfig.bgColor;
        }

        if (newConfig.entityId) {
            btn.dataset.entityId = newConfig.entityId;
        }

        if (newConfig.service) {
            btn.dataset.service = newConfig.service;
        }

        if (newConfig.command) {
            btn.dataset.command = newConfig.command;
        }

        saveToLocalStorage();
        return true;
    }

    // Delete button
    function deleteButton(buttonId) {
        const index = remoteButtons.findIndex(b => b.id === buttonId);
        if (index !== -1) {
            remoteButtons.splice(index, 1);

            const btn = document.getElementById(buttonId);
            if (btn) btn.remove();

            saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Handle state update from Home Assistant
    function handleStateUpdate(entityId, state) {
        const isOn = state === 'on';

        remoteButtons.forEach(config => {
            if (config.entityId === entityId) {
                config.isOn = isOn;

                const btn = document.getElementById(config.id);
                if (btn) {
                    if (isOn) {
                        btn.classList.add('on');
                        btn.classList.remove('off');
                    } else {
                        btn.classList.remove('on');
                        btn.classList.add('off');
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
        getRemoteButtons,
        updateConfig,
        deleteButton,
        handleStateUpdate,
        openRemoteModal,
        sendToHomeAssistant
    };
})();