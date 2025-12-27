// remote.js - Complete Remote Control Module (Enhanced)
window.RemoteModule = (() => {
    // Internal state
    let remoteButtons = []
    let currentRemote = null
    let remoteModal = null
    let remoteEditModal = null
    let remoteGrid = null
    let callbacks = {}
    let isEditMode = false
    let isDragging = false
    let longPressTimer = null
    let currentEditingRemoteButtonIndex = null
    let currentDraggingButton = null
    const dragStart = { x: 0, y: 0 }
    const dragThreshold = 10
    
    // Touch scrolling variables
    let isScrolling = false
    let scrollStartY = 0
    let modalContent = null
    let touchStartY = 0
    let isTouchOnModalContent = false

    // SVG Configuration
    const SVG_PATH = './src/svg/'
    const SVG_ICONS = [
        'power.svg', 'tv.svg', 'volume-up.svg', 'volume-down.svg', 'volume-mute.svg',
        'home.svg', 'arrow-left.svg', 'arrow-right.svg', 'arrow-up.svg', 'arrow-down.svg',
        'light-bulb-1.svg', 'light-bulb-2.svg', 'light-bulb-3.svg', 'light-bulb-4.svg',
        'play.svg', 'pause.svg', 'stop.svg', 'plus.svg', 'settings1.svg', 'settings2.svg',
        'fan.svg', 'ac-1.svg', 'ac-2.svg', 'ac-3.svg', 'climate.svg', 'alarm.svg',
        'bluetooth.svg', 'wifi-on.svg', 'wifi-off.svg', 'camera.svg', 'door-closed.svg',
        'door-opened.svg', 'lock.svg', 'lock-open.svg', 'curtain1.svg', 'curtain2.svg',
        'blind.svg', 'dimmer-1.svg', 'dimmer-3.svg', 'ceiling-light.svg', 'table-light-1.svg',
        'table-light-2.svg', 'chandelier-1.svg', 'chandelier-2.svg', 'chandelier-3.svg',
        'netflix.svg', 'youtube.svg', 'prime.svg', 'hotstar.svg', 'kodi.svg', 'cast.svg',
        'hdmi.svg', 'satellite.svg', 'source.svg', 'back.svg', 'menu1.svg', 'menu2.svg',
        'ok.svg', 'cross.svg', 'reload.svg', 'skip-backward1.svg', 'skip-backward2.svg',
        'skip-forward1.svg', 'skip-forward2.svg', 'film.svg', 'movie.svg', 'presentation.svg',
        'projector.svg', 'printer1.svg', 'printer2.svg', 'file-search.svg', 'navigate.svg',
        'human.svg', 'person-fall-1.svg', 'person-fall-2.svg', 'sensor-presence1.svg',
        'sensor-presense.svg', 'walk-1.svg', 'signal.svg', 'data.svg', 'info.svg',
        'exit.svg', 'candle.svg', 'drop.svg', 'remote.svg', 'remote2.svg', 'remote4.svg',
        'minus.svg', 'vibrate-on.svg', 'vibrate-off.svg'
    ]
    let svgCache = new Map()

    // Create and inject all necessary styles
    function injectStyles() {
        const style = document.createElement("style")
        style.textContent = `
      /* Remote Button Styles */
      .light-button.remote {
        background: white;
        border: 1px solid #ddd;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        cursor: pointer;
        border-radius: 5px;
      }

      .light-button.remote .icon {
        color: #666;
      }

      .light-button.remote:hover {
        box-shadow: 0 3px 8px rgba(0,0,0,0.15);
        background-color: #f0f0f0;
      }

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
        box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
        cursor: grabbing;
      }

      /* Remote Control Modal Styles - MOBILE FIXED */
      .remote-control-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 20px 10px;
        box-sizing: border-box;
        touch-action: pan-y; /* Allow vertical scrolling */
      }

      .remote-control-content {
        background-color: rgba(255, 255, 255, var(--dimmer-content-opacity, 0.95));
        border-radius: 15px;
        width: 100%;
        height: fit-content;
        max-width: 450px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 25px;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 15px auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        box-sizing: border-box;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y; /* Allow vertical scrolling on content */
      }

      /* Mobile-specific styles */
      @media (max-width: 768px) {
        .remote-control-modal {
          padding: 10px 5px;
          align-items:center;
        justify-content: center;
          overflow-y: scroll; /* Ensure modal can scroll */
        }
        
        .remote-control-content {
          max-height: 85vh;
          padding: 20px 15px;
          margin: 0 auto;
          width: 95%;
          overflow-y: auto;
        }
        
        .remote-grid {
          gap: 10px;
          margin: 15px 0;
        }
        
        .remote-control-btn {
          height: 65px;
          font-size: 16px;
          touch-action: manipulation; /* Prevent browser zoom on buttons */
        }
        
        .remote-btn-icon {
          width: 28px;
          height: 28px;
        }
        
        .remote-btn-label {
          font-size: 11px;
        }
        
        .remote-icon-grid {
          max-height: 150px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Improve touch scrolling on mobile */
        .remote-control-modal * {
          -webkit-tap-highlight-color: transparent;
        }
      }

      @media (max-width: 480px) {
        .remote-control-content {
          padding: 15px 10px;
          max-height: 80vh;
        }
        
        .remote-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        
        .remote-control-btn {
          height: 60px;
          font-size: 15px;
        }
        
        .remote-title {
          font-size: 20px;
        }
        
        .remote-subtitle {
          font-size: 12px;
        }
        
        .remote-form-group {
          margin-bottom: 12px;
        }
        
        .remote-control-modal {
        
        justify-content: center;
          padding: 5px;
        }
      }

      .remote-control-modal .close-modal {
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #000;
        z-index: 1001;
        width: 35px;
        height: 35px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        transition: background-color 0.2s;
        touch-action: manipulation;
      }

      .remote-control-modal .close-modal:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }

      /* Edit button in header */
      .remote-edit-button {
        position: absolute;
        top: 15px;
        left: 15px;
        background: none;
        border: none;
        cursor: pointer;
        color: #000;
        z-index: 1001;
        width: 35px;
        height: 35px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        transition: background-color 0.2s;
        touch-action: manipulation;
      }

      .remote-edit-button:hover {
        background-color: rgba(0, 122, 255, 0.1);
      }

      /* Remote Control Styles */
      .remote-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .remote-title {
        color: #000;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
        font-family: Arial, sans-serif;
        text-align: center;
        word-break: break-word;
      }

      .remote-subtitle {
        color: #aaa;
        font-size: 14px;
        margin-bottom: 25px;
        font-family: Arial, sans-serif;
        text-align: center;
        display: none;
        word-break: break-word;
      }

      .remote-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(auto-fit, minmax(70px, 1fr));
        gap: 15px;
        width: 100%;
        max-width: 350px;
        margin: 20px auto;
        touch-action: manipulation;
      }

      .remote-control-btn {
        background: linear-gradient(145deg, #ffffff, #ffffff);
        border: none;
        border-radius: 10px;
        color: #000;
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
        touch-action: manipulation;
        -webkit-user-select: none;
        user-select: none;
      }

      .remote-control-btn:hover {
        background: linear-gradient(145deg, #e8e8e8, #d0d0d0);
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
      }

      .remote-control-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .remote-control-btn.power {
        background: linear-gradient(145deg, #ff3b30, #cc0000);
        color: white;
      }

      .remote-control-btn.power:hover {
        background: linear-gradient(145deg, #ff5c52, #ff3b30);
        color: white;
      }

      .remote-control-btn.function {
        background: linear-gradient(145deg, #007aff, #0056cc);
        color: white;
      }

      .remote-control-btn.function:hover {
        background: linear-gradient(145deg, #3395ff, #007aff);
        color: white;
      }

      .remote-btn-icon {
        margin-bottom: 5px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .remote-btn-icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }

      .remote-btn-label {
        font-size: 12px;
        opacity: 0.9;
        max-width: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Edit Form Styles */
      .remote-edit-form {
        width: 100%;
        display: none;
        overflow-y: auto;
        max-height: calc(90vh - 150px);
        -webkit-overflow-scrolling: touch;
      }

      .remote-form-group {
        margin-bottom: 15px;
        width: 100%;
      }

      .remote-form-label {
        display: block;
        margin-bottom: 5px;
        color: #333;
        font-weight: bold;
        font-size: 14px;
      }

      .remote-form-input,
      .remote-form-select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 14px;
        box-sizing: border-box;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        touch-action: manipulation;
      }

      .remote-form-input:focus,
      .remote-form-select:focus {
        outline: none;
        border-color: #007aff;
      }

      /* Style for select dropdown on mobile */
      .remote-form-select {
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 20px;
        padding-right: 40px;
      }

      .remote-color-picker-container {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .remote-color-picker {
        width: 50px;
        height: 50px;
        border: 1px solid #ddd;
        border-radius: 5px;
        cursor: pointer;
        -webkit-appearance: none;
        border: none;
        padding: 0;
        touch-action: manipulation;
      }

      .remote-color-picker::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      .remote-color-picker::-webkit-color-swatch {
        border: 1px solid #ddd;
        border-radius: 5px;
      }

      .remote-color-value {
        font-family: monospace;
        font-size: 14px;
        color: #666;
      }

      .remote-button-preview {
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

      .remote-button-preview-icon {
        margin-bottom: 5px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .remote-button-preview-icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }

      .remote-button-preview-label {
        font-size: 12px;
        font-weight: bold;
      }

      .remote-form-buttons {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .remote-btn {
        padding: 12px 20px;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 1;
        min-height: 44px;
        touch-action: manipulation;
      }

      .remote-btn-primary {
        background: linear-gradient(145deg, #007aff, #0056cc);
        color: white;
      }

      .remote-btn-primary:hover {
        background: linear-gradient(145deg, #3395ff, #007aff);
      }

      .remote-btn-secondary {
        background: #f0f0f0;
        color: #333;
      }

      .remote-btn-secondary:hover {
        background: #e0e0e0;
      }

      .remote-btn-danger {
        background: linear-gradient(145deg, #ff3b30, #cc0000);
        color: white;
      }

      .remote-btn-danger:hover {
        background: linear-gradient(145deg, #ff5c52, #ff3b30);
      }

      /* Icon grid */
      .remote-icon-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
        max-height: 200px;
        overflow-y: auto;
        padding: 10px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 10px;
        margin-top: 10px;
        -webkit-overflow-scrolling: touch;
      }

      .remote-icon-option {
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s;
        padding: 8px;
        background: white;
        border: 2px solid transparent;
        touch-action: manipulation;
      }

      .remote-icon-option svg {
        width: 24px;
        height: 24px;
        fill: #666;
      }

      .remote-icon-option:hover {
        background: #e3f2fd;
      }

      .remote-icon-option:hover svg {
        fill: #007aff;
      }

      .remote-icon-option.selected {
        background: #007aff;
        border-color: #0056cc;
      }

      .remote-icon-option.selected svg {
        fill: white;
      }

      /* Delete confirmation */
      .remote-delete-confirmation {
        text-align: center;
        padding: 20px;
        display: none;
      }

      .remote-delete-confirmation p {
        margin-bottom: 20px;
        color: #333;
        font-size: 16px;
      }

      /* Empty state */
      .remote-empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px 20px;
        color: #666;
        font-size: 14px;
      }

      .remote-empty-state svg {
        width: 32px;
        height: 32px;
        opacity: 0.5;
        margin-bottom: 10px;
        fill: #666;
      }

      /* Force color override for all SVG elements */
      .remote-control-btn svg,
      .remote-control-btn svg *,
      .remote-button-preview-icon svg,
      .remote-button-preview-icon svg *,
      .remote-icon-option svg,
      .remote-icon-option svg * {
        fill: currentColor !important;
      }

      /* Selected icon should be white */
      .remote-icon-option.selected svg,
      .remote-icon-option.selected svg * {
        fill: white !important;
      }

      /* Prevent body scroll when modal is open */
      body.modal-open {
        overflow: hidden;
        position: fixed;
        width: 100%;
        height: 100%;
      }

      /* Scrollbar styling for better mobile experience */
      .remote-control-modal::-webkit-scrollbar {
        width: 5px;
      }

      .remote-control-modal::-webkit-scrollbar-track {
        background: transparent;
      }

      .remote-control-modal::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 10px;
      }

      .remote-control-content::-webkit-scrollbar {
        width: 5px;
      }

      .remote-control-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .remote-control-content::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 10px;
      }
    `
        document.head.appendChild(style)
    }

    // Create remote modal HTML (with edit capabilities)
    function createModal() {
        if (document.getElementById("remoteControlModal")) return

        const modalHTML = `
      <div class="remote-control-modal" id="remoteControlModal">
        <div class="remote-control-content">
          <button class="remote-edit-button" id="remoteEditBtn" title="Edit Remote">
            <svg class="svg-icon" viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>

          <button class="close-modal" id="closeRemoteControlBtn">&times;</button>

          <div class="remote-title" id="remoteControlTitle">Remote Control</div>
          <div class="remote-subtitle" id="remoteControlSubtitle">Smart Controller</div>

          <div class="remote-container">
            <div class="remote-grid" id="remoteControlGrid">
              <div class="remote-empty-state" id="remoteEmptyState">
                <svg viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <br>
                No buttons yet. Click the edit button to add your first button.
              </div>
            </div>
          </div>

          <!-- Edit Form -->
          <div class="remote-edit-form" id="remoteEditForm">
            <div class="remote-form-group">
              <label class="remote-form-label">Button Icon</label>
              <input type="text" class="remote-form-input" id="remoteButtonIcon" placeholder="power.svg" value="power.svg">
              <div class="remote-icon-grid" id="remoteIconGrid">
                <!-- Icons will be populated dynamically -->
              </div>
            </div>

            <div class="remote-form-group">
              <label class="remote-form-label">Button Text</label>
              <input type="text" class="remote-form-input" id="remoteButtonText" placeholder="Enter button label" value="New Button">
            </div>

            <div class="remote-form-group">
              <label class="remote-form-label">Entity Type</label>
              <select class="remote-form-select" id="remoteEntityType">
                <option value="remote">Remote Control</option>
                <option value="switch">Switch</option>
              </select>
            </div>

            <div id="remoteConfig" class="remote-form-group">
              <label class="remote-form-label">Remote Entity ID</label>
              <input type="text" class="remote-form-input" id="remoteEntityId" placeholder="remote.living_room_tv">

              <label class="remote-form-label" style="margin-top: 10px;">Remote Service</label>
              <select class="remote-form-select" id="remoteService">
                <option value="">Select service...</option>
                <option value="remote.send_command">remote.send_command</option>
                <option value="remote.turn_on">remote.turn_on</option>
                <option value="remote.turn_off">remote.turn_off</option>
              </select>

              <div class="remote-form-group" id="remoteCommandContainer" style="margin-top: 10px; display: none;">
                <label class="remote-form-label">Command</label>
                <input type="text" class="remote-form-input" id="remoteCommand" placeholder="power, volume_up, etc.">
              </div>
            </div>

            <div id="switchConfig" class="remote-form-group" style="display: none;">
              <label class="remote-form-label">Switch Entity ID</label>
              <input type="text" class="remote-form-input" id="switchEntityId" placeholder="switch.living_room_lamp">
            </div>

            <div class="remote-form-group">
              <label class="remote-form-label">Text Color</label>
              <div class="remote-color-picker-container">
                <input type="color" class="remote-color-picker" id="remoteTextColor" value="#000000">
                <span class="remote-color-value" id="remoteTextColorValue">#000000</span>
              </div>
            </div>

            <div class="remote-form-group">
              <label class="remote-form-label">Background Color</label>
              <div class="remote-color-picker-container">
                <input type="color" class="remote-color-picker" id="remoteBgColor" value="#ffffff">
                <span class="remote-color-value" id="remoteBgColorValue">#ffffff</span>
              </div>
            </div>

            <div class="remote-form-group">
              <label class="remote-form-label">Button Preview</label>
              <div class="remote-button-preview" id="remoteButtonPreview">
                <div class="remote-button-preview-icon" id="remotePreviewIcon"></div>
                <span class="remote-button-preview-label">New Button</span>
              </div>
            </div>

            <div class="remote-form-buttons">
              <button class="remote-btn remote-btn-danger" id="remoteDeleteButton" style="display: none;">Delete Button</button>
              <button class="remote-btn remote-btn-secondary" id="remoteCancelEdit">Cancel</button>
              <button class="remote-btn remote-btn-primary" id="remoteSaveButton">Save Button</button>
            </div>
          </div>

          <!-- Delete Confirmation -->
          <div class="remote-delete-confirmation" id="remoteDeleteConfirmation">
            <h3 style="color: #ff3b30; margin-bottom: 15px;">Delete Button</h3>
            <p>Are you sure you want to delete this button? This action cannot be undone.</p>
            <div class="remote-form-buttons">
              <button class="remote-btn remote-btn-secondary" id="remoteCancelDelete">Cancel</button>
              <button class="remote-btn remote-btn-danger" id="remoteConfirmDelete">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `
        document.body.insertAdjacentHTML("beforeend", modalHTML)

        // Get references
        remoteModal = document.getElementById("remoteControlModal")
        remoteGrid = document.getElementById("remoteControlGrid")
        modalContent = document.querySelector(".remote-control-content")
        
        remoteEditModal = {
            form: document.getElementById("remoteEditForm"),
            iconGrid: document.getElementById("remoteIconGrid"),
            iconInput: document.getElementById("remoteButtonIcon"),
            textInput: document.getElementById("remoteButtonText"),
            entityTypeSelect: document.getElementById("remoteEntityType"),
            entityIdInput: document.getElementById("remoteEntityId"),
            serviceSelect: document.getElementById("remoteService"),
            commandContainer: document.getElementById("remoteCommandContainer"),
            commandInput: document.getElementById("remoteCommand"),
            switchEntityIdInput: document.getElementById("switchEntityId"),
            textColorInput: document.getElementById("remoteTextColor"),
            bgColorInput: document.getElementById("remoteBgColor"),
            textColorValue: document.getElementById("remoteTextColorValue"),
            bgColorValue: document.getElementById("remoteBgColorValue"),
            preview: document.getElementById("remoteButtonPreview"),
            previewIcon: document.getElementById("remotePreviewIcon"),
            deleteButton: document.getElementById("remoteDeleteButton"),
            saveButton: document.getElementById("remoteSaveButton"),
            cancelButton: document.getElementById("remoteCancelEdit")
        }
    }

    // Load SVG content
    async function loadSVG(svgName) {
        if (svgCache.has(svgName)) {
            return svgCache.get(svgName)
        }

        try {
            const response = await fetch(`${SVG_PATH}${svgName}`)
            if (!response.ok) throw new Error(`Failed to load ${svgName}`)

            const svgText = await response.text()
            svgCache.set(svgName, svgText)
            return svgText
        } catch (error) {
            console.error('Error loading SVG:', error)
            return `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`
        }
    }

    // Create SVG element from content
    function createSVGFromContent(svgContent, color = 'currentColor', size = 32) {
        const container = document.createElement('div')
        container.innerHTML = svgContent
        const svg = container.querySelector('svg')

        if (svg) {
            if (!svg.hasAttribute('viewBox')) {
                svg.setAttribute('viewBox', '0 0 24 24')
            }
            svg.style.width = `${size}px`
            svg.style.height = `${size}px`
            svg.style.fill = color
            return svg.cloneNode(true)
        }

        const fallback = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        fallback.setAttribute('viewBox', '0 0 24 24')
        fallback.style.width = `${size}px`
        fallback.style.height = `${size}px`
        fallback.style.fill = color
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z')
        fallback.appendChild(path)
        return fallback
    }

    // Initialize the module
    function init(cb) {
        callbacks = cb || {}

        // Inject styles
        injectStyles()

        // Create modal
        createModal()

        // Setup event listeners
        setupEventListeners()

        // Load saved remote buttons
        loadFromLocalStorage()

        console.log("Remote module initialized with full features")
        return {
            create,
            enableEditMode,
            updatePositions,
            getRemoteButtons,
            updateConfig,
            deleteButton,
            openRemoteModal,
            handleStateUpdate,
        }
    }

    // Load from localStorage
    function loadFromLocalStorage() {
        const saved = localStorage.getItem("remoteButtons")
        if (saved) {
            try {
                remoteButtons = JSON.parse(saved)
                restoreRemoteButtons()
            } catch (e) {
                console.error("Error loading remote buttons:", e)
                remoteButtons = []
            }
        }
    }

    // Save to localStorage
    function saveToLocalStorage() {
        const cleanRemotes = remoteButtons.map((remote) => ({
            id: remote.id,
            type: "remote",
            entityId: remote.entityId || "",
            name: remote.name || "Remote",
            iconClass: remote.iconClass || "remote.svg",
            position: {
                x: Number(remote.position.x.toFixed(4)),
                y: Number(remote.position.y.toFixed(4)),
            },
            remoteConfig: remote.remoteConfig || [],
        }))

        localStorage.setItem("remoteButtons", JSON.stringify(cleanRemotes))
    }

    // Create a remote button - WITH PROMPT FOR ENTITY ID
    function create(config) {
        if (!config.id) {
            config.id = "remote_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
        }

        // Prompt for entity ID if not provided
        if (!config.entityId) {
            const entityId = prompt("Enter Entity ID for Remote:", "")
            if (!entityId || !entityId.trim()) {
                console.warn("Remote creation cancelled: No entity ID provided")
                return null
            }
            config.entityId = entityId.trim()
        }

        // Prompt for name if not provided
        if (!config.name) {
            const name = prompt("Enter name for Remote (optional):", "Remote") || "Remote"
            config.name = name
        }

        // Set defaults
        config.type = "remote"
        config.iconClass = config.iconClass || "remote.svg"
        config.name = config.name || "Remote"
        config.remoteConfig = config.remoteConfig || []
        config.position = config.position || { x: 0.5, y: 0.5 }

        // Add to array
        remoteButtons.push(config)

        // Create DOM element
        createRemoteButton(config)

        // Save
        saveToLocalStorage()

        return config.id
    }

    // Create remote button DOM element
    function createRemoteButton(config) {
        // Remove existing if present
        const existing = document.getElementById(config.id)
        if (existing) existing.remove()

        const button = document.createElement("button")
        button.id = config.id
        button.className = "light-button remote"
        button.dataset.entityId = config.entityId
        button.dataset.type = "remote"
        button.dataset.icon = config.iconClass || "remote.svg"
        button.title = config.name || "Remote"

        // Create icon container
        button.innerHTML = `<div class="icon"></div>`

        // Set SVG icon
        if (window.SVGIcons) {
            window.SVGIcons.setIconImmediately(button, config.iconClass || "remote.svg")
        }

        // Add event listeners
        setupRemoteButtonEvents(button, config)

        // Append to pan layer
        const panLayer = document.getElementById("panLayer")
        if (panLayer) {
            panLayer.appendChild(button)

            // Position button
            updateButtonPosition(button, config.position)
        }

        return button
    }

    // Update button position
    function updateButtonPosition(button, position) {
        const img = document.getElementById("viewImage")
        if (img && position) {
            const imgWidth = img.clientWidth
            const imgHeight = img.clientHeight

            button.style.left = `${position.x * imgWidth}px`
            button.style.top = `${position.y * imgHeight}px`
        }
    }

    // Setup remote button events
    function setupRemoteButtonEvents(button, config) {
        let startX = 0
        let startY = 0
        let startLeft = 0
        let startTop = 0

        // Mouse down handler for drag/long press
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

            // Clear existing timer
            if (longPressTimer) {
                clearTimeout(longPressTimer)
                longPressTimer = null
            }

            // Start long press timer (for edit modal)
            longPressTimer = setTimeout(() => {
                const movedX = Math.abs(e.clientX - startX)
                const movedY = Math.abs(e.clientY - startY)

                if (movedX < dragThreshold && movedY < dragThreshold && !isDragging) {
                    openRemoteEditModal(config)
                }

                longPressTimer = null
            }, 600)

            // Mouse move to detect drag
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

            // Cleanup
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

        // Click handler (non-edit mode only) - opens remote modal
        button.addEventListener("click", (e) => {
            if (isEditMode) {
                e.stopPropagation()
                e.preventDefault()
                return
            }

            if (config.entityId && !isDragging) {
                e.stopPropagation()
                e.preventDefault()
                openRemoteModal(config)
            }
        })

        // Touch events for mobile
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
                    openRemoteEditModal(config)
                    longPressTimer = null
                }

                if (isDragging) {
                    stopDrag()
                }
            }
        })

        // Prevent context menu in edit mode
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
        currentDraggingButton = button

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
            currentDraggingButton = null

            // Calculate and save new position
            const img = document.getElementById("viewImage")
            if (img) {
                const imgRect = img.getBoundingClientRect()
                const buttonRect = button.getBoundingClientRect()

                const relativeX = (buttonRect.left + buttonRect.width / 2 - imgRect.left) / imgRect.width
                const relativeY = (buttonRect.top + buttonRect.height / 2 - imgRect.top) / imgRect.height

                const index = remoteButtons.findIndex((b) => b.id === config.id)
                if (index !== -1) {
                    remoteButtons[index].position = {
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

        remoteButtons.forEach((config) => {
            const btn = document.getElementById(config.id)
            if (btn) {
                btn.classList.remove("dragging")
                btn.style.cursor = "grab"
            }
        })
    }

    // Open remote edit modal (for configuring remote buttons)
    function openRemoteEditModal(config) {
        console.log("Opening remote edit modal for:", config.id)

        // Select this button for editing
        if (window.selectButtonForEdit) {
            window.selectButtonForEdit(config.id, "remote")
        }

        // Store current remote
        currentRemote = config

        // Update modal title
        document.getElementById("remoteControlTitle").textContent = "Edit Remote"
        document.getElementById("remoteControlSubtitle").textContent = "Configure remote buttons"

        // Hide grid, show edit form
        document.getElementById("remoteControlGrid").style.display = "none"
        remoteEditModal.form.style.display = "block"

        // Populate icon grid if not already done
        if (remoteEditModal.iconGrid.children.length === 0) {
            populateIconGrid()
        }

        // Reset form for new remote button configuration
        resetRemoteEditForm()

        // Update edit button icon to X
        const editBtn = document.getElementById("remoteEditBtn")
        const editBtnIcon = editBtn.querySelector('svg')
        editBtnIcon.innerHTML = ''
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z')
        editBtnIcon.appendChild(path)
        editBtn.title = "Close Edit Mode"

        // Show the modal
        remoteModal.style.display = "flex"
        document.body.classList.add('modal-open')
    }

    // Open remote control modal (for using the remote)
    async function openRemoteModal(config) {
        console.log("Opening remote control for:", config.name)

        currentRemote = config

        // Update modal title
        document.getElementById("remoteControlTitle").textContent = config.name || "Remote Control"
        document.getElementById("remoteControlSubtitle").textContent = config.entityId || "Smart Controller"

        // Show grid, hide edit form
        document.getElementById("remoteControlGrid").style.display = "grid"
        remoteEditModal.form.style.display = "none"
        document.getElementById("remoteDeleteConfirmation").style.display = "none"

        // Reset edit button icon
        const editBtn = document.getElementById("remoteEditBtn")
        const editBtnIcon = editBtn.querySelector('svg')
        editBtnIcon.innerHTML = ''
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z')
        editBtnIcon.appendChild(path)
        editBtn.title = "Edit Remote"

        // Render remote control buttons
        await renderRemoteButtons(config)

        // Show modal
        remoteModal.style.display = "flex"
        document.body.classList.add('modal-open')
    }

    // Close remote modal
    function closeRemoteModal() {
        remoteModal.style.display = "none"
        currentRemote = null
        currentEditingRemoteButtonIndex = null

        // Reset to normal view
        document.getElementById("remoteControlGrid").style.display = "grid"
        remoteEditModal.form.style.display = "none"
        document.getElementById("remoteDeleteConfirmation").style.display = "none"
        
        // Allow body scrolling again
        document.body.classList.remove('modal-open')
        
        // Reset touch states
        isScrolling = false
        isTouchOnModalContent = false
    }

    // Populate icon grid
    async function populateIconGrid() {
        const grid = remoteEditModal.iconGrid
        grid.innerHTML = ''

        // Load a subset of icons for better performance
        const displayIcons = SVG_ICONS.slice(0, 100)

        for (const iconName of displayIcons) {
            try {
                const svgContent = await loadSVG(iconName)

                const iconElement = document.createElement('div')
                iconElement.className = 'remote-icon-option'
                iconElement.title = iconName
                iconElement.dataset.icon = iconName

                // Create SVG from content
                const svg = createSVGFromContent(svgContent, '#666', 24)
                iconElement.appendChild(svg)

                iconElement.addEventListener('click', () => {
                    grid.querySelectorAll('.remote-icon-option').forEach(icon => {
                        icon.classList.remove('selected')
                    })

                    iconElement.classList.add('selected')
                    remoteEditModal.iconInput.value = iconName
                    updateRemotePreview()
                })

                grid.appendChild(iconElement)
            } catch (error) {
                console.warn(`Failed to load icon ${iconName}:`, error)
                // Create a placeholder element
                const iconElement = document.createElement('div')
                iconElement.className = 'remote-icon-option'
                iconElement.title = iconName
                iconElement.dataset.icon = iconName
                iconElement.textContent = '?'
                grid.appendChild(iconElement)
            }
        }

        // Select first icon by default
        setTimeout(() => {
            const firstIcon = grid.querySelector('.remote-icon-option')
            if (firstIcon) {
                firstIcon.classList.add('selected')
                remoteEditModal.iconInput.value = firstIcon.dataset.icon
                updateRemotePreview()
            }
        }, 100)
        
        console.log("Icon grid populated with", grid.children.length, "icons")
    }

    // Reset remote edit form
    function resetRemoteEditForm() {
        currentEditingRemoteButtonIndex = null

        remoteEditModal.iconInput.value = 'power.svg'
        remoteEditModal.textInput.value = 'New Button'
        remoteEditModal.entityTypeSelect.value = 'remote'
        remoteEditModal.entityIdInput.value = currentRemote ? currentRemote.entityId : ''
        remoteEditModal.serviceSelect.value = ''
        remoteEditModal.commandInput.value = ''
        remoteEditModal.switchEntityIdInput.value = ''
        remoteEditModal.textColorInput.value = '#000000'
        remoteEditModal.bgColorInput.value = '#ffffff'
        remoteEditModal.textColorValue.textContent = '#000000'
        remoteEditModal.bgColorValue.textContent = '#ffffff'

        // Hide delete button for new buttons
        remoteEditModal.deleteButton.style.display = 'none'

        // Show/hide config sections
        handleRemoteEntityTypeChange()

        // Update preview
        updateRemotePreview()

        // Select first icon in grid
        setTimeout(() => {
            const iconOptions = remoteEditModal.iconGrid.querySelectorAll('.remote-icon-option')
            if (iconOptions.length > 0) {
                iconOptions.forEach(option => option.classList.remove('selected'))
                iconOptions[0].classList.add('selected')
            }
        }, 100)
    }

    // Update remote preview
    async function updateRemotePreview() {
        const iconName = remoteEditModal.iconInput.value.trim()
        const text = remoteEditModal.textInput.value.trim()
        const textColor = remoteEditModal.textColorInput.value
        const bgColor = remoteEditModal.bgColorInput.value

        // Update preview text
        const previewLabel = remoteEditModal.preview.querySelector('.remote-button-preview-label')
        previewLabel.textContent = text || 'New Button'

        // Update preview colors
        remoteEditModal.preview.style.color = textColor
        remoteEditModal.preview.style.background = `linear-gradient(145deg, ${bgColor}, ${darkenColor(bgColor, 20)})`

        // Update preview icon
        remoteEditModal.previewIcon.innerHTML = ''

        try {
            const svgContent = await loadSVG(iconName || 'power.svg')
            const svg = createSVGFromContent(svgContent, textColor, 32)
            remoteEditModal.previewIcon.appendChild(svg)
        } catch (error) {
            console.error('Error updating preview:', error)
        }
    }

    // Handle entity type change
    function handleRemoteEntityTypeChange() {
        const entityType = remoteEditModal.entityTypeSelect.value

        // Show/hide appropriate config sections
        document.getElementById('remoteConfig').style.display = entityType === 'remote' ? 'block' : 'none'
        document.getElementById('switchConfig').style.display = entityType === 'switch' ? 'block' : 'none'

        // Update service change handler
        handleRemoteServiceChange()
    }

    // Handle service change
    function handleRemoteServiceChange() {
        const service = remoteEditModal.serviceSelect.value
        const commandContainer = remoteEditModal.commandContainer

        if (service === 'remote.send_command' || service === 'remote.turn_on') {
            commandContainer.style.display = 'block'
            const label = commandContainer.querySelector('.remote-form-label')
            if (service === 'remote.send_command') {
                label.textContent = 'Command'
                remoteEditModal.commandInput.placeholder = 'HOME, POWER, VOLUME_UP'
            } else if (service === 'remote.turn_on') {
                label.textContent = 'URL / App'
                remoteEditModal.commandInput.placeholder = 'https://youtube.com or app id'
            }
        } else {
            commandContainer.style.display = 'none'
            remoteEditModal.commandInput.value = ''
        }
    }

    // Save remote button configuration
    async function saveRemoteButton() {
        const icon = remoteEditModal.iconInput.value.trim()
        const text = remoteEditModal.textInput.value.trim()
        const entityType = remoteEditModal.entityTypeSelect.value
        const textColor = remoteEditModal.textColorInput.value
        const bgColor = remoteEditModal.bgColorInput.value

        let entityId = ''
        let service = ''
        let command = ''

        // Get entity-specific values
        if (entityType === 'remote') {
            entityId = remoteEditModal.entityIdInput.value.trim()
            service = remoteEditModal.serviceSelect.value
            if (service === 'remote.send_command' || service === 'remote.turn_on') {
                command = remoteEditModal.commandInput.value.trim()
            }
        } else if (entityType === 'switch') {
            entityId = remoteEditModal.switchEntityIdInput.value.trim()
            service = 'switch.toggle'
        }

        // Validation
        if (!text) {
            alert('Please enter button text')
            return
        }

        if (entityType === 'remote' && (!entityId || !service)) {
            alert('Please enter remote entity ID and select service')
            return
        }

        if (entityType === 'remote' && service === 'remote.send_command' && !command) {
            alert('Please enter command for remote.send_command')
            return
        }

        if (entityType === 'switch' && !entityId) {
            alert('Please enter switch entity ID')
            return
        }

        // Verify SVG exists
        if (!SVG_ICONS.includes(icon)) {
            alert('Please select a valid icon from the grid')
            return
        }

        const buttonData = {
            icon: icon || 'power.svg',
            text,
            entityType,
            textColor,
            bgColor,
            entityId,
            service,
            command
        }

        if (currentRemote) {
            // Add or update button in current remote's config
            if (currentEditingRemoteButtonIndex !== null) {
                // Update existing button
                currentRemote.remoteConfig[currentEditingRemoteButtonIndex] = buttonData
            } else {
                // Add new button
                currentRemote.remoteConfig.push(buttonData)
            }

            // Save to localStorage
            saveToLocalStorage()

            // Re-render buttons
            await renderRemoteButtons(currentRemote)
        }

        // Reset form
        resetRemoteEditForm()
    }

    // Edit existing remote button
    function editRemoteButton(index) {
        console.log("Editing button at index:", index)
        
        if (!currentRemote || !currentRemote.remoteConfig[index]) {
            console.error("No remote or button config found")
            return
        }

        const button = currentRemote.remoteConfig[index]
        currentEditingRemoteButtonIndex = index

        // Show edit form
        remoteEditModal.form.style.display = 'block'
        document.getElementById("remoteControlGrid").style.display = "none"
        document.getElementById("remoteDeleteConfirmation").style.display = "none"

        // Update modal title
        document.getElementById("remoteControlTitle").textContent = "Edit Button"
        document.getElementById("remoteControlSubtitle").textContent = "Modify button settings"

        // Populate form with button data
        remoteEditModal.iconInput.value = button.icon || 'power.svg'
        remoteEditModal.textInput.value = button.text || ''
        remoteEditModal.entityTypeSelect.value = button.entityType || 'remote'
        remoteEditModal.textColorInput.value = button.textColor || '#000000'
        remoteEditModal.bgColorInput.value = button.bgColor || '#ffffff'
        remoteEditModal.textColorValue.textContent = button.textColor || '#000000'
        remoteEditModal.bgColorValue.textContent = button.bgColor || '#ffffff'

        // Entity specific fields
        if (button.entityType === 'remote') {
            remoteEditModal.entityIdInput.value = button.entityId || ''
            remoteEditModal.serviceSelect.value = button.service || ''
            if (button.command) {
                remoteEditModal.commandInput.value = button.command
                remoteEditModal.commandContainer.style.display = 'block'
            } else {
                remoteEditModal.commandContainer.style.display = 'none'
            }
        } else if (button.entityType === 'switch') {
            remoteEditModal.switchEntityIdInput.value = button.entityId || ''
        }

        // Handle UI updates
        handleRemoteEntityTypeChange()
        updateRemotePreview()

        // Show delete button
        remoteEditModal.deleteButton.style.display = 'block'

        // Update edit button icon to X
        const editBtn = document.getElementById("remoteEditBtn")
        const editBtnIcon = editBtn.querySelector('svg')
        editBtnIcon.innerHTML = ''
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z')
        editBtnIcon.appendChild(path)
        editBtn.title = "Close Edit Mode"

        // Check if icon grid needs to be populated
        if (remoteEditModal.iconGrid.children.length === 0) {
            // Populate icon grid first, then select the icon
            populateIconGrid().then(() => {
                // After grid is populated, select the icon
                setTimeout(() => {
                    selectIconInGrid(button.icon || 'power.svg')
                }, 100)
            })
        } else {
            // Grid already populated, just select the icon
            setTimeout(() => {
                selectIconInGrid(button.icon || 'power.svg')
            }, 100)
        }
    }

    // Helper function to select an icon in the grid
    function selectIconInGrid(iconName) {
        const iconOptions = remoteEditModal.iconGrid.querySelectorAll('.remote-icon-option')
        console.log("Total icon options:", iconOptions.length)
        console.log("Looking for icon:", iconName)
        
        let found = false
        iconOptions.forEach(option => {
            if (option.dataset.icon === iconName) {
                option.classList.add('selected')
                console.log("Found and selected icon:", iconName)
                found = true
            } else {
                option.classList.remove('selected')
            }
        })
        
        if (!found && iconOptions.length > 0) {
            // If icon not found, select the first one
            iconOptions[0].classList.add('selected')
            remoteEditModal.iconInput.value = iconOptions[0].dataset.icon
            console.log("Icon not found, selecting first one:", iconOptions[0].dataset.icon)
            updateRemotePreview()
        }
    }

    // Delete remote button
    function deleteRemoteButton() {
        if (currentEditingRemoteButtonIndex !== null && currentRemote) {
            currentRemote.remoteConfig.splice(currentEditingRemoteButtonIndex, 1)
            saveToLocalStorage()
            renderRemoteButtons(currentRemote)
            resetRemoteEditForm()
        }
    }

    // Show delete confirmation
    function showDeleteConfirmation() {
        remoteEditModal.form.style.display = 'none'
        document.getElementById("remoteDeleteConfirmation").style.display = 'block'
    }

    // Cancel delete
    function cancelDelete() {
        document.getElementById("remoteDeleteConfirmation").style.display = 'none'
        if (currentEditingRemoteButtonIndex !== null) {
            remoteEditModal.form.style.display = 'block'
        }
    }

    async function renderRemoteButtons(config) {
        if (!remoteGrid) {
            console.warn("Remote grid not initialized yet")
            return
        }

        remoteGrid.innerHTML = ""

        const remoteConfig = config.remoteConfig || []

        // Check if modal exists first
        const emptyState = document.getElementById("remoteEmptyState")

        if (remoteConfig.length === 0) {
            // Create empty state if it doesn't exist
            if (!emptyState) {
                const emptyDiv = document.createElement("div")
                emptyDiv.className = "remote-empty-state"
                emptyDiv.id = "remoteEmptyState"
                emptyDiv.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <br>
                No buttons yet. Click the edit button to add your first button.
            `
                remoteGrid.appendChild(emptyDiv)
                emptyDiv.style.display = 'block'
            } else {
                emptyState.style.display = 'block'
            }
            return
        }

        // Hide empty state if it exists
        if (emptyState) {
            emptyState.style.display = 'none'
        }

        // Render all buttons
        for (const [index, btnConfig] of remoteConfig.entries()) {
            const btnElement = document.createElement("button")
            btnElement.className = "remote-control-btn"
            btnElement.dataset.index = index

            btnElement.style.color = btnConfig.textColor || "#000"
            if (!btnConfig.bgColor || btnConfig.bgColor.toLowerCase() === "#ffffff") {
                btnElement.style.background = "linear-gradient(145deg, #ffffff, #f0f0f0)"
            } else {
                btnElement.style.background = `linear-gradient(145deg, ${btnConfig.bgColor}, ${darkenColor(btnConfig.bgColor, 20)})`
            }

            // Create icon container
            const iconContainer = document.createElement("div")
            iconContainer.className = "remote-btn-icon"

            // Load SVG icon
            if (btnConfig.icon) {
                try {
                    const svgContent = await loadSVG(btnConfig.icon)
                    const svg = createSVGFromContent(svgContent, btnConfig.textColor || "#000", 32)
                    iconContainer.appendChild(svg)
                } catch (error) {
                    console.error("Error loading icon:", error)
                }
            }

            // Create label
            const label = document.createElement("span")
            label.className = "remote-btn-label"
            label.textContent = btnConfig.text || "Button"

            btnElement.appendChild(iconContainer)
            btnElement.appendChild(label)

            // Add long-press timer variable
            let longPressTimer = null

            // CLICK → SEND COMMAND (only if not a long press)
            btnElement.addEventListener("click", (e) => {
                // If it was a long press, don't send command
                if (longPressTimer === null) {
                    sendRemoteCommand(btnConfig)
                }
            })

            // MOUSE DOWN → START LONG PRESS TIMER
            btnElement.addEventListener("mousedown", (e) => {
                longPressTimer = setTimeout(() => {
                    // Long press detected - edit button
                    editRemoteButton(index)
                    longPressTimer = null
                }, 700) // 700ms for long press
            })

            // MOUSE UP → CANCEL LONG PRESS
            btnElement.addEventListener("mouseup", () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer)
                    longPressTimer = null
                }
            })

            // MOUSE LEAVE → CANCEL LONG PRESS
            btnElement.addEventListener("mouseleave", () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer)
                    longPressTimer = null
                }
            })

            // TOUCH EVENTS for mobile
            btnElement.addEventListener("touchstart", (e) => {
                e.preventDefault()
                longPressTimer = setTimeout(() => {
                    editRemoteButton(index)
                    longPressTimer = null
                }, 700)
            })

            btnElement.addEventListener("touchend", (e) => {
                e.preventDefault()
                if (longPressTimer) {
                    clearTimeout(longPressTimer)
                    longPressTimer = null
                }
            })

            btnElement.addEventListener("touchmove", (e) => {
                e.preventDefault()
                if (longPressTimer) {
                    clearTimeout(longPressTimer)
                    longPressTimer = null
                }
            })

            remoteGrid.appendChild(btnElement)
        }
    }

    // Send remote command to Home Assistant
    function sendRemoteCommand(btnConfig) {
        if (!btnConfig.entityId || !btnConfig.service) {
            console.warn("Remote: Missing entityId or service", btnConfig)
            return
        }

        const [domain, service] = btnConfig.service.split(".")

        const serviceData = {
            entity_id: btnConfig.entityId,
        }

        if (btnConfig.service === "remote.send_command" && btnConfig.command) {
            serviceData.command = btnConfig.command
        } else if (btnConfig.service === "remote.turn_on" && btnConfig.command) {
            serviceData.activity = btnConfig.command
        }

        if (callbacks.sendCommand) {
            callbacks.sendCommand(domain, service, serviceData)
        }

        console.log("Remote: Sent command", { domain, service, serviceData })
    }

    // Darken color helper
    function darkenColor(color, percent) {
        if (color.startsWith("#")) {
            let r = Number.parseInt(color.slice(1, 3), 16)
            let g = Number.parseInt(color.slice(3, 5), 16)
            let b = Number.parseInt(color.slice(5, 7), 16)

            r = Math.max(0, Math.floor((r * (100 - percent)) / 100))
            g = Math.max(0, Math.floor((g * (100 - percent)) / 100))
            b = Math.max(0, Math.floor((b * (100 - percent)) / 100))

            return `rgb(${r}, ${g}, ${b})`
        }
        return color
    }

    // Restore remote buttons
    function restoreRemoteButtons() {
        remoteButtons.forEach(createRemoteButton)
    }

    // Touch event handlers for modal scrolling
    function setupTouchScrolling() {
        if (!remoteModal || !modalContent) return
        
        // Check if touch is on modal content or modal background
        const isTouchOnContent = (touchY) => {
            const contentRect = modalContent.getBoundingClientRect()
            return touchY >= contentRect.top && touchY <= contentRect.bottom
        }
        
        // Touch start - record starting position
        remoteModal.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return
            
            const touch = e.touches[0]
            touchStartY = touch.clientY
            scrollStartY = modalContent.scrollTop
            isTouchOnModalContent = isTouchOnContent(touch.clientY)
            
            // If touch is on modal background (not content), allow default scrolling
            if (!isTouchOnModalContent) {
                e.stopPropagation()
            }
        }, { passive: true })
        
        // Touch move - handle scrolling
        remoteModal.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 1) return
            
            const touch = e.touches[0]
            const deltaY = touch.clientY - touchStartY
            
            // If touch started on modal content
            if (isTouchOnModalContent) {
                const isAtTop = modalContent.scrollTop === 0
                const isAtBottom = modalContent.scrollHeight - modalContent.clientHeight <= modalContent.scrollTop + 1
                
                // If content is scrollable, handle the scroll
                if ((deltaY > 0 && isAtTop) || (deltaY < 0 && isAtBottom)) {
                    // Allow modal background to scroll when at top/bottom of content
                    e.stopPropagation()
                } else {
                    // Content will scroll naturally, prevent bubbling
                    e.stopPropagation()
                }
            } else {
                // Touch started on modal background, allow default behavior
                e.stopPropagation()
            }
        }, { passive: true })
        
        // Touch end - reset state
        remoteModal.addEventListener('touchend', () => {
            isTouchOnModalContent = false
        }, { passive: true })
        
        // Prevent default touch behaviors on interactive elements
        const interactiveElements = remoteModal.querySelectorAll('button, input, select, .remote-control-btn, .remote-icon-option')
        interactiveElements.forEach(el => {
            el.addEventListener('touchstart', (e) => {
                e.stopPropagation()
            }, { passive: true })
            
            el.addEventListener('touchmove', (e) => {
                e.stopPropagation()
            }, { passive: true })
        })
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close button
        document.getElementById("closeRemoteControlBtn").addEventListener("click", closeRemoteModal)

        // Edit button
        document.getElementById("remoteEditBtn").addEventListener("click", () => {
            if (currentRemote) {
                if (remoteEditModal.form.style.display === 'block') {
                    // Exit edit mode
                    remoteEditModal.form.style.display = 'none'
                    document.getElementById("remoteControlGrid").style.display = "grid"
                    document.getElementById("remoteDeleteConfirmation").style.display = "none"

                    // Reset edit button icon
                    const editBtn = document.getElementById("remoteEditBtn")
                    const editBtnIcon = editBtn.querySelector('svg')
                    editBtnIcon.innerHTML = ''
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
                    path.setAttribute('d', 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z')
                    editBtnIcon.appendChild(path)
                    editBtn.title = "Edit Remote"

                    // Re-render buttons to exit edit mode
                    renderRemoteButtons(currentRemote)
                } else {
                    // Enter edit mode - show form for adding new button
                    remoteEditModal.form.style.display = 'block'
                    document.getElementById("remoteControlGrid").style.display = "none"
                    document.getElementById("remoteDeleteConfirmation").style.display = "none"

                    // Update modal title
                    document.getElementById("remoteControlTitle").textContent = "Edit Remote"
                    document.getElementById("remoteControlSubtitle").textContent = "Configure remote buttons"

                    // Reset form for new button
                    resetRemoteEditForm()

                    // Update edit button icon to X
                    const editBtn = document.getElementById("remoteEditBtn")
                    const editBtnIcon = editBtn.querySelector('svg')
                    editBtnIcon.innerHTML = ''
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
                    path.setAttribute('d', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z')
                    editBtnIcon.appendChild(path)
                    editBtn.title = "Close Edit Mode"
                }
            }
        })

        // Edit form buttons
        document.getElementById("remoteSaveButton").addEventListener("click", saveRemoteButton)
        document.getElementById("remoteCancelEdit").addEventListener("click", () => {
            remoteEditModal.form.style.display = 'none'
            document.getElementById("remoteControlGrid").style.display = "grid"
            resetRemoteEditForm()
        })
        document.getElementById("remoteDeleteButton").addEventListener("click", showDeleteConfirmation)

        // Delete confirmation buttons
        document.getElementById("remoteCancelDelete").addEventListener("click", cancelDelete)
        document.getElementById("remoteConfirmDelete").addEventListener("click", () => {
            deleteRemoteButton()
            cancelDelete()
        })

        // Form inputs
        remoteEditModal.iconInput.addEventListener("input", updateRemotePreview)
        remoteEditModal.textInput.addEventListener("input", updateRemotePreview)
        remoteEditModal.textColorInput.addEventListener("input", (e) => {
            remoteEditModal.textColorValue.textContent = e.target.value
            updateRemotePreview()
        })
        remoteEditModal.bgColorInput.addEventListener("input", (e) => {
            remoteEditModal.bgColorValue.textContent = e.target.value
            updateRemotePreview()
        })
        remoteEditModal.entityTypeSelect.addEventListener("change", handleRemoteEntityTypeChange)
        remoteEditModal.serviceSelect.addEventListener("change", handleRemoteServiceChange)

        // Close modal on outside click
        remoteModal.addEventListener("click", (e) => {
            if (e.target === remoteModal) {
                closeRemoteModal()
            }
        })

        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (document.getElementById("remoteDeleteConfirmation").style.display === "block") {
                    cancelDelete()
                } else if (remoteEditModal.form.style.display === "block") {
                    remoteEditModal.form.style.display = "none"
                    document.getElementById("remoteControlGrid").style.display = "grid"
                    resetRemoteEditForm()
                } else if (remoteModal.style.display === "flex") {
                    closeRemoteModal()
                }
            }
        })
        
        // Setup touch scrolling after a short delay
        setTimeout(() => {
            setupTouchScrolling()
        }, 100)
    }

    // Toggle edit mode for floorplan buttons
    function enableEditMode(flag) {
        isEditMode = flag

        remoteButtons.forEach((config) => {
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

    // Update positions
    function updatePositions() {
        const img = document.getElementById("viewImage")
        if (!img) return

        const imgWidth = img.clientWidth
        const imgHeight = img.clientHeight

        remoteButtons.forEach((config) => {
            const btn = document.getElementById(config.id)
            if (btn) {
                updateButtonPosition(btn, config.position)
            }
        })
    }

    // Get all remote buttons
    function getRemoteButtons() {
        return remoteButtons
    }

    // Update button config (for floorplan button edit modal)
    function updateConfig(buttonId, newConfig) {
        const index = remoteButtons.findIndex((b) => b.id === buttonId)
        if (index === -1) return false

        const btnData = remoteButtons[index]
        Object.assign(btnData, newConfig)

        const btn = document.getElementById(buttonId)
        if (!btn) return false

        if (newConfig.iconClass && window.SVGIcons) {
            window.SVGIcons.clearButtonIcons(btn)
            window.SVGIcons.setIconImmediately(btn, newConfig.iconClass)
            btn.dataset.icon = newConfig.iconClass
        }

        if (newConfig.name) {
            btn.dataset.name = newConfig.name
            btn.title = newConfig.name
        }

        if (newConfig.entityId) {
            btn.dataset.entityId = newConfig.entityId
        }

        saveToLocalStorage()
        return true
    }

    // Delete button (for floorplan button edit modal)
    function deleteButton(buttonId) {
        const index = remoteButtons.findIndex((b) => b.id === buttonId)
        if (index !== -1) {
            remoteButtons.splice(index, 1)

            const btn = document.getElementById(buttonId)
            if (btn) btn.remove()

            saveToLocalStorage()
            return true
        }
        return false
    }

    // Handle state updates from Home Assistant
    function handleStateUpdate(entityId, state, attributes) {
        // Update remote button state if needed
        remoteButtons.forEach((remote) => {
            if (remote.entityId === entityId) {
                const btn = document.getElementById(remote.id)
                if (btn) {
                    // Update button appearance based on state
                    if (state === "on" || state === "playing") {
                        btn.classList.add("on")
                        btn.classList.remove("off")
                    } else {
                        btn.classList.remove("on")
                        btn.classList.add("off")
                    }
                }
            }
        })
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
        openRemoteModal,
        handleStateUpdate,
    }
})()