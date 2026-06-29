const lengthUnits = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344
};

const weightUnits = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  t: 1000,
  oz: 0.028349523125,
  lb: 0.45359237
};

const volumeUnits = {
  ml: 0.001,
  l: 1,
  m3: 1000,
  tsp: 0.00492892159375,
  tbsp: 0.01478676478125,
  cup: 0.2365882365,
  gal: 3.785411784
};

const operators = {
  "+": { precedence: 1, args: 2, fn: (a, b) => a + b },
  "-": { precedence: 1, args: 2, fn: (a, b) => a - b },
  "*": { precedence: 2, args: 2, fn: (a, b) => a * b },
  "/": { precedence: 2, args: 2, fn: (a, b) => a / b },
  "^": { precedence: 3, args: 2, fn: (a, b) => a ** b }
};

const functions = {
  sqrt: Math.sqrt,
  sin: value => Math.sin(toRadians(value)),
  cos: value => Math.cos(toRadians(value)),
  tan: value => Math.tan(toRadians(value)),
  log: Math.log10,
  ln: Math.log,
  abs: Math.abs
};

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function round(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Результат не является конечным числом");
  }

  return Number.parseFloat(value.toFixed(10));
}

function convertLinear(value, from, to, units) {
  if (!Number.isFinite(value)) {
    throw new Error("Введите числовое значение");
  }

  if (!units[from] || !units[to]) {
    throw new Error("Неизвестная единица измерения");
  }

  return round((value * units[from]) / units[to]);
}

function convertTemperature(value, from, to) {
  if (!Number.isFinite(value)) {
    throw new Error("Введите числовое значение");
  }

  const toCelsius = {
    c: value,
    f: (value - 32) * (5 / 9),
    k: value - 273.15
  }[from];

  if (toCelsius === undefined || !["c", "f", "k"].includes(to)) {
    throw new Error("Неизвестная единица температуры");
  }

  const converted = {
    c: toCelsius,
    f: toCelsius * (9 / 5) + 32,
    k: toCelsius + 273.15
  }[to];

  return round(converted);
}

function tokenize(expression) {
  const tokens = [];
  const source = expression.replace(/\s+/g, "").toLowerCase();
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\d|\./.test(char)) {
      let number = char;
      index += 1;
      while (index < source.length && /[\d.]/.test(source[index])) {
        number += source[index];
        index += 1;
      }
      tokens.push({ type: "number", value: Number(number) });
      continue;
    }

    if (/[a-z]/.test(char)) {
      let name = char;
      index += 1;
      while (index < source.length && /[a-z]/.test(source[index])) {
        name += source[index];
        index += 1;
      }
      tokens.push({ type: "function", value: name });
      continue;
    }

    if ("+-*/^()".includes(char)) {
      tokens.push({ type: char === "(" || char === ")" ? "paren" : "operator", value: char });
      index += 1;
      continue;
    }

    throw new Error("В выражении есть недопустимый символ");
  }

  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const stack = [];
  let previous;

  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
      previous = token;
      continue;
    }

    if (token.type === "function") {
      if (!functions[token.value]) {
        throw new Error(`Функция ${token.value} не поддерживается`);
      }
      stack.push(token);
      previous = token;
      continue;
    }

    if (token.type === "paren" && token.value === "(") {
      stack.push(token);
      previous = token;
      continue;
    }

    if (token.type === "paren" && token.value === ")") {
      while (stack.length && stack.at(-1).value !== "(") {
        output.push(stack.pop());
      }

      if (!stack.length) {
        throw new Error("Скобки расставлены неверно");
      }

      stack.pop();
      if (stack.length && stack.at(-1).type === "function") {
        output.push(stack.pop());
      }
      previous = token;
      continue;
    }

    if (token.type === "operator") {
      const isUnaryMinus = token.value === "-" && (!previous || previous.type === "operator" || previous.value === "(");
      if (isUnaryMinus) {
        output.push({ type: "number", value: 0 });
      }

      while (
        stack.length &&
        stack.at(-1).type === "operator" &&
        operators[stack.at(-1).value].precedence >= operators[token.value].precedence
      ) {
        output.push(stack.pop());
      }

      stack.push(token);
      previous = token;
    }
  }

  while (stack.length) {
    const token = stack.pop();
    if (token.value === "(" || token.value === ")") {
      throw new Error("Скобки расставлены неверно");
    }
    output.push(token);
  }

  return output;
}

function evaluateExpression(expression) {
  if (!expression || expression.length > 120) {
    throw new Error("Введите выражение до 120 символов");
  }

  const stack = [];

  for (const token of toRpn(tokenize(expression))) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }

    if (token.type === "function") {
      const value = stack.pop();
      stack.push(functions[token.value](value));
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();

    if (left === undefined || right === undefined) {
      throw new Error("Выражение составлено неверно");
    }

    stack.push(operators[token.value].fn(left, right));
  }

  if (stack.length !== 1) {
    throw new Error("Выражение составлено неверно");
  }

  return round(stack[0]);
}

export function calculate({ calculator, payload }) {
  if (calculator === "units") {
    const { category, value, from, to } = payload;
    const numericValue = Number(value);
    const converters = {
      length: () => convertLinear(numericValue, from, to, lengthUnits),
      volume: () => convertLinear(numericValue, from, to, volumeUnits),
      temperature: () => convertTemperature(numericValue, from, to)
    };

    if (!converters[category]) {
      throw new Error("Категория единиц не поддерживается");
    }

    return {
      operation: `${category}: ${from} -> ${to}`,
      result: converters[category]()
    };
  }

  if (calculator === "weight") {
    const { value, from, to } = payload;
    return {
      operation: `weight: ${from} -> ${to}`,
      result: convertLinear(Number(value), from, to, weightUnits)
    };
  }

  if (calculator === "engineering") {
    return {
      operation: "engineering expression",
      result: evaluateExpression(payload.expression)
    };
  }

  throw new Error("Калькулятор не поддерживается");
}
