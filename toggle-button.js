class ToggleButton {
    constructor(config) {
        this.id = config.id;
        this.name = config.name || 'Light';
        this.label = config.label || config.name || 'Light';
        this.type = 'button-toggle';
        this.position = config.position || { x: 0.5, y: 0.5 };
        this.entityId = config.entityId;
        this.isOn = false;

        // Register with ButtonManager
        if (window.ButtonManager) {
            window.ButtonManager.registerButton(this);
        }

        // --- NEW: Register buttons by entityId ---
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
    }

    // Update entity ID (NEW METHOD)
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

        // --- NEW: Optimistic update for ALL buttons with same entity ---
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
        const button = document.getElementById(this.id);
        if (!button) return;

        const icon = button.querySelector('.icon');
        if (this.isOn) {
            button.classList.add('on');
            icon.classList.remove('fa-lightbulb');
            icon.classList.add('fa-solid', 'fa-lightbulb');
        } else {
            button.classList.remove('on');
            icon.classList.remove('fa-solid', 'fa-lightbulb');
            icon.classList.add('fa-lightbulb');
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

        // --- NEW: Sync all buttons with same entity ---
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
            position: { x: 0.3, y: 0.5 }
        },
        // You can add more buttons here with same or different entityId
    ];

    toggleButtons.forEach(config => {
        new ToggleButton(config);
    });

    // --- NEW: After WebSocket connects, load latest states for all buttons ---
    if (window.ws) {
        window.ws.addEventListener("open", () => {
            Object.values(window.EntityButtons).forEach(btnList => {
                btnList.forEach(btn => btn.getInitialState());
            });
        });
    }
});