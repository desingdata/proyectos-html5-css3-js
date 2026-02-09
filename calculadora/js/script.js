// Clase base para la calculadora estándar y científica
class Calculator {
     constructor(previousOperandTextElement, currentOperandTextElement) {
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.clear();
    }

    // Clears all values from the calculator
    clear() {
        this.currentOperand = '';
        this.previousOperand = '';
        this.operation = undefined;
    }
    // Deletes the last digit from the current operand
    delete() {
        this.currentOperand = this.currentOperand.toString().slice(0, -1);
    }

    // Appends a number or decimal point to the current operand
    appendNumber(number) {
        // Prevents adding multiple decimal points
        if (number === '.' && this.currentOperand.includes('.')) return;
        this.currentOperand = this.currentOperand.toString() + number.toString();
    }

    // Selects an operation (+, -, *, ÷, x^y)
    chooseOperation(operation) {
        // If the current operand is empty, do nothing
        if (this.currentOperand === '') return;
        // If there's already a previous operand, compute the result before the new operation
        if (this.previousOperand !== '') {
            this.compute();
        }
        this.operation = operation;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '';
    }

    // Performs the calculation based on the selected operation (for binary operations)
    compute() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);
        // If numbers are not valid, do nothing
        if (isNaN(prev) || isNaN(current)) return;

        switch (this.operation) {
            case '+':
                computation = prev + current;
                break;
            case '-':
                computation = prev - current;
                break;
            case '*':
                computation = prev * current;
                break;
            case '÷':
                // Handles division by zero
                if (current === 0) {
                    computation = 'Error: Div / 0';
                } else {
                    computation = prev / current;
                }
                break;
            case 'x^y': // Power for scientific calculator
                computation = Math.pow(prev, current);
                break;
            default:
                return;
        }
        this.currentOperand = computation;
        this.operation = undefined;
        this.previousOperand = '';
    }

    // Performs scientific functions that operate on a single operand (unary operations)
    computeScientific(func) {
        let num = parseFloat(this.currentOperand);
        // For PI and E, no numeric input is required
        if (isNaN(num) && func !== 'pi' && func !== 'e') return;

        let result;
        switch (func) {
            case 'sqrt':
                if (num < 0) {
                    result = 'Error: √ Negativo';
                } else {
                    result = Math.sqrt(num);
                }
                break;
            case 'sin':
                result = Math.sin(num * (Math.PI / 180)); // Convert degrees to radians for trigonometric functions
                break;
            case 'cos':
                result = Math.cos(num * (Math.PI / 180));
                break;
            case 'tan':
                result = Math.tan(num * (Math.PI / 180));
                break;
            case 'log': // Log base 10
                if (num <= 0) {
                    result = 'Error: log(Neg)';
                } else {
                    result = Math.log10(num);
                }
                break;
            case 'ln': // Natural logarithm
                if (num <= 0) {
                    result = 'Error: ln(Neg)';
                } else {
                    result = Math.log(num);
                }
                break;
            case 'pi':
                result = Math.PI;
                break;
            case 'e':
                result = Math.E;
                break;
            case 'factorial':
                if (num < 0 || !Number.isInteger(num)) {
                    result = 'Error: x!';
                } else if (num === 0) {
                    result = 1;
                } else {
                    let fact = 1;
                    for (let i = 2; i <= num; i++) {
                        fact *= i;
                    }
                    result = fact;
                }
                break;
            default:
                return;
        }
        this.currentOperand = result;
        this.updateDisplay();
    }

    // Formats the number for display with commas and appropriate precision
    getDisplayNumber(number) {
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber.split('.')[0]);
        const decimalDigits = stringNumber.split('.')[1];
        let integerDisplay;
        if (isNaN(integerDigits)) {
            integerDisplay = '';
        } else {
            integerDisplay = new Intl.NumberFormat('es-ES').format(integerDigits);
        }
        if (decimalDigits != null) {
            return `${integerDisplay}.${decimalDigits}`;
        } else {
            return integerDisplay;
        }
    }

    // Updates the calculator display
    updateDisplay() {
        this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
        if (this.operation != null) {
            this.previousOperandTextElement.innerText = `${this.getDisplayNumber(this.previousOperand)} ${this.operation}`;
        } else {
            this.previousOperandTextElement.innerText = '';
        }
    }
}
// --------------------------------------------------------------------
// Lógica de Modos (Tabs) y Navegación
// --------------------------------------------------------------------
const tabButtons = document.querySelectorAll('[data-tab-target]');
const contentSections = document.querySelectorAll('.content-section');
const hamburgerMenu = document.getElementById('hamburger-menu');
const navbarLinks = document.getElementById('navbar-links');

