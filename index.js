// @ts-check



/***********
 * Helpers *
 **********/

/**
 * @template T
 * @typedef { new (...args: any[]) => T } Constructor
 */


/**
 * @param { number } x
 * @param { number } smoothness
 * @param { number } inflection_point
*/
function smoothStep(x, smoothness, inflection_point) {
    if (x <= 0.0) { return 0.0; }
    if (x >= 1.0) { return 1.0; }
    const c = (1 - smoothness) / (smoothness - 3);
    if (x <= inflection_point) {
        const a = x * (1 + c) / (x + inflection_point * c);
        return x * a ** 2
    } else {
        const b = (1 - x) * (1 + c) / ((1 - x) + (1 - inflection_point) * c);
        return 1 - (1 - x) * (b ** 2);
    }
}

/**
 * @param {number} num
 * @param {number} min
 * @param {number} max
 */
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
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

/**
 * @param {boolean[]} bits
 */
function from_bits(...bits) {
    let rule = 0;
    for (var i = 0; i < bits.length; i++) {
        rule += bits[i] ? 2 ** i : 0;
    }
    return rule;
}

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
 * @param {function(): void} listener
 * @param {(HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLCanvasElement)[]} elements
 */
function addEventListener(listener, ...elements) {
    for (const element of elements) {
        if (element instanceof HTMLInputElement) {
            element.addEventListener("input", () => listener());
        } else if (element instanceof HTMLButtonElement || element instanceof HTMLCanvasElement) {
            element.addEventListener("click", () => listener());
        } else if (element instanceof HTMLSelectElement) {
            element.addEventListener("change", () => listener());
        }
    }
}

/**
 * @template {HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLCanvasElement} ListenerElementType
 * @param {string} id
 * @param {Constructor<ListenerElementType>} ty
 * @param {(function(): void)[]} listeners
 * @returns {ListenerElementType}
 */
function getElementAndSetListeners(id, ty, ...listeners) {
    const element = getTypedElementById(id, ty);
    for (const listener of listeners) {
        addEventListener(listener, element);
    }

    return element;
}

/**
 * @param {number} min
 * @param {number} max
 */
function randomRange(min, max) {
    return Math.random() * (max - min) + min
}



/**
 * Adapted from https://gist.github.com/earthbound19/e7fe15fdf8ca3ef814750a61bc75b5ce
 * @param {number} lightness
 * @param {number} a
 * @param {number} b
 * @returns {[number, number, number]}
 */
function oklab(lightness, a, b) {
    /** @param {number} c */
    function linearToGamma(c) {
        return c >= 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
    }

    const l = lightness + a * +0.3963377774 + b * +0.2158037573;
    const m = lightness + a * -0.1055613458 + b * -0.0638541728;
    const s = lightness + a * -0.0894841775 + b * -1.2914855480;

    const l_cubed = l ** 3;
    const m_cubed = m ** 3;
    const s_cubed = s ** 3;

    const r_linear = l_cubed * +4.0767416621 + m_cubed * -3.3077115913 + s_cubed * +0.2309699292;
    const g_linear = l_cubed * -1.2684380046 + m_cubed * +2.6097574011 + s_cubed * -0.3413193965;
    const b_linear = l_cubed * -0.0041960863 + m_cubed * -0.7034186147 + s_cubed * +1.7076147010;

    // Convert linear RGB to sRGB (produces perceptually linear lightness)
    const red = linearToGamma(r_linear);
    const green = linearToGamma(g_linear);
    const blue = linearToGamma(b_linear);

    return [red, green, blue];
}

/**
 * @param {number} red
 * @param {number} green 
 * @param {number} blue 
 * @returns {string}
 */
function toHexColorCode(red, green, blue) {
    /** @param {number} x */
    function toHex(x) {
        x = clamp(x * 255, 0, 255);
        x = Math.round(x);
        const hex = x.toString(16);
        return hex.length == 1 ? `0${hex}` : hex;
    }
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}



/************
 * CA Logic *
 ************/

