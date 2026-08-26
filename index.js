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
 * @param {HTMLInputElement[]} elements
 */
function setEventListener(listener, ...elements) {
    for (const element of elements) {
        element.addEventListener("input", () => listener());
    }
}

/**********************
 * CA Logic & Drawing *
 **********************/

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
 * @param {ImageData} imageData
 * @param {number} x
 * @param {number} y
 * @param {BoundaryCondition} boundary
 * @returns {boolean}
 */
function getPixel(imageData, x, y, boundary) {
    /**
     * @param {number} n
     * @param {number} mod
     */
    function remEuclid(n, mod) {
        return ((n % mod) + mod) % mod;
    }

    if (x < 0 || x >= imageData.width) {
        if (boundary == "off") {
            return false;
        } else if (boundary == "on") {
            return true;
        } else if (boundary == "wrap") {
            x = remEuclid(x, imageData.width);
        }
    }
    if (y < 0 || y >= imageData.height) {
        if (boundary == "off") {
            return false;
        } else if (boundary == "on") {
            return true;
        } else if (boundary == "wrap") {
            y = remEuclid(imageData.height, y);
        }
    }

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

/**
 * @param {Rule} rule
 * @param {BoundaryCondition} boundary
 * @param {InitialCondition} initial
 */
function initialize_canvas(rule, boundary, initial) {
    const width = CTX.canvas.width;
    const height = CTX.canvas.height;
    const imageData = CTX.createImageData(width, height);
    // Populate initial row
    populateRow(imageData, 0, initial);

    // Draw the rest of the rows
    for (let y = 1; y < height; y++) {
        renderRow(imageData, y, rule, boundary);
    }
    CTX.putImageData(imageData, 0, 0);
}

/**
 * @param {ImageData} imageData
 * @param {number} y
 * @param {InitialCondition} initial
 */
function populateRow(imageData, y, initial) {
    const width = imageData.width;

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
        const color = rule(x) ? WHITE : BLACK;
        setPixel(imageData, x, y, color);
    }
}

/**
 * @param {ImageData} imageData
 * @param {number} y
 * @param {RandomnessType} randomness_type
 * @param {number} percent
 */
function injectRandomness(imageData, y, randomness_type, percent) {
    for (let x = 0; x < imageData.width; x++) {
        let color = null;
        if (Math.random() < percent) {
            if (randomness_type == "on") { color = WHITE; }
            else if (randomness_type == "off") { color = BLACK; }
            else if (randomness_type == "replace") { color = WHITE; }
            else if (randomness_type == "flip") {
                var pixel = getPixel(imageData, x, y, "off");
                color = pixel ? BLACK : WHITE;
            }
        } else {
            if (randomness_type == "replace") { color = BLACK; }
        }

        if (color != null) {
            setPixel(imageData, x, y, color);
        }
    }
}

/**
 * Shifts up the canvas by a single pixel.
 * @param {ImageData} imageData
 * @param {number} amount
 * @param {Rule} rule
 * @param {BoundaryCondition} boundary
 */
function shiftUp(imageData, amount, rule, boundary) {
    // Prevent scrolling the entire canvas offscreen
    if (amount >= imageData.height) {
        amount = imageData.height - 1;
    }

    for (let y = 0; y < imageData.height - amount; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const pixel = getPixel(imageData, x, y + amount, boundary);
            setPixel(imageData, x, y, pixel ? WHITE : BLACK);
        }
    }
    for (let y = imageData.height - amount; y < imageData.height; y++) {
        renderRow(imageData, y, rule, boundary);
    }
}

/**
 * @param {ImageData} imageData
 * @param {number} y
 * @param {Rule} rule
 * @param {BoundaryCondition} boundary
 */
function renderRow(imageData, y, rule, boundary) {
    for (let x = 0; x < imageData.width; x++) {
        const left = getPixel(imageData, x - 1, y - 1, boundary);
        const mid = getPixel(imageData, x, y - 1, boundary);
        const right = getPixel(imageData, x + 1, y - 1, boundary);

        const cell = rule(left, mid, right);

        const color = cell ? WHITE : BLACK;
        setPixel(imageData, x, y, color);
    }
}

/*****************************
 * Controls & Event Handlers *
 *****************************/

