import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const unitGroups = {
  length: {
    label: "Длина",
    units: {
      mm: "Миллиметры",
      cm: "Сантиметры",
      m: "Метры",
      km: "Километры",
      in: "Дюймы",
      ft: "Футы",
      yd: "Ярды",
      mi: "Мили"
    }
  },
  volume: {
    label: "Объем",
    units: {
      ml: "Миллилитры",
      l: "Литры",
      m3: "Куб. метры",
      tsp: "Чайные ложки",
      tbsp: "Столовые ложки",
      cup: "Чашки",
      gal: "Галлоны"
    }
  },
  temperature: {
    label: "Температура",
    units: {
      c: "Цельсий",
      f: "Фаренгейт",
      k: "Кельвин"
    }
  }
};

const weightUnits = {
  mg: "Миллиграммы",
  g: "Граммы",
  kg: "Килограммы",
  t: "Тонны",
  oz: "Унции",
  lb: "Фунты"
};

const tabs = [
  { id: "units", label: "Единицы" },
  { id: "weight", label: "Вес" },
  { id: "engineering", label: "Инженерный" }
];

function App() {
  const [activeTab, setActiveTab] = useState("units");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  async function loadHistory() {
    const response = await fetch(`${API_URL}/history`);
    if (!response.ok) {
      throw new Error("Не удалось загрузить историю");
    }
    setHistory(await response.json());
  }

  useEffect(() => {
    async function boot() {
      try {
        await loadHistory();
      } catch {
        setError("Сервер недоступен. Запустите проект командой npm run dev.");
      }
    }

    boot();
  }, []);

  async function calculate(calculator, payload) {
    setError("");
    const response = await fetch(`${API_URL}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calculator, payload })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Не удалось выполнить расчет");
      return null;
    }

    setHistory(current => [data, ...current].slice(0, 20));
    return data;
  }

  async function clearAllHistory() {
    setError("");
    const response = await fetch(`${API_URL}/history`, { method: "DELETE" });
    if (response.ok) {
      setHistory([]);
    }
  }

  const activeCalculator = {
    units: <UnitsCalculator onCalculate={calculate} />,
    weight: <WeightCalculator onCalculate={calculate} />,
    engineering: <EngineeringCalculator onCalculate={calculate} />
  }[activeTab];

  return (
    <main className="app-shell">
      <section className="workspace">
        <nav className="tabs" aria-label="Тип калькулятора">
          {tabs.map(tab => (
            <button
              className={activeTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {error && <div className="error">{error}</div>}

        <div className="content-grid">
          <section className="calculator-panel">{activeCalculator}</section>
          <HistoryPanel history={history} onClear={clearAllHistory} />
        </div>
      </section>
    </main>
  );
}

function UnitsCalculator({ onCalculate }) {
  const [category, setCategory] = useState("length");
  const [value, setValue] = useState("100");
  const [from, setFrom] = useState("cm");
  const [to, setTo] = useState("m");
  const [result, setResult] = useState(null);

  const units = useMemo(() => unitGroups[category].units, [category]);

  function changeCategory(nextCategory) {
    const keys = Object.keys(unitGroups[nextCategory].units);
    setCategory(nextCategory);
    setFrom(keys[0]);
    setTo(keys[1]);
    setResult(null);
  }

  async function submit(event) {
    event.preventDefault();
    const data = await onCalculate("units", { category, value: Number(value), from, to });
    setResult(data);
  }

  return (
    <form onSubmit={submit}>
      <PanelHeader title="Единицы измерения" text="Длина, объем и температура считаются на сервере и сохраняются в PostgreSQL." />
      <SegmentedControl value={category} options={unitGroups} onChange={changeCategory} />
      <ConverterFields value={value} onValueChange={setValue} from={from} to={to} onFromChange={setFrom} onToChange={setTo} units={units} />
      <ResultBar result={result} to={to} />
    </form>
  );
}

function WeightCalculator({ onCalculate }) {
  const [value, setValue] = useState("72");
  const [from, setFrom] = useState("kg");
  const [to, setTo] = useState("lb");
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    const data = await onCalculate("weight", { value: Number(value), from, to });
    setResult(data);
  }

  return (
    <form onSubmit={submit}>
      <PanelHeader title="Калькулятор веса" text="Конвертирует массу между метрическими и английскими единицами." />
      <ConverterFields value={value} onValueChange={setValue} from={from} to={to} onFromChange={setFrom} onToChange={setTo} units={weightUnits} />
      <ResultBar result={result} to={to} />
    </form>
  );
}

function EngineeringCalculator({ onCalculate }) {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    const data = await onCalculate("engineering", { expression });
    if (data) {
      setResult(data);
      setExpression(String(data.result));
    }
  }

  function addToken(token) {
    setResult(null);
    setExpression(current => `${current}${token}`);
  }

  function clearDisplay() {
    setExpression("");
    setResult(null);
  }

  function removeLast() {
    setResult(null);
    setExpression(current => current.slice(0, -1));
  }

  return (
    <form className="classic-calculator" onSubmit={submit}>
      <div className="calculator-display" aria-live="polite">
        {expression || result?.result || "0"}
      </div>
      <div className="calculator-keys">
        <button type="button" className="key operator" onClick={() => addToken("+")}>+</button>
        <button type="button" className="key operator" onClick={() => addToken("-")}>-</button>
        <button type="button" className="key operator" onClick={() => addToken("*")}>×</button>
        <button type="button" className="key operator" onClick={() => addToken("/")}>÷</button>

        <button type="button" className="key" onClick={() => addToken("7")}>7</button>
        <button type="button" className="key" onClick={() => addToken("8")}>8</button>
        <button type="button" className="key" onClick={() => addToken("9")}>9</button>
        <button className="key equals" type="submit">=</button>

        <button type="button" className="key" onClick={() => addToken("4")}>4</button>
        <button type="button" className="key" onClick={() => addToken("5")}>5</button>
        <button type="button" className="key" onClick={() => addToken("6")}>6</button>

        <button type="button" className="key" onClick={() => addToken("1")}>1</button>
        <button type="button" className="key" onClick={() => addToken("2")}>2</button>
        <button type="button" className="key" onClick={() => addToken("3")}>3</button>

        <button type="button" className="key zero" onClick={() => addToken("0")}>0</button>
        <button type="button" className="key" onClick={() => addToken(".")}>.</button>
        <button type="button" className="key clear" onClick={clearDisplay}>AC</button>

        <button type="button" className="key function" onClick={() => addToken("sqrt(")}>√</button>
        <button type="button" className="key function" onClick={() => addToken("^")}>xʸ</button>
        <button type="button" className="key function" onClick={() => addToken("sin(")}>sin</button>
        <button type="button" className="key function" onClick={() => addToken("cos(")}>cos</button>
        <button type="button" className="key function" onClick={() => addToken("tan(")}>tan</button>
        <button type="button" className="key function" onClick={() => addToken("log(")}>log</button>
        <button type="button" className="key function" onClick={() => addToken("ln(")}>ln</button>
        <button type="button" className="key function" onClick={() => addToken("(")}>(</button>
        <button type="button" className="key function" onClick={() => addToken(")")}>)</button>
        <button type="button" className="key clear" onClick={removeLast}>⌫</button>
      </div>
    </form>
  );
}

function PanelHeader({ title, text }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function SegmentedControl({ value, options, onChange }) {
  return (
    <div className="segmented">
      {Object.entries(options).map(([id, option]) => (
        <button className={value === id ? "active" : ""} key={id} type="button" onClick={() => onChange(id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ConverterFields({ value, onValueChange, from, to, onFromChange, onToChange, units }) {
  return (
    <div className="field-grid">
      <label className="field">
        <span>Значение</span>
        <input type="number" step="any" value={value} onChange={event => onValueChange(event.target.value)} />
      </label>
      <SelectField label="Из" value={from} onChange={onFromChange} units={units} />
      <SelectField label="В" value={to} onChange={onToChange} units={units} />
      <button className="primary-action" type="submit">
        Рассчитать
      </button>
    </div>
  );
}

function SelectField({ label, value, onChange, units }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {Object.entries(units).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultBar({ result, to }) {
  return (
    <div className="result-bar">
      <span>Результат</span>
      <strong>{result ? `${result.result}${to ? ` ${to}` : ""}` : "Ожидает расчета"}</strong>
    </div>
  );
}

function HistoryPanel({ history, onClear }) {
  return (
    <aside className="history-panel">
      <div className="history-header">
        <div>
          <h2>История</h2>
          <p>Последние 20 записей из PostgreSQL</p>
        </div>
        <button type="button" onClick={onClear} disabled={history.length === 0}>
          Очистить
        </button>
      </div>
      <div className="history-list">
        {history.length === 0 ? (
          <p className="empty">Расчеты появятся здесь после первого запроса к серверу.</p>
        ) : (
          history.map(item => (
            <article key={item.id} className="history-item">
              <span>{formatCalculator(item.calculator)}</span>
              <strong>{item.result}</strong>
              <small>{item.operation}</small>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}

function formatCalculator(calculator) {
  return {
    units: "Единицы",
    weight: "Вес",
    engineering: "Инженерный"
  }[calculator] || calculator;
}

createRoot(document.getElementById("root")).render(<App />);
