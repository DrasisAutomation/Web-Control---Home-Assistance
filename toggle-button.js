// toggle-button.js - Updated for SVG icons
class ToggleButton {
    constructor(config) {
        this.id = config.id;
        this.name = config.name || 'Light';
        this.label = config.label || config.name || 'Light';
        this.type = 'button-toggle';
        this.position = config.position || { x: 0.5, y: 0.5 };
        this.entityId = config.entityId;
        this.isOn = false;
        this.iconClass = config.iconClass || 'light-bulb-1.svg'; // Default SVG

        // Register with ButtonManager
        if (window.ButtonManager) {
            window.ButtonManager.registerButton(this);
        }

        // Register buttons by entityId
        if (!window.EntityButtons) window.EntityButtons = {};
        if (this.entityId) {
            if (!window.EntityButtons[this.entityId]) {
                window.EntityButtons[this.entityId] = [];
            }
            window.EntityButtons[this.entityId].push(this);
        }

        // Initialize WebSocket connection if entityId provided
        if (this.entityId && window.ws && window.ws.readyState === WebSocket.OPEN) {
            this.getInitialState();
        }
        
        // Create the button element
        this.createButton();
    }

    // Create the button DOM element
    createButton() {
        // Remove existing if present
        const existing = document.getElementById(this.id);
        if (existing) existing.remove();

        const button = document.createElement('button');
        button.id = this.id;
        button.className = 'light-button';
        button.dataset.type = this.type;
        button.dataset.entityId = this.entityId || '';
        button.dataset.icon = this.iconClass;

        // Create icon container for SVG
        const iconContainer = document.createElement('div');
        iconContainer.className = 'icon';
        button.appendChild(iconContainer);

        // Set SVG icon immediately
        if (window.SVGIcons) {
            window.SVGIcons.setIconImmediately(button, this.iconClass);
        }

        // Set initial state
        this.updateUI();

        // Add click handler
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onClick();
        });

        // Position button
        const panLayer = document.getElementById('panLayer');
        if (panLayer) {
            panLayer.appendChild(button);

            const img = document.getElementById('viewImage');
            if (img) {
                const imgWidth = img.clientWidth;
                const imgHeight = img.clientHeight;

                button.style.left = `${this.position.x * imgWidth}px`;
                button.style.top = `${this.position.y * imgHeight}px`;
            }
        }

        this.buttonElement = button;
        return button;
    }

    // Update entity ID
    updateEntityId(newEntityId) {
        // Remove from old entityId group
        if (this.entityId && window.EntityButtons[this.entityId]) {
            const index = window.EntityButtons[this.entityId].indexOf(this);
            if (index > -1) {
                window.EntityButtons[this.entityId].splice(index, 1);
            }
        }

        // Update entityId
        this.entityId = newEntityId;

        // Add to new entityId group
        if (newEntityId) {
            if (!window.EntityButtons[newEntityId]) {
                window.EntityButtons[newEntityId] = [];
            }
            window.EntityButtons[newEntityId].push(this);
        }

        // Update button element
        if (this.buttonElement) {
            this.buttonElement.dataset.entityId = newEntityId;
        }

        // Get initial state for new entity
        if (newEntityId && window.ws && window.ws.readyState === WebSocket.OPEN) {
            this.getInitialState();
        }
    }

    // Handle click
    onClick() {
        if (this.entityId) {
            this.toggleLight();
        } else {
            // Local toggle for demo
            this.isOn = !this.isOn;
            this.updateUI();
        }
    }

    // Toggle light via WebSocket
    toggleLight() {
        if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
            console.log("WebSocket not connected");
            return;
        }

        const service = this.isOn ? "turn_off" : "turn_on";

        window.ws.send(JSON.stringify({
            id: Date.now(),
            type: "call_service",
            domain: "light",
            service: service,
            service_data: { entity_id: this.entityId }
        }));

        // Optimistic update for ALL buttons with same entity
        const newState = !this.isOn;

        if (window.EntityButtons[this.entityId]) {
            window.EntityButtons[this.entityId].forEach(btn => {
                btn.isOn = newState;
                btn.updateUI();
            });
        }
    }

    // Update button UI
    updateUI() {
        const button = this.buttonElement || document.getElementById(this.id);
        if (!button) return;

        // Update on/off class
        if (this.isOn) {
            button.classList.add('on');
            button.classList.remove('off');
        } else {
            button.classList.remove('on');
            button.classList.add('off');
        }

        // Update icon color
        if (window.SVGIcons && window.SVGIcons.updateIconColor) {
            window.SVGIcons.updateIconColor(button);
        }
    }

    // Get initial state from Home Assistant
    getInitialState() {
        if (!window.ws || window.ws.readyState !== WebSocket.OPEN) return;

        window.ws.send(JSON.stringify({
            id: Date.now(),
            type: "get_states"
        }));
    }

    // Handle state update from Home Assistant
    handleStateUpdate(state) {
        this.isOn = state === "on";
        this.updateUI();

        // Sync all buttons with same entity
        if (window.EntityButtons[this.entityId]) {
            window.EntityButtons[this.entityId].forEach(btn => {
                btn.isOn = this.isOn;
                btn.updateUI();
            });
        }
    }
}

// Example usage - create toggle buttons
document.addEventListener("DOMContentLoaded", () => {
    const toggleButtons = [
        {
            id: 'light-bedroom',
            name: 'Bed Light',
            label: 'Bed',
            entityId: 'light.row_1_2',
            position: { x: 0.3, y: 0.5 },
            iconClass: 'light-bulb-1.svg'
        }
    ];

    toggleButtons.forEach(config => {
        new ToggleButton(config);
    });

    // After WebSocket connects, load latest states for all buttons
    if (window.ws) {
        window.ws.addEventListener("open", () => {
            Object.values(window.EntityButtons).forEach(btnList => {
                btnList.forEach(btn => btn.getInitialState());
            });
        });
    }
});