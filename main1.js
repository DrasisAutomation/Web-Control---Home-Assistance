// Global selection handler - must be available BEFORE modules load
window.selectButtonForEdit = (buttonId, type) => {
    console.log("Selecting button:", buttonId, "type:", type)

    // Clear previous selection
    document.querySelectorAll(".light-button.selected").forEach((b) => {
        b.classList.remove("selected")
        console.log("Removed selection from:", b.id)
    })

    const btn = document.getElementById(buttonId)
    if (!btn) {
        console.error("Button not found:", buttonId)
        return
    }

    btn.classList.add("selected")
    console.log("Added selection to:", buttonId)

    window.currentEditingButton = buttonId
    window.currentEditingType = type

    // Store in both window.buttons and global for backup
    if (window.buttons) {
        window.buttons.setEditingButtonId(buttonId)
    }
}

// Initialize global variables
window.currentEditingButton = null
window.currentEditingType = null
// Global selection state
window.currentEditingButton = null
window.currentEditingType = null

// Function to select a button for editing
function selectButtonForEdit(buttonId, type) {
    // Clear previous selection
    document.querySelectorAll(".light-button.selected").forEach((b) => b.classList.remove("selected"))

    const btn = document.getElementById(buttonId)
    if (!btn) return

    btn.classList.add("selected")

    window.currentEditingButton = buttonId
    window.currentEditingType = type
}
// main.js - Updated with CCT, RGB, and Remote support
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("gesturestart", (e) => e.preventDefault())
    document.addEventListener("gesturechange", (e) => e.preventDefault())
    document.addEventListener("gestureend", (e) => e.preventDefault())
    // Delete button event listener
    document.getElementById("deleteBtn").addEventListener("click", handleDeleteButton)

    const container = document.getElementById("container")
    const pan = document.getElementById("panLayer")
    const img = document.getElementById("viewImage")
    const editBtn = document.getElementById("editBtn")
    const saveBtn = document.getElementById("saveBtn")
    const loadBtn = document.getElementById("loadBtn")
    const clearAllBtn = document.getElementById("clearAllBtn")
    const imageBtn = document.getElementById("imageBtn")
    const addBtn = document.getElementById("addBtn")
    const editControls = document.getElementById("editControls")
    const imageFileInput = document.getElementById("imageFileInput")
    const loadFileInput = document.getElementById("loadFileInput")

    const buttonSize = document.getElementById("buttonSize")
    const sizeValue = document.getElementById("sizeValue")
    const buttonOpacity = document.getElementById("buttonOpacity")
    const opacityValue = document.getElementById("opacityValue")
    const modalOpacity = document.getElementById("modalOpacity")
    const modalValue = document.getElementById("modalValue")

    const STORAGE_KEY = "floorplan_design_v3.0"
    const DEFAULT_LOAD_FILE = "load1.json"

    let scale = 1
    const maxScale = 5
    const minScale = 1
    let posX = 0
    let posY = 0
    let imgNaturalW = 0
    let imgNaturalH = 0
    let lastPinchDistance = null
    let isPinching = false
    let isEditMode = false
    let isDragging = false
    const dragStart = { x: 0, y: 0 }
    const panStart = { x: 0, y: 0 }

    const WS_URL = "wss://demo.lumihomepro1.com/api/websocket"
    const TOKEN =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIzNGNlNThiNDk1Nzk0NDVmYjUxNzE2NDA0N2Q0MGNmZCIsImlhdCI6MTc2NTM0NzQ5MSwiZXhwIjoyMDgwNzA3NDkxfQ.Se5PGwx0U9aqyVRnD1uwvCv3F-aOE8H53CKA5TqsV7U"

    let ws,
        ready = false

    img.onload = () => initImage()
    if (img.complete) initImage()

    function initImage() {
        imgNaturalW = img.naturalWidth
        imgNaturalH = img.naturalHeight

        img.style.height = "80vh"
        img.style.width = "auto"
        img.style.maxWidth = "none"

        scale = 1
        posX = 0
        posY = 0

        pan.style.cssText = ""
        pan.style.transform = "translate(0px, 0px) scale(1)"
        pan.style.transformOrigin = "center center"

        pan.offsetHeight
        container.offsetHeight

        requestAnimationFrame(() => {
            pan.style.transform = "translate(0px, 0px) scale(1)"
            pan.style.transformOrigin = "center center"
            updateButtonPositions()
        })

        updateButtonPositions()
    }

    function resetViewHard() {
        isDragging = false
        isPinching = false
        container.classList.remove("grabbing")

        scale = 1
        posX = 0
        posY = 0

        pan.style.transform = "translate(0px, 0px) scale(1)"
        pan.style.transformOrigin = "center center"

        setTimeout(() => {
            pan.style.cssText = pan.style.cssText.replace(/transform[^;]*;?/g, "")
            pan.style.transform = "translate(0px, 0px) scale(1)"
            pan.style.transformOrigin = "center center"
        }, 10)

        pan.offsetHeight
        void pan.offsetWidth

        requestAnimationFrame(() => {
            pan.style.transform = "translate(0px, 0px) scale(1)"
            pan.style.transformOrigin = "center center"

            requestAnimationFrame(() => {
                pan.style.transform = "translate(0px, 0px) scale(1)"
                pan.style.transformOrigin = "center center"
                updateButtonPositions()
                updateFooter("View reset")
                if (img.complete) {
                    initImage()
                }
            })
        })

        updateButtonPositions()
    }

    function getImageMetadata() {
        return {
            naturalWidth: img.clientWidth,
            naturalHeight: img.clientHeight,
            scale: scale,
            src: img.src,
            dataURL: img.src.startsWith("data:") ? img.src : null,
            transform: { scale, posX, posY },
        }
    }

    function applyTransform() {
        pan.style.transformOrigin = "center center"
        pan.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`
        updateButtonPositions()
    }

    function updateButtonPositions() {
        if (buttons.updateButtonPositions) {
            buttons.updateButtonPositions()
        }
        if (window.DimmerModule && DimmerModule.updatePositions) {
            DimmerModule.updatePositions()
        }
        if (window.CCTModule && CCTModule.updatePositions) {
            CCTModule.updatePositions()
        }
        if (window.RGBModule && RGBModule.updatePositions) {
            RGBModule.updatePositions()
        }
        if (window.RemoteModule && RemoteModule.updatePositions) {
            RemoteModule.updatePositions()
        }
        if (window.LockModule && LockModule.updatePositions) {
            LockModule.updatePositions()
        }
        if (window.CurtainModule && CurtainModule.updatePositions) {
            CurtainModule.updatePositions()
        }
        if (window.SensorModule && SensorModule.updatePositions) {
            SensorModule.updatePositions()
        }
    }

    function startPan(e) {
        if (e.target.closest(".light-button")) return

        isDragging = true
        container.classList.add("grabbing")

        const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX
        const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY

        dragStart.x = clientX
        dragStart.y = clientY
        panStart.x = posX
        panStart.y = posY

        e.preventDefault()
    }

    function doPan(e) {
        if (!isDragging) return

        const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX
        const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY

        const deltaX = clientX - dragStart.x
        const deltaY = clientY - dragStart.y

        posX = panStart.x + deltaX
        posY = panStart.y + deltaY

        const containerW = container.clientWidth
        const containerH = container.clientHeight

        const scaledW = img.clientWidth * scale
        const scaledH = img.clientHeight * scale

        const maxX = Math.max(0, (scaledW - containerW) / 2)
        const maxY = Math.max(0, (scaledH - containerH) / 2)

        if (scaledW > containerW) {
            posX = Math.max(-maxX, Math.min(maxX, posX))
        } else {
            posX = 0
        }

        if (scaledH > containerH) {
            posY = Math.max(-maxY, Math.min(maxY, posY))
        } else {
            posY = 0
        }

        applyTransform()
        e.preventDefault()
    }

    function stopPan() {
        isDragging = false
        container.classList.remove("grabbing")
    }

    function handleZoom(e) {
        e.preventDefault()

        const zoomIntensity = 0.001
        const delta = e.deltaY
        const zoomFactor = 1 - delta * zoomIntensity

        const oldScale = scale
        scale = Math.min(maxScale, Math.max(minScale, scale * zoomFactor))

        if (scale === oldScale) return

        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left - rect.width / 2
        const mouseY = e.clientY - rect.top - rect.height / 2

        const scaleChange = scale / oldScale
        posX = mouseX - (mouseX - posX) * scaleChange
        posY = mouseY - (mouseY - posY) * scaleChange

        applyTransform()
    }

    function updateBrightness(entityId, brightness, buttonId) {
        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            return
        }

        const domain = getDomainFromEntityId(entityId)

        if (domain === "light") {
            const haBrightness = Math.round((brightness / 100) * 255)

            ws.send(
                JSON.stringify({
                    id: Date.now(),
                    type: "call_service",
                    domain: "light",
                    service: "turn_on",
                    service_data: {
                        entity_id: entityId,
                        brightness: haBrightness,
                    },
                }),
            )

            updateFooter(`Brightness set to ${brightness}%`)
        } else if (domain === "fan") {
            const percentage = Math.round(brightness)

            ws.send(
                JSON.stringify({
                    id: Date.now(),
                    type: "call_service",
                    domain: "fan",
                    service: "set_percentage",
                    service_data: {
                        entity_id: entityId,
                        percentage: percentage,
                    },
                }),
            )

            updateFooter(`Fan speed set to ${brightness}%`)
        }
    }

    // Update CCT (Color Temperature)
    function updateCCT(entityId, brightness, temperature, buttonId) {
        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            return
        }

        const domain = getDomainFromEntityId(entityId)

        if (domain === "light") {
            const haBrightness = Math.round((brightness / 100) * 255)

            // Convert percentage to mireds (153-500 range)
            // 0% = 6500K (153 mireds), 100% = 2000K (500 mireds)
            const minMireds = 153
            const maxMireds = 500
            const mireds = Math.round(minMireds + (maxMireds - minMireds) * (temperature / 100))

            ws.send(
                JSON.stringify({
                    id: Date.now(),
                    type: "call_service",
                    domain: "light",
                    service: "turn_on",
                    service_data: {
                        entity_id: entityId,
                        brightness: haBrightness,
                        color_temp: mireds,
                    },
                }),
            )

            updateFooter(`CCT updated to ${brightness}% brightness, ${temperature}% temperature`)
        }
    }

    // Update RGB Color
    function updateRGB(entityId, brightness, hue, buttonId) {
        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            return
        }

        const domain = getDomainFromEntityId(entityId)

        if (domain === "light") {
            const haBrightness = Math.round((brightness / 100) * 255)

            ws.send(
                JSON.stringify({
                    id: Date.now(),
                    type: "call_service",
                    domain: "light",
                    service: "turn_on",
                    service_data: {
                        entity_id: entityId,
                        brightness: haBrightness,
                        hs_color: [hue, 100],
                    },
                }),
            )

            updateFooter(`RGB updated to ${brightness}% brightness, hue: ${hue}°`)
        }
    }

    // Handle delete button click

    // Handle delete button click
    function handleDeleteButton() {
        const id = window.currentEditingButton
        const type = window.currentEditingType
        let deleted

        if (!id || !type) {
            // Handle error or return early
            return
        }

        // Route delete to appropriate module
        if (type === "dimmer" && window.DimmerModule && window.DimmerModule.deleteButton) {
            deleted = window.DimmerModule.deleteButton(id)
        } else if (type === "cct" && window.CCTModule && window.CCTModule.deleteButton) {
            deleted = window.CCTModule.deleteButton(id)
        } else if (type === "rgb" && window.RGBModule && window.RGBModule.deleteButton) {
            deleted = window.RGBModule.deleteButton(id)
        } else if (type === "remote" && window.RemoteModule && window.RemoteModule.deleteButton) {
            deleted = window.RemoteModule.deleteButton(id)
        } else if (type === "lock" && window.LockModule && window.LockModule.deleteButton) {
            deleted = window.LockModule.deleteButton(id)
        } else if (type === "curtain" && window.CurtainModule && window.CurtainModule.deleteButton) {
            deleted = window.CurtainModule.deleteButton(id)
        } else if (type === "sensor" && window.SensorModule && window.SensorModule.deleteButton) {
            deleted = window.SensorModule.deleteButton(id)
        } else if (window.buttons && window.buttons.deleteButton) {
            deleted = window.buttons.deleteButton(id)
        }

        // Handle the result of the deletion
        if (deleted) {
            // Perform any necessary actions after deletion
            console.log("Button deleted successfully")
        } else {
            console.error("Failed to delete button")
        }
    }


    function saveDesign() {
        console.log("Saving design...")

        // Get CURRENT slider values
        const currentButtonSize = buttonSize ? Number.parseFloat(buttonSize.value) : 1
        const currentButtonOpacity = buttonOpacity ? Number.parseFloat(buttonOpacity.value) : 0.8
        const currentModalOpacity = modalOpacity ? Number.parseFloat(modalOpacity.value) : 0.6

        console.log("Current slider values:", {
            buttonSize: currentButtonSize,
            buttonOpacity: currentButtonOpacity,
            modalOpacity: currentModalOpacity,
        })

        // Save to localStorage slider values
        const sliderValues = {
            buttonSize: currentButtonSize,
            buttonOpacity: currentButtonOpacity,
            modalOpacity: currentModalOpacity,
            lastSaved: new Date().toISOString(),
        }

        localStorage.setItem("sliderValues", JSON.stringify(sliderValues))

        // Get all buttons from all modules
        const allButtons = buttons.getButtons()
        const dimmerButtons = window.DimmerModule ? DimmerModule.getDimmerButtons() : []
        const cctButtons = window.CCTModule ? CCTModule.getCCTButtons() : []
        const rgbButtons = window.RGBModule ? RGBModule.getRGBButtons() : []
        const lockButtons = window.LockModule ? LockModule.getLockButtons() : []
        const curtainButtons = window.CurtainModule ? CurtainModule.getCurtainButtons() : []
        const remoteButtons = window.RemoteModule ? RemoteModule.getRemoteButtons() : []
        const sensorButtons = window.SensorModule ? SensorModule.getSensorButtons() : []

        // Create unified buttons array
        const unifiedButtons = []

        // Add regular buttons
        allButtons.forEach((button) => {
            if (button && button.id) {
                unifiedButtons.push({
                    id: button.id,
                    type: button.type || "toggle",
                    entityId: button.entityId || "",
                    name: button.name || "",
                    iconClass: button.iconClass || "fa-lightbulb",
                    position: {
                        x: button.position ? Number(button.position.x.toFixed(4)) : 0.5,
                        y: button.position ? Number(button.position.y.toFixed(4)) : 0.5,
                    },
                })
            }
        })

        // Add dimmer buttons
        dimmerButtons.forEach((dimmer) => {
            if (dimmer && dimmer.id) {
                unifiedButtons.push({
                    id: dimmer.id,
                    type: "dimmer",
                    entityId: dimmer.entityId || "",
                    name: dimmer.name || "Dimmer",
                    iconClass: dimmer.iconClass || "fa-sliders-h",
                    position: {
                        x: dimmer.position ? Number(dimmer.position.x.toFixed(4)) : 0.5,
                        y: dimmer.position ? Number(dimmer.position.y.toFixed(4)) : 0.5,
                    },
                })
            }
        })

        // Add CCT buttons
        cctButtons.forEach((cct) => {
            if (cct && cct.id) {
                unifiedButtons.push({
                    id: cct.id,
                    type: "cct",
                    entityId: cct.entityId || "",
                    name: cct.name || "CCT Light",
                    iconClass: cct.iconClass || "fa-lightbulb",
                    position: {
                        x: cct.position ? Number(cct.position.x.toFixed(4)) : 0.5,
                        y: cct.position ? Number(cct.position.y.toFixed(4)) : 0.5,
                    },
                    brightness: cct.brightness || 50,
                    temperature: cct.temperature || 50,
                })
            }
        })

        // Add RGB buttons
        rgbButtons.forEach((rgb) => {
            if (rgb && rgb.id) {
                unifiedButtons.push({
                    id: rgb.id,
                    type: "rgb",
                    entityId: rgb.entityId || "",
                    name: rgb.name || "RGB Light",
                    iconClass: rgb.iconClass || "fa-lightbulb",
                    position: {
                        x: rgb.position ? Number(rgb.position.x.toFixed(4)) : 0.5,
                        y: rgb.position ? Number(rgb.position.y.toFixed(4)) : 0.5,
                    },
                    brightness: rgb.brightness || 50,
                    hue: rgb.hue || 180,
                })
            }
        })


        // Add sensor buttons to unifiedButtons:
        sensorButtons.forEach((sensor) => {
            if (sensor && sensor.id) {
                unifiedButtons.push({
                    id: sensor.id,
                    type: "sensor",
                    entityId: sensor.entityId || "",
                    name: sensor.name || "Sensor",
                    iconClass: sensor.iconClass || "sensor-presence1.svg",
                    position: {
                        x: sensor.position ? Number(sensor.position.x.toFixed(4)) : 0.5,
                        y: sensor.position ? Number(sensor.position.y.toFixed(4)) : 0.5,
                    },
                    sensorConfig: sensor.sensorConfig || [], // Sensor configuration
                })
            }
        })

        // Add lock buttons to unifiedButtons
        lockButtons.forEach((lock) => {
            if (lock && lock.id) {
                unifiedButtons.push({
                    id: lock.id,
                    type: "lock",
                    entityId: lock.entityId || "",
                    name: lock.name || "Lock",
                    iconClass: lock.iconClass || "lock.svg",
                    position: {
                        x: lock.position ? Number(lock.position.x.toFixed(4)) : 0.5,
                        y: lock.position ? Number(lock.position.y.toFixed(4)) : 0.5,
                    },
                    isLocked: lock.isLocked || true,
                })
            }
        })

        // Add curtain buttons to unifiedButtons
        curtainButtons.forEach((curtain) => {
            if (curtain && curtain.id) {
                unifiedButtons.push({
                    id: curtain.id,
                    type: "curtain",
                    entityId: curtain.entityId || "",
                    name: curtain.name || "Curtain",
                    iconClass: curtain.iconClass || "curtain1.svg",
                    position: {
                        x: curtain.position ? Number(curtain.position.x.toFixed(4)) : 0.5,
                        y: curtain.position ? Number(curtain.position.y.toFixed(4)) : 0.5,
                    },
                    currentPosition: typeof curtain.currentPosition === "number" ? curtain.currentPosition : 0,
                    isOpen: curtain.isOpen || false,
                })
            }
        })

        // Add remote buttons to unifiedButtons
        // Add remote buttons to unifiedButtons
        remoteButtons.forEach((remote) => {
            if (remote && remote.id) {
                unifiedButtons.push({
                    id: remote.id,
                    type: "remote",
                    entityId: remote.entityId || "",
                    name: remote.name || "Remote",
                    iconClass: remote.iconClass || "remote.svg",
                    position: {
                        x: remote.position ? Number(remote.position.x.toFixed(4)) : 0.5,
                        y: remote.position ? Number(remote.position.y.toFixed(4)) : 0.5,
                    },
                    remoteConfig: remote.remoteConfig || [], // ← THIS IS CRITICAL
                })
            }
        })

        // Get image metadata
        const imageMeta = getImageMetadata()

        // Create design data WITH settings
        const designData = {
            meta: {
                savedAt: new Date().toISOString(),
                version: "2.0",
                totalButtons: unifiedButtons.length,
            },
            settings: {
                buttonSize: currentButtonSize,
                buttonOpacity: currentButtonOpacity,
                modalOpacity: currentModalOpacity,
            },
            image: imageMeta.src || "",
            transform: {
                scale: Number(scale.toFixed(3)),
                posX: Number(posX.toFixed(2)),
                posY: Number(posY.toFixed(2)),
            },
            buttons: unifiedButtons,
        }

        console.log("Saving design data:", designData)

        // Save to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(designData))
            console.log("Design saved to localStorage")
        } catch (error) {
            console.error("Could not save to localStorage:", error)
        }

        // Download as file
        const blob = new Blob([JSON.stringify(designData, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "floorplan-design.json"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        updateFooter("Design saved with current settings!")
    }

    function loadDesign(file) {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const designData = JSON.parse(e.target.result)

                // ENHANCED: Store the loaded design in localStorage with timestamp
                try {
                    const enhancedDesignData = {
                        ...designData,
                        meta: {
                            ...designData.meta,
                            loadedAt: new Date().toISOString(),
                            source: "file_import",
                        },
                    }
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(enhancedDesignData))
                    console.log("Loaded design stored in localStorage with timestamp")
                } catch (error) {
                    console.warn("Could not store loaded design in localStorage:", error)
                }

                // ALSO store slider settings if they exist in the design
                if (designData.settings) {
                    try {
                        const sliderValues = {
                            buttonSize: designData.settings.buttonSize || 1,
                            buttonOpacity: designData.settings.buttonOpacity || 0.8,
                            modalOpacity: designData.settings.modalOpacity || 0.6,
                            lastLoaded: new Date().toISOString(),
                            source: "from_loaded_design",
                        }
                        localStorage.setItem("sliderValues", JSON.stringify(sliderValues))
                        console.log("Loaded slider settings stored in localStorage")
                    } catch (error) {
                        console.warn("Could not store slider settings:", error)
                    }
                }

                applyDesign(designData)
            } catch (error) {
                alert("Error loading design file. Please check the file format.")
            }
        }

        reader.readAsText(file)
    }

    async function loadDesignFromURL(url) {
        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.status}`)
            }

            const designData = await response.json()

            // Remove duplicates before applying
            if (designData.buttons && Array.isArray(designData.buttons)) {
                designData.buttons = removeDuplicateButtons(designData.buttons)
            }

            // ENHANCED: Store the loaded design in localStorage with timestamp
            try {
                const enhancedDesignData = {
                    ...designData,
                    meta: {
                        ...designData.meta,
                        loadedAt: new Date().toISOString(),
                        source: "url_import",
                        url: url,
                    },
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(enhancedDesignData))
                console.log("Loaded design from URL stored in localStorage")
            } catch (error) {
                console.warn("Could not store loaded design in localStorage:", error)
            }

            // ALSO store slider settings if they exist in the design
            if (designData.settings) {
                try {
                    const sliderValues = {
                        buttonSize: designData.settings.buttonSize || 1,
                        buttonOpacity: designData.settings.buttonOpacity || 0.8,
                        modalOpacity: designData.settings.modalOpacity || 0.6,
                        lastLoaded: new Date().toISOString(),
                        source: "from_loaded_design_url",
                    }
                    localStorage.setItem("sliderValues", JSON.stringify(sliderValues))
                    console.log("Loaded slider settings stored in localStorage")
                } catch (error) {
                    console.warn("Could not store slider settings:", error)
                }
            }

            applyDesign(designData)
        } catch (error) {
            if (url !== DEFAULT_LOAD_FILE) {
                alert(`Error loading design from ${url}. Please check if the file exists and is valid JSON.`)
            }
        }
    }

    function applyDesign(designData) {
        console.log("Applying design:", designData)

        function finishLoading() {
            console.log("Finishing design load.")

            // Clear ALL existing buttons first
            clearAllButtons()

            // Clear arrays
            if (buttons && buttons.getButtons) {
                buttons.getButtons().length = 0
            }

            if (window.DimmerModule && DimmerModule.getDimmerButtons) {
                DimmerModule.getDimmerButtons().length = 0
            }

            if (window.CCTModule && CCTModule.getCCTButtons) {
                CCTModule.getCCTButtons().length = 0
            }

            if (window.RGBModule && RGBModule.getRGBButtons) {
                RGBModule.getRGBButtons().length = 0
            }

            if (window.LockModule && LockModule.getLockButtons) {
                LockModule.getLockButtons().length = 0
            }

            if (window.CurtainModule && CurtainModule.getCurtainButtons) {
                CurtainModule.getCurtainButtons().length = 0
            }

            if (window.RemoteModule && RemoteModule.getRemoteButtons) {
                RemoteModule.getRemoteButtons().length = 0
            }

            // Remove all button elements
            document.querySelectorAll(".light-button").forEach((btn) => btn.remove())

            // Apply slider settings from design
            if (designData.settings) {
                console.log("Loading settings from design:", designData.settings)

                // Apply button size
                if (designData.settings.buttonSize !== undefined) {
                    const size = Number.parseFloat(designData.settings.buttonSize)
                    if (!isNaN(size)) {
                        console.log("Setting button size to:", size)
                        document.documentElement.style.setProperty("--button-scale", size.toString())
                        if (buttonSize) {
                            buttonSize.value = size
                        }
                        if (sizeValue) {
                            sizeValue.textContent = `${Math.round(size * 100)}%`
                        }
                    }
                }

                // Apply button opacity
                if (designData.settings.buttonOpacity !== undefined) {
                    const opacity = Number.parseFloat(designData.settings.buttonOpacity)
                    if (!isNaN(opacity)) {
                        console.log("Setting button opacity to:", opacity)
                        document.documentElement.style.setProperty("--button-opacity", opacity.toString())
                        if (buttonOpacity) {
                            buttonOpacity.value = opacity
                        }
                        if (opacityValue) {
                            opacityValue.textContent = `${Math.round(opacity * 100)}%`
                        }
                    }
                }

                // Apply modal opacity
                if (designData.settings.modalOpacity !== undefined) {
                    const modalOpacityValue = Number.parseFloat(designData.settings.modalOpacity)
                    if (!isNaN(modalOpacityValue)) {
                        console.log("Setting modal opacity to:", modalOpacityValue)
                        document.documentElement.style.setProperty("--dimmer-content-opacity", modalOpacityValue.toString())
                        if (modalOpacity) {
                            modalOpacity.value = modalOpacityValue
                        }
                        if (modalValue) {
                            modalValue.textContent = `${Math.round(modalOpacityValue * 100)}%`
                        }
                    }
                }

                // Save these settings to localStorage sliderValues
                const sliderValues = {
                    buttonSize: designData.settings.buttonSize || 1,
                    buttonOpacity: designData.settings.buttonOpacity || 0.8,
                    modalOpacity: designData.settings.modalOpacity || 0.6,
                    lastApplied: new Date().toISOString(),
                }
                localStorage.setItem("sliderValues", JSON.stringify(sliderValues))
            }

            // Apply transform if exists
            if (designData.transform) {
                scale = designData.transform.scale || scale
                posX = designData.transform.posX || posX
                posY = designData.transform.posY || posY
                applyTransform()
            } else {
                initImage()
            }

            // Load buttons from design data
            if (designData.buttons && Array.isArray(designData.buttons)) {
                console.log("Loading buttons:", designData.buttons.length)

                designData.buttons.forEach((buttonConfig, index) => {
                    // Clean config
                    const cleanConfig = {
                        id: buttonConfig.id || `button_${Date.now()}_${index}`,
                        type: buttonConfig.type || "toggle",
                        entityId: buttonConfig.entityId || "",
                        name: buttonConfig.name || "",
                        iconClass: buttonConfig.iconClass || "fa-lightbulb",
                        position: buttonConfig.position || { x: 0.5, y: 0.5 },
                        brightness: buttonConfig.brightness || 50,
                        temperature: buttonConfig.temperature || 50,
                        hue: buttonConfig.hue || 180,
                        currentPosition: buttonConfig.currentPosition || 0,
                        isLocked: buttonConfig.isLocked || true,
                        remoteConfig: buttonConfig.remoteConfig || [],
                    }

                    console.log(`Creating button ${index}:`, cleanConfig)

                    // Create button based on type
                    if (cleanConfig.type === "dimmer") {
                        if (window.DimmerModule && DimmerModule.create) {
                            DimmerModule.create(cleanConfig)
                        }
                    } else if (cleanConfig.type === "cct") {
                        if (window.CCTModule && CCTModule.create) {
                            CCTModule.create(cleanConfig)
                        }
                    } else if (cleanConfig.type === "rgb") {
                        if (window.RGBModule && RGBModule.create) {
                            RGBModule.create(cleanConfig)
                        }
                    } else if (cleanConfig.type === "lock") {
                        if (window.LockModule && LockModule.create) {
                            LockModule.create(cleanConfig)
                        }
                    } else if (cleanConfig.type === "curtain") {
                        if (window.CurtainModule && CurtainModule.create) {
                            CurtainModule.create({
                                ...cleanConfig,
                                currentPosition: typeof buttonConfig.currentPosition === "number"
                                    ? buttonConfig.currentPosition
                                    : 0, // Default to 0, not 50
                                isOpen: typeof buttonConfig.currentPosition === "number"
                                    ? buttonConfig.currentPosition > 0
                                    : false,
                            })
                        }
                    } else if (cleanConfig.type === "remote") {
                        if (window.RemoteModule && RemoteModule.create) {
                            RemoteModule.create({
                                id: cleanConfig.id,
                                type: "remote",
                                entityId: cleanConfig.entityId,
                                name: cleanConfig.name,
                                iconClass: cleanConfig.iconClass || "remote.svg",
                                position: cleanConfig.position,
                                remoteConfig: cleanConfig.remoteConfig || [],
                            })
                        }
                    } else if (cleanConfig.type === "sensor") {
                        if (window.SensorModule && SensorModule.create) {
                            SensorModule.create({
                                ...cleanConfig,
                                type: "sensor",
                            })
                        }
                    } else {
                        buttons.create(cleanConfig)
                    }
                })
            }

            // Apply button opacity to all buttons after creation
            setTimeout(() => {
                const currentOpacity = buttonOpacity ? Number.parseFloat(buttonOpacity.value) : 0.8
                console.log("Applying opacity to all buttons:", currentOpacity)
                document.querySelectorAll(".light-button").forEach((btn) => {
                    btn.style.opacity = currentOpacity
                })
            }, 200)

            // Get fresh states from Home Assistant
            if (ready && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(
                    JSON.stringify({
                        id: Date.now(),
                        type: "get_states",
                    }),
                )
            }

            updateFooter("Design loaded and stored locally")
        }

        // Handle image loading
        if (designData.image) {
            if (designData.image.startsWith("data:")) {
                img.onload = finishLoading
                img.src = designData.image
            } else {
                if (confirm("Image not included — please upload the floorplan image now.")) {
                    imageFileInput.onchange = () => {
                        const imageFile = imageFileInput.files[0]
                        const imageReader = new FileReader()
                        imageReader.onload = (ev) => {
                            img.onload = finishLoading
                            img.src = ev.target.result
                        }
                        imageReader.readAsDataURL(imageFile)
                    }
                    imageFileInput.click()
                    return
                }
            }
        } else {
            img.onload = finishLoading
            img.src = img.src
        }
    }

    // Add this function to remove duplicate buttons
    function removeDuplicateButtons(buttonsArray) {
        const seen = new Set()
        return buttonsArray.filter((button) => {
            // Create a unique key for each button
            const key = `${button.entityId}_${button.position.x}_${button.position.y}_${button.type}`

            if (seen.has(key)) {
                return false // Duplicate
            }

            seen.add(key)
            return true
        })
    }

    function clearAll() {
        if (!confirm("Are you sure you want to clear all buttons and reset the design? This action cannot be undone.")) {
            return
        }

        // Clear all buttons
        clearAllButtons()

        // Clear design storage but KEEP slider values
        localStorage.removeItem(STORAGE_KEY)

        // DO NOT remove sliderValues!
        // localStorage.removeItem('sliderValues'); // REMOVE THIS LINE!

        // Reset image
        img.src = "image.png"

        // Reset view
        initImage()

        // Sliders should KEEP their values from localStorage
        // They will be loaded automatically via loadSliderValues()

        updateFooter("All cleared! (slider settings preserved)")
    }

    function clearAllButtons() {
        const allButtons = buttons.getButtons()
        allButtons.forEach((button) => {
            buttons.deleteButton(button.id)
        })

        if (window.DimmerModule && DimmerModule.getDimmerButtons) {
            const allDimmers = DimmerModule.getDimmerButtons()
            allDimmers.forEach((dimmer) => {
                DimmerModule.deleteButton(dimmer.id)
            })
        }

        if (window.CCTModule && CCTModule.getCCTButtons) {
            const allCCTs = CCTModule.getCCTButtons()
            allCCTs.forEach((cct) => {
                CCTModule.deleteButton(cct.id)
            })
        }

        if (window.RGBModule && RGBModule.getRGBButtons) {
            const allRGBs = RGBModule.getRGBButtons()
            allRGBs.forEach((rgb) => {
                RGBModule.deleteButton(rgb.id)
            })
        }

        // In clearAllButtons function:
        if (window.SensorModule && SensorModule.getSensorButtons) {
            const allSensors = SensorModule.getSensorButtons()
            allSensors.forEach((sensor) => {
                SensorModule.deleteButton(sensor.id)
            })
        }

        if (window.LockModule && LockModule.getLockButtons) {
            const allLocks = LockModule.getLockButtons()
            allLocks.forEach((lock) => {
                LockModule.deleteButton(lock.id)
            })
        }

        if (window.CurtainModule && CurtainModule.getCurtainButtons) {
            const allCurtains = CurtainModule.getCurtainButtons()
            allCurtains.forEach((curtain) => {
                CurtainModule.deleteButton(curtain.id)
            })
        }

        if (window.RemoteModule && RemoteModule.getRemoteButtons) {
            const allRemotes = RemoteModule.getRemoteButtons()
            allRemotes.forEach((remote) => {
                RemoteModule.deleteButton(remote.id)
            })
        }
    }

    function loadFromStorage() {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY)
            if (storedData) {
                const designData = JSON.parse(storedData)
                applyDesign(designData)
                return true
            }
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY)
        }
        return false
    }

    function updateFooter(text) {
        const footer = document.querySelector(".footer")
        footer.innerHTML = `
        <span>${text}</span>
        <div style="display: flex; gap: 10px;">
            <button class="footer-control load-btn" id="loadBtn">📂 Load.7</button>
            <button class="footer-control reset-footer-btn" id="footerResetBtn" 
                    style="background: #666; padding: 4px 8px; border-radius: 4px;">
                ↻
            </button>
        </div>
    `

        const footerResetBtn = document.getElementById("footerResetBtn")
        if (footerResetBtn) {
            footerResetBtn.addEventListener("click", () => {
                resetViewHard()
                updateFooter("View reset from footer")
            })
        }

        const newLoadBtn = document.getElementById("loadBtn")
        if (newLoadBtn) {
            newLoadBtn.addEventListener("click", () => {
                loadDesignFromURL(DEFAULT_LOAD_FILE)
            })
        }
    }

    function showNotification(message, type = "info") {
        const existing = document.querySelector(".notification-indicator")
        if (existing) existing.remove()

        const notification = document.createElement("div")
        notification.className = `notification-indicator`
        notification.style.background = type === "error" ? "#ff4757" : type === "success" ? "#2ed573" : "#3742fa"
        notification.textContent = message
        document.body.appendChild(notification)

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove()
            }
        }, 2000)
    }

    function saveSliderValues() {
        const sliderValues = {
            buttonSize: buttonSize ? Number.parseFloat(buttonSize.value) : 1,
            buttonOpacity: buttonOpacity ? Number.parseFloat(buttonOpacity.value) : 1,
            modalOpacity: modalOpacity ? Number.parseFloat(modalOpacity.value) : 1,
            lastSaved: new Date().toISOString(),
        }

        try {
            localStorage.setItem("sliderValues", JSON.stringify(sliderValues))
        } catch (error) {
            console.warn("Could not save slider values:", error)
        }
    }
    // Make saveSliderValues available globally
    window.saveSliderValues = saveSliderValues;
    function loadSliderValues() {
        try {
            const saved = JSON.parse(localStorage.getItem("sliderValues") || "{}")

            console.log("Loading saved slider values:", saved)

            /* ---------- BUTTON SIZE ---------- */
            if (saved.buttonSize !== undefined) {
                const size = Number.parseFloat(saved.buttonSize)
                if (!isNaN(size) && buttonSize) {
                    buttonSize.value = size
                    document.documentElement.style.setProperty("--button-scale", size.toString())
                    if (sizeValue) {
                        sizeValue.textContent = `${Math.round(size * 100)}%`
                    }
                    console.log("Loaded button size:", size)
                }
            }

            /* ---------- BUTTON OPACITY ---------- */
            if (saved.buttonOpacity !== undefined) {
                const opacity = Number.parseFloat(saved.buttonOpacity)
                if (!isNaN(opacity) && buttonOpacity) {
                    buttonOpacity.value = opacity
                    // Apply to CSS variable
                    document.documentElement.style.setProperty("--button-opacity", opacity.toString())
                    // Apply to all buttons immediately
                    document.querySelectorAll(".light-button").forEach((btn) => {
                        btn.style.opacity = opacity
                    })
                    if (opacityValue) {
                        opacityValue.textContent = `${Math.round(opacity * 100)}%`
                    }
                    console.log("Loaded button opacity:", opacity)
                }
            }

            /* ---------- MODAL OPACITY ---------- */
            if (saved.modalOpacity !== undefined) {
                const modalOpacityValue = Number.parseFloat(saved.modalOpacity)
                if (!isNaN(modalOpacityValue) && modalOpacity) {
                    modalOpacity.value = modalOpacityValue
                    // Apply to CSS variable
                    document.documentElement.style.setProperty("--dimmer-content-opacity", modalOpacityValue.toString())
                    if (modalValue) {
                        modalValue.textContent = `${Math.round(modalOpacityValue * 100)}%`
                    }
                    console.log("Loaded modal opacity:", modalOpacityValue)
                }
            }
        } catch (error) {
            console.error("Error loading slider values:", error)
            // Set defaults
            document.documentElement.style.setProperty("--button-scale", "1")
            document.documentElement.style.setProperty("--button-opacity", "1")
            document.documentElement.style.setProperty("--dimmer-content-opacity", "1")
        }
    }

    function applyModalOpacity(opacityValue) {
        const opacity = Number.parseFloat(opacityValue)

        document.documentElement.style.setProperty("--dimmer-content-opacity", opacity)
    }

    function applyButtonOpacity(opacityValue) {
        const opacity = Number.parseFloat(opacityValue)

        if (isNaN(opacity)) return

        // Always update the CSS variable
        document.documentElement.style.setProperty("--button-opacity", opacity.toString())

        // Force update all buttons
        const allButtons = document.querySelectorAll(".light-button")
        allButtons.forEach((button) => {
            button.style.opacity = opacity
        })

        // Update slider if it exists
        if (buttonOpacity) {
            buttonOpacity.value = opacity
        }

        // Update display if it exists
        if (opacityValue) {
            opacityValue.textContent = `${Math.round(opacity * 100)}%`
        }
    }

    function setupEventListeners() {
        container.addEventListener(
            "touchstart",
            (e) => {
                if (e.touches.length === 2) {
                    isPinching = true
                    lastPinchDistance = getDistance(e.touches[0], e.touches[1])
                    e.preventDefault()
                }
            },
            { passive: false },
        )

        container.addEventListener(
            "touchmove",
            (e) => {
                if (!isPinching || e.touches.length !== 2) return

                const currentDistance = getDistance(e.touches[0], e.touches[1])
                const zoomFactor = currentDistance / lastPinchDistance

                const oldScale = scale
                scale *= zoomFactor
                scale = Math.min(maxScale, Math.max(minScale, scale))

                const rect = container.getBoundingClientRect()
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - rect.width / 2
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top - rect.height / 2

                const scaleChange = scale / oldScale
                posX = centerX - (centerX - posX) * scaleChange
                posY = centerY - (centerY - posY) * scaleChange

                lastPinchDistance = currentDistance
                applyTransform()

                e.preventDefault()
            },
            { passive: false },
        )

        container.addEventListener("touchend", () => {
            if (isPinching) {
                isPinching = false
                lastPinchDistance = null
            }
        })

        container.addEventListener("mousedown", (e) => {
            if (e.target.closest(".light-button")) return
            startPan(e)
        })

        container.addEventListener(
            "touchstart",
            (e) => {
                if (e.touches.length !== 1 || e.target.closest(".light-button")) return
                startPan(e)
            },
            { passive: false },
        )

        window.addEventListener("mousemove", (e) => {
            if (isDragging) doPan(e)
        })

        window.addEventListener(
            "touchmove",
            (e) => {
                if (e.touches.length !== 1) return
                if (isDragging) doPan(e)
            },
            { passive: false },
        )

        window.addEventListener("mouseup", stopPan)
        window.addEventListener("touchend", stopPan)

        container.addEventListener("wheel", handleZoom, { passive: false })

        // Replace the applyButtonOpacity function with this:
        function applyButtonOpacity(opacityValue) {
            const opacity = Number.parseFloat(opacityValue)

            // Always update the CSS variable
            document.documentElement.style.setProperty("--button-opacity", opacity.toString())

            // Force update all buttons
            const buttons = document.querySelectorAll(".light-button")
            buttons.forEach((button) => {
                button.style.opacity = opacity
            })
        }

        editBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;

            if (isEditMode) {
                editBtn.textContent = '✓ Done';
                editBtn.classList.add('edit-mode');
                container.classList.add('edit-mode');
                editControls.style.display = 'flex';

                // Enable edit mode for all modules
                buttons.enableEditMode(true);
                if (window.DimmerModule && DimmerModule.enableEditMode) {
                    DimmerModule.enableEditMode(true);
                }
                if (window.CCTModule && CCTModule.enableEditMode) {
                    CCTModule.enableEditMode(true);
                }
                if (window.RGBModule && RGBModule.enableEditMode) {
                    RGBModule.enableEditMode(true);
                }
                if (window.LockModule && LockModule.enableEditMode) {
                    LockModule.enableEditMode(true);
                }
                if (window.CurtainModule && CurtainModule.enableEditMode) {
                    CurtainModule.enableEditMode(true);
                }
                if (window.RemoteModule && RemoteModule.enableEditMode) {
                    RemoteModule.enableEditMode(true);
                }
                // ADD THIS FOR SENSOR MODULE:
                if (window.SensorModule && window.SensorModule.enableEditMode) {
                    window.SensorModule.enableEditMode(true);
                }
            } else {
                editBtn.textContent = '✎ Edit';
                editBtn.classList.remove('edit-mode');
                container.classList.remove('edit-mode');
                editControls.style.display = 'none';

                // Disable edit mode for all modules
                buttons.enableEditMode(false);
                if (window.DimmerModule && DimmerModule.enableEditMode) {
                    DimmerModule.enableEditMode(false);
                }
                if (window.CCTModule && CCTModule.enableEditMode) {
                    CCTModule.enableEditMode(false);
                }
                if (window.RGBModule && RGBModule.enableEditMode) {
                    RGBModule.enableEditMode(false);
                }
                if (window.LockModule && LockModule.enableEditMode) {
                    LockModule.enableEditMode(false);
                }
                if (window.CurtainModule && CurtainModule.enableEditMode) {
                    CurtainModule.enableEditMode(false);
                }
                if (window.RemoteModule && RemoteModule.enableEditMode) {
                    RemoteModule.enableEditMode(false);
                }
                // ADD THIS FOR SENSOR MODULE:
                if (window.SensorModule && window.SensorModule.enableEditMode) {
                    window.SensorModule.enableEditMode(false);
                }
            }
        });

        saveBtn.addEventListener("click", saveDesign)

        loadBtn.addEventListener("click", () => {
            loadDesignFromURL(DEFAULT_LOAD_FILE)
        })

        loadFileInput.addEventListener("change", (e) => {
            if (e.target.files[0]) {
                loadDesign(e.target.files[0])
            }
        })

        clearAllBtn.addEventListener("click", clearAll)

        imageBtn.addEventListener("click", () => imageFileInput.click())
        imageFileInput.addEventListener("change", (e) => {
            if (e.target.files[0]) {
                const reader = new FileReader()
                reader.onload = (ev) => {
                    img.src = ev.target.result
                    initImage()
                }
                reader.readAsDataURL(e.target.files[0])
            }
        })

        addBtn.addEventListener("click", () => {
            document.getElementById("buttonPickerModal").style.display = "flex"
        })

        setupSliderListeners()
    }

    function setupSliderListeners() {

        // 🔑 EXIT EARLY IF SLIDERS DON'T EXIST
        if (!buttonSize || !sizeValue) return

        // Button Size Slider
        buttonSize.addEventListener("input", () => {
            const size = Number.parseFloat(buttonSize.value || "1")

            document.documentElement.style.setProperty(
                "--button-scale",
                size.toString()
            )

            sizeValue.textContent = `${Math.round(size * 100)}%`
            saveSliderValues()

            console.log("Button size changed:", size)
        })

        // Button Opacity Slider
        if (buttonOpacity && opacityValue) {
            buttonOpacity.addEventListener("input", () => {
                const opacity = Number.parseFloat(buttonOpacity.value || "1")

                document.documentElement.style.setProperty(
                    "--button-opacity",
                    opacity.toString()
                )

                document.querySelectorAll(".light-button").forEach(btn => {
                    btn.style.opacity = opacity
                })

                opacityValue.textContent = `${Math.round(opacity * 100)}%`
                saveSliderValues()
            })
        }

        // Modal Opacity Slider
        if (modalOpacity && modalValue) {
            modalOpacity.addEventListener("input", () => {
                const opacity = Number.parseFloat(modalOpacity.value || "0.6")

                document.documentElement.style.setProperty(
                    "--dimmer-content-opacity",
                    opacity.toString()
                )

                modalValue.textContent = `${Math.round(opacity * 100)}%`
                saveSliderValues()
            })
        }
    }


    // In main.js - replace the form submission handler
    document.getElementById("buttonEditForm").addEventListener("submit", (e) => {
        e.preventDefault()
        console.log("Form submitted")

        const entityId = document.getElementById("editEntityId").value.trim()
        const name = document.getElementById("editName").value.trim()
        const icon = document.getElementById("editIcon").value

        console.log("Form values:", { entityId, name, icon })

        // Get the button ID that's being edited
        const btnId = window.currentEditingButton
        const btnType = window.currentEditingType

        console.log("Editing button:", btnId, "type:", btnType)

        if (!btnId) {
            alert("No button selected.")
            console.error("No button selected")
            return
        }

        if (!entityId) {
            alert("Entity ID is required.")
            console.error("Entity ID is required")
            return
        }

        // Determine which module to update based on button type
        if (btnType === "dimmer" && window.DimmerModule) {
            console.log("Updating dimmer button:", btnId)
            const success = DimmerModule.updateConfig(btnId, {
                entityId: entityId,
                name: name || "Dimmer",
                iconClass: icon,
            })
            console.log("Dimmer update result:", success)
        } else if (btnType === "cct" && window.CCTModule) {
            console.log("Updating CCT button:", btnId)
            const success = CCTModule.updateConfig(btnId, {
                entityId: entityId,
                name: name || "CCT Light",
                iconClass: icon,
            })
            console.log("CCT update result:", success)
        } else if (btnType === "rgb" && window.RGBModule) {
            console.log("Updating RGB button:", btnId)
            const success = RGBModule.updateConfig(btnId, {
                entityId: entityId,
                name: name || "RGB Light",
                iconClass: icon,
            })
            console.log("RGB update result:", success)
        } else if (btnType === "lock" && window.LockModule) {
            console.log("Updating lock button:", btnId)
            const success = LockModule.updateConfig(btnId, {
                entityId: entityId,
                name: name || "Lock",
                iconClass: icon,
            })
            console.log("Lock update result:", success)
        } else if (btnType === "curtain" && window.CurtainModule) {
            console.log("Updating curtain button:", btnId)
            const success = CurtainModule.updateConfig(btnId, {
                entityId: entityId,
                name: name || "Curtain",
                iconClass: icon,
            })
            console.log("Curtain update result:", success)
        } else if (btnType === "remote" && window.RemoteModule) {
            console.log("Updating remote button:", btnId)
            const success = RemoteModule.updateConfig(btnId, {
                entityId: entityId,
                name: name || "Remote",
                iconClass: icon,
            })
            console.log("Remote update result:", success)
            // In the form submission handler, add this condition:
        } else if (btnType === "sensor" && window.SensorModule && SensorModule.updateConfig) {
            console.log("Updating sensor button:", btnId)
            const success = SensorModule.updateConfig(btnId, {
                entityId: entityId,
                name: name || "Sensor",
                iconClass: icon,
            })
            console.log("Sensor update result:", success)
        }
        else {
            console.log("Updating regular button:", btnId)
            const success = buttons.updateButtonConfig(btnId, {
                entityId: entityId,
                name: name || "Button",
                iconClass: icon,
            })
            console.log("Regular button update result:", success)
        }

        // Close modal
        document.getElementById("buttonEditModal").style.display = "none"

        // Clear selection
        if (window.currentEditingButton) {
            const btn = document.getElementById(window.currentEditingButton)
            if (btn) btn.classList.remove("selected")
        }

        window.currentEditingButton = null
        window.currentEditingType = null
    })

    document.getElementById("closeEditBtn")?.addEventListener("click", () => {
        document.getElementById("buttonEditModal").style.display = "none"

        // Clear selection when modal closes
        if (window.currentEditingButton) {
            const btn = document.getElementById(window.currentEditingButton)
            if (btn) btn.classList.remove("selected")
        }

        window.currentEditingButton = null
        window.currentEditingType = null
    })

    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                overlay.style.display = "none"

                // Clear selection when modal closes
                if (window.currentEditingButton) {
                    const btn = document.getElementById(window.currentEditingButton)
                    if (btn) btn.classList.remove("selected")
                }

                window.currentEditingButton = null
                window.currentEditingType = null
            }
        })
    })

    function connectWebSocket() {
        ws = new WebSocket(WS_URL)

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "auth", access_token: TOKEN }))
        }

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data)

            if (data.type === "auth_ok") {
                ready = true

                setTimeout(() => {
                    ws.send(
                        JSON.stringify({
                            id: 1,
                            type: "get_states",
                        }),
                    )

                    setTimeout(() => {
                        ws.send(
                            JSON.stringify({
                                id: 2,
                                type: "subscribe_events",
                                event_type: "state_changed",
                            }),
                        )
                    }, 100)
                }, 100)
            } else if (data.type === "result" && Array.isArray(data.result)) {
                const states = data.result

                // Update all buttons based on state
                updateAllButtonsFromState(states)
            } else if (data.type === "event" && data.event?.event_type === "state_changed") {
                const entityId = data.event.data.entity_id
                const newState = data.event.data.new_state

                // Update specific button based on state change
                updateButtonFromStateChange(entityId, newState)
            }
        }

        ws.onerror = (error) => {
            disableAllButtons()
        }

        ws.onclose = () => {
            disableAllButtons()
            ready = false
            setTimeout(connectWebSocket, 3000)
        }
    }

    function updateAllButtonsFromState(states) {
        // Update regular buttons
        buttons.getButtons().forEach((button) => {
            const st = states.find((s) => s.entity_id === button.entityId)
            if (st) {
                updateLightUI(button.id, st.state === "on" || st.state === "open" || st.state === "playing")

                const domain = getDomainFromEntityId(button.entityId)

                if (domain === "light" || domain === "fan") {
                    const brightness = st.attributes?.brightness || st.attributes?.percentage
                    if (brightness !== undefined) {
                        let brightnessPercent
                        if (domain === "light") {
                            brightnessPercent = Math.round((brightness / 255) * 100)
                        } else {
                            brightnessPercent = brightness
                        }

                        // Update dimmer module
                        if (window.DimmerModule && DimmerModule.handleStateUpdate) {
                            DimmerModule.handleStateUpdate(button.entityId, st.state, brightnessPercent)
                        }

                        // In updateAllButtonsFromState function:
                        if (window.SensorModule && SensorModule.handleStateUpdate) {
                            SensorModule.handleStateUpdate(entityId, st.state, st.attributes)
                        }

                        // Update CCT module if color temp exists
                        if (st.attributes?.color_temp) {
                            if (window.CCTModule && CCTModule.handleStateUpdate) {
                                CCTModule.handleStateUpdate(button.entityId, st.state, brightnessPercent, st.attributes.color_temp)
                            }
                        }

                        // Update RGB module if hs_color exists
                        if (st.attributes?.hs_color) {
                            if (window.RGBModule && RGBModule.handleStateUpdate) {
                                RGBModule.handleStateUpdate(button.entityId, st.state, brightnessPercent, st.attributes.hs_color)
                            }
                        }
                    }
                }
            }
        })

        // Update dimmer buttons
        if (window.DimmerModule && DimmerModule.getDimmerButtons) {
            DimmerModule.getDimmerButtons().forEach((dimmer) => {
                const st = states.find((s) => s.entity_id === dimmer.entityId)
                if (st) {
                    const brightness = st.attributes?.brightness
                    const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
                    DimmerModule.handleStateUpdate(dimmer.entityId, st.state, brightnessPercent)
                }
            })
        }

        // Update CCT buttons
        if (window.CCTModule && CCTModule.getCCTButtons) {
            CCTModule.getCCTButtons().forEach((cct) => {
                const st = states.find((s) => s.entity_id === cct.entityId)
                if (st) {
                    const brightness = st.attributes?.brightness
                    const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
                    const colorTemp = st.attributes?.color_temp
                    CCTModule.handleStateUpdate(cct.entityId, st.state, brightnessPercent, colorTemp)
                }
            })
        }

        // Update RGB buttons
        if (window.RGBModule && RGBModule.getRGBButtons) {
            RGBModule.getRGBButtons().forEach((rgb) => {
                const st = states.find((s) => s.entity_id === rgb.entityId)
                if (st) {
                    const brightness = st.attributes?.brightness
                    const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
                    const hsColor = st.attributes?.hs_color
                    RGBModule.handleStateUpdate(rgb.entityId, st.state, brightnessPercent, hsColor)
                }
            })
        }

        // Update lock buttons
        if (window.LockModule && LockModule.getLockButtons) {
            LockModule.getLockButtons().forEach((lock) => {
                const st = states.find((s) => s.entity_id === lock.entityId)
                if (st) {
                    const isLocked = st.state === "locked"
                    LockModule.handleStateUpdate(lock.entityId, st.state)
                }
            })
        }

        // Update curtain buttons
        if (window.CurtainModule && CurtainModule.getCurtainButtons) {
            CurtainModule.getCurtainButtons().forEach((curtain) => {
                const st = states.find((s) => s.entity_id === curtain.entityId)
                if (st) {
                    const position = st.attributes?.current_position || st.attributes?.position || 50
                    CurtainModule.handleStateUpdate(curtain.entityId, st.state, position)
                }
            })
        }

        // Update remote buttons
        if (window.RemoteModule && RemoteModule.getRemoteButtons) {
            RemoteModule.getRemoteButtons().forEach((remote) => {
                const st = states.find((s) => s.entity_id === remote.entityId)
                if (st) {
                    RemoteModule.handleStateUpdate(remote.entityId, st.state, st.attributes)
                }
            })
        }
    }

    function updateButtonFromStateChange(entityId, newState) {
        const allLights = buttons.getButtons().filter((l) => l.entityId === entityId)
        allLights.forEach((light) => {
            updateLightUI(light.id, newState.state === "on")

            if (light.type === "dimmer") {
                const brightness = newState.attributes?.brightness
                const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
                if (window.DimmerModule && DimmerModule.handleStateUpdate) {
                    DimmerModule.handleStateUpdate(entityId, newState.state, brightnessPercent)
                }
            } else if (light.type === "cct") {
                const brightness = newState.attributes?.brightness
                const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
                const colorTemp = newState.attributes?.color_temp
                if (window.CCTModule && CCTModule.handleStateUpdate) {
                    CCTModule.handleStateUpdate(entityId, newState.state, brightnessPercent, colorTemp)
                }
            } else if (light.type === "rgb") {
                const brightness = newState.attributes?.brightness
                const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
                const hsColor = newState.attributes?.hs_color
                if (window.RGBModule && RGBModule.handleStateUpdate) {
                    RGBModule.handleStateUpdate(entityId, newState.state, brightnessPercent, hsColor)
                }
            }
        })

        // Also update module-specific buttons
        if (window.DimmerModule && DimmerModule.handleStateUpdate) {
            const brightness = newState.attributes?.brightness
            const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
            DimmerModule.handleStateUpdate(entityId, newState.state, brightnessPercent)
        }

        if (window.CCTModule && CCTModule.handleStateUpdate) {
            const brightness = newState.attributes?.brightness
            const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
            const colorTemp = newState.attributes?.color_temp
            CCTModule.handleStateUpdate(entityId, newState.state, brightnessPercent, colorTemp)
        }

        // In updateButtonFromStateChange function:
        if (window.SensorModule && SensorModule.handleStateUpdate) {
            SensorModule.handleStateUpdate(entityId, newState.state, newState.attributes)
        }

        if (window.RGBModule && RGBModule.handleStateUpdate) {
            const brightness = newState.attributes?.brightness
            const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : 0
            const hsColor = newState.attributes?.hs_color
            RGBModule.handleStateUpdate(entityId, newState.state, brightnessPercent, hsColor)
        }
        if (window.LockModule && LockModule.handleStateUpdate) {
            LockModule.handleStateUpdate(entityId, newState.state)
        }

        // Handle curtain state updates
        if (window.CurtainModule && CurtainModule.handleStateUpdate) {
            const position = newState.attributes?.current_position || newState.attributes?.position || 50
            CurtainModule.handleStateUpdate(entityId, newState.state, position)
        }

        // Handle remote state updates
        if (window.RemoteModule && RemoteModule.handleStateUpdate) {
            RemoteModule.handleStateUpdate(entityId, newState.state, newState.attributes)
        }
    }

    function disableAllButtons() {
        buttons.getButtons().forEach((light) => {
            const btn = document.getElementById(light.id)
            if (btn) btn.disabled = true
        })

        if (window.DimmerModule && DimmerModule.getDimmerButtons) {
            DimmerModule.getDimmerButtons().forEach((dimmer) => {
                const btn = document.getElementById(dimmer.id)
                if (btn) btn.disabled = true
            })
        }

        // In disableAllButtons function:
        if (window.SensorModule && SensorModule.getSensorButtons) {
            SensorModule.getSensorButtons().forEach((sensor) => {
                const btn = document.getElementById(sensor.id)
                if (btn) btn.disabled = true
            })
        }

        if (window.CCTModule && CCTModule.getCCTButtons) {
            CCTModule.getCCTButtons().forEach((cct) => {
                const btn = document.getElementById(cct.id)
                if (btn) btn.disabled = true
            })
        }

        if (window.RGBModule && RGBModule.getRGBButtons) {
            RGBModule.getRGBButtons().forEach((rgb) => {
                const btn = document.getElementById(rgb.id)
                if (btn) btn.disabled = true
            })
        }

        if (window.LockModule && LockModule.getLockButtons) {
            LockModule.getLockButtons().forEach((lock) => {
                const btn = document.getElementById(lock.id)
                if (btn) btn.disabled = true
            })
        }

        if (window.CurtainModule && CurtainModule.getCurtainButtons) {
            CurtainModule.getCurtainButtons().forEach((curtain) => {
                const btn = document.getElementById(curtain.id)
                if (btn) btn.disabled = true
            })
        }

        if (window.RemoteModule && RemoteModule.getRemoteButtons) {
            RemoteModule.getRemoteButtons().forEach((remote) => {
                const btn = document.getElementById(remote.id)
                if (btn) btn.disabled = true
            })
        }
    }

    function toggleLight(entityId, buttonId) {
        if (isEditMode) {
            return
        }

        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            return
        }

        const light = buttons.getButtons().find((l) => l.entityId === entityId)
        if (!light) return

        const btn = document.getElementById(buttonId)
        const isOn = btn.classList.contains("on")

        // Handle special button types that open modals instead of toggling
        if (light.type === "dimmer") {
            if (window.DimmerModule && DimmerModule.openDimmerModal) {
                DimmerModule.openDimmerModal(light)
            }
            return
        } else if (light.type === "cct") {
            if (window.CCTModule && CCTModule.openCCTModal) {
                CCTModule.openCCTModal(light)
            }
            return
        } else if (light.type === "rgb") {
            if (window.RGBModule && RGBModule.openRGBModal) {
                RGBModule.openRGBModal(light)
            }
            return
        } else if (light.type === "remote") {
            if (window.RemoteModule && RemoteModule.openRemoteModal) {
                RemoteModule.openRemoteModal(light)
            }
            return
        } else if (light.type === "sensor") { // ← ADD THIS SECTION
            // Open sensor modal instead of toggling
            if (window.SensorModule && SensorModule.openSensorModal) {
                SensorModule.openSensorModal(light)
            }
            return
        }

        // Handle regular toggle buttons
        const domain = getDomainFromEntityId(entityId)
        let service, serviceData

        if (domain === "switch") {
            service = isOn ? "turn_off" : "turn_on"
            serviceData = { entity_id: entityId }
        } else if (domain === "light") {
            service = isOn ? "turn_off" : "turn_on"
            serviceData = { entity_id: entityId }
        } else if (domain === "scene") {
            service = "turn_on"
            serviceData = { entity_id: entityId }
        } else if (domain === "script") {
            service = "turn_on"
            serviceData = { entity_id: entityId }
        } else if (domain === "cover") {
            service = isOn ? "close_cover" : "open_cover"
            serviceData = { entity_id: entityId }
        } else if (domain === "input_boolean") {
            service = isOn ? "turn_off" : "turn_on"
            serviceData = { entity_id: entityId }
        } else if (domain === "fan") {
            service = isOn ? "turn_off" : "turn_on"
            serviceData = { entity_id: entityId }
        } else {
            service = isOn ? "turn_off" : "turn_on"
            serviceData = { entity_id: entityId }
        }

        ws.send(
            JSON.stringify({
                id: Date.now(),
                type: "call_service",
                domain: domain,
                service: service,
                service_data: serviceData,
            }),
        )

        updateLightUI(buttonId, !isOn)

        updateFooter(`${light.name} is ${!isOn ? "on" : "off"}`)
    }

    function getDomainFromEntityId(entityId) {
        if (!entityId) return "light"

        const parts = entityId.split(".")
        return parts.length > 0 ? parts[0] : "light"
    }

    function getButtonType(buttonId) {
        const btn = document.getElementById(buttonId)
        if (!btn) return "toggle"

        if (btn.classList.contains("dimmer")) return "dimmer"
        if (btn.classList.contains("cct")) return "cct"
        if (btn.classList.contains("rgb")) return "rgb"
        if (btn.classList.contains("remote")) return "remote"
        if (btn.classList.contains("lock")) return "lock"
        if (btn.classList.contains("curtain")) return "curtain"
        return "toggle"
    }

    function updateLightUI(buttonId, isOn) {
        const btn = document.getElementById(buttonId)
        if (!btn) return

        const icon = btn.querySelector(".icon")
        const light = buttons.getButtons().find((l) => l.id === buttonId)

        if (!light) return

        const domain = getDomainFromEntityId(light.entityId)

        if (isOn) {
            btn.classList.add("on")
            btn.classList.remove("off")

            if (domain === "cover") {
                icon.classList.add("fa-door-open")
            } else if (domain === "fan") {
                icon.classList.add("fa-fan")
            } else {
                icon.classList.add("fa-solid")
            }
        } else {
            btn.classList.remove("on")
            btn.classList.add("off")

            if (domain === "cover") {
                icon.classList.remove("fa-door-open")
                icon.classList.add("fa-door-closed")
            } else if (domain === "fan") {
                icon.classList.remove("fa-fan")
            } else {
                icon.classList.remove("fa-solid")
            }
        }

        btn.disabled = false
    }

    // Update Lock via WebSocket
    function updateLock(entityId, isLocked, buttonId) {
        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            return
        }

        const domain = getDomainFromEntityId(entityId)

        if (domain === "lock") {
            const service = isLocked ? "lock" : "unlock"

            ws.send(
                JSON.stringify({
                    id: Date.now(),
                    type: "call_service",
                    domain: "lock",
                    service: service,
                    service_data: {
                        entity_id: entityId,
                    },
                }),
            )

            updateFooter(`Lock ${isLocked ? "locked" : "unlocked"}`)
        }
    }

    function updateSensor(entityId, state, attributes) {
        // This function will be called by SensorModule
        console.log("Sensor update:", entityId, state, attributes)

        // Update UI based on sensor state
        if (window.SensorModule && SensorModule.handleStateUpdate) {
            SensorModule.handleStateUpdate(entityId, state, attributes)
        }
    }

    // Update Curtain via WebSocket
    function updateCurtain(entityId, position, buttonId) {
        if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
            return
        }

        const domain = getDomainFromEntityId(entityId)

        if (domain === "cover") {
            ws.send(
                JSON.stringify({
                    id: Date.now(),
                    type: "call_service",
                    domain: "cover",
                    service: "set_cover_position",
                    service_data: {
                        entity_id: entityId,
                        position: position,
                    },
                }),
            )

            updateFooter(`Curtain position set to ${position}%`)
        }
    }

    window.addEventListener("resize", () => {
        const oldScale = scale

        initImage()

        if (oldScale > 1.5) {
            scale = Math.min(oldScale, maxScale)
            applyTransform()
        }

        updateButtonPositions()
    })

    function setupMobileZoomPrevention() {
        let lastTap = 0
        container.addEventListener(
            "touchend",
            (e) => {
                const currentTime = new Date().getTime()
                const tapLength = currentTime - lastTap

                if (tapLength < 300 && tapLength > 0) {
                    e.preventDefault()
                    e.stopPropagation()
                }

                lastTap = currentTime
            },
            { passive: false },
        )

        document.addEventListener(
            "touchmove",
            (e) => {
                if (e.scale !== 1) {
                    e.preventDefault()
                }
            },
            { passive: false },
        )
    }

    function fixAllIconsGlobally() {
        console.log("Performing global icon fix...")

        // Wait for everything to load
        setTimeout(() => {
            if (window.SVGIcons && window.SVGIcons.fixAllButtonIcons) {
                window.SVGIcons.fixAllButtonIcons()
            }

            // Additional cleanup
            document.querySelectorAll(".light-button").forEach((button) => {
                // Remove any duplicate SVGs
                const svgs = button.querySelectorAll(".svg-icon")
                if (svgs.length > 1) {
                    for (let i = 1; i < svgs.length; i++) {
                        svgs[i].remove()
                    }
                }

                // Remove any FontAwesome remnants
                const faIcons = button.querySelectorAll(".fas, .fa, .far, .fal, .fad, .fab")
                faIcons.forEach((icon) => icon.remove())

                // Ensure only one icon container
                let iconContainer = button.querySelector(".icon")
                if (!iconContainer) {
                    iconContainer = document.createElement("div")
                    iconContainer.className = "icon"
                    button.appendChild(iconContainer)
                }

                // Clear and reload icon
                const iconName = button.dataset.icon || "light-bulb-1.svg"
                if (window.SVGIcons) {
                    window.SVGIcons.clearButtonIcons(button)
                    setTimeout(() => {
                        window.SVGIcons.setIconImmediately(button, iconName)
                    }, 50)
                }
            })
        }, 1000)
    }

    function init() {
        // Preload common SVG icons
        if (window.SVGIcons && window.SVGIcons.preloadIcons) {
            const commonIcons = ["light-bulb-1.svg", "dimmer.svg", "fan.svg", "door-opened.svg", "door-closed.svg", "remote.svg"]
            window.SVGIcons.preloadIcons(commonIcons)
        }
        // Load slider values FIRST
        loadSliderValues()
        setTimeout(fixAllIconsGlobally, 1500)

        // Initialize modules with callbacks
        buttons.init(pan, getImageMetadata, {
            toggleLight: toggleLight,
            updateBrightness: updateBrightness,
        })

        // Initialize SensorModule
        if (window.SensorModule && typeof window.SensorModule.init === "function") {
            SensorModule = window.SensorModule.init({
                updateSensor: updateSensor,
            })
        }
        if (window.DimmerModule) {
            DimmerModule = window.DimmerModule.init({
                updateBrightness,
            })
        }

        if (window.CCTModule) {
            CCTModule = window.CCTModule.init({
                updateCCT,
            })
        }

        if (window.RGBModule) {
            RGBModule = window.RGBModule.init({
                updateRGB,
            })
        }

        if (window.LockModule) {
            LockModule = window.LockModule.init({
                updateLock,
            })
        }

        if (window.CurtainModule) {
            CurtainModule = window.CurtainModule.init({
                updateCurtain,
            })
        }

        if (window.RemoteModule) {
            RemoteModule = window.RemoteModule.init({
                sendCommand: (domain, service, serviceData) => {
                    if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
                        console.warn("WS not ready")
                        return
                    }

                    ws.send(
                        JSON.stringify({
                            id: Date.now(),
                            type: "call_service",
                            domain,
                            service,
                            service_data: serviceData,
                        }),
                    )

                    updateFooter(`Sent ${domain}.${service}`)
                },
            })
        }
        // Initialize image and UI
        initImage()
        setupMobileZoomPrevention()
        setupEventListeners()

        // Apply modal opacity immediately (using loaded value)
        if (modalOpacity) {
            const initialModalOpacity = Number.parseFloat(modalOpacity.value) || 1
            applyModalOpacity(initialModalOpacity)
        }

        // Apply button opacity immediately (using loaded value)
        if (buttonOpacity) {
            const initialButtonOpacity = Number.parseFloat(buttonOpacity.value) || 1
            applyButtonOpacity(initialButtonOpacity)
        }

        // Load design
        if (!loadFromStorage()) {
            showNotification("Loading default design...", "info")
            loadDesignFromURL(DEFAULT_LOAD_FILE).catch(() => {
                img.src = "image.png"
                updateFooter("Ready")
            })
        }

        connectWebSocket()
    }

    init()
    loadSliderValues()
})

