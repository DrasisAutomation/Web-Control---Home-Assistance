document.addEventListener("DOMContentLoaded", () => {

    const container = document.getElementById("container");
    const pan = document.getElementById("panLayer");
    const img = document.getElementById("viewImage");
    const resetBtn = document.getElementById("resetBtn");

    let scale = 1;
    const maxScale = 5;
    let minScale = 1;

    let posX = 0;
    let posY = 0;

    let startX = 0;
    let startY = 0;
    let dragging = false;

    let imgNaturalW = 0;
    let imgNaturalH = 0;

    /* When image loads, set min-scale correctly */
    img.onload = () => initImage();
    if (img.complete) initImage();

    function initImage() {
        const containerRect = container.getBoundingClientRect();

        imgNaturalW = img.naturalWidth;
        imgNaturalH = img.naturalHeight;

        // Height is always 80% => scale is fixed based on height
        const targetHeight = window.innerHeight * 0.80;
        minScale = targetHeight / imgNaturalH;
        scale = minScale;

        posX = 0;
        posY = 0;

        applyTransform();
    }

    /* Boundaries calculation */
    function clamp() {
        const scaledW = imgNaturalW * scale;
        const scaledH = imgNaturalH * scale;

        const maxX = scaledW > container.clientWidth ? (scaledW - container.clientWidth) / 2 : 0;
        const maxY = scaledH > container.clientHeight ? (scaledH - container.clientHeight) / 2 : 0;

        posX = Math.max(-maxX, Math.min(maxX, posX));
        posY = Math.max(-maxY, Math.min(maxY, posY));
    }

    function applyTransform() {
        clamp();
        pan.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    }

    /* DRAG */
    container.addEventListener("mousedown", e => {
        dragging = true;
        startX = e.clientX - posX;
        startY = e.clientY - posY;
    });

    window.addEventListener("mousemove", e => {
        if (!dragging) return;
        posX = e.clientX - startX;
        posY = e.clientY - startY;
        applyTransform();
    });

    window.addEventListener("mouseup", () => dragging = false);

    /* TOUCH DRAG */
    container.addEventListener("touchstart", e => {
        if (e.touches.length === 1) {
            dragging = true;
            startX = e.touches[0].clientX - posX;
            startY = e.touches[0].clientY - posY;
        }
    }, { passive:false });

    container.addEventListener("touchmove", e => {
        if (!dragging || e.touches.length !== 1) return;
        posX = e.touches[0].clientX - startX;
        posY = e.touches[0].clientY - startY;
        applyTransform();
    }, { passive:false });

    container.addEventListener("touchend", () => dragging = false);

    /* WHEEL ZOOM */
    container.addEventListener("wheel", e => {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));

        scale = newScale;

        applyTransform();
    }, { passive:false });

    /* RESET BUTTON */
    resetBtn.addEventListener("click", () => initImage());

    /* Resize behavior */
    window.addEventListener("resize", () => initImage());

});