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
 * Represents an infinitely long row of cells. Each cell can be set to true or false.
 * Cells all initially are set to false and can be set or get even if if prior cells are not set
 * Note that this allows for both positive and negative indicies. Hence, one can have say, cells
 * -3, -1, 2, and 400 all set to true and the rest set to false.
 */
class Row {

    constructor() {
        /** @type {boolean[]} */
        this.left = [];
        this.center = false;
        /** @type {boolean[]} */
        this.right = [];
    }

    /**
     * @param {boolean[]} left
     * @param {boolean} center
     * @param {boolean[]} right
     * @returns {Row}
     */
    static create(left, center, right) {
        const row = new Row();
        row.left = structuredClone(left);
        row.center = center;
        row.right = structuredClone(right);
        return row;
    }

    clone() {
        return Row.create(this.left, this.center, this.right);
    }

    get min_index() {
        return -this.left.length;
    }

    get max_index() {
        return this.right.length;
    }

    get length() {
        // Add 1 due to the center cell
        return 1 + this.left.length + this.right.length;
    }

    /**
     * 
     * @param {number} index Index of the cell to get. This can be negative
     * @returns {boolean} The value of the cell. If the cell has never been set before, then this is false
     */
    get(index) {
        if (index == 0) {
            return this.center;
        } else if (index > 0) {
            const i = index - 1;
            return i < this.right.length ? this.right[i] : false;
        } else {
            const i = -index - 1;
            return i < this.left.length ? this.left[i] : false;
        }
    }

    /**
     * Sets the cell at `index` to `value`.
     * @param {number} index Index of the cell to set. This can be negative
     * @param {boolean} value Value to set the cell to
     */
    set(index, value) {
        if (index == 0) {
            this.center = value;
        } else if (index > 0) {
            const i = index - 1;
            extendToMatchIndex(this.right, i);
            this.right[i] = value;
        } else {
            const i = -index - 1;
            extendToMatchIndex(this.left, i);
            this.left[i] = value;
        }

        /**
         * @param {boolean[]} array
         * @param {number} newIndex
         */
        function extendToMatchIndex(array, newIndex) {
            if (newIndex >= array.length) {
                // Add one because newIndex is an index
                // eg: If we want to extend so that array[4] is present, and array is currently
                // 2 elements long (so array[0] and array[1] exist), then we need to add 3 elements
                // (adding array[2], array[3], and array[4])
                const amountToExtend = newIndex - array.length + 1;
                /** @type {boolean[]} */
                const values = Array(amountToExtend).fill(false);
                array.push(...values);
            }
        }
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
 * Apply Rule to the Row and returns the new Row. The returned Row is a copy of the input
 * Row but with Rule applied.
 * @param {Row} row 
 * @param {Rule} rule 
 * @returns {Row}
 */
function apply_rule(row, rule) {
    const new_row = row.clone();

    const min = row.min_index - 1;
    const max = row.max_index + 1;
    for (let i = min; i <= max; i++) {
        const left = row.get(i - 1);
        const mid = row.get(i);
        const right = row.get(i + 1);

        const cell = rule(left, mid, right);
        new_row.set(i, cell);
    }
    return new_row;
}


/**
 * @param {number} num_rows
 * @param {Rule} rule
 * @returns {Row[]}
 */
function get_rows(num_rows, rule) {
    const init = new Row();
    init.set(0, true);

    const rows = [init];

    // Start at 1 since the initial row is already provided
    for (let i = 1; i < num_rows; i++) {
        const last_row = unwrap(rows.at(-1));
        const next_row = apply_rule(last_row, rule);
        rows.push(next_row);
    }

    return rows;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Row[]} rows
 * @param {number} x_scale
 * @param {number} y_scale
 */
function draw_rows(ctx, rows, x_scale, y_scale) {
    // Set background to black
    // We do this before the translation stuff to make this simple.
    ctx.reset();
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const half_width = ctx.canvas.width / 2;
    ctx.scale(x_scale, y_scale);
    // Translate the origin so that (0, 0) lies at the center-top of the screen
    ctx.translate(half_width / x_scale, 0);

    const height = rows.length;
    for (let y = 0; y < height; y++) {
        const row = rows[y];
        for (let x = row.min_index; x <= row.max_index; x++) {
            const cell = row.get(x);
            const color = cell ? "white" : "black";
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function render(ctx) {
    clampRowInput();

    const n = parseInt(rule_input.value);
    const rule = make_rule(n);

    const num_rows = parseInt(row_input.value);
    const x_scale = parseFloat(x_scale_input.value);
    const y_scale = parseFloat(y_scale_input.value);

    const rows = get_rows(num_rows, rule);
    draw_rows(ctx, rows, x_scale, y_scale);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function actualCanvasHeight(ctx) {
    const y_scale = parseFloat(y_scale_input.value);
    return Math.floor(ctx.canvas.height / y_scale);
}

function clampRowInput() {
    const actual_canvas_height = actualCanvasHeight(ctx);
    row_input.max = actual_canvas_height.toString();

    const num_rows = parseInt(row_input.value);
    if (num_rows > actual_canvas_height) {
        row_input.value = actual_canvas_height.toString();
    }
}

const canvas = getTypedElementById('canvas', HTMLCanvasElement);
const ctx = unwrap(canvas.getContext("2d"));

const rule_input = getTypedElementById('rule', HTMLInputElement);
const row_input = getTypedElementById('rows', HTMLInputElement);
const x_scale_input = getTypedElementById('x-scale', HTMLInputElement);
const y_scale_input = getTypedElementById('y-scale', HTMLInputElement);

rule_input.addEventListener("input", () => render(ctx));
x_scale_input.addEventListener("input", () => render(ctx));
y_scale_input.addEventListener("input", () => render(ctx));
row_input.addEventListener("input", () => render(ctx));

render(ctx);


