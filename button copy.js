// buttons.js - Button management module with CCT, RGB, and Remote support (FIXED ICONS)
window.buttons = (() => {
  // Internal state
  let lightButtons = []
  let panElement = null
  let getImageMetaFn = null
  let callbacks = {}
  let isEditMode = false
  let currentDraggingButton = null
  let isDraggingButton = false
  const dragStart = { x: 0, y: 0 }
  const panStart = { x: 0, y: 0 }
  let longPressTimer = null
  let editingButtonId = null
  const dragThreshold = 10

  // Button types configuration
  const BUTTON_TYPES = {
    toggle: {
      name: "Toggle Light",
      icon: "light-bulb-1.svg",
      defaultName: "Light",
      type: "toggle",
    },
    sensor: {
      name: "Sensor",
      icon: "sensor-presence1.svg",
      defaultName: "Sensor",
      type: "sensor",
    },
    scene: {
      name: "Scene",
      icon: "scene.svg",
      defaultName: "Scene",
      type: "scene",
    },
    dimmer: {
      name: "Dimmer",
      icon: "dimmer.svg",
      defaultName: "Dimmer",
      type: "dimmer",
    },
    cct: {
      name: "CCT Light",
      icon: "light-bulb-1.svg",
      defaultName: "CCT Light",
      type: "cct",
    },
    rgb: {
      name: "RGB Light",
      icon: "light-bulb-1.svg",
      defaultName: "RGB Light",
      type: "rgb",
    },
    lock: {
      name: "Lock",
      icon: "lock.svg",
      defaultName: "Lock",
      type: "lock",
    },
    curtain: {
      name: "Curtain",
      icon: "curtain1.svg",
      defaultName: "Curtain",
      type: "curtain",
    },
    remote: {
      name: "Remote",
      icon: "remote.svg",
      defaultName: "Remote",
      type: "remote",
    },
  }

  // Initialize the module
  function init(panEl, imageMetaFn, cb) {
    panElement = panEl
    getImageMetaFn = imageMetaFn
    callbacks = cb || {}

    // Load saved positions from localStorage
    loadFromLocalStorage()
    setupModalListeners()

    return {
      enableEditMode,
      create,
      save,
      load,
      getButtons,
      updateButtonConfig,
      deleteButton,
      updateButtonPositions,
    }
  }

  // Load from localStorage
  function loadFromLocalStorage() {
    const savedPositions = localStorage.getItem("lightPositions")
    if (savedPositions) {
      try {
        const saved = JSON.parse(savedPositions)
        lightButtons = saved
        restoreButtons()
      } catch (e) {
        console.error("Error loading saved positions:", e)
        lightButtons = []
      }
    } else {
      lightButtons = []
    }
  }

  // Save to localStorage
  function saveToLocalStorage() {
    localStorage.setItem("lightPositions", JSON.stringify(lightButtons))
  }

  // Toggle edit mode
  function enableEditMode(flag) {
    isEditMode = flag

    // Update all buttons' edit mode state
    lightButtons.forEach((button) => {
      const btn = document.getElementById(button.id)
      if (btn) {
        if (flag) {
          btn.classList.add("edit-mode")
          btn.style.cursor = "grab"
        } else {
          btn.classList.remove("edit-mode")
          btn.style.cursor = ""
          saveToLocalStorage()
        }
      }
    })
  }

  // Create a new button
  function create(config) {
    // Generate unique ID if not provided
    if (!config.id) {
      config.id = "button_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    }

    // Ensure required properties
    config.type = config.type || "toggle"
    config.iconClass = config.iconClass || BUTTON_TYPES[config.type]?.icon || "light-bulb-1.svg"
    config.name = config.name || BUTTON_TYPES[config.type]?.defaultName || "Button"

    // Add to array
    lightButtons.push(config)

    // Create DOM element
    createLightButton(config)

    // Update positions
    updateButtonPositions()

    return config.id
  }

  function save() {
    const imageMeta = getImageMetaFn ? getImageMetaFn() : {}

    const cleanButtons = lightButtons.map((b) => ({
      id: b.id,
      type: b.type || "toggle",
      entityId: b.entityId || "",
      name: b.name || "",
      iconClass: b.iconClass || "",
      position: {
        x: Number(b.position.x.toFixed(4)),
        y: Number(b.position.y.toFixed(4)),
      },
    }))

    return {
      image: imageMeta.src || "",
      transform: imageMeta.transform || {},
      buttons: cleanButtons,
    }
  }

  // Load from data
  function load(data) {
    // Clear existing buttons
    lightButtons = []
    document.querySelectorAll(".light-button").forEach((btn) => btn.remove())

    // Load new buttons
    if (data.buttons && Array.isArray(data.buttons)) {
      lightButtons = data.buttons
      restoreButtons()
    }

    // Update positions
    updateButtonPositions()

    // Save to localStorage
    saveToLocalStorage()
  }

  // Get all buttons
  function getButtons() {
    return lightButtons
  }

  // Update button config
  function updateButtonConfig(buttonId, newConfig) {
    const index = lightButtons.findIndex((b) => b.id === buttonId)
    if (index === -1) return false

    const buttonData = lightButtons[index]
    const oldEntityId = buttonData.entityId

    // Update stored data
    Object.assign(buttonData, newConfig)

    const btn = document.getElementById(buttonId)
    if (!btn) return false

    // 🔴 FIXED ICON UPDATE
    if (newConfig.iconClass) {
      // Update stored icon
      buttonData.iconClass = newConfig.iconClass

      // Clear and set new icon with proper delay
      if (window.SVGIcons) {
        // Clear any existing icons
        window.SVGIcons.clearButtonIcons(btn)

        // Update the data attribute
        btn.dataset.icon = newConfig.iconClass

        // Set new icon with a small delay to ensure DOM is ready
        setTimeout(() => {
          window.SVGIcons.setIconImmediately(btn, newConfig.iconClass)
        }, 10)
      }
    }

    // NAME UPDATE
    if (newConfig.name) {
      btn.dataset.name = newConfig.name
      btn.title = newConfig.name
    }

    // ENTITY UPDATE
    if (newConfig.entityId && newConfig.entityId !== oldEntityId) {
      // Remove from old entity group
      if (oldEntityId && window.EntityButtons?.[oldEntityId]) {
        window.EntityButtons[oldEntityId] = window.EntityButtons[oldEntityId].filter((b) => b.id !== buttonId)
      }

      // Add to new entity group
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
          // Update icon color
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

    // Refresh HA state
    if (window.ws?.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({ id: Date.now(), type: "get_states" }))
    }

    return true
  }

  // Delete a button
  function deleteButton(buttonId) {
    const index = lightButtons.findIndex((b) => b.id === buttonId)
    if (index !== -1) {
      const button = lightButtons[index]

      // Remove from EntityButtons registry
      if (button.entityId && window.EntityButtons && window.EntityButtons[button.entityId]) {
        const btnIndex = window.EntityButtons[button.entityId].findIndex((btn) => btn.id === buttonId)
        if (btnIndex > -1) {
          window.EntityButtons[button.entityId].splice(btnIndex, 1)
        }
      }

      lightButtons.splice(index, 1)
      const btn = document.getElementById(buttonId)
      if (btn) {
        btn.remove()
      }
      saveToLocalStorage()
      return true
    }
    return false
  }

  // Update button positions
  function updateButtonPositions() {
    const imgMeta = getImageMetaFn ? getImageMetaFn() : null
    if (!imgMeta || !imgMeta.naturalWidth) return

    lightButtons.forEach((button) => {
      const btn = document.getElementById(button.id)
      if (btn) {
        const imgX = button.position.x * imgMeta.naturalWidth
        const imgY = button.position.y * imgMeta.naturalHeight

        btn.style.left = `${imgX}px`
        btn.style.top = `${imgY}px`
      }
    })
  }

  // Restore all buttons
  function restoreButtons() {
    lightButtons.forEach(createLightButton)
  }

  // Create light button with SVG icon (FIXED VERSION)
  function createLightButton(config) {
    const existingBtn = document.getElementById(config.id)
    if (existingBtn) existingBtn.remove()

    const button = document.createElement("button")
    button.id = config.id
    button.className = "light-button"
    button.dataset.type = config.type || "toggle"
    button.dataset.entityId = config.entityId || ""

    // Store icon name for later
    button.dataset.icon = config.iconClass || "light-bulb-1.svg"

    // Create icon container
    const iconContainer = document.createElement("div")
    iconContainer.className = "icon"
    button.appendChild(iconContainer)

    // IMPORTANT: Use a microtask delay to ensure DOM is ready
    setTimeout(() => {
      if (window.SVGIcons) {
        window.SVGIcons.setIconImmediately(button, config.iconClass || "light-bulb-1.svg")
      }
    }, 0)

    setupButtonEventListeners(button, config)

    // Append to pan layer
    const panLayer = document.getElementById("panLayer")
    if (panLayer) {
      panLayer.appendChild(button)
    }

    return button
  }

  // Set up button event listeners
  function setupButtonEventListeners(button, config) {
    // Click handler
    button.addEventListener("click", (e) => {
      if (!isEditMode && callbacks.toggleLight) {
        e.stopPropagation()
        const currentEntity = button.dataset.entityId
        callbacks.toggleLight(currentEntity, config.id)
      }
    })

    // Mouse/touch down for drag and long press
    button.addEventListener("mousedown", (e) => startButtonInteraction(e, button, config))
    button.addEventListener("touchstart", (e) => startButtonInteraction(e, button, config))

    // Prevent context menu on long press
    button.addEventListener("contextmenu", (e) => {
      if (isEditMode) e.preventDefault()
      return false
    })
  }

  // Start button interaction (drag or long press)
  function startButtonInteraction(e, button, config) {
    if (!isEditMode) return

    e.stopPropagation()
    e.preventDefault()

    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY

    // Store starting positions
    dragStart.x = clientX
    dragStart.y = clientY
    panStart.x = config.position.x
    panStart.y = config.position.y

    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }

    // Start long press timer
    longPressTimer = setTimeout(() => {
      // Only show edit modal if we haven't moved much
      const movedX = Math.abs(clientX - dragStart.x)
      const movedY = Math.abs(clientY - dragStart.y)

      if (movedX < dragThreshold && movedY < dragThreshold && !isDraggingButton) {
        showEditModal(config)
      }

      longPressTimer = null
    }, 600)

    // Add mouse move listener to detect drag
    const mouseMoveHandler = (moveEvent) => {
      const moveClientX = moveEvent.type.includes("touch") ? moveEvent.touches[0].clientX : moveEvent.clientX
      const moveClientY = moveEvent.type.includes("touch") ? moveEvent.touches[0].clientY : moveEvent.clientY

      const deltaX = Math.abs(moveClientX - dragStart.x)
      const deltaY = Math.abs(moveClientY - dragStart.y)

      // If movement exceeds threshold, start dragging
      if ((deltaX > dragThreshold || deltaY > dragThreshold) && longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
        startButtonDrag(moveEvent, button, config)

        // Remove this listener
        document.removeEventListener("mousemove", mouseMoveHandler)
        document.removeEventListener("touchmove", mouseMoveHandler)
      }
    }

    // Add temporary mouse move listeners
    document.addEventListener("mousemove", mouseMoveHandler)
    document.addEventListener("touchmove", mouseMoveHandler, { passive: false })

    // Clean up if mouse up occurs before long press
    const cleanup = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      document.removeEventListener("mousemove", mouseMoveHandler)
      document.removeEventListener("touchmove", mouseMoveHandler)
      document.removeEventListener("mouseup", cleanup)
      document.removeEventListener("touchend", cleanup)
    }

    document.addEventListener("mouseup", cleanup)
    document.addEventListener("touchend", cleanup)
  }

  // Start button dragging
  function startButtonDrag(e, button, config) {
    isDraggingButton = true
    currentDraggingButton = button
    button.classList.add("dragging")
    button.style.cursor = "grabbing"

    // Add global event listeners for dragging
    document.addEventListener("mousemove", doButtonDrag)
    document.addEventListener("touchmove", doButtonDrag, { passive: false })

    const stopDrag = () => {
      stopButtonDrag()
      document.removeEventListener("mouseup", stopDrag)
      document.removeEventListener("touchend", stopDrag)
    }

    document.addEventListener("mouseup", stopDrag)
    document.addEventListener("touchend", stopDrag)
  }

  // Handle button dragging
  function doButtonDrag(e) {
    if (!isDraggingButton || !currentDraggingButton) return

    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - dragStart.x
    const deltaY = clientY - dragStart.y

    const imgMeta = getImageMetaFn()
    if (!imgMeta) return

    // Get REAL image display size
    const realW = document.getElementById("viewImage").clientWidth
    const realH = document.getElementById("viewImage").clientHeight

    // Convert to relative position
    const deltaXRel = deltaX / realW
    const deltaYRel = deltaY / realH

    const buttonId = currentDraggingButton.id
    const buttonConfig = lightButtons.find((b) => b.id === buttonId)

    if (buttonConfig) {
      buttonConfig.position.x = panStart.x + deltaXRel
      buttonConfig.position.y = panStart.y + deltaYRel

      // Clamp to image bounds
      buttonConfig.position.x = Math.max(0, Math.min(1, buttonConfig.position.x))
      buttonConfig.position.y = Math.max(0, Math.min(1, buttonConfig.position.y))

      updateButtonPositions()
    }

    if (e.preventDefault) e.preventDefault()
    e.stopPropagation()
  }

  // Stop button dragging
  function stopButtonDrag() {
    if (currentDraggingButton) {
      currentDraggingButton.classList.remove("dragging")
      currentDraggingButton.style.cursor = "grab"
    }

    isDraggingButton = false
    currentDraggingButton = null

    // Remove global event listeners
    document.removeEventListener("mousemove", doButtonDrag)
    document.removeEventListener("touchmove", doButtonDrag)

    // Save position
    saveToLocalStorage()
  }

  // Show edit modal
  function showEditModal(config) {
    editingButtonId = config.id
    // Set the editing button ID so it's accessible to the modal
    window.buttons.setEditingButtonId(config.id)

    // Also set a global reference for other modules
    window.currentEditingButton = {
      id: config.id,
      type: config.type || "toggle",
    }

    // Fill form with current values
    document.getElementById("editEntityId").value = config.entityId || ""
    document.getElementById("editName").value = config.name || ""
    document.getElementById("editIcon").value = config.iconClass || "light-bulb-1.svg"

    // Show modal
    document.getElementById("buttonEditModal").style.display = "flex"
  }

  // Set up modal listeners
  function setupModalListeners() {
    // Button picker modal close
    document.getElementById("closePickerBtn")?.addEventListener("click", () => {
      document.getElementById("buttonPickerModal").style.display = "none"
    })

    // Button edit modal close
    document.getElementById("closeEditBtn")?.addEventListener("click", () => {
      document.getElementById("buttonEditModal").style.display = "none"
      editingButtonId = null
    })

    // Button type selection handler
    document.querySelectorAll(".button-type-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation()
        const type = item.dataset.type
        const icon = item.dataset.icon || "light-bulb-1.svg"

        // Close picker modal
        document.getElementById("buttonPickerModal").style.display = "none"

        if (type === "sensor" && window.SensorModule && typeof window.SensorModule.create === "function") {
          window.SensorModule.create({
            type: "sensor",
            iconClass: icon,
            position: { x: 0.5, y: 0.5 },
          })
        } else if (type === "remote" && window.RemoteModule && typeof window.RemoteModule.create === "function") {
          // RemoteModule will handle entity ID prompt internally
          window.RemoteModule.create({
            type: "remote",
            iconClass: icon,
            position: { x: 0.5, y: 0.5 },
          })
        } else {
          // For other button types, prompt for entity ID
          const buttonType = BUTTON_TYPES[type]
          const entityId = prompt(`Enter Entity ID for ${buttonType.name}:`, "")

          if (entityId && entityId.trim()) {
            const name = prompt(`Enter name (optional):`, buttonType.defaultName) || buttonType.defaultName
            const position = { x: 0.5, y: 0.5 }

            // Route to appropriate module based on type
            if (type === "dimmer" && window.DimmerModule && typeof window.DimmerModule.create === "function") {
              window.DimmerModule.create({
                entityId: entityId.trim(),
                name: name,
                position: position,
                iconClass: icon,
                brightness: 50,
                isOn: false,
                type: "dimmer",
              })
            } else if (type === "cct" && window.CCTModule && typeof window.CCTModule.create === "function") {
              window.CCTModule.create({
                entityId: entityId.trim(),
                name: name,
                position: position,
                iconClass: icon,
                brightness: 50,
                temperature: 50,
                isOn: false,
                type: "cct",
              })
            } else if (type === "rgb" && window.RGBModule && typeof window.RGBModule.create === "function") {
              window.RGBModule.create({
                entityId: entityId.trim(),
                name: name,
                position: position,
                iconClass: icon,
                brightness: 50,
                hue: 180,
                isOn: false,
                type: "rgb",
              })
            } else if (type === "lock" && window.LockModule && typeof window.LockModule.create === "function") {
              window.LockModule.create({
                entityId: entityId.trim(),
                name: name,
                position: position,
                iconClass: icon,
                isLocked: true,
                type: "lock",
              })
            } else if (
              type === "curtain" &&
              window.CurtainModule &&
              typeof window.CurtainModule.create === "function"
            ) {
              window.CurtainModule.create({
                entityId: entityId.trim(),
                name: name,
                position: position,
                iconClass: icon,
                currentPosition: 50,
                isOpen: false,
                type: "curtain",
              })
            } else {
              // Default toggle button
              create({
                id: `button_${Date.now()}`,
                type: type,
                entityId: entityId.trim(),
                name: name,
                iconClass: icon,
                position: position,
              })
            }
          }
        }
      })
    })

    // Edit form submission
    const editForm = document.getElementById("buttonEditForm")
    if (editForm) {
      editForm.addEventListener("submit", (e) => {
        e.preventDefault()

        if (editingButtonId) {
          const newConfig = {
            entityId: document.getElementById("editEntityId").value.trim(),
            name: document.getElementById("editName").value.trim() || "Light",
            iconClass: document.getElementById("editIcon").value,
          }

          if (!newConfig.entityId) {
            alert("Entity ID is required")
            return
          }

          // Check button type and route to appropriate module
          const btn = document.getElementById(editingButtonId)
          let isSpecialButton = false
          let module = null

          if (btn) {
            if (btn.classList.contains("dimmer") && window.DimmerModule && window.DimmerModule.updateConfig) {
              module = window.DimmerModule
              isSpecialButton = true
            } else if (btn.classList.contains("cct") && window.CCTModule && window.CCTModule.updateConfig) {
              module = window.CCTModule
              isSpecialButton = true
            } else if (btn.classList.contains("rgb") && window.RGBModule && window.RGBModule.updateConfig) {
              module = window.RGBModule
              isSpecialButton = true
            } else if (btn.classList.contains("lock") && window.LockModule && window.LockModule.updateConfig) {
              module = window.LockModule
              isSpecialButton = true
            } else if (btn.classList.contains("curtain") && window.CurtainModule && window.CurtainModule.updateConfig) {
              module = window.CurtainModule
              isSpecialButton = true
            } else if (btn.classList.contains("remote") && window.RemoteModule && window.RemoteModule.updateConfig) {
              module = window.RemoteModule
              isSpecialButton = true
            } else if (btn.classList.contains("sensor") && window.SensorModule && window.SensorModule.updateConfig) {
              module = window.SensorModule
              isSpecialButton = true
            }
          }

          if (isSpecialButton && module) {
            // Update special button via its module
            module.updateConfig(editingButtonId, newConfig)
          } else {
            // Update regular button
            updateButtonConfig(editingButtonId, newConfig)
          }

          document.getElementById("buttonEditModal").style.display = "none"
          editingButtonId = null
        }
      })
    }

    // Delete button event listener
    document.getElementById("deleteBtn")?.addEventListener("click", () => {
      if (editingButtonId && confirm("Are you sure you want to delete this button?")) {
        // Check button type and route to appropriate module
        const btn = document.getElementById(editingButtonId)
        let isSpecialButton = false
        let module = null

        if (btn) {
          if (btn.classList.contains("dimmer") && window.DimmerModule && window.DimmerModule.deleteButton) {
            module = window.DimmerModule
            isSpecialButton = true
          } else if (btn.classList.contains("cct") && window.CCTModule && window.CCTModule.deleteButton) {
            module = window.CCTModule
            isSpecialButton = true
          } else if (btn.classList.contains("rgb") && window.RGBModule && window.RGBModule.deleteButton) {
            module = window.RGBModule
            isSpecialButton = true
          } else if (btn.classList.contains("lock") && window.LockModule && window.LockModule.deleteButton) {
            module = window.LockModule
            isSpecialButton = true
          } else if (btn.classList.contains("curtain") && window.CurtainModule && window.CurtainModule.deleteButton) {
            module = window.CurtainModule
            isSpecialButton = true
          } else if (btn.classList.contains("remote") && window.RemoteModule && window.RemoteModule.deleteButton) {
            module = window.RemoteModule
            isSpecialButton = true
          } else if (btn.classList.contains("sensor") && window.SensorModule && window.SensorModule.deleteButton) {
            module = window.SensorModule
            isSpecialButton = true
          }
        }

        let deleted = false
        if (isSpecialButton && module) {
          deleted = module.deleteButton(editingButtonId)
        } else {
          deleted = deleteButton(editingButtonId)
        }

        if (deleted) {
          document.getElementById("buttonEditModal").style.display = "none"
          editingButtonId = null
        }
      }
    })

    // Close modals on overlay click
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.style.display = "none"
          editingButtonId = null
        }
      })
    })

    // ESC key to close modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay").forEach((overlay) => {
          overlay.style.display = "none"
        })
        editingButtonId = null
      }
    })
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
    updateButtonPositions,
    setEditingButtonId: (id) => {
      editingButtonId = id
    },
    getEditingButtonId: () => editingButtonId,
  }
})()