// Function to switch tabs
function activateTab(targetId) {
    // Deactivate all tabs and content sections
    tabButtons.forEach(btn => btn.classList.remove('active'));
    contentSections.forEach(section => section.classList.remove('active'));

    // Activate the corresponding tab and content section
    document.querySelector(`.navbar-links button[data-tab-target="${targetId}"]`).classList.add('active');
    document.getElementById(targetId).classList.add('active');

    // If standard or scientific calculator is activated, clear their displays
    if (targetId === 'standard') {
        calculatorStandard.clear();
        calculatorStandard.updateDisplay();
    } else if (targetId === 'scientific') {
        calculatorScientific.clear();
        calculatorScientific.updateDisplay();
    }
    // Hide the hamburger menu if it's open
    if (navbarLinks.classList.contains('active')) {
        navbarLinks.classList.remove('active');
        hamburgerMenu.classList.remove('active');
    }
}

// Event listener for tab buttons
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        activateTab(button.dataset.tabTarget);
    });
});

// Event listener for hamburger menu
hamburgerMenu.addEventListener('click', () => {
    navbarLinks.classList.toggle('active');
    hamburgerMenu.classList.toggle('active');
});
// --------------------------------------------------------------------
// Calculadora Estándar
// --------------------------------------------------------------------
const numberButtonsStandard = document.querySelectorAll('#standard [data-number]');
const operationButtonsStandard = document.querySelectorAll('#standard [data-operation]');
const equalsButtonStandard = document.querySelector('#standard [data-equals]');
const deleteButtonStandard = document.querySelector('#standard [data-delete]');
const allClearButtonStandard = document.querySelector('#standard [data-all-clear]');
const previousOperandTextElementStandard = document.querySelector('[data-previous-operand]');
const currentOperandTextElementStandard = document.querySelector('[data-current-operand]');

const calculatorStandard = new Calculator(previousOperandTextElementStandard, currentOperandTextElementStandard);

numberButtonsStandard.forEach(button => {
    button.addEventListener('click', () => {
        calculatorStandard.appendNumber(button.innerText);
        calculatorStandard.updateDisplay();
    });
});
operationButtonsStandard.forEach(button => {
    button.addEventListener('click', () => {
        calculatorStandard.chooseOperation(button.innerText);
        calculatorStandard.updateDisplay();
    });
});
equalsButtonStandard.addEventListener('click', () => {
    calculatorStandard.compute();
    calculatorStandard.updateDisplay();
});
allClearButtonStandard.addEventListener('click', () => {
    calculatorStandard.clear();
    calculatorStandard.updateDisplay();
});
deleteButtonStandard.addEventListener('click', () => {
    calculatorStandard.delete();
    calculatorStandard.updateDisplay();
});
// --------------------------------------------------------------------
// Calculadora Científica
// --------------------------------------------------------------------
const numberButtonsScientific = document.querySelectorAll('#scientific [data-number-scientific]');
// This selector now correctly includes the x^y button due to the HTML change
const operationButtonsScientific = document.querySelectorAll('#scientific [data-operation-scientific]');
const equalsButtonScientific = document.querySelector('#scientific [data-equals-scientific]');
const deleteButtonScientific = document.querySelector('#scientific [data-delete-scientific]');
const allClearButtonScientific = document.querySelector('#scientific [data-all-clear-scientific]');
// Unary scientific functions
const scientificFuncButtons = document.querySelectorAll('#scientific [data-scientific-func]');
const previousOperandTextElementScientific = document.querySelector('[data-previous-operand-scientific]');
const currentOperandTextElementScientific = document.querySelector('[data-current-operand-scientific]');

const calculatorScientific = new Calculator(previousOperandTextElementScientific, currentOperandTextElementScientific);

