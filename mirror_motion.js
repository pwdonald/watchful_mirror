var gui = global.window.nwDispatcher.requireNwGui(),
    guiWindow = gui.Window.get(),
    config = require('./config.json'),
    buffers = [],
    index = 0,
    width = 0,
    height = 0,
    motionTimer = 0,
    context,
    canvas,
    video,
    win,
    hideTimeout;

var previousLocation = {
    x: 0,
    y: 0
};

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

var initialize = function(videoElement, canvasElement) {
    win = gui.Window.get();
    video = document.getElementById(videoElement);
    canvas = document.getElementById(canvasElement);
    context = canvas.getContext('2d');
    motionTimer = 0;

    width = canvas.width;
    height = canvas.height;

    previousLocation.x = guiWindow.x;
    previousLocation.y = guiWindow.y;

    for (var i = 0; i < 2; i++) {
        buffers.push(new Uint8Array(width * height));
    }

    navigator.webkitGetUserMedia({
        video: true
    }, start, fail);
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

    if (frame) {
        markFrame(frame.data);
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
            hideBody();
        }, config.timer);
    }
    context.putImageData(frame, 0, 0);
};

var markFrame = function(data) {
    var buffer = buffers[index++ % buffers.length];

    for (var i = 0, j = 0; i < buffer.length; i++, j += 4) {
        var current = calulateLightnessValue(data[j], data[j + 1], data[j + 2]);

        data[j] = data[j + 1] = data[j + 2] = 255;
        data[j + 3] = 255 * calculateLightnessDiff(i, current);
        buffer[i] = current;
    }
};

var calulateLightnessValue = function(r, g, b) {
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