document.addEventListener(
    "wheel",
    (e) => {
        if (e.ctrlKey) e.preventDefault()
    },
    { passive: false },
)

document.addEventListener("keydown", (e) => {
    const key = e.key
    if ((e.ctrlKey || e.metaKey) && (key === "=" || key === "-" || key === "0")) {
        e.preventDefault()
    }
})

function getDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX
    const dy = t2.clientY - t1.clientY
    return Math.hypot(dx, dy)
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay").forEach((overlay) => {
            overlay.style.display = "none"
        })

        // Clear selection when modal closes
        if (window.currentEditingButton) {
            const btn = document.getElementById(window.currentEditingButton)
            if (btn) btn.classList.remove("selected")
        }

        window.currentEditingButton = null
        window.currentEditingType = null
    }
})

let lastTapTime = 0
const container = document.getElementById("container")
if (container) {
    container.addEventListener(
        "touchend",
        (e) => {
            const currentTime = new Date().getTime()
            const tapLength = currentTime - lastTapTime

            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault()
                e.stopPropagation()

                if (window.resetViewHard) {
                    window.resetViewHard()
                }

                container.style.backgroundColor = "rgba(76, 175, 80, 0.2)"
                setTimeout(() => {
                    container.style.backgroundColor = ""
                }, 300)

                return false
            }

            lastTapTime = currentTime
        },
        { passive: false },
    )
}