numberButtonsScientific.forEach(button => {
    button.addEventListener('click', () => {
        calculatorScientific.appendNumber(button.innerText);
        calculatorScientific.updateDisplay();
    });
});
operationButtonsScientific.forEach(button => {
    button.addEventListener('click', () => {
        // These are binary operations including x^y
        calculatorScientific.chooseOperation(button.innerText);
        calculatorScientific.updateDisplay();
    });
});
equalsButtonScientific.addEventListener('click', () => {
    calculatorScientific.compute();
    calculatorScientific.updateDisplay();
});
allClearButtonScientific.addEventListener('click', () => {
    calculatorScientific.clear();
    calculatorScientific.updateDisplay();
});
deleteButtonScientific.addEventListener('click', () => {
    calculatorScientific.delete();
    calculatorScientific.updateDisplay();
});
scientificFuncButtons.forEach(button => {
    button.addEventListener('click', () => {
        // These are unary scientific functions
        const func = button.dataset.scientificFunc;
        console.log(`Scientific function triggered: ${func} with current operand: ${calculatorScientific.currentOperand}`); // Added log for debugging
        calculatorScientific.computeScientific(func);
    });
});
// --------------------------------------------------------------------
// Calculadora Programador
// --------------------------------------------------------------------
const progInput = document.getElementById('prog-input');
const progBaseSelect = document.getElementById('prog-base');
const progDec = document.getElementById('prog-dec');
const progBin = document.getElementById('prog-bin');
const progOct = document.getElementById('prog-oct');
const progHex = document.getElementById('prog-hex');
const progClear = document.getElementById('prog-clear');
const progNot = document.getElementById('prog-not');
const progAnd = document.getElementById('prog-and');
const progOr = document.getElementById('prog-or');
const progXor = document.getElementById('prog-xor');
const progLShift = document.getElementById('prog-lshift');
const progRShift = document.getElementById('prog-rshift');
const progEq = document.getElementById('prog-eq');

let progCurrentValue = 0;
let progOperator = null;
let progOperand = null;

function updateProgrammerDisplay(value) {
    progDec.innerText = value.toString(10);
    progBin.innerText = value.toString(2);
    progOct.innerText = value.toString(8);
    progHex.innerText = value.toString(16).toUpperCase();
}

function convertFromBase(value, base) {
    try {
        if (base === '16') {
            return parseInt(value, 16);
        }
        return parseInt(value, parseInt(base));
    } catch (e) {
        return NaN;
    }
}

progInput.addEventListener('input', () => {
    const base = progBaseSelect.value;
    const inputValue = progInput.value;
    let decValue = convertFromBase(inputValue, base);

    if (!isNaN(decValue)) {
        progCurrentValue = decValue;
        updateProgrammerDisplay(progCurrentValue);
    } else {
        progDec.innerText = 'Inválido';
        progBin.innerText = 'Inválido';
        progOct.innerText = 'Inválido';
        progHex.innerText = 'Inválido';
    }
});

progBaseSelect.addEventListener('change', () => {
    const base = progBaseSelect.value;
    if (!isNaN(progCurrentValue)) {
        if (base === '10') progInput.value = progCurrentValue.toString(10);
        else if (base === '2') progInput.value = progCurrentValue.toString(2);
        else if (base === '8') progInput.value = progCurrentValue.toString(8);
        else if (base === '16') progInput.value = progCurrentValue.toString(16).toUpperCase();
    } else {
        progInput.value = '';
    }
    updateProgrammerDisplay(progCurrentValue);
});

progClear.addEventListener('click', () => {
    progCurrentValue = 0;
    progInput.value = '';
    progOperator = null;
    progOperand = null;
    updateProgrammerDisplay(progCurrentValue);
});

function handleProgOperation(op) {
    const inputValue = parseInt(progInput.value, parseInt(progBaseSelect.value));
    if (isNaN(inputValue)) return;

    if (progOperand === null) {
        progOperand = inputValue;
    } else {
        if (progOperator) {
            computeProgResult();
            progOperand = progCurrentValue;
        }
    }
    progOperator = op;
    progInput.value = '';
}

