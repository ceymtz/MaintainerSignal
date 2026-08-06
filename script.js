const result = document.querySelector('#result');
const history = document.querySelector('#history');
const keys = document.querySelector('.keys');

let currentValue = '0';
let previousValue = null;
let selectedOperator = null;
let waitingForValue = false;
let shouldReset = false;

const operatorSymbols = {
  '+': '+',
  '-': '-',
  '*': '×',
  '/': '÷'
};

function updateDisplay() {
  result.textContent = currentValue;
  result.scrollLeft = result.scrollWidth;
}

function resetCalculator() {
  currentValue = '0';
  previousValue = null;
  selectedOperator = null;
  waitingForValue = false;
  shouldReset = false;
  history.textContent = '';
  updateDisplay();
}

function inputNumber(number) {
  if (currentValue === 'Error' || waitingForValue || shouldReset) {
    currentValue = number;
    waitingForValue = false;
    shouldReset = false;
  } else if (currentValue === '0') {
    currentValue = number;
  } else if (currentValue.replace('-', '').replace('.', '').length < 12) {
    currentValue += number;
  }

  updateDisplay();
}

function inputDecimal() {
  if (currentValue === 'Error' || waitingForValue || shouldReset) {
    currentValue = '0.';
    waitingForValue = false;
    shouldReset = false;
  } else if (!currentValue.includes('.')) {
    currentValue += '.';
  }

  updateDisplay();
}

function calculate(first, second, operator) {
  switch (operator) {
    case '+':
      return first + second;
    case '-':
      return first - second;
    case '*':
      return first * second;
    case '/':
      return second === 0 ? null : first / second;
    default:
      return second;
  }
}

function formatNumber(number) {
  if (!Number.isFinite(number)) return 'Error';

  const rounded = Number.parseFloat(number.toPrecision(12));
  return String(rounded);
}

function chooseOperator(operator) {
  if (currentValue === 'Error') {
    resetCalculator();
    return;
  }

  const inputValue = Number.parseFloat(currentValue);

  if (selectedOperator && !waitingForValue) {
    const calculatedValue = calculate(previousValue, inputValue, selectedOperator);

    if (calculatedValue === null) {
      currentValue = 'Error';
      previousValue = null;
      selectedOperator = null;
      history.textContent = 'No se puede dividir entre cero';
      updateDisplay();
      return;
    }

    currentValue = formatNumber(calculatedValue);
    previousValue = calculatedValue;
    updateDisplay();
  } else {
    previousValue = inputValue;
  }

  selectedOperator = operator;
  waitingForValue = true;
  shouldReset = false;
  history.textContent = `${currentValue} ${operatorSymbols[operator]}`;
}

function showResult() {
  if (!selectedOperator || waitingForValue || currentValue === 'Error') return;

  const secondValue = Number.parseFloat(currentValue);
  const expression = `${formatNumber(previousValue)} ${operatorSymbols[selectedOperator]} ${currentValue}`;
  const calculatedValue = calculate(previousValue, secondValue, selectedOperator);

  if (calculatedValue === null) {
    currentValue = 'Error';
    history.textContent = 'No se puede dividir entre cero';
  } else {
    currentValue = formatNumber(calculatedValue);
    history.textContent = `${expression} =`;
  }

  previousValue = null;
  selectedOperator = null;
  waitingForValue = false;
  shouldReset = true;
  updateDisplay();
}

function toggleSign() {
  if (currentValue === '0' || currentValue === 'Error') return;
  currentValue = currentValue.startsWith('-')
    ? currentValue.slice(1)
    : `-${currentValue}`;
  updateDisplay();
}

function convertToPercent() {
  if (currentValue === 'Error') return;
  currentValue = formatNumber(Number.parseFloat(currentValue) / 100);
  shouldReset = true;
  updateDisplay();
}

function handleAction(action) {
  if (action === 'clear') resetCalculator();
  if (action === 'decimal') inputDecimal();
  if (action === 'equals') showResult();
  if (action === 'sign') toggleSign();
  if (action === 'percent') convertToPercent();
}

keys.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.number !== undefined) {
    inputNumber(button.dataset.number);
  } else if (button.dataset.operator) {
    chooseOperator(button.dataset.operator);
  } else if (button.dataset.action) {
    handleAction(button.dataset.action);
  }
});

window.addEventListener('keydown', (event) => {
  if (/^[0-9]$/.test(event.key)) inputNumber(event.key);
  else if (['+', '-', '*', '/'].includes(event.key)) chooseOperator(event.key);
  else if (event.key === '.' || event.key === ',') inputDecimal();
  else if (event.key === 'Enter' || event.key === '=') showResult();
  else if (event.key === 'Escape' || event.key === 'Delete') resetCalculator();
  else if (event.key === '%') convertToPercent();
  else if (event.key === 'Backspace' && currentValue !== 'Error') {
    currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
    updateDisplay();
  } else {
    return;
  }

  event.preventDefault();
});

updateDisplay();
