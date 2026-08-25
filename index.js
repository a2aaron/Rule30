// @ts-check

/**
 * @template T
 * @typedef {new (...args: any[]) => T} Constructor
 */

/**
 * Gets an element `id` and enforces that the element is of type `ty`
 * @template ElementType
 * @param {string} id
 * @param {Constructor<ElementType>} ty
 * @returns {ElementType}
 */
function getTypedElementById(id, ty) {
    const element = document.getElementById(id);
    if (element == null) { throw new Error(`Element with id ${id} not found!`); }
    if (!(element instanceof ty)) {
        throw new Error(`Element with id ${id} is type ${element.constructor.name}, wanted ${ty}`);
    }
    return element;
}

/**
 * Returns `x`. If `x` is null, an error is thrown.
 * @template T
 * @param {T | null | undefined} x 
 * @return {T}
 */
function unwrap(x) {
    if (x == null) {
        throw new Error("Unwrapped a null value!");
    } else if (x == undefined) {
        throw new Error("Unwrapped an undefined value!");
    }
    return x;
}

/**
 * Construct rule `n` (eg: rule 30, rule 90, etc)
 * @param {number} n 
 * @typedef {function(boolean, boolean, boolean): boolean} Rule
 * @returns {Rule}
*/
function make_rule(n) {
    return function (left, mid, right) {
        if (!left && !mid && !right) { return get_bit(n, 0); }
        else if (!left && !mid && right) { return get_bit(n, 1); }
        else if (!left && mid && !right) { return get_bit(n, 2); }
        else if (!left && mid && right) { return get_bit(n, 3); }
        else if (left && !mid && !right) { return get_bit(n, 4); }
        else if (left && !mid && right) { return get_bit(n, 5); }
        else if (left && mid && !right) { return get_bit(n, 6); }
        else if (left && mid && right) { return get_bit(n, 7); }
        throw new Error("unreachable!");
    }

    /**
     * Extracts the `i`th bit of `x`
     * @param {number} x number to extract bits from
     * @param {number} i index of the bit to get
     * @returns {boolean} True if the `i`th bit is 1 and false otherwise
     */
    function get_bit(x, i) {
        const mask = 1 << i;
        const masked_x = x & mask;
        const bit_is_set = masked_x > 0;
        return bit_is_set
    }
}

/**
 * @param {number} width
 * @param {number} height
 * @param {Rule} rule
 */
function draw(width, height, rule) {
    const imageData = CTX.createImageData(width, height);
    // Populate initial row
    for (let x = 0; x < width; x++) {
        if (x == Math.floor(width / 2)) {
            setPixel(imageData, x, 0, WHITE);
        } else {
            setPixel(imageData, x, 0, BLACK);
        }
    }

    // Draw the rest of the rows
    for (let y = 1; y < height; y++) {
        renderRow(imageData, y, rule);
    }
    CTX.putImageData(imageData, 0, 0);
}

/**
 * @param {ImageData} imageData
 * @param {number} y
 * @param {Rule} rule
 */
function renderRow(imageData, y, rule) {
    for (let x = 0; x < imageData.width; x++) {
        const left = getPixel(imageData, x - 1, y - 1);
        const mid = getPixel(imageData, x, y - 1);
        const right = getPixel(imageData, x + 1, y - 1);

        const cell = rule(left, mid, right);

        const color = cell ? WHITE : BLACK;
        setPixel(imageData, x, y, color);
    }
}

/**
 * @param {ImageData} imageData
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function getPixel(imageData, x, y) {
    if (x < 0 || x >= imageData.width) { return false; }
    if (y < 0 || y >= imageData.height) { return false; }

    const index = (y * imageData.width + x) * 4;
    return imageData.data[index] == 255;
}

/**
 * @param {ImageData} imageData
 * @param {number} x
 * @param {number} y
 * @param {number[]} color
 */
function setPixel(imageData, x, y, color) {
    const index = (y * imageData.width + x) * 4;
    imageData.data[index] = color[0]; // red
    imageData.data[index + 1] = color[1]; // green
    imageData.data[index + 2] = color[2]; // blue
    imageData.data[index + 3] = 255; // alpha
}