function computeProgResult() {
    let num1 = progOperand;
    let num2 = parseInt(progInput.value, parseInt(progBaseSelect.value));

    if (isNaN(num1) && progOperator !== 'NOT') {
        progCurrentValue = 0;
        updateProgrammerDisplay(progCurrentValue);
        return;
    }
    if (isNaN(num2) && progOperator !== 'NOT') return;

    let result;
    switch (progOperator) {
        case 'AND':
            result = num1 & num2;
            break;
        case 'OR':
            result = num1 | num2;
            break;
        case 'XOR':
            result = num1 ^ num2;
            break;
        case 'NOT':
            result = ~num1;
            break;
        case 'LSH':
            result = num1 << num2;
            break;
        case 'RSH':
            result = num1 >> num2;
            break;
        default:
            return;
    }
    progCurrentValue = result;
    updateProgrammerDisplay(progCurrentValue);
    progInput.value = progCurrentValue.toString(parseInt(progBaseSelect.value));
    progOperand = null;
    progOperator = null;
}

progNot.addEventListener('click', () => {
    let val = parseInt(progInput.value, parseInt(progBaseSelect.value));
    if (isNaN(val)) val = progCurrentValue;
    progCurrentValue = ~val;
    updateProgrammerDisplay(progCurrentValue);
    progInput.value = progCurrentValue.toString(parseInt(progBaseSelect.value));
    progOperand = null;
    progOperator = null;
});
progAnd.addEventListener('click', () => handleProgOperation('AND'));
progOr.addEventListener('click', () => handleProgOperation('OR'));
progXor.addEventListener('click', () => handleProgOperation('XOR'));
progLShift.addEventListener('click', () => handleProgOperation('LSH'));
progRShift.addEventListener('click', () => handleProgOperation('RSH'));
progEq.addEventListener('click', computeProgResult);

// Initialize programmer display
updateProgrammerDisplay(0);
// --------------------------------------------------------------------
// Date Calculation
// --------------------------------------------------------------------
const date1Input = document.getElementById('date1');
const date2Input = document.getElementById('date2');
const calculateDiffButton = document.getElementById('calculate-diff');
const dateDiffResult = document.getElementById('date-diff-result');

const baseDateInput = document.getElementById('base-date');
const daysInput = document.getElementById('days-input');
const dateUnitSelect = document.getElementById('date-unit-select');
const addDaysButton = document.getElementById('add-days');
const subtractDaysButton = document.getElementById('subtract-days');
const dateAddSubtractResult = document.getElementById('date-add-subtract-result');

function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

calculateDiffButton.addEventListener('click', () => {
    const date1 = new Date(date1Input.value);
    const date2 = new Date(date2Input.value);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
        dateDiffResult.innerText = 'Por favor, introduce dos fechas válidas.';
        return;
    }

    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    dateDiffResult.innerText = `Diferencia: ${diffDays} días`;
});

function adjustDate(operation) {
    const baseDate = new Date(baseDateInput.value);
    const value = parseInt(daysInput.value);
    const unit = dateUnitSelect.value;

    if (isNaN(baseDate.getTime()) || isNaN(value)) {
        dateAddSubtractResult.innerText = 'Por favor, introduce una fecha y un valor válidos.';
        return;
    }

    let newDate = new Date(baseDate);

    if (unit === 'days') {
        newDate.setDate(baseDate.getDate() + (operation === 'add' ? value : -value));
    } else if (unit === 'months') {
        newDate.setMonth(baseDate.getMonth() + (operation === 'add' ? value : -value));
    } else if (unit === 'years') {
        newDate.setFullYear(baseDate.getFullYear() + (operation === 'add' ? value : -value));
    }

    dateAddSubtractResult.innerText = `Nueva Fecha: ${formatDate(newDate)}`;
}

addDaysButton.addEventListener('click', () => adjustDate('add'));
subtractDaysButton.addEventListener('click', () => adjustDate('subtract'));
// --------------------------------------------------------------------
// Unit Converter
// --------------------------------------------------------------------
const converterTypeSelect = document.getElementById('converter-type-select');
const inputValue = document.getElementById('input-value');
const fromUnitSelect = document.getElementById('from-unit-select');
const toUnitSelect = document.getElementById('to-unit-select');
const outputValue = document.getElementById('output-value');
const convertButton = document.getElementById('convert-button');
const conversionResultBox = document.getElementById('conversion-result-box');

