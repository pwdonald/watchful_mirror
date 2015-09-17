var gui = global.window.nwDispatcher.requireNwGui();
var window1 = gui.Window.get();
var previousLocation = {
    x: 0,
    y: 0
};

var hideBody = function() {
    if (window1.x > 0 && window1.y > 0) {
        previousLocation.x = window1.x;
        previousLocation.y = window1.y;
    }
    window1.y = -500;
    window1.x = -500;
};

var showBody = function() {
    window1.x = previousLocation.x;
    window1.y = previousLocation.y;
};

var MirrorMotion = function() {
    return {
        buffers: [],
        index: 0,
        width: 0,
        height: 0,

        initialize: function(videoElement, canvasElement) {
            this.win = gui.Window.get();
            this.video = document.getElementById(videoElement);
            this.canvas = document.getElementById(canvasElement);
            this.context = this.canvas.getContext('2d');
            this.motionTimer = 0;

            this.width = this.canvas.width;
            this.height = this.canvas.height;

            previousLocation.x = window1.x;
            previousLocation.y = window1.y;

            for (var i = 0; i < 2; i++) {
                this.buffers.push(new Uint8Array(this.width * this.height));
            }

            navigator.webkitGetUserMedia({
                video: true
            }, this.start.bind(this), this.fail);
        },

        start: function(stream) {
            this.video.src = URL.createObjectURL(stream);
            this.video.play();

            requestAnimationFrame(this.analyzeFrame.bind(this));
        },

        fail: function() {
            alert('Failed to start video stream. Is something else using your camera?');
        },

        getFrame: function() {
            try {
                this.context.drawImage(this.video, 0, 0, this.width, this.height);
            } catch (e) {
                return;
            }

            return this.context.getImageData(0, 0, this.width, this.height);
        },

        analyzeFrame: function() {
            var frame = this.getFrame();

            if (frame) {
                this.markFrame(frame.data);
                this.drawFrame(frame);
            }

            requestAnimationFrame(this.analyzeFrame.bind(this));
        },

        drawFrame: function(frame) {
            if (this.motionTimer < 50000) {
                if (window1.x < 0 || window1.y < 0) {
                    showBody();
                }

                if (this.hideTimeout) {
                    window.clearTimeout(this.hideTimeout);
                }

                this.hideTimeout = window.setTimeout(function() {
                    hideBody();
                }, 5000);
            }
            this.context.putImageData(frame, 0, 0);
        },

        markFrame: function(data) {
            var buffers = this.buffers;

            var buffer = buffers[this.index++ % buffers.length];

            for (var i = 0, j = 0; i < buffer.length; i++, j += 4) {
                var current = this.calulateLightnessValue(data[j], data[j + 1], data[j + 2]);

                // Set color to black.
                data[j] = data[j + 1] = data[j + 2] = 255;

                // Full opacity for changes.
                data[j + 3] = 255 * this.calculateLightnessDiff(i, current);

                // Store current lightness value.
                buffer[i] = current;
            }
        },

        calulateLightnessValue(r, g, b) {
            return (Math.min(r, g, b) + Math.max(r, g, b)) / 255 * 50;
        },

        calculateLightnessDiff(index, value) {
            return this.buffers.some(function(buffer) {
                var diff = Math.abs(value - buffer[index]) >= 55;
                this.motionTimer++;

                if (diff) {
                    this.motionTimer = 0;
                }

                return diff;
            }.bind(this));
        }
    };
};