class Board {
    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.board = new Uint8Array(width * height);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {BoundaryCondition} [boundary]
     * @returns {boolean}
     */
    getCell(x, y, boundary) {
        /**
         * @param {number} n
         * @param {number} mod
         */
        function remEuclid(n, mod) {
            return ((n % mod) + mod) % mod;
        }

        if (x < 0 || x >= this.width) {
            if (boundary === undefined) {
                throw new Error(`x-coordinate ${x} is outside board size (width = ${this.width})`);
            } else if (boundary == "off") {
                return false;
            } else if (boundary == "on") {
                return true;
            } else if (boundary == "wrap") {
                x = remEuclid(x, this.width);
            }
        }
        if (y < 0 || y >= this.height) {
            if (boundary === undefined) {
                throw new Error(`y-coordinate ${y} is outside board size (height = ${this.height})`);
            }
            else if (boundary == "off") {
                return false;
            } else if (boundary == "on") {
                return true;
            } else if (boundary == "wrap") {
                y = remEuclid(this.height, y);
            }
        }

        const i = x + y * this.width;
        return this.board[i] == 1;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} value
     */
    setCell(x, y, value) {
        const i = x + y * this.width;
        this.board[i] = value ? 1 : 0;
    }
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
        else { return get_bit(n, 7); }
    }
}


/**
 * @param {Board} board
 * @param {Rule} rule
 * @param {BoundaryCondition} boundary
 * @param {InitialCondition} initial
 */
function initialize_board(board, rule, boundary, initial) {
    // Populate initial row
    populateRow(board, 0, initial);

    // Draw the rest of the rows
    for (let y = 1; y < board.height; y++) {
        computeRow(board, y, rule, boundary);
    }
}

/**
 * @param {Board} board
 * @param {number} y
 * @param {InitialCondition} initial
 */
function populateRow(board, y, initial) {
    const width = board.width;

    /** @type {(arg0: number) => boolean} */
    let rule;
    switch (initial) {
        case "one_cell_on_center": rule = x => x == Math.floor(width / 2);
            break;
        case "one_cell_on_left": rule = x => x == 0;
            break;
        case "one_cell_on_right": rule = x => x == width - 1;
            break;
        case "one_cell_on_random": {
            const cell = Math.floor(Math.random() * width);
            rule = x => x == cell;
            break;
        }
        case "one_cell_off_center": rule = x => x != Math.floor(width / 2);
            break;
        case "one_cell_off_left": rule = x => x != 0;
            break;
        case "one_cell_off_right": rule = x => x != width - 1;
            break;
        case "one_cell_off_random": {
            const cell = Math.floor(Math.random() * width);
            rule = x => x != cell;
            break;
        }
        case "random_5": rule = _ => Math.random() < 0.25;
            break;
        case "random_25": rule = _ => Math.random() < 0.05;
            break;
        case "random_50": rule = _ => Math.random() < 0.50;
            break;
        case "random_75": rule = _ => Math.random() < 0.75;
            break;
        case "random_95": rule = _ => Math.random() < 0.95;
            break;
        case "all_on": rule = _ => true;
            break;
        case "all_off": rule = _ => false;
            break;
    }
    for (let x = 0; x < width; x++) {
        const value = rule(x);
        board.setCell(x, y, value);
    }
}

/**
 * @param {Board} board
 * @param {number} y
 * @param {RandomnessType} randomness_type
 * @param {number} percent
 */
function injectRandomness(board, y, randomness_type, percent) {
    for (let x = 0; x < board.width; x++) {
        let value = null;
        if (Math.random() < percent) {
            if (randomness_type == "on") { value = true; }
            else if (randomness_type == "off") { value = false; }
            else if (randomness_type == "replace") { value = true; }
            else if (randomness_type == "flip") {
                value = !board.getCell(x, y);
            }
        } else {
            if (randomness_type == "replace") { value = false; }
        }

        if (value != null) {
            board.setCell(x, y, value);
        }
    }
}

/**
 * Shifts up the canvas by a single pixel.
 * @param {Board} board
 * @param {number} amount
 * @param {Rule} rule
 * @param {BoundaryCondition} boundary
 */
function shiftUp(board, amount, rule, boundary) {
    // Prevent scrolling the entire canvas offscreen
    if (amount >= board.height) {
        amount = board.height - 1;
    }

    board.board.copyWithin(0, board.width * amount);

    for (let y = board.height - amount; y < board.height; y++) {
        computeRow(board, y, rule, boundary);
    }
}

