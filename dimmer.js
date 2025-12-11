// dimmer.js
class DimmerButton {
    constructor(config) {
        this.id = config.id;
        this.entityId = config.entityId;
        this.position = config.position || { x: 0.5, y: 0.5 };
        this.brightness = 50;
        this.isOn = false;

        this.createButton();
        this.registerWebSocket();
    }

    // ---------------- BUTTON CREATION ----------------
    createButton() {
        this.btn = document.createElement("button");
        this.btn.id = this.id;
        this.btn.className = "dimmer-button";
        this.btn.innerHTML = `<i class="fas fa-lightbulb icon"></i>`;
        document.body.appendChild(this.btn);

        this.makeDraggable(this.btn);

        // Click opens modal
        this.btn.addEventListener("click", () => this.openModal());
    }

    // ---------------- DRAG FEATURE ----------------
    makeDraggable(btn) {
        let isDrag = false, startX, startY, origX, origY;

        btn.addEventListener("mousedown", e => {
            isDrag = true;
            startX = e.clientX;
            startY = e.clientY;
            origX = btn.offsetLeft;
            origY = btn.offsetTop;
            btn.style.cursor = "grabbing";
            e.stopPropagation();
        });

        window.addEventListener("mousemove", e => {
            if (!isDrag) return;
            btn.style.left = (origX + (e.clientX - startX)) + "px";
            btn.style.top = (origY + (e.clientY - startY)) + "px";
        });

        window.addEventListener("mouseup", () => {
            isDrag = false;
            btn.style.cursor = "grab";
        });
    }

    // ---------------- MODAL CONTROL ----------------
    openModal() {
        document.getElementById("brightnessModal").style.display = "flex";
        document.getElementById("brightnessSlider").value = this.brightness;
        document.getElementById("brightnessValue").textContent = `${this.brightness}%`;
    }

    closeModal() {
        document.getElementById("brightnessModal").style.display = "none";
    }

    // ---------------- WEBSOCKET CONTROL ----------------
    registerWebSocket() {
        // MUST EXIST: window.ws, window.isWSReady (global)
        const slider = document.getElementById("brightnessSlider");
        const value = document.getElementById("brightnessValue");

        slider.addEventListener("input", (e) => {
            this.brightness = parseInt(e.target.value);
            value.textContent = `${this.brightness}%`;
        });

        slider.addEventListener("change", () => {
            if (!window.isWSReady) return;

            const haValue = Math.round((this.brightness / 100) * 255);

            window.ws.send(JSON.stringify({
                id: Date.now(),
                type: "call_service",
                domain: "light",
                service: "turn_on",
                service_data: {
                    entity_id: this.entityId,
                    brightness: haValue
                }
            }));
        });
    }

    // ---------------- REALTIME STATE UPDATE ----------------
    updateState(isOn, brightness) {
        this.isOn = isOn;

        if (brightness !== null) {
            this.brightness = brightness;
        }

        const icon = this.btn.querySelector(".icon");

        if (this.isOn) {
            this.btn.classList.add("on");
            icon.classList.add("fa-solid");
        } else {
            this.btn.classList.remove("on");
            icon.classList.remove("fa-solid");
        }
    }
}
