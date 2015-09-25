var gui = global.window.nwDispatcher.requireNwGui(),
    guiWindow = gui.Window.get(),
    config = require('./config.json'),
    buffers = [],
    index = 0,
    width = 0,
    height = 0,
    motionTimer = 0,
    context,
    canvasMask,
    maskContext,
    canvas,
    video,
    win,
    hideTimeout,
    isDrawing = false;

var previousLocation = {
    x: 0,
    y: 0
};

var mouse = {
    x: 0,
    y: 0
};

var last_mouse = {
    x: 0,
    y: 0
};

var SPACE_KEY = 32;
var C_KEY = 99;

var hideBody = function() {
    if (guiWindow.x > 0 && guiWindow.y > 0) {
        previousLocation.x = guiWindow.x;
        previousLocation.y = guiWindow.y;
    }
    guiWindow.y = -500;
    guiWindow.x = -500;
};

var showBody = function() {
    guiWindow.x = previousLocation.x;
    guiWindow.y = previousLocation.y;
};

var initialize = function(videoElement, canvasElement, canvasMaskElement) {
    win = gui.Window.get();
    video = document.getElementById(videoElement);
    canvas = document.getElementById(canvasElement);
    context = canvas.getContext('2d');
    motionTimer++;

    width = canvas.width;
    height = canvas.height;

    previousLocation.x = guiWindow.x;
    previousLocation.y = guiWindow.y;

    initializeCanvasMask(canvasMaskElement);

    for (var i = 0; i < 2; i++) {
        buffers.push(new Uint8Array(width * height));
    }

    navigator.webkitGetUserMedia({
        video: true
    }, start, fail);
};

/**
 * Creates a separate canvas where the exclusion mask can be drawn by the user so
 * movement isn't picked up in those areas.
 *
 * Usage Instructions:
 * Pressing the SPACE key will activate and allow the user to draw areas on the
 * camera feed where movement detection should be ignored.
 *
 * Pressing the C key will clear any active areas that have been drawn to ignore
 * movement detection
 *
 * @param canvasMaskElement
 */
var initializeCanvasMask = function(canvasMaskElement) {
    canvasMask = document.getElementById(canvasMaskElement);
    maskContext = canvasMask.getContext('2d');

    /* Mask Drawing Settings */
    maskContext.lineWidth = 30;
    maskContext.lineJoin = 'round';
    maskContext.lineCap = 'round';
    maskContext.strokeStyle = 'red';

    canvasMask.addEventListener('mousemove', function(e) {
        last_mouse.x = mouse.x;
        last_mouse.y = mouse.y;

        mouse.x = e.pageX;
        mouse.y = e.pageY;
    }, false);

    canvasMask.addEventListener('mouseleave', function() {
        canvasMask.removeEventListener('mousemove', onMaskPaint, false);
    }, false);

    canvasMask.addEventListener('mousedown', function(e) {
        canvasMask.addEventListener('mousemove', onMaskPaint, false);
    }, false);

    canvasMask.addEventListener('mouseup', function() {
        canvasMask.removeEventListener('mousemove', onMaskPaint, false);
    }, false);

    guiWindow.window.addEventListener('keypress', function(e) {
        switch (e.which) {
            /**
             * Toggles mask transparency when the spacebar key is pressed to show/hide
             * the masked region that is excluded
             */
            case SPACE_KEY:
                isDrawing = !isDrawing;
                toggleMaskOpacity();
                break;

                /**
                 * Clears the active mask exclusion area when the c key is pressed
                 */
            case C_KEY:
                clearMask();
                break;
        }
    }, false);

};

var clearMask = function() {
    maskContext.clearRect(0, 0, canvasMask.width, canvasMask.height);
};

var toggleMaskOpacity = function() {
    var dragHandle = document.getElementById('draggableAppHandle');
    var maskDirections = document.getElementById('maskDirections');

    if (canvasMask.style.visibility === 'hidden' || canvasMask.style.visibility === '') {
        canvasMask.style.visibility = maskDirections.style.visibility = 'visible';
        dragHandle.style.display = 'none';
    } else {
        canvasMask.style.visibility = maskDirections.style.visibility = 'hidden';
        dragHandle.style.display = '';
    }
};

var onMaskPaint = function() {
    maskContext.beginPath();
    maskContext.moveTo(last_mouse.x, last_mouse.y);
    maskContext.lineTo(mouse.x, mouse.y);
    maskContext.closePath();
    maskContext.stroke();
};

var getMaskFrame = function() {
    return maskContext.getImageData(0, 0, width, height);
};

var start = function(stream) {
    video.src = URL.createObjectURL(stream);
    video.play();

    if (config.debug) {
        canvas.style.visibility = 'visible';
    }

    requestAnimationFrame(analyzeFrame);
};

var fail = function() {
    alert('Failed to start video stream. Is something else using your camera?');
};

var getFrame = function() {
    try {
        context.drawImage(video, 0, 0, width, height);
    } catch (e) {
        return;
    }

    return context.getImageData(0, 0, width, height);
};

var analyzeFrame = function() {
    var frame = getFrame();
    var maskFrame = getMaskFrame();

    if (frame) {
        markFrame(frame.data, maskFrame.data);
        drawFrame(frame);
    }

    requestAnimationFrame(analyzeFrame);
};

var drawFrame = function(frame) {
    if (motionTimer < 50000) {
        if (guiWindow.x < 0 || guiWindow.y < 0) {
            showBody();
        }

        if (hideTimeout) {
            window.clearTimeout(hideTimeout);
        }

        hideTimeout = window.setTimeout(function() {
            if (!isDrawing) {
                hideBody();
            }
        }, config.timer);
    }
    context.putImageData(frame, 0, 0);
};

var markFrame = function(data, maskData) {
    var buffer = buffers[index++ % buffers.length];

    for (var i = 0, j = 0; i < buffer.length; i++, j += 4) {
        var current = calculateLightnessValue(data[j], data[j + 1], data[j + 2]);
        var currentMask = calculateLightnessValue(maskData[j], maskData[j + 1], maskData[j + 2]);

        /**
         * When current mask has data exclude the lightness diff calculation and just
         * set the diff to 0 essentially preventing motion detection at that point
         */
        if (currentMask !== 0) {
            data[j] = data[j + 1] = data[j + 2] = 255;
            data[j + 3] = 0;
            motionTimer++;
        } else {
            data[j] = data[j + 1] = data[j + 2] = 255;
            data[j + 3] = 255 * calculateLightnessDiff(i, current);
        }

        buffer[i] = current;
    }
};

var calculateLightnessValue = function(r, g, b) {
    return (Math.min(r, g, b) + Math.max(r, g, b)) / 255 * 50;
};

var calculateLightnessDiff = function(index, value) {
    return buffers.some(function(buffer) {
        var diff = Math.abs(value - buffer[index]) >= config.threshold;
        motionTimer++;

        if (diff) {
            motionTimer = 0;
        }

        return diff;
    });
};