function resetCanvas() {
    CTX.imageSmoothingEnabled = false;
    const boundary = getBoundaryCondition();
    const initial = getInitialCondition();
    const n = parseInt(rule_input.value);
    const rule = make_rule(n);
    initialize_canvas(rule, boundary, initial);
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

function updateRuleInput() {
    let rule = 0;
    for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
        if (rule_checkboxes[i].checked) {
            rule += 2 ** i;
        }
    }
    if (parseInt(rule_input.value) != rule) {
        rule_input.value = rule.toFixed(0);
        resetIfNotPlaying();
    }
}

function updateRuleCheckboxes() {
    const rule = parseInt(rule_input.value);
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
    void copied_to_clipboard_message.offsetWidth;
    copied_to_clipboard_message.classList.add("animate-fade");
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

        const n = parseInt(rule_input.value);
        if (rowsToShift > 0) {
            const imageData = CTX.getImageData(0, 0, CTX.canvas.width, CTX.canvas.height);

            if (ADD_RANDOMNESS) {
                const percent = getRandomnessAmount();
                const randomness_type = getRandomnessType();
                injectRandomness(imageData, imageData.height - 1, randomness_type, percent)
                ADD_RANDOMNESS = false;
            }

            const boundary = getBoundaryCondition();
            shiftUp(imageData, rowsToShift, make_rule(n), boundary);
            CTX.putImageData(imageData, 0, 0);
            // Only record LAST_FRAME if we actually changed anything on the canvas.
            LAST_FRAME = timestamp;
        }
        requestAnimationFrame(animationLoop);
    }
}

let ANIMATING = false;
// Note: In miliseconds
/** @type {number | null} */
let LAST_FRAME = null;
let ADD_RANDOMNESS = false;

/** @typedef {[number, number, number]} Color */

/** @type {Color} */
const BLACK = [0, 0, 0];
/** @type {Color} */
const WHITE = [255, 255, 255];

const canvas = getTypedElementById('canvas', HTMLCanvasElement);
const CTX = unwrap(canvas.getContext("2d"));

const rule_input = getTypedElementById('rule', HTMLInputElement);
const internal_width_input = getTypedElementById('internal-width', HTMLInputElement);
const internal_height_input = getTypedElementById('internal-height', HTMLInputElement);
const lock_internal_size_input = getTypedElementById('lock-internal-size', HTMLInputElement);
const external_width_input = getTypedElementById('external-width', HTMLInputElement);
const external_height_input = getTypedElementById('external-height', HTMLInputElement);
const lock_aspect_ratio_input = getTypedElementById('lock-aspect-ratio', HTMLInputElement);

const play_button = getTypedElementById('play', HTMLButtonElement);
const reset_button = getTypedElementById('reset', HTMLButtonElement);
const inject_randomness_button = getTypedElementById('inject-randomness', HTMLButtonElement);
const randomize_rule_button = getTypedElementById('randomize-rule', HTMLButtonElement);

const speed_input = getTypedElementById('speed', HTMLInputElement);
const randomness_input = getTypedElementById('randomness-amount', HTMLInputElement);

const boundary_dropdown = getTypedElementById('boundary', HTMLSelectElement);
const initial_dropdown = getTypedElementById('initial', HTMLSelectElement);
const randomness_type_dropdown = getTypedElementById('randomness-type', HTMLSelectElement);

const copied_to_clipboard_message = getTypedElementById('copied-to-clipboard-message', HTMLParagraphElement);

const NUM_RULE_CHECKBOXES = 8;
/**
 * @type {HTMLInputElement[]}
 */
const rule_checkboxes = [];
for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
    const rule_checkbox = getTypedElementById(`rule-checkbox-${i}`, HTMLInputElement);
    rule_checkboxes.push(rule_checkbox)
}

setEventListener(updateRuleInput, ...rule_checkboxes);
setEventListener(updateRuleCheckboxes, rule_input);

play_button.addEventListener("click", toggleAnimating);
reset_button.addEventListener("click", resetCanvas);
inject_randomness_button.addEventListener("click", () => ADD_RANDOMNESS = true)
randomize_rule_button.addEventListener("click", randomizeRule);

initial_dropdown.addEventListener('input', resetCanvas);
rule_input.addEventListener('input', resetIfNotPlaying);
boundary_dropdown.addEventListener('change', resetIfNotPlaying);

canvas.addEventListener('click', copyCanvasToClipboard);

setEventListener(applyControls, lock_aspect_ratio_input, external_width_input, external_height_input, lock_internal_size_input, internal_width_input, internal_height_input);
setEventListener(setSpeedLabel, lock_internal_size_input, speed_input, internal_height_input);
setEventListener(setRandomnessLabel, randomness_input);

resetCanvas();
applyControls();
setSpeedLabel();
setRandomnessLabel();