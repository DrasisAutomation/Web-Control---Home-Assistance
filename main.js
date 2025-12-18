// main.js - Updated with localStorage persistence and clear functionality
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    // 🔴 Block browser pinch zoom (mobile Safari & Chrome)
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('gestureend', e => e.preventDefault());


    const container = document.getElementById("container");
    const pan = document.getElementById("panLayer");
    const img = document.getElementById("viewImage");
    const resetBtn = document.getElementById("resetBtn");
    const editBtn = document.getElementById("editBtn");
    const saveBtn = document.getElementById("saveBtn");
    const loadBtn = document.getElementById("loadBtn");
    const clearAllBtn = document.getElementById("clearAllBtn");
    const imageBtn = document.getElementById("imageBtn");
    const addBtn = document.getElementById("addBtn");
    const editControls = document.getElementById("editControls");
    const imageFileInput = document.getElementById("imageFileInput");
    const loadFileInput = document.getElementById("loadFileInput");

    // Storage constants
    const STORAGE_KEY = 'floorplan_design_v1.1';
    const DEFAULT_LOAD_FILE = 'load.json'; // Default file to load

    // Zoom and Pan variables
    let scale = 1;
    const maxScale = 5;
    let minScale = 1;

    let posX = 0;
    let posY = 0;

    // Image dimensions
    let imgNaturalW = 0;
    let imgNaturalH = 0;

    let lastPinchDistance = null;
    let isPinching = false;

    // State variables
    let isEditMode = false;
    let isDragging = false;

    // Drag start positions
    let dragStart = { x: 0, y: 0 };
    let panStart = { x: 0, y: 0 };

    // WebSocket configuration
    const WS_URL = "wss://demo.lumihomepro1.com/api/websocket";
    const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIzNGNlNThiNDk1Nzk0NDVmYjUxNzE2NDA0N2Q0MGNmZCIsImlhdCI6MTc2NTM0NzQ5MSwiZXhwIjoyMDgwNzA3NDkxfQ.Se5PGwx0U9aqyVRnD1uwvCv3F-aOE8H53CKA5TqsV7U";

    // WebSocket connection
    let ws, ready = false;

    // Initialize image when loaded
    img.onload = () => initImage();
    if (img.complete) initImage();

    function initImage() {
        imgNaturalW = img.naturalWidth;
        imgNaturalH = img.naturalHeight;

        // Calculate min scale (image fits in viewport at 80% height)
        scale = 1;     // image already scaled by CSS to 80vh
        minScale = 1;  // prevent zooming below 80vh size

        // Center the image
        posX = 0;
        posY = 0;

        applyTransform();
        updateButtonPositions();
    }

    // main.js - Updated resetViewHard function
    // main.js - Enhanced resetViewHard function for mobile
    function resetViewHard() {
        // Reset all transform state
        scale = 1;
        posX = 0;
        posY = 0;

        // Reset pinch state
        isPinching = false;
        lastPinchDistance = null;

        // Add reset transition class for smooth animation
        pan.classList.add('reset-transition');

        // Reset transform with important properties
        pan.style.cssText = `
        transform: translate(0px, 0px) scale(1) !important;
        transform-origin: center center !important;
        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
    `;

        // Force browser to recognize the change
        void pan.offsetWidth; // Trigger reflow

        // Smoothly apply reset
        requestAnimationFrame(() => {
            pan.style.transform = 'translate(0px, 0px) scale(1)';

            // Update button positions after animation
            setTimeout(() => {
                pan.classList.remove('reset-transition');
                updateButtonPositions();

                // Final check to ensure reset
                setTimeout(() => {
                    if (Math.abs(scale - 1) > 0.01 || Math.abs(posX) > 1 || Math.abs(posY) > 1) {
                        // Force hard reset if not properly reset
                        scale = 1;
                        posX = 0;
                        posY = 0;
                        pan.style.transform = 'translate(0px, 0px) scale(1)';
                        updateButtonPositions();
                    }
                }, 100);
            }, 300);
        });

        // Immediate position update
        updateButtonPositions();
    }

    // Get image metadata for buttons.js
    function getImageMetadata() {
        return {
            naturalWidth: img.clientWidth,
            naturalHeight: img.clientHeight,
            scale: scale,
            src: img.src,
            dataURL: img.src.startsWith('data:') ? img.src : null,
            transform: { scale, posX, posY }
        };
    }

    function applyTransform() {
        pan.style.transformOrigin = 'center center';
        pan.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
        updateButtonPositions();
    }


    // Update button positions
    function updateButtonPositions() {
        if (buttons.updateButtonPositions) {
            buttons.updateButtonPositions();
        }
        if (window.DimmerModule && DimmerModule.updatePositions) {
            DimmerModule.updatePositions();
        }
    }

    // Handle image panning
    function startPan(e) {
        // Don't start panning if clicking on a button
        if (e.target.closest('.light-button')) return;

        isDragging = true;
        container.classList.add('grabbing');

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        dragStart.x = clientX;
        dragStart.y = clientY;
        panStart.x = posX;
        panStart.y = posY;

        e.preventDefault();
    }

    function doPan(e) {
        if (!isDragging) return;

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        // Calculate movement
        const deltaX = clientX - dragStart.x;
        const deltaY = clientY - dragStart.y;

        // Apply movement to position
        posX = panStart.x + deltaX;
        posY = panStart.y + deltaY;

        // Apply boundaries
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;

        // Real visible image size
        const scaledW = img.clientWidth * scale;
        const scaledH = img.clientHeight * scale;

        // Maximum panning amounts
        const maxX = Math.max(0, (scaledW - containerW) / 2);
        const maxY = Math.max(0, (scaledH - containerH) / 2);

        // Allow dragging only if image is larger than container
        if (scaledW > containerW) {
            posX = Math.max(-maxX, Math.min(maxX, posX));
        } else {
            posX = 0; // Center if image fits
        }

        if (scaledH > containerH) {
            posY = Math.max(-maxY, Math.min(maxY, posY));
        } else {
            posY = 0; // Center if image fits
        }

        applyTransform();
        e.preventDefault();
    }

    function stopPan() {
        isDragging = false;
        container.classList.remove('grabbing');
    }

    // Handle zooming
    function handleZoom(e) {
        e.preventDefault();

        // Calculate zoom factor
        const zoomIntensity = 0.001;
        const delta = e.deltaY;
        const zoomFactor = 1 - delta * zoomIntensity;

        const oldScale = scale;
        scale = Math.min(maxScale, Math.max(minScale, scale * zoomFactor));

        if (scale === oldScale) return;

        // Get mouse position relative to container center
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        // Adjust position to zoom toward mouse
        const scaleChange = scale / oldScale;
        posX = mouseX - (mouseX - posX) * scaleChange;
        posY = mouseY - (mouseY - posY) * scaleChange;

        applyTransform();
    }

    // Update brightness/percentage for dimmers and fans
    function updateBrightness(entityId, brightness, buttonId) {
        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            console.log("Not ready to update brightness");
            return;
        }

        const domain = getDomainFromEntityId(entityId);

        if (domain === 'light') {
            // Convert percentage to HA brightness value (0-255)
            const haBrightness = Math.round((brightness / 100) * 255);

            ws.send(JSON.stringify({
                id: Date.now(),
                type: "call_service",
                domain: "light",
                service: "turn_on",
                service_data: {
                    entity_id: entityId,
                    brightness: haBrightness
                }
            }));

            console.log(`Light brightness updated to ${brightness}% (${haBrightness})`);
            updateFooter(`Brightness set to ${brightness}%`);
        }
        else if (domain === 'fan') {
            // Convert percentage to fan speed percentage
            const percentage = Math.round(brightness);

            ws.send(JSON.stringify({
                id: Date.now(),
                type: "call_service",
                domain: "fan",
                service: "set_percentage",
                service_data: {
                    entity_id: entityId,
                    percentage: percentage
                }
            }));

            console.log(`Fan speed set to ${brightness}%`);
            updateFooter(`Fan speed set to ${brightness}%`);
        }
    }

    // Save design to localStorage and JSON file
    function saveDesign() {
        const buttonData = buttons.save();
        const dimmerData = window.DimmerModule ? DimmerModule.getDimmerButtons() : [];

        const designData = {
            meta: {
                savedAt: new Date().toISOString(),
                version: '1.1',
                hasDimmers: dimmerData.length > 0
            },
            image: buttonData.image || '',
            buttons: buttonData.buttons || [],
            dimmers: dimmerData,
            transform: buttonData.transform || {}
        };

        // Save to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(designData));
            console.log('Design saved to localStorage');
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }

        // Create blob and download JSON file
        const blob = new Blob([JSON.stringify(designData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'floorplan-design.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        // Update footer
        updateFooter('Design saved!');
    }

    // Load design from JSON file
    function loadDesign(file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const designData = JSON.parse(e.target.result);
                applyDesign(designData);

                // Save to localStorage when loading from file
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(designData));
                    console.log('Design saved to localStorage');
                } catch (error) {
                    console.error('Failed to save to localStorage:', error);
                }

            } catch (error) {
                console.error("Error loading design:", error);
                alert("Error loading design file. Please check the file format.");
            }
        };

        reader.readAsText(file);
    }

    // Load design from URL (load.json)
    async function loadDesignFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.status}`);
            }

            const designData = await response.json();
            console.log(`Design loaded from ${url}`);
            applyDesign(designData);

            // Save to localStorage when loading from URL
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(designData));
                console.log('Design saved to localStorage');
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }

        } catch (error) {
            console.error(`Error loading design from ${url}:`, error);
            // Don't show alert for default file - it's optional
            if (url !== DEFAULT_LOAD_FILE) {
                alert(`Error loading design from ${url}. Please check if the file exists and is valid JSON.`);
            }
        }
    }

    // Apply design data to the interface
    function applyDesign(designData) {
        // Helper: load data + update HA states
        function finishLoading() {
            // Clear existing buttons and dimmers
            clearAllButtons();

            // Load regular buttons
            if (designData.buttons) {
                buttons.load(designData);
            }

            // Load dimmers
            if (designData.dimmers && window.DimmerModule) {
                designData.dimmers.forEach(dimmerConfig => {
                    DimmerModule.create(dimmerConfig);
                });
            }

            // Apply transform if available
            if (designData.transform) {
                scale = designData.transform.scale || scale;
                posX = designData.transform.posX || posX;
                posY = designData.transform.posY || posY;
                applyTransform();
            } else {
                initImage();
            }

            // Request updated HA light states
            if (ready && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    id: Date.now(),
                    type: "get_states"
                }));
            }

            updateFooter("Design loaded!");
        }

        // Image handling
        if (designData.image) {
            if (designData.image.startsWith('data:')) {
                img.onload = finishLoading;
                img.src = designData.image;
            } else {
                if (confirm("Image not included — please upload the floorplan image now.")) {
                    imageFileInput.onchange = function () {
                        const imageFile = imageFileInput.files[0];
                        const imageReader = new FileReader();
                        imageReader.onload = function (ev) {
                            img.onload = finishLoading;
                            img.src = ev.target.result;
                        };
                        imageReader.readAsDataURL(imageFile);
                    };
                    imageFileInput.click();
                    return;
                }
            }
        } else {
            img.onload = finishLoading;
            img.src = img.src;
        }
    }

    // Clear all buttons, dimmers, and localStorage
    function clearAll() {
        if (!confirm("Are you sure you want to clear all buttons, dimmers, and reset the design? This action cannot be undone.")) {
            return;
        }

        // Clear all buttons from buttons module
        buttons.getButtons().forEach(button => {
            buttons.deleteButton(button.id);
        });

        // Clear all dimmers
        if (window.DimmerModule && DimmerModule.getDimmerButtons) {
            DimmerModule.getDimmerButtons().forEach(dimmer => {
                DimmerModule.deleteButton(dimmer.id);
            });
        }

        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);

        // Reset image to default
        img.src = 'image.png';

        // Reset transform
        initImage();

        updateFooter('All cleared!');
    }

    // Clear all buttons and dimmers (without confirmation, used internally)
    function clearAllButtons() {
        // Clear all buttons from buttons module
        const allButtons = buttons.getButtons();
        allButtons.forEach(button => {
            buttons.deleteButton(button.id);
        });

        // Clear all dimmers
        if (window.DimmerModule && DimmerModule.getDimmerButtons) {
            const allDimmers = DimmerModule.getDimmerButtons();
            allDimmers.forEach(dimmer => {
                DimmerModule.deleteButton(dimmer.id);
            });
        }
    }

    // Load design from localStorage on page load
    function loadFromStorage() {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            if (storedData) {
                const designData = JSON.parse(storedData);
                console.log('Loading design from localStorage');
                applyDesign(designData);
                return true;
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
        }
        return false;
    }

    // Update footer text
    function updateFooter(text) {
        const footer = document.querySelector('.footer');
        footer.innerHTML = `${text} <button class="footer-control load-btn" id="loadBtn">📂 Load...</button>`;

        // Update the load button event listener
        const newLoadBtn = document.getElementById('loadBtn');
        if (newLoadBtn) {
            newLoadBtn.addEventListener('click', () => {
                // Load from DEFAULT_LOAD_FILE when clicked
                loadDesignFromURL(DEFAULT_LOAD_FILE);
            });
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.notification-indicator');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification-indicator`;
        notification.style.background = type === 'error' ? '#ff4757' :
            type === 'success' ? '#2ed573' :
                '#3742fa';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-remove after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2000);
    }

    // Set up event listeners
    function setupEventListeners() {
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isPinching = true;
                lastPinchDistance = getDistance(e.touches[0], e.touches[1]);
                e.preventDefault();
            }
        }, { passive: false });

        container.addEventListener('touchmove', (e) => {
            if (!isPinching || e.touches.length !== 2) return;

            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const zoomFactor = currentDistance / lastPinchDistance;

            const oldScale = scale;
            scale *= zoomFactor;
            scale = Math.min(maxScale, Math.max(minScale, scale));

            // Zoom towards center of pinch
            const rect = container.getBoundingClientRect();
            const centerX =
                (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - rect.width / 2;
            const centerY =
                (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top - rect.height / 2;

            const scaleChange = scale / oldScale;
            posX = centerX - (centerX - posX) * scaleChange;
            posY = centerY - (centerY - posY) * scaleChange;

            lastPinchDistance = currentDistance;
            applyTransform();

            e.preventDefault();
        }, { passive: false });

        container.addEventListener('touchend', () => {
            if (isPinching) {
                isPinching = false;
                lastPinchDistance = null;
            }
        });


        // Image panning
        container.addEventListener('mousedown', (e) => {
            if (e.target.closest('.light-button')) return;
            startPan(e);
        });

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1 || e.target.closest('.light-button')) return;
            startPan(e);
        }, { passive: false });

        // Move events
        window.addEventListener('mousemove', (e) => {
            if (isDragging) doPan(e);
        });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 1) return;
            if (isDragging) doPan(e);
        }, { passive: false });

        // End events
        window.addEventListener('mouseup', stopPan);
        window.addEventListener('touchend', stopPan);

        // Zoom
        container.addEventListener('wheel', handleZoom, { passive: false });

        // main.js - Updated reset button event listener
        resetBtn.addEventListener('click', () => {
            resetViewHard();

            // Add visual feedback
            resetBtn.innerHTML = '✓';
            resetBtn.style.background = '#4CAF50';

            setTimeout(() => {
                resetBtn.innerHTML = '↺';
                resetBtn.style.background = 'rgba(0,0,0,0.7)';
            }, 1000);
        });


        // Edit mode toggle
        editBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;

            if (isEditMode) {
                editBtn.textContent = '✓ Done';
                editBtn.classList.add('edit-mode');
                container.classList.add('edit-mode');
                editControls.style.display = 'flex';

                // Enable edit mode in both modules
                buttons.enableEditMode(true);
                if (window.DimmerModule && DimmerModule.enableEditMode) {
                    DimmerModule.enableEditMode(true);
                }
            } else {
                editBtn.textContent = '✎ Edit';
                editBtn.classList.remove('edit-mode');
                container.classList.remove('edit-mode');
                editControls.style.display = 'none';

                // Disable edit mode in both modules
                buttons.enableEditMode(false);
                if (window.DimmerModule && DimmerModule.enableEditMode) {
                    DimmerModule.enableEditMode(false);
                }
            }
        });

        // Save button
        saveBtn.addEventListener('click', saveDesign);

        // Load button - CHANGED: Now loads DEFAULT_LOAD_FILE directly
        loadBtn.addEventListener('click', () => {
            loadDesignFromURL(DEFAULT_LOAD_FILE);
        });

        // Keep the file input for manual loading if needed
        loadFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                loadDesign(e.target.files[0]);
            }
        });

        // Clear All button
        clearAllBtn.addEventListener('click', clearAll);

        // Image button (edit mode)
        imageBtn.addEventListener('click', () => imageFileInput.click());
        imageFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    img.src = ev.target.result;
                    initImage();
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        // Add button (edit mode)
        addBtn.addEventListener('click', () => {
            document.getElementById('buttonPickerModal').style.display = 'flex';
        });
    }
    // --- FIX EDIT MODAL UPDATE ---
    document.getElementById("buttonEditForm").addEventListener("submit", function (e) {
        e.preventDefault();

        const entityId = document.getElementById("editEntityId").value.trim();
        const name = document.getElementById("editName").value.trim();
        const icon = document.getElementById("editIcon").value;

        const btnId = buttons.getEditingButtonId();  // Use the getter function

        if (!btnId) {
            alert("No button selected.");
            return;
        }

        if (!entityId) {
            alert("Entity ID is required.");
            return;
        }

        // Update the button configuration
        buttons.updateButtonConfig(btnId, {
            entityId: entityId,
            name: name || 'Button',
            iconClass: icon
        });

        // Close modal
        document.getElementById("buttonEditModal").style.display = "none";

        // Clear the editing button ID
        buttons.setEditingButtonId(null);
    });

    // Button edit modal close
    document.getElementById('closeEditBtn')?.addEventListener('click', () => {
        document.getElementById('buttonEditModal').style.display = 'none';
        editingButtonId = null;
        if (window.buttons) {
            window.buttons.setEditingButtonId(null);
        }
    });

    // Close on overlay click - also clear editing button ID
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
                editingButtonId = null;
                if (window.buttons) {
                    window.buttons.setEditingButtonId(null);
                }
            }
        });
    });

    // WebSocket Functions
    function connectWebSocket() {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log("WebSocket connected");
            ws.send(JSON.stringify({ type: "auth", access_token: TOKEN }));
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);

            if (data.type === "auth_ok") {
                console.log("Authentication successful");
                ready = true;

                // Get initial states
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 1,
                        type: "get_states"
                    }));

                    // Subscribe to changes
                    setTimeout(() => {
                        ws.send(JSON.stringify({
                            id: 2,
                            type: "subscribe_events",
                            event_type: "state_changed"
                        }));
                    }, 100);
                }, 100);
            }
            else if (data.type === "result" && Array.isArray(data.result)) {
                const states = data.result;

                // Update regular buttons
                buttons.getButtons().forEach(button => {
                    const st = states.find(s => s.entity_id === button.entityId);
                    if (st) {
                        updateLightUI(button.id, st.state === "on" || st.state === "open" || st.state === "playing");

                        const domain = getDomainFromEntityId(button.entityId);

                        // Handle brightness/percentage for different entity types
                        if (domain === 'light' || domain === 'fan') {
                            const brightness = st.attributes?.brightness || st.attributes?.percentage;
                            if (brightness !== undefined) {
                                // Convert to percentage
                                let brightnessPercent;
                                if (domain === 'light') {
                                    brightnessPercent = Math.round((brightness / 255) * 100);
                                } else {
                                    brightnessPercent = brightness; // Already in percentage for fans
                                }

                                if (window.DimmerModule && DimmerModule.handleStateUpdate) {
                                    DimmerModule.handleStateUpdate(
                                        button.entityId,
                                        st.state,
                                        brightnessPercent
                                    );
                                }
                            }
                        }
                    }
                });

                // Update dimmer buttons
                if (window.DimmerModule && DimmerModule.getDimmerButtons) {
                    DimmerModule.getDimmerButtons().forEach(dimmer => {
                        const st = states.find(s => s.entity_id === dimmer.entityId);
                        if (st) {
                            const brightness = st.attributes?.brightness;
                            const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0;
                            DimmerModule.handleStateUpdate(
                                dimmer.entityId,
                                st.state,
                                brightnessPercent
                            );
                        }
                    });
                }
            }
            else if (data.type === "event" && data.event?.event_type === "state_changed") {
                const entityId = data.event.data.entity_id;
                const newState = data.event.data.new_state;

                // Update regular buttons
                const allLights = buttons.getButtons().filter(l => l.entityId === entityId);
                allLights.forEach(light => {
                    updateLightUI(light.id, newState.state === "on");

                    // Update dimmer if applicable
                    if (light.type === 'dimmer') {
                        const brightness = newState.attributes?.brightness;
                        const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0;
                        if (window.DimmerModule && DimmerModule.handleStateUpdate) {
                            DimmerModule.handleStateUpdate(
                                entityId,
                                newState.state,
                                brightnessPercent
                            );
                        }
                    }
                });

                // Update dimmer module
                if (window.DimmerModule && DimmerModule.handleStateUpdate) {
                    const brightness = newState.attributes?.brightness;
                    const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0;
                    DimmerModule.handleStateUpdate(
                        entityId,
                        newState.state,
                        brightnessPercent
                    );
                }
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            buttons.getButtons().forEach(light => {
                const btn = document.getElementById(light.id);
                if (btn) btn.disabled = true;
            });

            // Disable dimmer buttons too
            if (window.DimmerModule && DimmerModule.getDimmerButtons) {
                DimmerModule.getDimmerButtons().forEach(dimmer => {
                    const btn = document.getElementById(dimmer.id);
                    if (btn) btn.disabled = true;
                });
            }
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected");
            buttons.getButtons().forEach(light => {
                const btn = document.getElementById(light.id);
                if (btn) btn.disabled = true;
            });

            // Disable dimmer buttons too
            if (window.DimmerModule && DimmerModule.getDimmerButtons) {
                DimmerModule.getDimmerButtons().forEach(dimmer => {
                    const btn = document.getElementById(dimmer.id);
                    if (btn) btn.disabled = true;
                });
            }

            ready = false;
            setTimeout(connectWebSocket, 3000);
        };
    }

    // Toggle light via WebSocket
    // main.js - Updated toggleLight function to handle multiple entity types
    function toggleLight(entityId, buttonId) {
        // Don't toggle if we're in edit mode
        if (isEditMode) {
            return;
        }

        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            console.log("Not ready to toggle");
            return;
        }

        const light = buttons.getButtons().find(l => l.entityId === entityId);
        if (!light) return;

        const btn = document.getElementById(buttonId);
        const isOn = btn.classList.contains('on');

        // For dimmers, ALWAYS open dimmer modal when clicked
        if (light.type === 'dimmer') {
            // Open dimmer modal
            if (window.DimmerModule && DimmerModule.openDimmerModal) {
                DimmerModule.openDimmerModal(light);
            }
            return;
        }

        // Determine domain and service based on entity ID
        const domain = getDomainFromEntityId(entityId);
        let service, serviceData;

        // For switch entities
        if (domain === 'switch') {
            service = isOn ? "turn_off" : "turn_on";
            serviceData = { entity_id: entityId };
        }
        // For light entities (including dimmers)
        else if (domain === 'light') {
            service = isOn ? "turn_off" : "turn_on";
            serviceData = { entity_id: entityId };
        }
        // For scene entities
        else if (domain === 'scene') {
            service = "turn_on";
            serviceData = { entity_id: entityId };
        }
        // For script entities
        else if (domain === 'script') {
            service = "turn_on";
            serviceData = { entity_id: entityId };
        }
        // For cover entities (garage doors, blinds)
        else if (domain === 'cover') {
            service = isOn ? "close_cover" : "open_cover";
            serviceData = { entity_id: entityId };
        }
        // For input_boolean entities
        else if (domain === 'input_boolean') {
            service = isOn ? "turn_off" : "turn_on";
            serviceData = { entity_id: entityId };
        }
        // For fan entities
        else if (domain === 'fan') {
            service = isOn ? "turn_off" : "turn_on";
            serviceData = { entity_id: entityId };
        }
        // Default to light domain
        else {
            service = isOn ? "turn_off" : "turn_on";
            serviceData = { entity_id: entityId };
        }

        ws.send(JSON.stringify({
            id: Date.now(),
            type: "call_service",
            domain: domain,
            service: service,
            service_data: serviceData
        }));

        // Update UI optimistically
        updateLightUI(buttonId, !isOn);

        // Update footer
        updateFooter(`${light.name} is ${!isOn ? 'on' : 'off'}`);
    }

    // Helper function to extract domain from entity ID
    function getDomainFromEntityId(entityId) {
        if (!entityId) return 'light';

        const parts = entityId.split('.');
        return parts.length > 0 ? parts[0] : 'light';
    }

    // Update light UI
    function updateLightUI(buttonId, isOn) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        const icon = btn.querySelector('.icon');
        const light = buttons.getButtons().find(l => l.id === buttonId);

        if (!light) return;

        // Determine entity type
        const domain = getDomainFromEntityId(light.entityId);

        if (isOn) {
            btn.classList.add('on');
            btn.classList.remove('off');

            // Add appropriate icon classes based on domain
            if (domain === 'cover') {
                icon.classList.add('fa-door-open');
            } else if (domain === 'fan') {
                icon.classList.add('fa-fan');
            } else {
                icon.classList.add('fa-solid');
            }
        } else {
            btn.classList.remove('on');
            btn.classList.add('off');

            // Remove appropriate icon classes
            if (domain === 'cover') {
                icon.classList.remove('fa-door-open');
                icon.classList.add('fa-door-closed');
            } else if (domain === 'fan') {
                icon.classList.remove('fa-fan');
            } else {
                icon.classList.remove('fa-solid');
            }
        }

        btn.disabled = false;
    }

    // Window resize handler
