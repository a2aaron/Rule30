// @ts-check


//#region Helpers - Math
class SeedableRNG {
    /**
     * @param {number} seed
     */
    constructor(seed) {
        this.seed = seed;
    }

    random() {
        let x = this.seed;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;

        x = x % 1000000;
        const float = Math.abs(x / 1000000);
        console.log(float);
        this.seed = x;
        return float;
    }

    /**
     * @param {number} min
     * @param {number} max
     */
    randomRangeInt(min, max) {
        return Math.floor(this.randomRange(min, max));
    }

    /**
     * @param {number} min
     * @param {number} max
     */
    randomRange(min, max) {
        return this.random() * (max - min) + min;
    }

    randomNonzeroTrit() {
        const trit = this.randomRangeInt(0, 2) + 1;
        assertTrit(trit);
        return trit;
    }
}

/**
 * @typedef {[number, number, number]} Color
 * Adapted from https://gist.github.com/earthbound19/e7fe15fdf8ca3ef814750a61bc75b5ce
 * @param {number} lightness
 * @param {number} a
 * @param {number} b
 * @returns {Color}
 * 
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
 * @typedef {0 | 1 | 2} Trit
 * @param {number} x
 * @param {number} i
 * @returns {Trit}
 */
function get_trit(x, i) {
    const a = 3 ** (i + 1);
    const b = 3 ** i;
    const shifted = (x - a) / b;
    const trit = Math.floor(remEuclid(shifted, 3));
    assertTrit(trit);
    return trit;
}

/**
 * @param {number} min
 * @param {number} max
 */
function randomRange(min, max) {
    return Math.random() * (max - min) + min
}

/**
 * @param {number} min
 * @param {number} max
 */
function randomRangeInt(min, max) {
    return Math.floor(randomRange(min, max));
}