const units = {
    currency: {
        label: 'Divisa',
        rates: {
            'USD - Dólar Estadounidense': 1,
            'EUR - Euro': 0.92,
            'GBP - Libra Esterlina': 0.79,
            'JPY - Yen Japonés': 156.90,
            'COP - Peso Colombiano': 4100,
        }
    },
    volume: {
        label: 'Volumen',
        units: {
            'Litros (L)': 1,
            'Militros (mL)': 1000,
            'Metros Cúbicos (m³)': 0.001,
            'Galones (US fl)': 0.264172,
            'Pintas (US fl)': 2.11338,
            'Onzas líquidas (US fl)': 33.814,
        }
    },
    length: {
        label: 'Longitud',
        units: {
            'Metros (m)': 1,
            'Kilómetros (km)': 0.001,
            'Centímetros (cm)': 100,
            'Milímetros (mm)': 1000,
            'Millas (mi)': 0.000621371,
            'Yardas (yd)': 1.09361,
            'Pies (ft)': 3.28084,
            'Pulgadas (in)': 39.3701,
        }
    },
    weight: {
        label: 'Peso y Masa',
        units: {
            'Kilogramos (kg)': 1,
            'Gramos (g)': 1000,
            'Libras (lb)': 2.20462,
            'Onzas (oz)': 35.274,
            'Toneladas métricas (t)': 0.001,
        }
    },
    temperature: {
        label: 'Temperatura',
        units: {
            'Celsius (°C)': { toKelvin: (c) => c + 273.15, fromKelvin: (k) => k - 273.15 },
            'Fahrenheit (°F)': { toKelvin: (f) => (f - 32) * 5 / 9 + 273.15, fromKelvin: (k) => (k - 273.15) * 9 / 5 + 32 },
            'Kelvin (K)': { toKelvin: (k) => k, fromKelvin: (k) => k },
        },
        convert: (value, from, to) => {
            if (from === to) return value;
            const valInKelvin = units.temperature.units[from].toKelvin(value);
            return units.temperature.units[to].fromKelvin(valInKelvin);
        }
    },
    energy: {
        label: 'Energía',
        units: {
            'Julios (J)': 1,
            'Kilojulios (kJ)': 0.001,
            'Calorías (cal)': 0.239006,
            'Kilocalorías (kcal)': 0.000239006,
            'Vatios-hora (Wh)': 0.000277778,
            'Kilovatios-hora (kWh)': 0.000000277778,
        }
    },
    area: {
        label: 'Área',
        units: {
            'Metros Cuadrados (m²)': 1,
            'Kilómetros Cuadrados (km²)': 0.000001,
            'Hectáreas (ha)': 0.0001,
            'Acres (ac)': 0.000247105,
            'Pies Cuadrados (ft²)': 10.7639,
            'Pulgadas Cuadradas (in²)': 1550,
        }
    },
    speed: {
        label: 'Velocidad',
        units: {
            'Metros por segundo (m/s)': 1,
            'Kilómetros por hora (km/h)': 3.6,
            'Millas por hora (mph)': 2.23694,
            'Nudos (kn)': 1.94384,
        }
    },
    time: {
        label: 'Tiempo',
        units: {
            'Segundos (s)': 1,
            'Minutos (min)': 1 / 60,
            'Horas (hr)': 1 / 3600,
            'Días (day)': 1 / 86400,
            'Semanas (week)': 1 / 604800,
            'Años (year)': 1 / 31536000,
        }
    },
    power: {
        label: 'Potencia',
        units: {
            'Vatios (W)': 1,
            'Kilovatios (kW)': 0.001,
            'Caballos de fuerza (hp)': 0.00134102,
            'Julios por segundo (J/s)': 1,
            'Calorías por segundo (cal/s)': 0.239006,
        }
    },
    data: {
        label: 'Datos',
        units: {
            'Bits (bit)': 1,
            'Bytes (B)': 1 / 8,
            'Kilobytes (KB)': 1 / 8000,
            'Megabytes (MB)': 1 / 8000000,
            'Gigabytes (GB)': 1 / 8000000000,
            'Terabytes (TB)': 1 / 8000000000000,
            'Kibibytes (KiB)': 1 / 8192,
            'Mebibytes (MiB)': 1 / 8388608,
            'Gibibytes (GiB)': 1 / 8589934592,
            'Tebibytes (TiB)': 1 / 8796093022208,
        }
    },
    pressure: {
        label: 'Presión',
        units: {
            'Pascales (Pa)': 1,
            'Kilopascales (kPa)': 0.001,
            'Bares (bar)': 0.00001,
            'Atmósferas (atm)': 0.00000986923,
            'Libras por pulgada cuadrada (psi)': 0.000145038,
        }
    },
    angle: {
        label: 'Ángulos',
        units: {
            'Grados (°)': 1,
            'Radianes (rad)': Math.PI / 180,
            'Gradianes (gon)': 0.9,
        },
        convert: (value, from, to) => {
            if (from === to) return value;
            let valInDegrees;
            if (from === 'Grados (°)') valInDegrees = value;
            else if (from === 'Radianes (rad)') valInDegrees = value * (180 / Math.PI);
            else if (from === 'Gradianes (gon)') valInDegrees = value * (9 / 10);

            if (to === 'Grados (°)') return valInDegrees;
            else if (to === 'Radianes (rad)') return valInDegrees * (Math.PI / 180);
            else if (to === 'Gradianes (gon)') return valInDegrees * (10 / 9);
        }
    }
};