// main.js - Updated window resize handler
window.addEventListener("resize", () => {
    // Store current scale before reset
    const oldScale = scale;
    
    // Reinitialize image
    initImage();
    
    // If we were zoomed in, maintain some zoom level
    if (oldScale > 1.5) {
        scale = Math.min(oldScale, maxScale);
        applyTransform();
    }
    
    updateButtonPositions();
});

// main.js - Enhanced mobile zoom prevention
function setupMobileZoomPrevention() {
    // Prevent double-tap zoom
    let lastTap = 0;
    container.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            e.stopPropagation();
            
            // Optional: double-tap to zoom in/out
            // if (scale === 1) {
            //     scale = 2;
            // } else {
            //     resetViewHard();
            // }
            // applyTransform();
        }
        
        lastTap = currentTime;
    }, { passive: false });
    
    // Additional zoom prevention
    document.addEventListener('touchmove', (e) => {
        if (e.scale !== 1) {
            e.preventDefault();
        }
    }, { passive: false });
}
    // Initialize everything
    function init() {
        // Initialize buttons module first
        buttons.init(pan, getImageMetadata, {
            toggleLight: toggleLight,
            updateBrightness: updateBrightness
        });

        // Initialize dimmer module if available
        if (window.DimmerModule && DimmerModule.init) {
            DimmerModule.init({
                updateBrightness: updateBrightness
            });
        }

        initImage();
        setupMobileZoomPrevention(); 
        setupEventListeners();

        // Load priority:
        // 1. Try to load from localStorage first (user's saved state)
        // 2. If nothing in localStorage, automatically load from DEFAULT_LOAD_FILE
        if (!loadFromStorage()) {
            console.log('No localStorage found, loading default design from load.json...');
            showNotification('Loading default design...', 'info');

            // Automatically load from default load.json file
            loadDesignFromURL(DEFAULT_LOAD_FILE).then(() => {
                console.log('Default design loaded from load.json');
            }).catch((error) => {
                console.log('No load.json found, starting with default image');
                // If load.json doesn't exist, just use default image
                img.src = 'image.png';
                updateFooter('Ready');
            });
        }

        connectWebSocket();
    }

    // Start the application
    init();
});

// BLOCK ALL PAGE ZOOM EVENTS
document.addEventListener("wheel", e => {
    if (e.ctrlKey) e.preventDefault();
}, { passive: false });

document.addEventListener("keydown", e => {
    const key = e.key;
    if ((e.ctrlKey || e.metaKey) && (key === "=" || key === "-" || key === "0")) {
        e.preventDefault();
    }
});

function getDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
}
