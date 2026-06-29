import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function initDatabase() {
  await pool.query(`
    create table if not exists calculation_history (
      id bigserial primary key,
      calculator varchar(40) not null,
      operation varchar(80) not null,
      input jsonb not null,
      result text not null,
      created_at timestamptz not null default now()
    );
  `);
}

export async function saveCalculation({ calculator, operation, input, result }) {
  const { rows } = await pool.query(
    `
      insert into calculation_history (calculator, operation, input, result)
      values ($1, $2, $3, $4)
      returning id, calculator, operation, input, result, created_at
    `,
    [calculator, operation, input, String(result)]
  );

  return rows[0];
}

export async function getHistory() {
  const { rows } = await pool.query(`
    select id, calculator, operation, input, result, created_at
    from calculation_history
    order by created_at desc
    limit 20
  `);

  return rows;
}

export async function clearHistory() {
  await pool.query("delete from calculation_history");
}
