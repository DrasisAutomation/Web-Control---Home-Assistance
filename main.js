document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const container = document.getElementById("container");
    const pan = document.getElementById("panLayer");
    const img = document.getElementById("viewImage");
    const resetBtn = document.getElementById("resetBtn");
    const editBtn = document.getElementById("editBtn");
    const saveBtn = document.getElementById("saveBtn");
    const loadBtn = document.getElementById("loadBtn");
    const imageBtn = document.getElementById("imageBtn");
    const addBtn = document.getElementById("addBtn");
    const editControls = document.getElementById("editControls");
    const imageFileInput = document.getElementById("imageFileInput");
    const loadFileInput = document.getElementById("loadFileInput");

    // Zoom and Pan variables
    let scale = 1;
    const maxScale = 5;
    let minScale = 1;

    let posX = 0;
    let posY = 0;

    // Image dimensions
    let imgNaturalW = 0;
    let imgNaturalH = 0;

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

    // Apply transform to pan layer
    function applyTransform() {
        pan.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
        updateButtonPositions();
    }

    // Update button positions
    function updateButtonPositions() {
        if (buttons.updateButtonPositions) {
            buttons.updateButtonPositions();
        }
    }

    // Handle image panning
    function startPan(e) {
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

    // Save design to JSON file
    function saveDesign() {
        const designData = buttons.save();

        // Create blob and download
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

                // Helper: load buttons + update HA states
                function finishLoading() {
                    buttons.load(designData);
                    initImage();

                    // 🔥 Request updated HA light states
                    if (ready && ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            id: Date.now(),
                            type: "get_states"
                        }));
                    }

                    updateFooter("Design loaded!");
                }

                // -------- IMAGE HANDLING ----------
                if (designData.image) {
                    if (designData.image.startsWith('data:')) {
                        // Image is embedded → load directly
                        img.onload = finishLoading;
                        img.src = designData.image;

                    } else {
                        // External image → user must upload the file
                        if (confirm("Image not included — please upload the floorplan image now.")) {

                            imageFileInput.onclick = null; // remove previous listeners
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
                    // No image in design → just load buttons
                    img.onload = finishLoading;
                    img.src = img.src; // trigger load
                }

            } catch (error) {
                console.error("Error loading design:", error);
                alert("Error loading design file. Please check the file format.");
            }
        };

        reader.readAsText(file);
    }

    // Update footer text
    function updateFooter(text) {
        const footer = document.querySelector('.footer');
        footer.innerHTML = `${text} <button class="footer-control load-btn" id="loadBtn">📂 Load</button>`;
        document.getElementById('loadBtn').addEventListener('click', () => loadFileInput.click());
    }

    // Set up event listeners
    function setupEventListeners() {
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

        // Reset button
        resetBtn.addEventListener('click', () => {
            initImage();
        });

        // Edit mode toggle
        editBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;

            if (isEditMode) {
                editBtn.textContent = '✓ Done';
                editBtn.classList.add('edit-mode');
                container.classList.add('edit-mode');
                editControls.style.display = 'flex';

                // Enable edit mode in buttons module
                buttons.enableEditMode(true);
            } else {
                editBtn.textContent = '✎ Edit';
                editBtn.classList.remove('edit-mode');
                container.classList.remove('edit-mode');
                editControls.style.display = 'none';

                // Disable edit mode in buttons module
                buttons.enableEditMode(false);
            }
        });

        // Save button
        saveBtn.addEventListener('click', saveDesign);

        // Load button
        loadBtn.addEventListener('click', () => loadFileInput.click());
        loadFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                loadDesign(e.target.files[0]);
            }
        });

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

                buttons.getButtons().forEach(light => {
                    const st = states.find(s => s.entity_id === light.entityId);
                    if (st) {
                        updateLightUI(light.id, st.state === "on");
                    }
                });

            }

            else if (data.type === "event" && data.event?.event_type === "state_changed") {
                const allLights = buttons.getButtons().filter(l => l.entityId === data.event.data.entity_id);

                allLights.forEach(light => {
                    updateLightUI(light.id, data.event.data.new_state.state === "on");
                });

            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            buttons.getButtons().forEach(light => {
                const btn = document.getElementById(light.id);
                if (btn) btn.disabled = true;
            });
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected");
            buttons.getButtons().forEach(light => {
                const btn = document.getElementById(light.id);
                if (btn) btn.disabled = true;
            });
            ready = false;
            setTimeout(connectWebSocket, 3000);
        };
    }

    // Toggle light via WebSocket
    function toggleLight(entityId, buttonId) {
        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            console.log("Not ready to toggle");
            return;
        }

        const light = buttons.getButtons().find(l => l.entityId === entityId);
        if (!light) return;

        const btn = document.getElementById(buttonId);
        const isOn = btn.classList.contains('on');
        const service = isOn ? "turn_off" : "turn_on";

        ws.send(JSON.stringify({
            id: Date.now(),
            type: "call_service",
            domain: "light",
            service: service,
            service_data: { entity_id: entityId }
        }));

        // Update UI optimistically
        updateLightUI(buttonId, !isOn);

        // Update footer
        updateFooter(`${light.name} is ${!isOn ? 'on' : 'off'}`);
    }

    // Update light UI
    function updateLightUI(buttonId, isOn) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        const icon = btn.querySelector('.icon');

        if (isOn) {
            btn.classList.add('on');
            icon.classList.add('fa-solid');
        } else {
            btn.classList.remove('on');
            icon.classList.remove('fa-solid');
        }

        btn.disabled = false;
    }

    // Window resize handler
    window.addEventListener("resize", () => {
        initImage();
    });

    // Initialize everything
    function init() {
        // Initialize buttons module first
        buttons.init(pan, getImageMetadata, {
            toggleLight: toggleLight
        });

        initImage();
        setupEventListeners();
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