function populateUnitSelects(converterType) {
    fromUnitSelect.innerHTML = '';
    toUnitSelect.innerHTML = '';

    const converterData = units[converterType];

    if (converterType === 'currency') {
        for (const unit in converterData.rates) {
            const option1 = document.createElement('option');
            option1.value = unit;
            option1.innerText = unit;
            fromUnitSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = unit;
            option2.innerText = unit;
            toUnitSelect.appendChild(option2);
        }
    } else {
        for (const unit in converterData.units) {
            const option1 = document.createElement('option');
            option1.value = unit;
            option1.innerText = unit;
            fromUnitSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = unit;
            option2.innerText = unit;
            toUnitSelect.appendChild(option2);
        }
    }
}

converterTypeSelect.addEventListener('change', () => {
    populateUnitSelects(converterTypeSelect.value);
    inputValue.value = ''; // Clear input on type change
    outputValue.value = '';
    conversionResultBox.innerText = '';
});

convertButton.addEventListener('click', () => {
    const type = converterTypeSelect.value;
    const value = parseFloat(inputValue.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    if (isNaN(value)) {
        outputValue.value = 'Valor inválido';
        conversionResultBox.innerText = 'Por favor, introduce un número válido.';
        return;
    }

    let result;
    if (type === 'currency') {
        const fromRate = units.currency.rates[fromUnit];
        const toRate = units.currency.rates[toUnit];
        if (!fromRate || !toRate) {
            result = 'Error de tasa';
        } else {
            result = (value / fromRate) * toRate;
        }
    } else if (type === 'temperature' || type === 'angle') {
        result = units[type].convert(value, fromUnit, toUnit);
    } else {
        const fromFactor = units[type].units[fromUnit];
        const toFactor = units[type].units[toUnit];
        if (!fromFactor || !toFactor) {
            result = 'Error de unidad';
        } else {
            result = (value / fromFactor) * toFactor;
        }
    }

    if (typeof result === 'number' && !isNaN(result)) {
        outputValue.value = result.toFixed(6);
        conversionResultBox.innerText = `${value} ${fromUnit} es igual a ${result.toFixed(6)} ${toUnit}`;
    } else {
        outputValue.value = result.toString();
        conversionResultBox.innerText = `Error en la conversión: ${result}`;
    }
});

// Initialize converter with currency type on load
populateUnitSelects('currency');

// Optional: Keyboard support (for active calculator)
document.addEventListener('keydown', e => {
    const activeCalculator = document.querySelector('.content-section.active .calculator-grid');
    if (!activeCalculator) return;

    if (activeCalculator.parentElement.id === 'standard' || activeCalculator.parentElement.id === 'scientific') {
        const currentCalculator = activeCalculator.parentElement.id === 'standard' ? calculatorStandard : calculatorScientific;

        if (e.key >= '0' && e.key <= '9' || e.key === '.') {
            currentCalculator.appendNumber(e.key);
            currentCalculator.updateDisplay();
        } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            const operationKey = e.key === '/' ? '÷' : e.key;
            currentCalculator.chooseOperation(operationKey);
            currentCalculator.updateDisplay();
        } else if (e.key === 'Enter' || e.key === '=') {
            e.preventDefault();
            currentCalculator.compute();
            currentCalculator.updateDisplay();
        } else if (e.key === 'Backspace') {
            currentCalculator.delete();
            currentCalculator.updateDisplay();
        } else if (e.key === 'Escape') {
            currentCalculator.clear();
            currentCalculator.updateDisplay();
        }
    }
});