/** @returns {Trit} */
function randomTrit() {
    const trit = randomRangeInt(0, 3);
    assertTrit(trit);
    return trit;
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
 * @param {number} n
 * @param {number} mod
 */
function remEuclid(n, mod) {
    return ((n % mod) + mod) % mod;
}
//#endregion

//#region Helpers - Types & DOM
/**
 * @template T
 * @typedef { new (...args: any[]) => T } Constructor
 */


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
 * @template T
 * @param {any} value
 * @param {Constructor<T>} ty
 * @returns {T}
 */
function cast(value, ty) {
    if (value instanceof ty) {
        return value;
    } else {
        throw new Error(`Expected ${value} to be of type ${ty} but got ${value.constructor.name}`);
    }
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 *
 * @param {K | string} tagName
 * @param {...(Node | string)} children
 * 
 * @overload
 * @param {K} tagName
 * @param {...(Node | string)[]} children
 * @returns {HTMLElementTagNameMap[K]}
 *
 * @overload
 * @param {string} tagName
 * @param {...(Node | string)[]} children
 * @returns {HTMLElement}
 */
// eslint-disable-next-line no-unused-vars
function h(tagName, ...children) {
    const element = document.createElement(tagName);
    element.append(...children);
    return element;
}

/**
 * @param {function(): void} listener
 * @param {(HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLCanvasElement | HTMLElement)[]} elements
 */
function addEventListener(listener, ...elements) {
    for (const element of elements) {
        if (element instanceof HTMLInputElement) {
            element.addEventListener("input", () => listener());
        } else if (element instanceof HTMLButtonElement || element instanceof HTMLCanvasElement) {
            element.addEventListener("click", () => listener());
        } else if (element instanceof HTMLSelectElement) {
            element.addEventListener("change", () => listener());
        } else {
            element.addEventListener("click", () => listener());
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
//#endregion

//#region CA Logic
/**
 * @typedef {Trit} Cell
 */
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
     * @param {number} width
     * @param {number} height
     */
    resetToSize(width, height) {
        this.width = width;
        this.height = height;
        this.board = new Uint8Array(width * height);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {BoundaryCondition} [boundary]
     * @returns {Cell}
     */
    getCell(x, y, boundary) {
        if (x < 0 || x >= this.width) {
            if (boundary === undefined) {
                throw new Error(`x-coordinate ${x} is outside board size (width = ${this.width})`);
            } else if (boundary == "off") {
                return 0;
            } else if (boundary == "on") {
                return 1;
            } else if (boundary == "wrap") {
                x = remEuclid(x, this.width);
            }
        }
        if (y < 0 || y >= this.height) {
            if (boundary === undefined) {
                throw new Error(`y-coordinate ${y} is outside board size (height = ${this.height})`);
            }
            else if (boundary == "off") {
                return 0;
            } else if (boundary == "on") {
                return 1;
            } else if (boundary == "wrap") {
                y = remEuclid(this.height, y);
            }
        }

        const i = x + y * this.width;
        //@ts-ignore This is called in a hot loop. The only way to store to this.board however
        // is from setCell, which only accepts Cells.
        return this.board[i];
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {Cell} cell
     */
    setCell(x, y, cell) {
        const i = x + y * this.width;
        this.board[i] = cell;
    }
}

class Rule {
    /** 
     * @param {Map<Shape, Cell>} shapes 
     * @typedef {string} Shape
     */
    constructor(shapes) {
        this.shapes = shapes;
    }

    /**
     * @param {NumericRule} rule
     * @returns {Rule}
     */
    static fromNumericRule(rule) {
        const shapes = new Map();
        for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
            assertRuleBoxIndex(i);
            const shape = Rule.ruleBoxIndexToShape(i);
            shapes.set(shape, get_trit(rule, i));
        }
        return new Rule(shapes);
    }

    /**
     * @param {Cell} left
     * @param {Cell} mid
     * @param {Cell} right
     * @returns {Cell}
     */
    get(left, mid, right) {
        const shape = Rule.arrayToShape(left, mid, right);
        return this.getByShape(shape);
    }

    /**
     * @param {Shape} shape
     * @returns {Cell}
     */
    getByShape(shape) {
        return unwrap(this.shapes.get(shape));
    }

    /** @returns {NumericRule} */
    getAsNumericRule() {
        let rule = 0;
        for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
            assertRuleBoxIndex(i);
            const cell = this.getByRuleBoxIndex(i);
            rule += cell * (3 ** i);
        }

        return numericRule(rule);
    }

    /**
     * @typedef {number & { __brand: "ruleBoxIndex" }} RuleBoxIndex
     * @param {RuleBoxIndex} i 
     * @returns {Cell}
     */
    getByRuleBoxIndex(i) {
        const shape = Rule.ruleBoxIndexToShape(i);
        return unwrap(this.shapes.get(shape));
    }

    /**
     * @param {RuleBoxIndex} i
     * @param {Cell} value
     */
    setByRuleBoxIndex(i, value) {
        const shape = Rule.ruleBoxIndexToShape(i);
        this.shapes.set(shape, value);
    }

    randomize() {
        const newShapes = new Map();
        for (const [shape, _cell] of this.shapes.entries()) {
            const newCell = randomTrit();
            newShapes.set(shape, newCell);
        }
        return new Rule(newShapes);
    }

    /**
     * @param {number} mutation_amount
     */
    mutate(mutation_amount) {
        /** @type {Map<Shape, Cell>} */
        const newShapes = new Map();
        for (const [shape, cell] of this.shapes.entries()) {
            newShapes.set(shape, cell);
        }
        for (let i = 0; i < mutation_amount; i++) {
            const i = randomRangeInt(0, newShapes.size);
            const randomShape = [...newShapes.keys()][i];


            let newCell = randomTrit();
            while (newCell == newShapes.get(randomShape)) {
                newCell = randomTrit(); // force newCell to not be identical to the existing cell.
            }
            newShapes.set(randomShape, newCell);
        }

        return new Rule(newShapes);
    }

    flip() {
        /** @type {Map<Shape, Cell>} */
        const newShapes = new Map();
        for (const [shape, cell] of this.shapes.entries()) {
            const [left, mid, right] = Rule.shapeToArray(shape);
            const flippedShape = Rule.arrayToShape(right, mid, left);
            newShapes.set(flippedShape, cell);
        }
        return new Rule(newShapes);
    }

    /**
     * @param {number} amount
     */
    complement(amount) {
        /** @type {Map<Shape, Cell>} */
        const newShapes = new Map();
        for (const pair of this.shapes.entries()) {
            const shape = pair[0];
            let cell = pair[1];
            let [left, mid, right] = Rule.shapeToArray(shape);
            left = (left + amount) % 3;
            mid = (mid + amount) % 3;
            right = (right + amount) % 3;
            cell = (cell + amount) % 3;

            assertTrit(left);
            assertTrit(mid);
            assertTrit(right);
            assertTrit(cell);
            newShapes.set(Rule.arrayToShape(left, mid, right), cell);
        }
        return new Rule(newShapes);
    }

    /**
     * @param {number} amount
     */
    bitwise_add(amount) {
        /** @type {Map<Shape, Cell>} */
        const newShapes = new Map();
        for (const pair of this.shapes.entries()) {
            const shape = pair[0];
            let cell = pair[1];
            const [left, mid, right] = Rule.shapeToArray(shape);
            cell = (cell + amount) % 3;

            assertTrit(left);
            assertTrit(mid);
            assertTrit(right);
            assertTrit(cell);
            newShapes.set(Rule.arrayToShape(left, mid, right), cell);
        }
        return new Rule(newShapes);
    }

    /**
     * @param {RuleBoxIndex} index 
     * @returns {Shape}
     */
    static ruleBoxIndexToShape(index) {
        const left = get_trit(index, 2);
        const mid = get_trit(index, 1);
        const right = get_trit(index, 0);
        const shape = Rule.arrayToShape(left, mid, right);
        return shape;
    }

    /**
     * @param {Shape} shape 
     * @returns {[Cell, Cell, Cell]}
     */
    static shapeToArray(shape) {
        const left = parseInt(shape[0]);
        const mid = parseInt(shape[1]);
        const right = parseInt(shape[2]);
        assertTrit(left);
        assertTrit(mid);
        assertTrit(right);
        return [left, mid, right];
    }

    /**
     * @param {Cell} left
     * @param {Cell} mid
     * @param {Cell} right
     */
    static arrayToShape(left, mid, right) {
        const shape = `${left}${mid}${right}`;
        return shape;
    }

}


/**
 * @param {Board} board
 * @param {Rule} rule
 * @param {InitialCondition} initial
 * @param {BoundaryCondition} boundary
 */
function initialize_board(board, rule, initial, boundary) {
    // Populate initial row
    populateRow(board, 0, initial);

    // Draw the rest of the rows
    for (let y = 1; y < board.height; y++) {
        computeRow(board, rule, boundary, y);
    }
}

/**
 * @param {Board} board
 * @param {number} y
 * @param {InitialCondition} initial
 */
function populateRow(board, y, initial) {
    const seed = getSeed();
    const rng = new SeedableRNG(seed);

    const width = board.width;

    /** @type {(arg0: number) => [boolean, Cell]} */
    let rule;
    switch (initial) {
        case "one_cell_on_center": rule = x => [x == Math.floor(width / 2), 1];
            break;
        case "one_cell_on_left": rule = x => [x == 0, 1];
            break;
        case "one_cell_on_right": rule = x => [x == width - 1, 1];
            break;
        case "one_cell_on_random": {
            const cell = rng.randomRangeInt(0, width);
            rule = x => [x == cell, 1];
            break;
        }
        case "one_cell_off_center": rule = x => [x != Math.floor(width / 2), 1];
            break;
        case "one_cell_off_left": rule = x => [x != 0, 1];
            break;
        case "one_cell_off_right": rule = x => [x != width - 1, 1];
            break;
        case "one_cell_off_random": {
            const cell = rng.randomRangeInt(0, width);
            rule = x => [x != cell, 1];
            break;
        }
        case "random_5": rule = _ => [rng.randomRange(0.0, 1.0) < 0.25, rng.randomNonzeroTrit()];
            break;
        case "random_25": rule = _ => [rng.randomRange(0.0, 1.0) < 0.05, rng.randomNonzeroTrit()];
            break;
        case "random_50": rule = _ => [rng.randomRange(0.0, 1.0) < 0.50, rng.randomNonzeroTrit()];
            break;
        case "random_75": rule = _ => [rng.randomRange(0.0, 1.0) < 0.75, rng.randomNonzeroTrit()];
            break;
        case "random_95": rule = _ => [rng.randomRange(0.0, 1.0) < 0.95, rng.randomNonzeroTrit()];
            break;
        case "all_on": rule = _ => [true, 1];
            break;
        case "all_off": rule = _ => [false, 1];
            break;
    }
    for (let x = 0; x < width; x++) {
        const [result, cell] = rule(x);
        const value = result ? cell : 0;
        board.setCell(x, y, value);
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
        computeRow(board, rule, boundary, y);
    }
}

/**
 * @param {Board} board
 * @param {Rule} rule
 * @param {BoundaryCondition} boundary
 * @param {number} y
 */
function computeRow(board, rule, boundary, y) {
    for (let x = 0; x < board.width; x++) {
        const cell = evaluate(board, rule, boundary, x, y - 1);
        board.setCell(x, y, cell);
    }
}

/**
 * 
 * @param {Board} board 
 * @param {Rule} rule
 * @param {BoundaryCondition} boundary
 * @param {number} x 
 * @param {number} y 
 */
function evaluate(board, rule, boundary, x, y) {
    const left = board.getCell(x - 1, y, boundary);
    const mid = board.getCell(x, y, boundary);
    const right = board.getCell(x + 1, y, boundary);

    const value = rule.get(left, mid, right);
    if (value === undefined) {
        return 0;
    }
    return value;
}

/**
 * @param {Board} board
 * @param {number} y
 * @param {RandomnessType} randomness_type
 * @param {number} percent
 */
function injectRandomness(board, y, randomness_type, percent) {
    /** @param {Trit} trit */
    function cycleTrit(trit) {
        const newTrit = (trit + 1) % 3;
        assertTrit(newTrit);
        return newTrit;
    }


    for (let x = 0; x < board.width; x++) {
        /** @type { Trit? } */
        let value = null;
        if (randomRange(0.0, 1.0) < percent) {
            switch (randomness_type) {
                case "state_0": value = 0;
                    break;
                case "state_1": value = 1;
                    break;
                case "state_2": value = 2;
                    break;
                case "replace": value = randomTrit();
                    break;
                case "cycle": value = cycleTrit(board.getCell(x, y));
                    break;
            }
        }

        if (value != null) {
            board.setCell(x, y, value);
        }
    }
}
//#endregion

//#region Rendering & Animation

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

    const STATE_0 = parseColorCode(color_state_0_input.value);
    const STATE_1 = parseColorCode(color_state_1_input.value);
    const STATE_2 = parseColorCode(color_state_2_input.value);

    // Very hot loop. Try to hoist constants out of this loop.
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const cell = board.getCell(x, y);
            const color = cell == 0 ? STATE_0 : (cell == 1 ? STATE_1 : STATE_2);
            const index = y * width + x;
            buf32[index] = color;
        }
    }
    ctx.putImageData(imageData, 0, 0);

}

function render() {
    requestAnimationFrame(animationLoop);
}

function resetCanvas() {
    NEEDS_RESET = true;
    render();
}

function resetIfNotPlaying() {
    if (!ANIMATING) {
        NEEDS_RESET = true;
        render();
    }
}

/**
 * @param {number} timestamp 
 */
function animationLoop(timestamp) {
    function shouldRandomizeRow() {
        return RANDOMIZE_ROW || (randomize_if_boring_input.checked && bottomRowIsAllSame());
    }

    function bottomRowIsAllSame() {
        const board = unwrap(BOARD);
        const lastRow = board.height - 1;

        const firstCell = board.getCell(0, lastRow)
        for (let x = 1; x < board.width; x++) {
            if (firstCell != board.getCell(x, lastRow)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {Board} board
     * @param {number} rowsToShift
     */
    function updateBoard(board, rowsToShift) {
        const initial = getInitialCondition();
        const boundary = getBoundaryCondition();

        if (NEEDS_RESET) {
            NEEDS_RESET = false;
            board.resetToSize(CTX.canvas.width, CTX.canvas.height);
            initialize_board(board, RULE, initial, boundary);

            LAST_MUTATE = 0;
            TOTAL_ROWS = 0;
        }


        if (shouldRandomizeRow()) {
            const percent = getRandomnessAmount();
            const randomness_type = getRandomnessType();
            injectRandomness(board, board.height - 1, randomness_type, percent);
            RANDOMIZE_ROW = false;
        }

        if (rowsToShift > 0) {
            shiftUp(board, rowsToShift, RULE, boundary);
        }
    }

    if (ANIMATING) {
        if (LAST_FRAME == null) {
            LAST_FRAME = timestamp;
        }
        // These are in miliseconds, so divide by 1000 to get seconds.
        const deltaTime = (timestamp - LAST_FRAME) / 1000;
        const rowsPerSecond = getRowsPerSecond();
        const rowsToShift = Math.floor(deltaTime * rowsPerSecond);
        if (rowsToShift > 0) {
            const mutationRate = parseInt(auto_mutate_rate_input.value)
            if (mutationRate > 0 && TOTAL_ROWS - LAST_MUTATE > mutationRate) {
                mutateRule();
                LAST_MUTATE = TOTAL_ROWS;
            }

            updateBoard(BOARD, rowsToShift);
            renderBoard(CTX, BOARD);

            // Only record LAST_FRAME if we actually changed anything on the canvas.
            LAST_FRAME = timestamp;

            TOTAL_ROWS += rowsToShift;
        }

        render();
    } else {
        updateBoard(BOARD, 0);
        renderBoard(CTX, BOARD);
    }
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
    render();
}

function stopAnimationLoop() {
    ANIMATING = false;
    LAST_FRAME = null;
}
//#endregion

//#region Controls - Rule Controls

function createRuleDiagrams() {
    const rule_diagrams_element = unwrap(document.querySelector("rule-diagrams"));
    const rule_inputs = [];

    for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
        assertRuleBoxIndex(i);

        const rule_diagram = document.importNode(rule_diagram_template.content, true);

        const rule_input = cast(rule_diagram.querySelector("rule-input"), HTMLElement);
        if (rule_input.dataset.state === undefined) {
            rule_input.dataset.state = "0";
        }
        addEventListener(() => ruleBoxClicked(i), rule_input);

        rule_inputs.push(rule_input);

        const rule_boxes = rule_diagram.querySelectorAll("rule-box");
        for (let j = 0; j < 3; j++) {
            const rule_box = cast(rule_boxes[j], HTMLElement);
            // Use 2 - j so that the rightmost box changes first and the leftmost box changes last
            const state = get_trit(i, 2 - j);
            rule_box.dataset.state = state.toString();
        }

        rule_diagrams_element.appendChild(rule_diagram);
    }
    return rule_inputs;
}

/**
 * @returns {Rule}
 */
function getRuleFromControls() {
    const n = getNumericRule();
    return Rule.fromNumericRule(n);
}

/**
 * @param {Rule} rule 
 */
function setRuleControls(rule) {
    const numericRule = rule.getAsNumericRule();
    rule_input.value = numericRule.toString();
    for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
        assertRuleBoxIndex(i);
        const cell = rule.getByRuleBoxIndex(i);
        setRuleBox(i, cell);
    }
}

/**
 * @param {Rule} newRule
 */
function setRule(newRule) {
    RULE = newRule;
    setRuleControls(RULE);
    resetIfNotPlaying();
}

function randomizeRule() {
    const newRule = RULE.randomize();
    setRule(newRule);
    addToHistory(newRule);

    if (randomize_colors_also_input.checked) {
        randomizeAllColors();
    }
}

function mutateRule() {
    const mutationAmount = parseInt(mutate_amount_input.value);
    const newRule = RULE.mutate(mutationAmount);
    setRule(newRule);
    addToHistory(newRule);
}

function flipRule() {
    setRule(RULE.flip());
}

function complementRule() {
    setRule(RULE.complement(1));
}

function cycleRule() {
    setRule(RULE.bitwise_add(1));
}

/**
 * @returns {NumericRule}
 */
function getNumericRule() {
    return numericRule(parseInt(rule_input.value));
}

function ruleTextboxChanged() {
    /** @param {NumericRule} numericRule */
    function setRuleBoxes(numericRule) {
        for (let i = 0; i < NUM_RULE_CHECKBOXES; i++) {
            assertRuleBoxIndex(i);
            setRuleBox(i, get_trit(numericRule, i));
        }
    }

    const rule = getNumericRule();
    RULE = Rule.fromNumericRule(rule)
    setRuleBoxes(rule);
    resetIfNotPlaying();
}

/**
 * 
 * @param {number} x 
 * @returns {asserts x is Trit}
 */
function assertTrit(x) {
    if (x < 0 || x > 3 || !Number.isInteger(x)) {
        throw new Error(`Expected a trit, got ${x}!`);
    }
}

/**
 * @param {RuleBoxIndex} i
 */
function ruleBoxClicked(i) {
    const newState = (getStateFromRuleInput(i) + 1) % 3;
    assertTrit(newState);
    setRuleBox(i, newState);

    RULE.setByRuleBoxIndex(i, newState);
    const numericRule = RULE.getAsNumericRule();
    rule_input.value = numericRule.toString();
    resetIfNotPlaying();
}


/**
 * @param {number} i 
 * @returns {asserts i is RuleBoxIndex}
 */
function assertRuleBoxIndex(i) {
    if (i < 0 || i > NUM_RULE_CHECKBOXES || !Number.isInteger(i)) {
        throw new Error(`Expected an integer between 0 and ${NUM_RULE_CHECKBOXES}, got ${i}`);
    }
}

/** @param {RuleBoxIndex} i */
function getStateFromRuleInput(i) {
    return parseInt(RULE_INPUTS[i].dataset.state ?? "0");
}

/**
 * @param {RuleBoxIndex} i
 * @param {Trit} state
 */
function setRuleBox(i, state) {
    RULE_INPUTS[i].dataset.state = state.toString();
}

/**
 * @typedef {number & { __brand: "numericRule" }} NumericRule
 * @param {number} x 
 * @returns {NumericRule}
 */
function numericRule(x) {
    // @ts-ignore constructor method. There aren't actually any real requirements for
    // a numeric rule, other than it maybe being an integer
    // In principle I could bounds check this (between 0 and whatever the maximum unsigned 27-trit
    // value is but I don't really care enough to do that)
    return x;
}
//#endregion

//#region Controls - Color Picker
/**
 * @param {number} lightness_min
 * @param {number} lightness_max
 */
function getRandomColor(lightness_min, lightness_max) {
    const lightness = randomRange(lightness_min, lightness_max);
    const a = randomRange(-0.4, 0.4);
    const b = randomRange(-0.4, 0.4);
    const [red, green, blue] = oklab(lightness, a, b);
    return toHexColorCode(red, green, blue);
}

function randomizeAllColors() {
    randomizeColorPicker(0);
    randomizeColorPicker(1);
    randomizeColorPicker(2);
    render();
}

/**
 * @param {Trit} state
 */
function randomizeColorPicker(state) {
    const color = getRandomColorForState(state);
    const color_picker = getColorPicker(state);
    color_picker.value = color;
    setColorVar(state);

}

/**
 * @param {Trit} state
 */
function setColorVar(state) {
    const color_picker = getColorPicker(state);
    const color = color_picker.value;
    document.documentElement.style.setProperty(`--state-${state}-color`, color);
}

/**
 * @param {Trit} state
 * @returns {string}
 */
function getRandomColorForState(state) {
    if (state == 0) {
        return getRandomColor(0.0, 0.5);
    } else if (state == 1) {
        return getRandomColor(0.5, 1.0);
    } else if (state == 2) {
        return getRandomColor(0.5, 1.0);
    } else {
        throw new Error("unreachable");
    }
}

/**
 * @param {Trit} state
 * @returns {HTMLInputElement}
 */
function getColorPicker(state) {
    if (state == 0) {
        return color_state_0_input;
    } else if (state == 1) {
        return color_state_1_input;
    } else if (state == 2) {
        return color_state_2_input;
    } else {
        throw new Error("unreachable");
    }
}
//#endregion

//#region Controls & Event Handlers
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


function setSpeedLabel() {
    const speedLabel = getTypedElementById("speed-label", HTMLSpanElement);
    const rowsPerSecond = getRowsPerSecond();
    speedLabel.textContent = `${rowsPerSecond.toFixed(0)}`
}

function setRandomnessLabel() {
    const randomnessLabel = getTypedElementById("randomness-label", HTMLSpanElement);
    const randomness = getRandomnessAmount() * 100;
    const label = randomness < 10 ? randomness.toFixed(1) : randomness.toFixed(0);
    randomnessLabel.textContent = `${label}%`
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
 * @typedef { "state_0" | "state_1" | "state_2" | "replace" | "cycle" } RandomnessType
 * @returns {RandomnessType}
 */
function getRandomnessType() {
    const randomnessType = randomness_type_dropdown.value;
    if (randomnessType == "state_0" ||
        randomnessType == "state_1" ||
        randomnessType == "state_2" ||
        randomnessType == "replace" ||
        randomnessType == "cycle") {
        return randomnessType;
    }
    throw new Error("unreachable");
}


function getSeed() {
    return parseInt(randomness_seed_input.value)
}

async function copyCanvasToClipboard() {
    canvas.toBlob(async (blob) => {
        if (!blob) {
            throw new Error("Could not convert canvas to blob?");
        }

        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
    }, 'image/png');
    copied_to_clipboard_message.classList.remove("animate-fade");
    void copied_to_clipboard_message.offsetWidth; // Required to make the animation actually trigger
    copied_to_clipboard_message.classList.add("animate-fade");
}
//#endregion

//#region Controls - Keyboard & History

/**
 * @param {KeyboardEvent} event
 */
function handleKeyPress(event) {
    if (event.code == "Space") {
        event.preventDefault();
        toggleAnimating();
    } else if (event.code == "ArrowLeft") {
        event.preventDefault();
        if (HISTORY_CURSOR > 0) {
            HISTORY_CURSOR -= 1;
            const newLocal = HISTORY[HISTORY_CURSOR];
            setRule(newLocal);
        }
    } else if (event.code == "ArrowRight") {
        event.preventDefault();
        if (HISTORY_CURSOR < HISTORY.length - 1) {
            HISTORY_CURSOR += 1;
            const newLocal_1 = HISTORY[HISTORY_CURSOR];
            setRule(newLocal_1);
        }
    }
}

/**
 * @param {Rule} newRule
 */
function addToHistory(newRule) {
    HISTORY.push(newRule);
    if (HISTORY.length > MAX_HISTORY) {
        HISTORY.splice(0, 1);
    }
    HISTORY_CURSOR = HISTORY.length - 1;
}

//#endregion

//#region Setup

// Window
window.addEventListener('keydown', (event) => handleKeyPress(event))

// Canvas
const canvas = getElementAndSetListeners('canvas', HTMLCanvasElement, copyCanvasToClipboard);
const CTX = unwrap(canvas.getContext("2d"));
CTX.imageSmoothingEnabled = false;

const copied_to_clipboard_message = getTypedElementById('copied-to-clipboard-message', HTMLParagraphElement);

// Animation Options
const play_button = getElementAndSetListeners('play', HTMLButtonElement, toggleAnimating);
const _reset_button = getElementAndSetListeners('reset', HTMLButtonElement, resetCanvas);
const speed_input = getElementAndSetListeners('speed', HTMLInputElement, setSpeedLabel);

// Randomization Options
const randomness_input = getElementAndSetListeners('randomness-amount', HTMLInputElement, setRandomnessLabel);
const randomize_if_boring_input = getTypedElementById('randomize-if-boring', HTMLInputElement);
const randomness_type_dropdown = getElementAndSetListeners('randomness-type', HTMLSelectElement);
const randomness_seed_input = getElementAndSetListeners('randomness-seed', HTMLInputElement, resetIfNotPlaying);

// Rule Options
const rule_input = getElementAndSetListeners('rule', HTMLInputElement, ruleTextboxChanged, resetIfNotPlaying);
const rule_diagram_template = getTypedElementById('rule-diagram', HTMLTemplateElement);
const boundary_dropdown = getElementAndSetListeners('boundary', HTMLSelectElement, resetIfNotPlaying);
const initial_dropdown = getElementAndSetListeners('initial', HTMLSelectElement, resetCanvas);

const auto_mutate_rate_input = getTypedElementById('auto-mutate-rate', HTMLInputElement);
const mutate_amount_input = getTypedElementById('mutate-amount', HTMLInputElement);

// Rule Options - Randomizations
const randomize_colors_also_input = getTypedElementById('randomize-colors-also', HTMLInputElement);

const _inject_randomness_button = getElementAndSetListeners('inject-randomness', HTMLButtonElement, () => RANDOMIZE_ROW = true);
const _randomize_rule_button = getElementAndSetListeners('randomize-rule', HTMLButtonElement, randomizeRule);
const _mutate_rule_button = getElementAndSetListeners('mutate-rule', HTMLButtonElement, mutateRule);
const _flip_rule_button = getElementAndSetListeners('flip-rule', HTMLButtonElement, flipRule);
const _completement_rule_button = getElementAndSetListeners('complement-rule', HTMLButtonElement, complementRule);
const _cycle_rule_button = getElementAndSetListeners('cycle-rule', HTMLButtonElement, cycleRule);

// Canvas Options - Canvas Size
const internal_width_input = getElementAndSetListeners('internal-width', HTMLInputElement, applyControls);
const internal_height_input = getElementAndSetListeners('internal-height', HTMLInputElement, applyControls, setSpeedLabel);
const lock_internal_size_input = getElementAndSetListeners('lock-internal-size', HTMLInputElement, applyControls, setSpeedLabel);
const external_width_input = getElementAndSetListeners('external-width', HTMLInputElement, applyControls);
const external_height_input = getElementAndSetListeners('external-height', HTMLInputElement, applyControls);
const lock_aspect_ratio_input = getElementAndSetListeners('lock-aspect-ratio', HTMLInputElement, applyControls);

// Canvas Options - Randomize Colors
const _randomize_both_colors_button = getElementAndSetListeners('randomize-all-colors', HTMLButtonElement, () => { randomizeAllColors(); render(); });
const _randomize_state_0_color_button = getElementAndSetListeners('randomize-color-state-0', HTMLButtonElement, () => { randomizeColorPicker(0); render(); });
const _randomize_state_1_color_button = getElementAndSetListeners('randomize-color-state-1', HTMLButtonElement, () => { randomizeColorPicker(1); render(); });
const _randomize_state_2_color_button = getElementAndSetListeners('randomize-color-state-2', HTMLButtonElement, () => { randomizeColorPicker(2); render(); });

// Canvas Options - Colorpickers
const color_state_0_input = getElementAndSetListeners('color-state-0', HTMLInputElement, () => { setColorVar(0); render(); });
const color_state_1_input = getElementAndSetListeners('color-state-1', HTMLInputElement, () => { setColorVar(1); render(); });
const color_state_2_input = getElementAndSetListeners('color-state-2', HTMLInputElement, () => { setColorVar(2); render(); });


const NUM_RULE_CHECKBOXES = 27;

/** @type {HTMLElement[]} */
const RULE_INPUTS = createRuleDiagrams();

/** @type {Board} */
const BOARD = new Board(CTX.canvas.width, CTX.canvas.height);

/** @type {Rule} */
let RULE = getRuleFromControls();

const MAX_HISTORY = 100;
/** @type {Rule[]} */
const HISTORY = [RULE];
let HISTORY_CURSOR = 0;

let ANIMATING = false;
// Note: In miliseconds
/** @type {number | null} */
let LAST_FRAME = null;
let RANDOMIZE_ROW = false;
let NEEDS_RESET = true;
let LAST_MUTATE = 0;
let TOTAL_ROWS = 0;

resetCanvas();
applyControls();
setSpeedLabel();
setRandomnessLabel();
setColorVar(0);
setColorVar(1);
setColorVar(2);
ruleTextboxChanged();
render();
//#endregion