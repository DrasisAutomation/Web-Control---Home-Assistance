// Button 1 specific functionality
document.addEventListener('DOMContentLoaded', function() {
    // Wait for the floor plan to be fully initialized
    setTimeout(() => {
        initializeButton1();
    }, 100);
});

function initializeButton1() {
    const button1 = document.getElementById('btnLight1');
    
    if (!button1) {
        console.error('Button 1 (btnLight1) not found!');
        return;
    }
    
    // Add click event listener
    button1.addEventListener('click', function(e) {
        // If in edit mode, don't open modal
        const editModeToggle = document.getElementById('editModeToggle');
        const isEditMode = editModeToggle.classList.contains('active');
        
        if (isEditMode) {
            // In edit mode, clicking doesn't open modal
            return;
        }
        
        // Prevent event from bubbling
        e.stopPropagation();
        
        // Open modal with Light 1 controls
        openLight1Modal();
    });
    
    console.log('Button 1 (Light 1) initialized');
}

function openLight1Modal() {
    // Create modal content for Light 1
    const modalContent = `
        <div class="control-panel">
            <div class="device-status">
                <div class="status-indicator">
                    <div class="status-light off" id="statusLight"></div>
                    <span>Status: <strong id="statusText">Off</strong></span>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="deviceToggle">
                    <span class="slider"></span>
                </label>
            </div>
            
            <div class="brightness-control">
                <label for="brightnessSlider">Brightness: <span id="brightnessValue">50%</span></label>
                <input type="range" min="0" max="100" value="50" class="slider-control" id="brightnessSlider">
            </div>
            
            <div class="color-control">
                <label>Light Color:</label>
                <div class="color-options">
                    <div class="color-option selected" data-color="warm" style="background-color: #ffd166;"></div>
                    <div class="color-option" data-color="cool" style="background-color: #90e0ef;"></div>
                    <div class="color-option" data-color="daylight" style="background-color: #f8f9fa;"></div>
                    <div class="color-option" data-color="colorful" style="background-color: #9d4edd;"></div>
                </div>
            </div>
            
            <div class="device-info">
                <h3>Device Information</h3>
                <p><strong>Name:</strong> Living Room Light</p>
                <p><strong>Type:</strong> Smart LED Bulb</p>
                <p><strong>Power:</strong> 9W</p>
                <p><strong>Last Updated:</strong> Just now</p>
            </div>
        </div>
    `;
    
    // Open modal using the global function
    if (window.FloorPlanDashboard && window.FloorPlanDashboard.openModal) {
        window.FloorPlanDashboard.openModal('Light 1 Control', modalContent);
        
        // Set up event listeners for modal elements
        setTimeout(() => {
            setupLight1ModalEvents();
        }, 10);
    } else {
        console.error('Global FloorPlanDashboard object not found');
    }
}

function setupLight1ModalEvents() {
    // Toggle switch
    const toggle = document.getElementById('deviceToggle');
    const statusLight = document.getElementById('statusLight');
    const statusText = document.getElementById('statusText');
    
    if (toggle) {
        toggle.addEventListener('change', function() {
            if (this.checked) {
                statusLight.classList.remove('off');
                statusLight.classList.add('on');
                statusText.textContent = 'On';
                
                // Show notification
                if (window.FloorPlanDashboard && window.FloorPlanDashboard.showNotification) {
                    window.FloorPlanDashboard.showNotification('Light 1 turned ON');
                }
            } else {
                statusLight.classList.remove('on');
                statusLight.classList.add('off');
                statusText.textContent = 'Off';
                
                // Show notification
                if (window.FloorPlanDashboard && window.FloorPlanDashboard.showNotification) {
                    window.FloorPlanDashboard.showNotification('Light 1 turned OFF');
                }
            }
        });
    }
    
    // Brightness slider
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
    
    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', function() {
            brightnessValue.textContent = `${this.value}%`;
        });
    }
    
    // Color options
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            this.classList.add('selected');
            
            // Show notification
            const colorName = this.dataset.color;
            if (window.FloorPlanDashboard && window.FloorPlanDashboard.showNotification) {
                window.FloorPlanDashboard.showNotification(`Light color changed to ${colorName}`);
            }
        });
    });
}