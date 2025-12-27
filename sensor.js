// sensor.js - Standalone Sensor Button with Direct Configuration (FIXED TO SHOW ANY STATE VALUE)
window.SensorModule = (() => {
  // Module state
  let sensorButtons = []
  let isEditMode = false
  let isDragging = false
  let longPressTimer = null
  const dragStart = { x: 0, y: 0 }
  const dragThreshold = 10
  let currentDraggingButton = null

  // Global modal reference
  let sensorModal = null
  let currentEditingSensor = null
  let currentStateConfigs = []

  // Default configurations - EXPANDED for various states
  const DEFAULT_CONFIGS = [
    { stateValue: "home", displayName: "Home", icon: "person-fall-1.svg", color: "#22c55e", buttonText: "Home" },
    { stateValue: "not_home", displayName: "Away", icon: "person-fall-1.svg", color: "#ef4444", buttonText: "Away" },
    { stateValue: "present", displayName: "Present", icon: "person-fall-1.svg", color: "#22c55e", buttonText: "Present" },
    { stateValue: "absent", displayName: "Absent", icon: "person-fall-1.svg", color: "#ef4444", buttonText: "Absent" },
    { stateValue: "in", displayName: "In", icon: "door-closed.svg", color: "#22c55e", buttonText: "In" },
    { stateValue: "out", displayName: "Out", icon: "door-opened.svg", color: "#ef4444", buttonText: "Out" },
    { stateValue: "on", displayName: "On", icon: "door-opened.svg", color: "#22c55e", buttonText: "On" },
    { stateValue: "off", displayName: "Off", icon: "door-closed.svg", color: "#ef4444", buttonText: "Off" },
    { stateValue: "open", displayName: "Open", icon: "window-open.svg", color: "#22c55e", buttonText: "Open" },
    { stateValue: "closed", displayName: "Closed", icon: "window-closed.svg", color: "#ef4444", buttonText: "Closed" },
    { stateValue: "fall", displayName: "Fall Detected", icon: "alarm.svg", color: "#dc2626", buttonText: "Fall!" },
    { stateValue: "normal", displayName: "Normal", icon: "alarm.svg", color: "#16a34a", buttonText: "Normal" },
    { stateValue: "unknown", displayName: "Unknown", icon: "alarm.svg", color: "#f59e0b", buttonText: "?" },
    { stateValue: "unavailable", displayName: "Unavailable", icon: "alarm.svg", color: "#94a3b8", buttonText: "N/A" },
  ]

  const AVAILABLE_COLORS = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ]

  // Common sensor icons
  const SENSOR_ICONS = [
    "door-opened.svg",
    "door-closed.svg",
    "alarm.svg",
    "sensor-presence1.svg",
    "person-fall-1.svg",
    "window-open.svg",
    "window-closed.svg",
    "motion-sensor.svg",
    "temperature.svg",
    "humidity.svg",
    "light-bulb-1.svg",
    "light-bulb-2.svg",
    "camera.svg",
    "lock.svg",
    "lock-open.svg",
  ]

  // Inject CSS styles
  function injectStyles() {
    if (document.querySelector("#sensor-module-styles")) return

    const style = document.createElement("style")
    style.id = "sensor-module-styles"
    style.textContent = `
            /* Sensor Button Styles - EXACTLY LIKE CCT */
            .light-button.sensor {
                background: white;
                border: 1px solid #ddd;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                cursor: pointer;
            }

            .light-button.sensor .icon {
                color: #666;
            }

            .light-button.sensor.on {
                box-shadow: 0 0 15px rgba(255, 200, 0, 0.8);
            }

            .light-button.sensor.on .icon {
                color: #ffcc00;
            }

            .light-button.sensor.off .icon {
                color: #666;
            }

            /* Edit mode for Sensor - EXACTLY LIKE CCT */
            .edit-mode .light-button.sensor {
                border: 2px dashed #4CAF50;
                background-color: rgba(255, 255, 255, 0.9);
                cursor: grab;
            }

            .edit-mode .light-button.sensor:hover {
                border: 2px dashed #f44336;
            }

            .edit-mode .light-button.sensor.dragging {
                z-index: 1000;
                border: 2px solid #f44336;
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
                cursor: grabbing;
            }

            /* Status dot for sensors */
            .light-button.sensor .status-dot {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                transition: all 0.3s ease;
                border: 1px solid rgba(255, 255, 255, 0.8);
                box-shadow: 0 0 8px currentColor;
                z-index: 101;
            }

            /* Sensor state label */
            .light-button.sensor .state-label {
                position: absolute;
                bottom: 2px;
                left: 0;
                width: 100%;
                text-align: center;
                font-size: 9px;
                font-weight: bold;
                color: #000;
                text-shadow: 0 1px 1px rgba(255,255,255,0.8);
                pointer-events: none;
                z-index: 100;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding: 0 2px;
            }

            /* Sensor Modal Styles */
            .sensor-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }

            .sensor-modal-content {
                background: white;
                border-radius: 12px;
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
                padding: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }

            .sensor-modal .close-modal {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #000;
                z-index: 1001;
                width: 30px;
                height: 30px;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .sensor-modal .close-modal:hover {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 50%;
            }

            .sensor-modal-header {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }

            .sensor-modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin: 0;
            }

            .sensor-current-state {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #007bff;
            }

            .sensor-state-config {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 15px;
                border: 1px solid #dee2e6;
            }

            .state-config-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .state-config-title {
                font-weight: 600;
                color: #495057;
                font-size: 14px;
            }

            .remove-config-btn {
                background: #dc3545;
                color: white;
                border: none;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .config-input-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }

            .config-form-group {
                margin-bottom: 15px;
            }

            .config-label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #495057;
                font-size: 12px;
            }

            .config-input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 6px;
                font-size: 14px;
            }

            .config-input:focus {
                outline: none;
                border-color: #80bdff;
                box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
            }

            .icon-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 8px;
                max-height: 120px;
                overflow-y: auto;
                padding: 10px;
                background: white;
                border: 1px solid #ced4da;
                border-radius: 6px;
            }

            .icon-option {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid transparent;
                border-radius: 6px;
                cursor: pointer;
                background: #f8f9fa;
            }

            .icon-option.selected {
                border-color: #007bff;
                background: #e7f3ff;
            }

            .icon-option img {
                width: 20px;
                height: 20px;
                opacity: 0.8;
            }

            .icon-option.selected img {
                opacity: 1;
            }

            .color-picker {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                align-items: center;
            }

            .color-option {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 2px solid transparent;
                cursor: pointer;
                transition: transform 0.2s;
            }

            .color-option.selected {
                border-color: #212529;
                transform: scale(1.1);
            }

            .custom-color-wrapper {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: 10px;
            }

            .hex-input {
                width: 80px;
                padding: 4px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                font-family: monospace;
            }

            .preview-area {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 12px;
                background: white;
                border-radius: 8px;
                border: 1px solid #dee2e6;
                margin-top: 10px;
            }

            .preview-icon {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background: #f8f9fa;
            }

            .preview-glow {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 0 10px rgba(0,0,0,0.2);
            }

            .modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
            }

            .sensor-btn {
                padding: 8px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 0.2s;
            }

            .sensor-btn-primary {
                background: #007bff;
                color: white;
            }

            .sensor-btn-primary:hover {
                background: #0056b3;
            }

            .sensor-btn-secondary {
                background: #6c757d;
                color: white;
            }

            .sensor-btn-secondary:hover {
                background: #545b62;
            }

            .sensor-btn-add {
                background: #28a745;
                color: white;
                width: 100%;
                margin-bottom: 15px;
            }

            .sensor-btn-add:hover {
                background: #1e7e34;
            }
                 .light-button.sensor .icon svg {
            width: 18px !important;
            height: 18px !important;
        }
        
        /* Make room for state label */
        .light-button.sensor .icon {
            margin-top: -5px;
        }
        
        /* Sensor state label - smaller font */
        .light-button.sensor .state-label {
            position: absolute;
            bottom: 2px;
            left: 0;
            width: 100%;
            text-align: center;
            font-size: 8px !important;
            font-weight: bold;
            color: #000;
            text-shadow: 0 1px 1px rgba(255,255,255,0.8);
            pointer-events: none;
            z-index: 100;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            padding: 0 1px;
        }
        
        `
    document.head.appendChild(style)
  }

  // Create configuration modal
  function createConfigModal() {
    if (document.getElementById("sensorConfigModal")) return

    const modalHTML = `
            <div class="sensor-modal" id="sensorConfigModal">
                <div class="sensor-modal-content"  style="display: none !important">
                    <button class="close-modal" id="sensorCloseBtn">&times;</button>
                    
                    <div class="sensor-modal-header">
                        <h3 class="sensor-modal-title">Sensor Configuration</h3>
                    </div>
                    
                    <div class="sensor-current-state">
                        <div><strong>Current State:</strong> <span id="sensorCurrentStateDisplay">Unknown</span></div>
                        <div><strong>Entity:</strong> <span id="sensorCurrentEntityDisplay">Not set</span></div>
                    </div>
                    
                    <div id="sensorStateConfigsContainer">
                        <!-- Configurations will be loaded here -->
                    </div>
                    
                    <button class="sensor-btn sensor-btn-add" id="sensorAddConfigBtn">
                        + Add State Configuration
                    </button>
                    
                    <div class="modal-actions">
                        <button class="sensor-btn sensor-btn-secondary" id="sensorCancelBtn">Cancel</button>
                        <button class="sensor-btn sensor-btn-primary" id="sensorSaveBtn">Save</button>
                    </div>
                </div>
            </div>
        `

    document.body.insertAdjacentHTML("beforeend", modalHTML)

    sensorModal = document.getElementById("sensorConfigModal")

    // Add event listeners
    document.getElementById("sensorCloseBtn").addEventListener("click", closeConfigModal)
    document.getElementById("sensorCancelBtn").addEventListener("click", closeConfigModal)
    document.getElementById("sensorSaveBtn").addEventListener("click", saveConfigurations)
    document.getElementById("sensorAddConfigBtn").addEventListener("click", addStateConfig)

    // Close modal on outside click
    sensorModal.addEventListener("click", (e) => {
      if (e.target === sensorModal) {
        closeConfigModal()
      }
    })

    // ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sensorModal.style.display === "flex") {
        closeConfigModal()
      }
    })
  }

  // Create sensor button - WITH STATE LABEL
  function createSensorButton(config) {
    // Remove existing if present
    const existing = document.getElementById(config.id)
    if (existing) existing.remove()

    const button = document.createElement("button")
    button.id = config.id
    button.className = "light-button sensor"
    button.dataset.entityId = config.entityId
    button.dataset.type = "sensor"
    button.dataset.icon = config.sensorConfig?.[0]?.icon || "alarm.svg"
    button.dataset.name = config.name || "Sensor"
    button.title = config.name || "Sensor"

    // Create icon container WITH STATE LABEL
    button.innerHTML = `
        <div class="icon"></div>
        <div class="status-dot"></div>
        <div class="state-label">${config.buttonText || config.currentState || ""}</div>
    `

    // Set SVG icon
    if (window.SVGIcons) {
      window.SVGIcons.setIconImmediately(button, config.iconClass || "alarm.svg")
    }

    // Set initial state
    if (config.isOn && config.currentState !== "off" && config.currentState !== "unknown") {
      button.classList.add("on")
      button.classList.remove("off")
    } else {
      button.classList.remove("on")
      button.classList.add("off")
    }

    // Update icon color based on state
    if (window.SVGIcons && window.SVGIcons.updateIconColor) {
      window.SVGIcons.updateIconColor(button)
    }

    // Add event listeners
    setupSensorButtonEvents(button, config)

    // Append to pan layer
    const panLayer = document.getElementById("panLayer")
    if (panLayer) {
      panLayer.appendChild(button)

      // Position button
      const img = document.getElementById("viewImage")
      if (img) {
        const imgWidth = img.clientWidth
        const imgHeight = img.clientHeight

        button.style.left = `${config.position.x * imgWidth}px`
        button.style.top = `${config.position.y * imgHeight}px`
      }
    }

    // Update appearance with current state
    updateButtonAppearance(config)

    return button
  }

  // Setup sensor button events
  function setupSensorButtonEvents(button, config) {
    let startX = 0
    let startY = 0
    let startLeft = 0
    let startTop = 0

    // Mouse down handler
    button.addEventListener("mousedown", (e) => {
      if (!isEditMode) {
        e.stopPropagation()
        e.preventDefault()
        return
      }

      e.stopPropagation()
      e.preventDefault()

      startX = e.clientX
      startY = e.clientY

      const rect = button.getBoundingClientRect()
      startLeft = Number.parseFloat(button.style.left) || rect.left
      startTop = Number.parseFloat(button.style.top) || rect.top

      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }

      longPressTimer = setTimeout(() => {
        const movedX = Math.abs(e.clientX - startX)
        const movedY = Math.abs(e.clientY - startY)

        if (movedX < dragThreshold && movedY < dragThreshold && !isDragging) {
          showEditModal(config)
        }

        longPressTimer = null
      }, 600)

      const mouseMoveHandler = (moveEvent) => {
        const moveX = Math.abs(moveEvent.clientX - startX)
        const moveY = Math.abs(moveEvent.clientY - startY)

        if ((moveX > dragThreshold || moveY > dragThreshold) && longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
          startDrag(moveEvent, button, config)

          document.removeEventListener("mousemove", mouseMoveHandler)
        }
      }

      document.addEventListener("mousemove", mouseMoveHandler)

      const cleanup = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
        document.removeEventListener("mousemove", mouseMoveHandler)
        document.removeEventListener("mouseup", cleanup)
      }

      document.addEventListener("mouseup", cleanup)
    })

    // Click handler (non-edit mode only)
    button.addEventListener("click", (e) => {
      if (isEditMode) {
        e.stopPropagation()
        e.preventDefault()
        return
      }

      if (config.entityId && !isDragging) {
        e.stopPropagation()
        e.preventDefault()
        openConfigModal(config)
      }
    })

    // Touch events
    button.addEventListener("touchstart", (e) => {
      if (!isEditMode) return

      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY

      const rect = button.getBoundingClientRect()
      startLeft = Number.parseFloat(button.style.left) || rect.left
      startTop = Number.parseFloat(button.style.top) || rect.top

      e.stopPropagation()
      e.preventDefault()
    })

    button.addEventListener("touchmove", (e) => {
      if (!isEditMode) return

      const touch = e.touches[0]
      const moveX = Math.abs(touch.clientX - startX)
      const moveY = Math.abs(touch.clientY - startY)

      if (moveX > dragThreshold || moveY > dragThreshold) {
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
        startDrag(e, button, config)
      }

      e.preventDefault()
    })

    button.addEventListener("touchend", () => {
      if (isEditMode) {
        if (longPressTimer && !isDragging) {
          clearTimeout(longPressTimer)
          showEditModal(config)
          longPressTimer = null
        }

        if (isDragging) {
          stopDrag()
        }
      }
    })

    button.addEventListener("contextmenu", (e) => {
      if (isEditMode) e.preventDefault()
      return false
    })
  }

  // Start dragging
  function startDrag(e, button, config) {
    isDragging = true
    button.classList.add("dragging")
    button.style.cursor = "grabbing"

    const startDragX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX
    const startDragY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY

    const originalLeft = Number.parseFloat(button.style.left)
    const originalTop = Number.parseFloat(button.style.top)

    const dragMoveHandler = (moveEvent) => {
      if (!isDragging) return

      const clientX = moveEvent.type.includes("touch") ? moveEvent.touches[0].clientX : moveEvent.clientX
      const clientY = moveEvent.type.includes("touch") ? moveEvent.touches[0].clientY : moveEvent.clientY

      const deltaX = clientX - startDragX
      const deltaY = clientY - startDragY

      button.style.left = `${originalLeft + deltaX}px`
      button.style.top = `${originalTop + deltaY}px`

      moveEvent.preventDefault()
    }

    const dragEndHandler = () => {
      if (!isDragging) return

      isDragging = false
      button.classList.remove("dragging")
      button.style.cursor = "grab"

      const img = document.getElementById("viewImage")
      if (img) {
        const imgRect = img.getBoundingClientRect()
        const buttonRect = button.getBoundingClientRect()

        const relativeX = (buttonRect.left + buttonRect.width / 2 - imgRect.left) / imgRect.width
        const relativeY = (buttonRect.top + buttonRect.height / 2 - imgRect.top) / imgRect.height

        const index = sensorButtons.findIndex((b) => b.id === config.id)
        if (index !== -1) {
          sensorButtons[index].position = {
            x: Math.max(0, Math.min(1, relativeX)),
            y: Math.max(0, Math.min(1, relativeY)),
          }
          saveToLocalStorage()
        }
      }

      document.removeEventListener("mousemove", dragMoveHandler)
      document.removeEventListener("touchmove", dragMoveHandler)
      document.removeEventListener("mouseup", dragEndHandler)
      document.removeEventListener("touchend", dragEndHandler)
    }

    document.addEventListener("mousemove", dragMoveHandler)
    document.addEventListener("touchmove", dragMoveHandler, { passive: false })
    document.addEventListener("mouseup", dragEndHandler)
    document.addEventListener("touchend", dragEndHandler)
  }

  // Stop dragging
  function stopDrag() {
    isDragging = false
    currentDraggingButton = null

    sensorButtons.forEach((config) => {
      const btn = document.getElementById(config.id)
      if (btn) {
        btn.classList.remove("dragging")
        btn.style.cursor = "grab"
      }
    })
  }

  // Show edit modal (for entity/name editing)
  function showEditModal(config) {
    console.log("Sensor: Opening edit modal for:", config.id)

    if (window.selectButtonForEdit) {
      window.selectButtonForEdit(config.id, "sensor")
    }

    const editEntityId = document.getElementById("editEntityId")
    const editName = document.getElementById("editName")
    const editIcon = document.getElementById("editIcon")

    if (editEntityId) editEntityId.value = config.entityId || ""
    if (editName) editName.value = config.name || "Sensor"
    if (editIcon) editIcon.value = config.sensorConfig?.[0]?.icon || "alarm.svg"

    window.currentEditingButton = config.id
    window.currentEditingType = "sensor"

    if (window.buttons && window.buttons.setEditingButtonId) {
      window.buttons.setEditingButtonId(config.id)
    }

    const modal = document.getElementById("buttonEditModal")
    if (modal) {
      modal.style.display = "flex"
    }
  }

  // Update button appearance based on state - FIXED TO SHOW BUTTON TEXT
  function updateButtonAppearance(config) {
    const button = document.getElementById(config.id)
    if (!button) return

    // Get current state - accept ANY value
    const currentState = String(config.currentState || "").trim()
    
    console.log("[updateButtonAppearance] State:", currentState, "for sensor:", config.name)

    const configs = Array.isArray(config.sensorConfig) && config.sensorConfig.length 
        ? config.sensorConfig 
        : DEFAULT_CONFIGS

    // Try to find exact match
    let matched = configs.find((c) => 
        String(c.stateValue).toLowerCase() === currentState.toLowerCase()
    )

    // If no exact match, try partial match
    if (!matched) {
        matched = configs.find((c) => 
            currentState.toLowerCase().includes(String(c.stateValue).toLowerCase()) ||
            String(c.stateValue).toLowerCase().includes(currentState.toLowerCase())
        )
    }

    // Fallback: Use 'unknown' config or first available
    if (!matched) {
        matched = configs.find((c) => String(c.stateValue).toLowerCase() === "unknown") || 
                 configs[0] || 
                 DEFAULT_CONFIGS.find(c => c.stateValue === "unknown")
    }

    // Get button text to display
    const buttonText = matched ? matched.buttonText || matched.displayName || currentState : currentState
    
    // Update state label with button text
    const stateLabel = button.querySelector(".state-label")
    if (stateLabel) {
      stateLabel.textContent = buttonText
    }

    // Update button title
    button.title = `${config.name || "Sensor"}: ${currentState}`

    // ✅ ICON
    if (window.SVGIcons && matched && matched.icon) {
        window.SVGIcons.setIconImmediately(button, matched.icon)
        button.dataset.icon = matched.icon
    }

    // ✅ STATUS DOT
    const dot = button.querySelector(".status-dot")
    if (dot && matched && matched.color) {
        dot.style.backgroundColor = matched.color
        dot.style.boxShadow = `0 0 8px ${matched.color}`
    }

    // ✅ ICON COLOR UPDATE
    if (window.SVGIcons?.updateIconColor) {
        setTimeout(() => window.SVGIcons.updateIconColor(button), 10)
    }
  }

  // Open configuration modal
  function openConfigModal(config) {
    currentEditingSensor = config
    currentStateConfigs = [...(config.sensorConfig || DEFAULT_CONFIGS)]

    // Update modal with current values
    document.getElementById("sensorCurrentEntityDisplay").textContent = config.entityId || "Not set"
    
    // Show ACTUAL current state value
    const actualState = config.currentState || "unknown"
    document.getElementById("sensorCurrentStateDisplay").textContent = actualState

    // Load configurations
    loadStateConfigurations()

    // Show modal
    if (sensorModal) {
      sensorModal.style.display = "flex"
    }
  }

  // Close configuration modal
  function closeConfigModal() {
    if (sensorModal) {
      sensorModal.style.display = "none"
    }
    currentEditingSensor = null
    currentStateConfigs = []
  }

  // Load state configurations into modal
  function loadStateConfigurations() {
    const container = document.getElementById("sensorStateConfigsContainer")

    if (!currentStateConfigs || currentStateConfigs.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No configurations yet.</div>'
      return
    }

    container.innerHTML = ""

    currentStateConfigs.forEach((config, index) => {
      const configElement = createStateConfigElement(config, index)
      container.appendChild(configElement)

      populateIconsForConfig(index)
      populateColorsForConfig(index)
    })
  }

  // Create state configuration element
  function createStateConfigElement(config, index) {
    const element = document.createElement("div")
    element.className = "sensor-state-config"
    element.dataset.index = index

    element.innerHTML = `
            <div class="state-config-header">
                <div class="state-config-title">State Configuration ${index + 1}</div>
                <button class="remove-config-btn" data-index="${index}">&times;</button>
            </div>
            
            <div class="config-input-row">
                <div class="config-form-group">
                    <label class="config-label">State Value</label>
                    <input type="text" class="config-input" 
                           value="${config.stateValue}" 
                           placeholder="in, out, home, not_home, etc." 
                           data-field="stateValue"
                           data-index="${index}">
                </div>
                <div class="config-form-group">
                    <label class="config-label">Display Name</label>
                    <input type="text" class="config-input" 
                           value="${config.displayName}" 
                           placeholder="Door Open" 
                           data-field="displayName"
                           data-index="${index}">
                </div>
                <div class="config-form-group">
                    <label class="config-label">Button Text</label>
                    <input type="text" class="config-input" 
                           value="${config.buttonText || config.displayName || config.stateValue}" 
                           placeholder="Text shown in button" 
                           data-field="buttonText"
                           data-index="${index}"
                           maxlength="8">
                    <div style="font-size: 10px; color: #666; margin-top: 2px;">Short text for button (max 8 chars)</div>
                </div>
            </div>
            
            <div class="config-form-group">
                <label class="config-label">Icon</label>
                <input type="text" class="config-input" 
                       placeholder="Search icons..." 
                       data-index="${index}"
                       oninput="window.SensorModule.filterIcons(${index}, this.value)">
                <div class="icon-grid" id="icon-grid-${index}">
                    <!-- Icons will be populated here -->
                </div>
            </div>
            
            <div class="config-form-group">
                <label class="config-label">Color</label>
                <div class="color-picker" id="color-picker-${index}">
                    <!-- Color options will be populated here -->
                    <div class="custom-color-wrapper">
                        <input type="color" value="${config.color}" 
                               onchange="window.SensorModule.selectColor(${index}, this.value)">
                        <input type="text" class="hex-input" value="${config.color}" 
                               placeholder="#000000"
                               onchange="window.SensorModule.setHexColor(${index}, this.value)">
                    </div>
                </div>
            </div>
            
            <div class="preview-area">
                <div class="preview-icon" id="preview-icon-${index}">
                    <img src="./src/svg/${config.icon}" alt="${config.icon}" style="width: 20px; height: 20px;">
                </div>
                <div>
                    <div style="font-size: 12px; color: #666;">Preview</div>
                    <div style="font-weight: 500;">${config.displayName}</div>
                </div>
                <div class="preview-glow" id="preview-glow-${index}" 
                     style="background-color: ${config.color};"></div>
            </div>
        `

    const inputs = element.querySelectorAll(".config-input[data-field]")
    inputs.forEach((input) => {
      input.addEventListener("input", (e) => {
        const field = e.target.dataset.field
        const idx = Number.parseInt(e.target.dataset.index)
        if (!isNaN(idx) && currentStateConfigs[idx]) {
          currentStateConfigs[idx][field] = e.target.value
          updatePreview(idx)
        }
      })
    })

    const removeBtn = element.querySelector(".remove-config-btn")
    removeBtn.addEventListener("click", () => {
      removeStateConfig(index)
    })

    return element
  }

  // Populate icons for a configuration
  function populateIconsForConfig(index) {
    const iconGrid = document.getElementById(`icon-grid-${index}`)
    if (!iconGrid) return

    iconGrid.innerHTML = ""

    SENSOR_ICONS.forEach((iconName) => {
      const iconOption = document.createElement("div")
      iconOption.className = "icon-option"
      if (currentStateConfigs[index].icon === iconName) {
        iconOption.classList.add("selected")
      }

      iconOption.innerHTML = `<img src="./src/svg/${iconName}" alt="${iconName}">`
      iconOption.dataset.icon = iconName

      iconOption.addEventListener("click", () => {
        selectIcon(index, iconName)
      })

      iconGrid.appendChild(iconOption)
    })
  }

  // Filter icons
  function filterIcons(index, searchTerm) {
    const iconGrid = document.getElementById(`icon-grid-${index}`)
    if (!iconGrid) return

    const iconOptions = iconGrid.querySelectorAll(".icon-option")
    iconOptions.forEach((option) => {
      const iconName = option.dataset.icon || ""
      if (iconName.toLowerCase().includes(searchTerm.toLowerCase())) {
        option.style.display = "flex"
      } else {
        option.style.display = "none"
      }
    })
  }

  // Select icon
  function selectIcon(index, iconName) {
    if (!currentStateConfigs[index]) return

    currentStateConfigs[index].icon = iconName

    const iconGrid = document.getElementById(`icon-grid-${index}`)
    if (iconGrid) {
      iconGrid.querySelectorAll(".icon-option").forEach((option) => {
        option.classList.remove("selected")
      })

      const selectedOption = iconGrid.querySelector(`.icon-option[data-icon="${iconName}"]`)
      if (selectedOption) {
        selectedOption.classList.add("selected")
      }
    }

    updatePreview(index)
  }

  // Populate colors for configuration
  function populateColorsForConfig(index) {
    const colorPicker = document.getElementById(`color-picker-${index}`)
    if (!colorPicker) return

    const customWrapper = colorPicker.querySelector(".custom-color-wrapper")
    colorPicker.innerHTML = ""

    AVAILABLE_COLORS.forEach((color) => {
      const colorOption = document.createElement("div")
      colorOption.className = "color-option"
      colorOption.style.backgroundColor = color

      if (currentStateConfigs[index].color === color) {
        colorOption.classList.add("selected")
      }

      colorOption.addEventListener("click", () => {
        selectColor(index, color)
      })

      colorPicker.appendChild(colorOption)
    })

    colorPicker.appendChild(customWrapper)
  }

  // Select color
  function selectColor(index, color) {
    if (!currentStateConfigs[index]) return

    currentStateConfigs[index].color = color

    populateColorsForConfig(index)
    updatePreview(index)
  }

  // Set hex color
  function setHexColor(index, hex) {
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
      if (hex.length === 6 && /^[A-Fa-f0-9]{6}$/.test(hex)) {
        hex = "#" + hex
      } else {
        return
      }
    }

    selectColor(index, hex)
  }

  // Update preview
  function updatePreview(index) {
    const config = currentStateConfigs[index]
    if (!config) return

    const previewIcon = document.getElementById(`preview-icon-${index}`)
    if (previewIcon) {
      previewIcon.innerHTML = `<img src="./src/svg/${config.icon}" alt="${config.icon}" style="width: 20px; height: 20px;">`
    }

    const previewGlow = document.getElementById(`preview-glow-${index}`)
    if (previewGlow) {
      previewGlow.style.backgroundColor = config.color
    }

    const configElement = document.querySelector(`.sensor-state-config[data-index="${index}"]`)
    if (configElement) {
      const previewName = configElement.querySelector(".preview-area div:nth-child(2) div:nth-child(2)")
      if (previewName) {
        previewName.textContent = config.displayName
      }
    }
  }

  // Add state configuration
  function addStateConfig() {
    currentStateConfigs.push({
      stateValue: "new_state",
      displayName: "New State",
      buttonText: "New",
      icon: "alarm.svg",
      color: AVAILABLE_COLORS[0],
    })

    loadStateConfigurations()
  }

  // Remove state configuration
  function removeStateConfig(index) {
    if (currentStateConfigs.length <= 1) {
      alert("You must have at least one state configuration")
      return
    }

    if (confirm("Remove this configuration?")) {
      currentStateConfigs.splice(index, 1)
      loadStateConfigurations()
    }
  }

  // Save configurations
  function saveConfigurations() {
    try {
      const validConfigs = currentStateConfigs.filter((c) => c.stateValue.trim() && c.icon.trim())

      if (validConfigs.length === 0) {
        alert("Please configure at least one state with a value and icon")
        return
      }

      // Ensure buttonText exists for all configs
      validConfigs.forEach(config => {
        if (!config.buttonText) {
          config.buttonText = config.displayName || config.stateValue
        }
      })

      currentEditingSensor.sensorConfig = validConfigs

      saveToLocalStorage()

      updateButtonAppearance(currentEditingSensor)

      closeConfigModal()

      console.log("Sensor configurations saved:", currentEditingSensor)
    } catch (error) {
      console.error("Error saving configurations:", error)
      alert("Error saving configurations")
    }
  }

  // Load from localStorage
  function loadFromLocalStorage() {
    const saved = localStorage.getItem("sensorButtons")
    if (saved) {
      try {
        sensorButtons = JSON.parse(saved)
        restoreSensorButtons()
      } catch (error) {
        console.error("Error loading sensor buttons:", error)
        sensorButtons = []
      }
    }
  }

  // Save to localStorage
  function saveToLocalStorage() {
    const cleanSensors = sensorButtons.map((sensor) => ({
      id: sensor.id,
      type: "sensor",
      entityId: sensor.entityId || "",
      name: sensor.name || "Sensor",
      position: {
        x: Number(sensor.position.x.toFixed(4)),
        y: Number(sensor.position.y.toFixed(4)),
      },
      sensorConfig: sensor.sensorConfig || DEFAULT_CONFIGS,
      currentState: sensor.currentState || "",
      isOn: sensor.isOn || false,
    }))

    localStorage.setItem("sensorButtons", JSON.stringify(cleanSensors))
  }

  // Restore sensor buttons
  function restoreSensorButtons() {
    sensorButtons.forEach((config) => {
      createSensorButton(config)
    })
  }

  // Update positions
  function updatePositions() {
    const img = document.getElementById("viewImage")
    if (!img) return

    const imgWidth = img.clientWidth
    const imgHeight = img.clientHeight

    sensorButtons.forEach((config) => {
      const btn = document.getElementById(config.id)
      if (btn) {
        btn.style.left = `${config.position.x * imgWidth}px`
        btn.style.top = `${config.position.y * imgHeight}px`
      }
    })
  }

  // Create a new sensor button
  function create(config = {}) {
    if (!config.id) {
      config.id = "sensor_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    }

    if (!config.entityId) {
      const entityId = prompt("Enter Entity ID for Sensor (e.g., sensor.presence):", "")
      if (!entityId || !entityId.trim()) {
        alert("Sensor creation cancelled. Entity ID is required.")
        return null
      }
      config.entityId = entityId.trim()
    }

    if (!config.name) {
      const name = prompt("Enter sensor name (optional):", "Sensor") || "Sensor"
      config.name = name
    }

    config.type = "sensor"
    config.iconClass = config.sensorConfig?.[0]?.icon || "alarm.svg"
    config.sensorConfig = config.sensorConfig || DEFAULT_CONFIGS
    config.currentState = config.currentState || ""
    config.isOn = config.isOn || false
    config.position = config.position || { x: 0.5, y: 0.5 }

    sensorButtons.push(config)

    createSensorButton(config)

    saveToLocalStorage()

    return config.id
  }

  // Handle state updates from Home Assistant - FIXED TO SHOW BUTTON TEXT
  function handleStateUpdate(entityId, state, entity) {
    console.log("[SensorModule] STATE UPDATE:", entityId, "State:", state)

    let actualState = state
    
    // Extract state from entity object if needed
    if (state && typeof state === 'object') {
        if (state.state !== undefined) {
            actualState = state.state
        } else if (state.attributes && state.attributes.state !== undefined) {
            actualState = state.attributes.state
        } else if (state.value !== undefined) {
            actualState = state.value
        }
    }
    
    // Convert to string - accept ANY value
    const rawState = actualState !== undefined && actualState !== null ? 
                     String(actualState) : ""
    
    console.log("[SensorModule] Processed state:", rawState, "for entity:", entityId)

    let updated = false

    sensorButtons.forEach((sensor) => {
      if (sensor.entityId === entityId) {
        // Store whatever value comes in
        sensor.currentState = rawState
        
        console.log("[SensorModule] Updated sensor:", sensor.name, "with state:", rawState)

        const button = document.getElementById(sensor.id)
        if (button) {
          updateButtonAppearance(sensor)
          
          // Update modal if open
          if (currentEditingSensor && currentEditingSensor.id === sensor.id) {
            const stateDisplay = document.getElementById("sensorCurrentStateDisplay")
            if (stateDisplay) stateDisplay.textContent = rawState || "unknown"
          }
        }
        updated = true
      }
    })

    if (updated) {
      saveToLocalStorage()
      console.log("[SensorModule] State update saved")
    } else {
      console.log("[SensorModule] No sensor found for entity:", entityId)
    }
  }

  // Toggle edit mode
  function enableEditMode(flag) {
    isEditMode = flag

    sensorButtons.forEach((config) => {
      const btn = document.getElementById(config.id)
      if (btn) {
        if (flag) {
          btn.classList.add("edit-mode")
          btn.style.cursor = "grab"
        } else {
          btn.classList.remove("edit-mode")
          btn.style.cursor = ""
        }
      }
    })

    if (!flag) {
      saveToLocalStorage()
    }
  }

  // Get all sensor buttons
  function getSensorButtons() {
    return sensorButtons
  }

  // Update config
  function updateConfig(buttonId, newConfig) {
    const index = sensorButtons.findIndex((b) => b.id === buttonId)
    if (index === -1) return false

    const btnData = sensorButtons[index]
    const oldEntityId = btnData.entityId

    Object.assign(btnData, newConfig)

    const btn = document.getElementById(buttonId)
    if (!btn) return false

    // ICON UPDATE
    if (newConfig.iconClass) {
      if (window.SVGIcons) {
        window.SVGIcons.clearButtonIcons(btn)
        window.SVGIcons.setIconImmediately(btn, newConfig.iconClass)
      }
      btn.dataset.icon = newConfig.iconClass
    }

    // NAME UPDATE
    if (newConfig.name) {
      btn.dataset.name = newConfig.name
      btn.title = newConfig.name
    }

    // ENTITY SYNC
    if (newConfig.entityId && newConfig.entityId !== oldEntityId) {
      if (oldEntityId && window.EntityButtons?.[oldEntityId]) {
        window.EntityButtons[oldEntityId] = window.EntityButtons[oldEntityId].filter((b) => b.id !== buttonId)
      }

      if (!window.EntityButtons) window.EntityButtons = {}
      if (!window.EntityButtons[newConfig.entityId]) {
        window.EntityButtons[newConfig.entityId] = []
      }

      const entityButton = {
        id: buttonId,
        entityId: newConfig.entityId,
        isOn: false,
        updateUI() {
          const el = document.getElementById(this.id)
          if (!el) return
          el.classList.toggle("on", this.isOn)
          if (window.SVGIcons && window.SVGIcons.updateIconColor) {
            window.SVGIcons.updateIconColor(el)
          }
        },
        handleStateUpdate(state) {
          this.isOn = state === "on"
          this.updateUI()
        },
      }

      window.EntityButtons[newConfig.entityId].push(entityButton)
      btn.dataset.entityId = newConfig.entityId
    }

    saveToLocalStorage()
    return true
  }

  // Delete button
  function deleteButton(buttonId) {
    const index = sensorButtons.findIndex((b) => b.id === buttonId)
    if (index !== -1) {
      sensorButtons.splice(index, 1)

      const btn = document.getElementById(buttonId)
      if (btn) btn.remove()

      saveToLocalStorage()
      return true
    }
    return false
  }

  // Initialize module
  function init(cb) {
    injectStyles()

    createConfigModal()

    loadFromLocalStorage()

    console.log("SensorModule initialized successfully")

    // Return public API
    return {
      create,
      enableEditMode,
      updatePositions,
      getSensorButtons,
      updateConfig,
      deleteButton,
      handleStateUpdate,
      openConfigModal,
      // Modal functions
      filterIcons,
      selectIcon,
      selectColor,
      setHexColor,
      removeStateConfig,
    }
  }

  // Debug functions
  window.debugSensors = () => {
    console.log("=== SENSOR DEBUG ===")
    sensorButtons.forEach((sensor, i) => {
      console.log(`Sensor ${i}:`, {
        id: sensor.id,
        entityId: sensor.entityId,
        name: sensor.name,
        currentState: sensor.currentState,
        configs: sensor.sensorConfig,
        isOn: sensor.isOn,
      })

      const btn = document.getElementById(sensor.id)
      if (btn) {
        console.log("Button:", {
          classes: btn.className,
          dataset: btn.dataset,
          stateLabel: btn.querySelector(".state-label")?.textContent,
          statusDot: btn.querySelector(".status-dot")?.style.backgroundColor
        })
      }
    })
    console.log("=== END DEBUG ===")
  }

  window.testSensorState = (entityId, state) => {
    console.log("Testing sensor with state:", state)
    handleStateUpdate(entityId, state)
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.SensorModule = init()
    })
  } else {
    window.SensorModule = init()
  }

  // Public API
  return {
    init,
    create,
    enableEditMode,
    updatePositions,
    getSensorButtons,
    updateConfig,
    deleteButton,
    handleStateUpdate,
    openConfigModal,
    // Modal functions
    filterIcons,
    selectIcon,
    selectColor,
    setHexColor,
    removeStateConfig,
  }
})()