/**
 * @param {Board} board
 * @param {number} y
 * @param {Rule} rule
 * @param {BoundaryCondition} boundary
 */
function computeRow(board, y, rule, boundary) {
    for (let x = 0; x < board.width; x++) {
        const left = board.getCell(x - 1, y - 1, boundary);
        const mid = board.getCell(x, y - 1, boundary);
        const right = board.getCell(x + 1, y - 1, boundary);

        const cell = rule(left, mid, right);

        board.setCell(x, y, cell);
    }
}


/****************
 * Render Image *
 ****************/

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Board} board 
 */
function renderBoard(ctx, board) {
    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    function packColor(r, g, b, a) { return (a << 24) | (b << 16) | (g << 8) | r; }

    /**
     * @param {string} color
     */
    function parseColorCode(color) {
        const r = parseInt(color.slice(1, 3), 16)
        const g = parseInt(color.slice(3, 5), 16)
        const b = parseInt(color.slice(5, 7), 16)
        return packColor(r, g, b, 255);
    }

    const imageData = ctx.createImageData(board.width, board.height);
    const buf32 = new Uint32Array(imageData.data.buffer);
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    const OFF_COLOR = parseColorCode(color_for_off_input.value);
    const ON_COLOR = parseColorCode(color_for_on_input.value);

    // Very hot loop. Try to hoist constants out of this loop.
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const pixel = board.getCell(x, y);
            const color = pixel ? ON_COLOR : OFF_COLOR;
            const index = y * width + x;
            buf32[index] = color;
        }
    }
    ctx.putImageData(imageData, 0, 0);

}

/*****************************
 * Controls & Event Handlers *
 *****************************/

function render() {
    if (BOARD != null) {
        renderBoard(CTX, BOARD);
    }
}

function resetCanvas() {
    CTX.imageSmoothingEnabled = false;
    const boundary = getBoundaryCondition();
    const initial = getInitialCondition();
    const n = getRule();
    const rule = make_rule(n);

    BOARD = new Board(CTX.canvas.width, CTX.canvas.height);
    initialize_board(BOARD, rule, boundary, initial);
    render();
}

function resetIfNotPlaying() {
    if (!ANIMATING) {
        resetCanvas();
    }
}

function applyControls() {
    applyLockAspectRatio();
    applyLockedToCanvas();
    setExternalCanvasSize();
    setInternalCanvasSize();
}

function applyLockedToCanvas() {
    if (lock_internal_size_input.checked) {
        internal_width_input.disabled = true;
        internal_height_input.disabled = true;

        internal_width_input.value = external_width_input.value;
        internal_height_input.value = external_height_input.value;
    } else {
        internal_width_input.disabled = false;
        internal_height_input.disabled = false;
    }
}

function applyLockAspectRatio() {
    if (lock_aspect_ratio_input.checked) {
        external_height_input.disabled = true;
        external_height_input.value = external_width_input.value;
    } else {
        external_height_input.disabled = false;
    }
}

function setInternalCanvasSize() {
    let width = parseFloat(internal_width_input.value);
    let height = parseFloat(internal_height_input.value);

    width = clamp(width, 1, 9999);
    height = clamp(height, 1, 9999);
    if ((CTX.canvas.width != width || CTX.canvas.height != height) && !isNaN(width) && !isNaN(height)) {
        CTX.canvas.width = width;
        CTX.canvas.height = height;
        resetCanvas();
    }
}

function setExternalCanvasSize() {
    CTX.canvas.style.width = `${external_width_input.value}px`;
    CTX.canvas.style.height = `${external_height_input.value}px`;
}

function toggleAnimating() {
    if (ANIMATING) {
        stopAnimationLoop();
        play_button.textContent = "Play";
    } else {
        startAnimationLoop();
        play_button.textContent = "Pause";
    }
}

function startAnimationLoop() {
    ANIMATING = true;
    requestAnimationFrame(animationLoop);
}

function stopAnimationLoop() {
    ANIMATING = false;
    LAST_FRAME = null;
}

