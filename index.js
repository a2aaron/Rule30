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
 * @param {CanvasRenderingContext2D} ctx
 * @param {Rule} rule
 * @param {number} width
 * @param {number} height
 */
function drawRows(ctx, rule, width, height) {
    /**
     * @param {number} width
     * @param {number} height
     */
    function drawTempCanvas(width, height) {
        const tempCanvas = new OffscreenCanvas(width, height);
        const tempCtx = unwrap(tempCanvas.getContext('2d'));

        const imageData = tempCtx.createImageData(width, height);
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
            for (let x = 0; x < width; x++) {
                const left = getPixel(imageData, x - 1, y - 1);
                const mid = getPixel(imageData, x, y - 1);
                const right = getPixel(imageData, x + 1, y - 1);

                const cell = rule(left, mid, right);

                const color = cell ? WHITE : BLACK;
                setPixel(imageData, x, y, color);
            }
        }
        tempCtx.putImageData(imageData, 0, 0);
        return tempCanvas;
    }

    /**
     * @param {ImageData} imageData
     * @param {number} x
     * @param {number} y
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
    const BLACK = [0, 0, 0];
    const WHITE = [255, 255, 255];

    const tempCanvas = drawTempCanvas(width, height);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function render(ctx) {
    if (lock_aspect_ratio_input.checked) {
        canvas_height_input.disabled = true;
        canvas_height_input.value = canvas_width_input.value;
    } else {
        canvas_height_input.disabled = false;
    }

    ctx.canvas.width = parseInt(canvas_width_input.value);
    ctx.canvas.height = parseInt(canvas_height_input.value);

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

    drawRows(ctx, rule, width, height);
}

const canvas = getTypedElementById('canvas', HTMLCanvasElement);
const ctx = unwrap(canvas.getContext("2d"));

const rule_input = getTypedElementById('rule', HTMLInputElement);
const width_input = getTypedElementById('width', HTMLInputElement);
const height_input = getTypedElementById('height', HTMLInputElement);
const locked_to_canvas_input = getTypedElementById('lock-to-canvas', HTMLInputElement);
const canvas_width_input = getTypedElementById('canvas-width', HTMLInputElement);
const canvas_height_input = getTypedElementById('canvas-height', HTMLInputElement);
const lock_aspect_ratio_input = getTypedElementById('lock-aspect-ratio', HTMLInputElement);

setEventListener(rule_input, width_input, height_input, locked_to_canvas_input, canvas_width_input, canvas_height_input, lock_aspect_ratio_input);

render(ctx);


/**
 * @param {HTMLInputElement[]} elements
 */
function setEventListener(...elements) {
    for (const element of elements) {
        element.addEventListener("input", () => render(ctx));
    }
}