function render() {
    if (lock_aspect_ratio_input.checked) {
        canvas_height_input.disabled = true;
        canvas_height_input.value = canvas_width_input.value;
    } else {
        canvas_height_input.disabled = false;
    }

    if (locked_to_canvas_input.checked) {
        width_input.disabled = true;
        height_input.disabled = true;

        width_input.value = canvas_width_input.value;
        height_input.value = canvas_height_input.value;
    } else {
        width_input.disabled = false;
        height_input.disabled = false;
    }


    const n = parseInt(rule_input.value);
    const rule = make_rule(n);

    const width = parseFloat(width_input.value);
    const height = parseFloat(height_input.value);

    CTX.canvas.style.width = `${canvas_width_input.value}px`;
    CTX.canvas.style.height = `${canvas_height_input.value}px`;
    CTX.canvas.width = width
    CTX.canvas.height = height
    CTX.imageSmoothingEnabled = false;

    draw(width, height, rule);
}

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

const CANVAS = getTypedElementById('canvas', HTMLCanvasElement);
const CTX = unwrap(CANVAS.getContext("2d"));

const rule_input = getTypedElementById('rule', HTMLInputElement);
const width_input = getTypedElementById('width', HTMLInputElement);
const height_input = getTypedElementById('height', HTMLInputElement);
const locked_to_canvas_input = getTypedElementById('lock-to-canvas', HTMLInputElement);
const canvas_width_input = getTypedElementById('canvas-width', HTMLInputElement);
const canvas_height_input = getTypedElementById('canvas-height', HTMLInputElement);
const lock_aspect_ratio_input = getTypedElementById('lock-aspect-ratio', HTMLInputElement);

const play_button = getTypedElementById('play', HTMLButtonElement);
const reset_button = getTypedElementById('reset', HTMLButtonElement);

const speed_input = getTypedElementById('speed', HTMLInputElement);


play_button.addEventListener("click", () => {
    if (ANIMATING) {
        stopAnimationLoop();
        play_button.textContent = "Play";
    } else {
        startAnimationLoop()
        play_button.textContent = "Pause";
    }
});

reset_button.addEventListener("click", () => render())
setEventListener(rule_input, width_input, height_input, locked_to_canvas_input, canvas_width_input, canvas_height_input, lock_aspect_ratio_input);

render();

let ANIMATING = false;
// Note: In miliseconds
/** @type {number | null} */
let LAST_FRAME = null;

function startAnimationLoop() {
    ANIMATING = true;
    LAST_FRAME = Date.now();
    animationLoop();
}

function stopAnimationLoop() {
    ANIMATING = false;
    LAST_FRAME = null;
}


function animationLoop() {
    if (ANIMATING && LAST_FRAME != null) {
        const currentTime = Date.now();
        // These are in miliseconds, so divide by 1000 to get seconds.
        const deltaTime = (currentTime - LAST_FRAME) / 1000;
        const rowsPerSecond = parseFloat(speed_input.value);
        const rowsToShift = Math.floor(deltaTime * rowsPerSecond);

        const n = parseInt(rule_input.value);
        if (rowsToShift > 0) {
            shiftUp(CTX, rowsToShift, make_rule(n));
            // Only record LAST_FRAME if we actually changed anything on the canvas.
            LAST_FRAME = currentTime;
        }
        requestAnimationFrame(animationLoop);
    }
}

/**
 * Shifts up the canvas by a single pixel.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} amount
 * @param {Rule} rule
 */
function shiftUp(ctx, amount, rule) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let y = 0; y < imageData.height - amount; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const pixel = getPixel(imageData, x, y + amount);
            setPixel(imageData, x, y, pixel ? WHITE : BLACK);
        }
    }
    for (let y = ctx.canvas.height - amount; y < ctx.canvas.height; y++) {
        renderRow(imageData, y, rule);
    }
    ctx.putImageData(imageData, 0, 0);
}

/**
 * @param {HTMLInputElement[]} elements
 */
function setEventListener(...elements) {
    for (const element of elements) {
        element.addEventListener("input", () => render());
    }
}