function setSpeedLabel() {
    const speedLabel = getTypedElementById("speed-label", HTMLLabelElement);
    const rowsPerSecond = getRowsPerSecond();
    speedLabel.textContent = `Speed (${rowsPerSecond.toFixed(0)})`
}

function setRandomnessLabel() {
    const randomnessLabel = getTypedElementById("randomness-label", HTMLLabelElement);
    const randomness = getRandomnessAmount() * 100;
    const label = randomness < 10 ? randomness.toFixed(1) : randomness.toFixed(0);
    randomnessLabel.textContent = `Randomness (${label}%)`
}

function randomizeRule() {
    const rule = Math.floor(Math.random() * 256);
    rule_input.value = rule.toFixed(0);
    resetIfNotPlaying();
    updateRuleCheckboxes();
}

function flipRule() {
    // Exchanges bits 1 and 4 as well as 3 and 6
    // (which exchanges FFT <-> TFF and FTT <-> TTF)
    const rule = getRule();
    const bit0 = get_bit(rule, 0); // FFF
    const bit1 = get_bit(rule, 1); // FFT, exchange with bit 4
    const bit2 = get_bit(rule, 2); // FTF
    const bit3 = get_bit(rule, 3); // FTT, exchange with bit 6
    const bit4 = get_bit(rule, 4); // TFF, exchange with bit 1
    const bit5 = get_bit(rule, 5); // TFT
    const bit6 = get_bit(rule, 6); // TTF, exchange with bit 3
    const bit7 = get_bit(rule, 7); // TTT
    const newRule = from_bits(bit0, bit4, bit2, bit6, bit1, bit5, bit3, bit7);

    rule_input.value = newRule.toFixed(0);
    resetIfNotPlaying();
    updateRuleCheckboxes();
}

function complementRule() {
    // Reverses and bitwise NOTs all the bits
    // This is equivalent to inverting what false and true means for the whole rule.
    const rule = getRule();
    const bit0 = get_bit(rule, 0); // FFF, exchange with bit 7
    const bit1 = get_bit(rule, 1); // FFT, exchange with bit 6
    const bit2 = get_bit(rule, 2); // FTF, exchange with bit 5
    const bit3 = get_bit(rule, 3); // FTT, exchange with bit 4
    const bit4 = get_bit(rule, 4); // TFF, exchange with bit 3
    const bit5 = get_bit(rule, 5); // TFT, exchange with bit 2
    const bit6 = get_bit(rule, 6); // TTF, exchange with bit 1
    const bit7 = get_bit(rule, 7); // TTT, exchange with bit 0
    const newRule = from_bits(!bit7, !bit6, !bit5, !bit4, !bit3, !bit2, !bit1, !bit0);

    rule_input.value = newRule.toFixed(0);
    resetIfNotPlaying();
    updateRuleCheckboxes();
}

function invertRule() {
    // Bitwise NOTs all the bits
    const rule = getRule();
    const bit0 = get_bit(rule, 0); // FFF, exchange with bit 7
    const bit1 = get_bit(rule, 1); // FFT, exchange with bit 6
    const bit2 = get_bit(rule, 2); // FTF, exchange with bit 5
    const bit3 = get_bit(rule, 3); // FTT, exchange with bit 4
    const bit4 = get_bit(rule, 4); // TFF, exchange with bit 3
    const bit5 = get_bit(rule, 5); // TFT, exchange with bit 2
    const bit6 = get_bit(rule, 6); // TTF, exchange with bit 1
    const bit7 = get_bit(rule, 7); // TTT, exchange with bit 0
    const newRule = from_bits(!bit0, !bit1, !bit2, !bit3, !bit4, !bit5, !bit6, !bit7);

    rule_input.value = newRule.toFixed(0);
    resetIfNotPlaying();
    updateRuleCheckboxes();
}

function updateRuleInput() {
    let rule = 0;
    for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
        if (rule_checkboxes[i].checked) {
            rule += 2 ** i;
        }
    }
    if (getRule() != rule) {
        rule_input.value = rule.toFixed(0);
        resetIfNotPlaying();
    }
}

function updateRuleCheckboxes() {
    const rule = getRule();
    for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
        rule_checkboxes[i].checked = get_bit(rule, i);
    }
}