// Add this to main.js
window.addEventListener("beforeunload", () => {
    saveSliderValues()
})

// Also save when leaving edit mode
// Also save when leaving edit mode
const editBtn = document.getElementById("editBtn")
if (editBtn) {
    editBtn.addEventListener("click", () => {
        setTimeout(() => {
            if (!isEditMode) {
                saveSliderValues()
            }
        }, 100)
    })
}

// Function to fix all existing button icons
function fixAllButtonIcons() {
    console.log("Fixing all button icons...")

    const allButtons = document.querySelectorAll(".light-button")
    allButtons.forEach((button) => {
        // Remove any FontAwesome icons
        const fontAwesomeIcons = button.querySelectorAll(".fas, .fa, .far, .fal, .fad, .fab")
        fontAwesomeIcons.forEach((icon) => icon.remove())

        // Ensure only one icon container
        let iconContainer = button.querySelector(".icon")
        if (!iconContainer) {
            iconContainer = document.createElement("div")
            iconContainer.className = "icon"
            button.appendChild(iconContainer)
        }

        // Remove duplicate SVGs
        const svgs = iconContainer.querySelectorAll(".svg-icon")
        if (svgs.length > 1) {
            // Keep only the first SVG
            for (let i = 1; i < svgs.length; i++) {
                svgs[i].remove()
            }
        }

        // Get icon from data attribute and reload if needed
        const iconName = button.dataset.icon || "light-bulb-1.svg"
        if (window.SVGIcons) {
            window.SVGIcons.setIconImmediately(button, iconName)
        }
    })

    console.log("Button icons fixed")
}

// Call this after DOM is loaded and modules are initialized
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(fixAllButtonIcons, 1000) // Fix after 1 second
})