async function copyCanvasToClipboard() {
    canvas.toBlob(async (blob) => {
        if (!blob) {
            console.error("Could not convert canvas to blob?");
            return;
        }

        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
    }, 'image/png');
    copied_to_clipboard_message.classList.remove("animate-fade");
    void copied_to_clipboard_message.offsetWidth; // Required to make the animation actually trigger
    copied_to_clipboard_message.classList.add("animate-fade");
}

/**
 * @param {number} lightness
 * @param {HTMLInputElement} color_input
 */
function randomizeColorInput(lightness, color_input) {
    const a = randomRange(-0.4, 0.4);
    const b = randomRange(-0.4, 0.4);
    const [red, green, blue] = oklab(lightness, a, b);
    console.log(red, green, blue);
    const color = toHexColorCode(red, green, blue);
    color_input.value = color;
}

function randomizeBothColors() {
    randomizeOffColor();
    randomizeOnColor();
}

function randomizeOnColor() {
    randomizeColorInput(randomRange(0.5, 1.0), color_for_on_input);
}

function randomizeOffColor() {
    randomizeColorInput(randomRange(0.0, 0.5), color_for_off_input);
}

function getRule() {
    return parseInt(rule_input.value);
}

function getRowsPerSecond() {
    const percent = parseFloat(speed_input.value);
    return (percent ** 4) * CTX.canvas.height * 10;
}

function getRandomnessAmount() {
    const percent = parseFloat(randomness_input.value);
    const smoothed = smoothStep(percent, 2.0, 1.0);
    return smoothed;
}

/**
 * @typedef {"off" | "on" | "wrap"} BoundaryCondition
 * @returns {BoundaryCondition}
 */
function getBoundaryCondition() {
    const boundary = boundary_dropdown.value;
    if (boundary == "off" || boundary == "on" || boundary == "wrap") {
        return boundary;
    }
    throw new Error("unreachable");
}

/**
 * @typedef { "one_cell_on_center" | "one_cell_on_left" | "one_cell_on_right" | "one_cell_on_random" |
 * "one_cell_off_center" | "one_cell_off_left" | "one_cell_off_right" | "one_cell_off_random" |
 * "random_5" | "random_25" | "random_50" | "random_75" | "random_95" |
 * "all_on" | "all_off"} InitialCondition
 * @returns {InitialCondition}
 */
function getInitialCondition() {
    const initial = initial_dropdown.value;
    if (initial == "one_cell_on_center" ||
        initial == "one_cell_on_left" ||
        initial == "one_cell_on_right" ||
        initial == "one_cell_on_random" ||
        initial == "one_cell_off_center" ||
        initial == "one_cell_off_left" ||
        initial == "one_cell_off_right" ||
        initial == "one_cell_off_random" ||
        initial == "random_5" ||
        initial == "random_25" ||
        initial == "random_50" ||
        initial == "random_75" ||
        initial == "random_95" ||
        initial == "all_on" ||
        initial == "all_off") {
        return initial;
    }
    throw new Error("unreachable");
}

/**
 * @typedef {"on" | "off" | "replace" | "flip"} RandomnessType
 * @returns {RandomnessType}
 */
function getRandomnessType() {
    const randomnessType = randomness_type_dropdown.value;
    if (randomnessType == "on" || randomnessType == "off" || randomnessType == "replace" || randomnessType == "flip") {
        return randomnessType;
    }
    throw new Error("unreachable");
}

/*************
 * Animation *
 *************/

/**
 * @param {number} timestamp 
 */
function animationLoop(timestamp) {
    if (ANIMATING) {
        if (LAST_FRAME == null) {
            LAST_FRAME = timestamp;
        }
        // These are in miliseconds, so divide by 1000 to get seconds.
        const deltaTime = (timestamp - LAST_FRAME) / 1000;
        const rowsPerSecond = getRowsPerSecond();
        const rowsToShift = Math.floor(deltaTime * rowsPerSecond);

        const n = getRule();
        if (rowsToShift > 0) {
            const board = unwrap(BOARD);
            if (ADD_RANDOMNESS) {
                const percent = getRandomnessAmount();
                const randomness_type = getRandomnessType();
                injectRandomness(board, board.height - 1, randomness_type, percent)
                ADD_RANDOMNESS = false;
            }

            const boundary = getBoundaryCondition();
            shiftUp(board, rowsToShift, make_rule(n), boundary);
            renderBoard(CTX, board);

            // Only record LAST_FRAME if we actually changed anything on the canvas.
            LAST_FRAME = timestamp;
        }
        requestAnimationFrame(animationLoop);
    }
}

/** @type {Board | null} */
let BOARD = null;

let ANIMATING = false;
// Note: In miliseconds
/** @type {number | null} */
let LAST_FRAME = null;
let ADD_RANDOMNESS = false;

/** @typedef {[number, number, number]} Color */


const canvas = getElementAndSetListeners('canvas', HTMLCanvasElement, copyCanvasToClipboard);
const CTX = unwrap(canvas.getContext("2d"));

const rule_input = getElementAndSetListeners('rule', HTMLInputElement, updateRuleCheckboxes, resetIfNotPlaying);
const internal_width_input = getElementAndSetListeners('internal-width', HTMLInputElement, applyControls);
const internal_height_input = getElementAndSetListeners('internal-height', HTMLInputElement, applyControls, setSpeedLabel);
const lock_internal_size_input = getElementAndSetListeners('lock-internal-size', HTMLInputElement, setSpeedLabel);
const external_width_input = getElementAndSetListeners('external-width', HTMLInputElement, applyControls);
const external_height_input = getElementAndSetListeners('external-height', HTMLInputElement, applyControls);
const lock_aspect_ratio_input = getElementAndSetListeners('lock-aspect-ratio', HTMLInputElement, applyControls);

const color_for_off_input = getElementAndSetListeners('color-for-off', HTMLInputElement, render);
const color_for_on_input = getElementAndSetListeners('color-for-on', HTMLInputElement, render);

const play_button = getElementAndSetListeners('play', HTMLButtonElement, toggleAnimating);
const _reset_button = getElementAndSetListeners('reset', HTMLButtonElement, resetCanvas);
const _inject_randomness_button = getElementAndSetListeners('inject-randomness', HTMLButtonElement, () => ADD_RANDOMNESS = true);
const _randomize_rule_button = getElementAndSetListeners('randomize-rule', HTMLButtonElement, randomizeRule);
const _flip_rule_button = getElementAndSetListeners('flip-rule', HTMLButtonElement, flipRule);
const _completement_rule_button = getElementAndSetListeners('complement-rule', HTMLButtonElement, complementRule);
const _invert_rule_button = getElementAndSetListeners('invert-rule', HTMLButtonElement, invertRule);

const _randomize_both_colors_button = getElementAndSetListeners('randomize-both-colors', HTMLButtonElement, () => { randomizeBothColors(); render(); });
const _randomize_off_color_button = getElementAndSetListeners('randomize-off-color', HTMLButtonElement, () => { randomizeOffColor(); render(); });
const _randomize_on_color_button = getElementAndSetListeners('randomize-on-color', HTMLButtonElement, () => { randomizeOnColor(); render(); });

const speed_input = getElementAndSetListeners('speed', HTMLInputElement, setSpeedLabel);
const randomness_input = getElementAndSetListeners('randomness-amount', HTMLInputElement, setRandomnessLabel);

const boundary_dropdown = getElementAndSetListeners('boundary', HTMLSelectElement, resetIfNotPlaying);
const initial_dropdown = getElementAndSetListeners('initial', HTMLSelectElement, resetCanvas);
const randomness_type_dropdown = getElementAndSetListeners('randomness-type', HTMLSelectElement);

const copied_to_clipboard_message = getTypedElementById('copied-to-clipboard-message', HTMLParagraphElement);

const NUM_RULE_CHECKBOXES = 8;
/** @type {HTMLInputElement[]} */
const rule_checkboxes = [];
for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
    const rule_checkbox = getElementAndSetListeners(`rule-checkbox-${i}`, HTMLInputElement, updateRuleInput);
    rule_checkboxes.push(rule_checkbox)
}

resetCanvas();
applyControls();
setSpeedLabel();
setRandomnessLabel();

