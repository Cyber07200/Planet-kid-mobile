/**
 * Минимальная подделка клиента Supabase (PostgREST) для проверок.
 *
 * Поддерживает те цепочки вызовов, которые реально использует
 * приложение: select/insert/update + eq/in/gte/lte + order/limit/
 * single/maybeSingle + count:'exact'. Данные лежат в памяти,
 * поэтому можно прогнать весь путь записи без сети.
 */

let seq = 1;

const nextId = (prefix) => `${prefix}_${seq++}`;

export const createFakeSupabase = (initial = {}) => {
  const store = new Map();

  /*
   * Правило искусственного сбоя: (таблица, операция) → ошибка.
   * Нужно, чтобы проверить поведение при закрытых политиках RLS,
   * когда база отвечает пустой ошибкой {"message": ""}.
   */
  let failRule = null;

  Object.entries(initial).forEach(([table, rows]) => {
    store.set(table, rows.map((row) => ({ ...row })));
  });

  const rowsOf = (table) => {
    if (!store.has(table)) {
      store.set(table, []);
    }

    return store.get(table);
  };

  const applyFilters = (rows, filters) =>
    rows.filter((row) =>
      filters.every(({ kind, column, value }) => {
        const current = row[column];

        if (kind === 'eq') return current === value;
        if (kind === 'in') return value.includes(current);
        if (kind === 'gte') return String(current) >= String(value);
        if (kind === 'lte') return String(current) <= String(value);
        if (kind === 'notNull') return current !== null && current !== undefined;

        return true;
      }),
    );

  const makeQuery = (table) => {
    const state = {
      op: 'select',
      embeds: [],
      filters: [],
      payload: null,
      options: {},
      single: false,
      maybeSingle: false,
      limit: null,
      orderBy: null,
    };

    const run = () => {
      const injected = failRule?.(table, state.op);

      if (injected) {
        return { data: null, count: null, error: injected };
      }

      const rows = rowsOf(table);

      if (state.op === 'insert') {
        const records = Array.isArray(state.payload)
          ? state.payload
          : [state.payload];

        const inserted = records.map((record) => {
          const row = {
            id: record.id ?? nextId(table),
            created_at: record.created_at ?? new Date().toISOString(),
            ...record,
          };

          rows.push(row);

          return { ...row };
        });

        return finish(inserted);
      }

      if (state.op === 'update') {
        const matched = applyFilters(rows, state.filters);

        matched.forEach((row) => Object.assign(row, state.payload));

        return finish(matched.map((row) => ({ ...row })));
      }

      /* select */
      let result = applyFilters(rows, state.filters).map((row) => ({ ...row }));

      if (state.orderBy) {
        const { column, ascending } = state.orderBy;

        result.sort((a, b) => {
          const left = String(a[column] ?? '');
          const right = String(b[column] ?? '');

          return ascending ? left.localeCompare(right) : right.localeCompare(left);
        });
      }

      if (state.limit !== null) {
        result = result.slice(0, state.limit);
      }

      return finish(result);
    };

    /* children → child_id, activity_types → activity_type_id, users → user_id */
    const foreignKeyFor = (embed) => {
      if (embed === 'children') return 'child_id';

      const singular = embed.endsWith('s') ? embed.slice(0, -1) : embed;

      return `${singular}_id`;
    };

    const attachEmbeds = (rows) =>
      rows.map((row) => {
        const copy = { ...row };

        state.embeds.forEach((embed) => {
          if (copy[embed] !== undefined) {
            return;
          }

          const key = foreignKeyFor(embed);

          if (copy[key] === undefined) {
            return;
          }

          copy[embed] =
            rowsOf(embed).find((item) => item.id === copy[key]) ?? null;
        });

        return copy;
      });

    const finish = (rawResult) => {
      const result = state.embeds.length > 0 ? attachEmbeds(rawResult) : rawResult;

      if (state.options.count === 'exact' && state.options.head) {
        return { data: null, count: result.length, error: null };
      }

      if (state.single) {
        if (result.length !== 1) {
          return { data: null, error: { message: 'single row expected' } };
        }

        return { data: result[0], error: null };
      }

      if (state.maybeSingle) {
        return { data: result[0] ?? null, error: null };
      }

      return { data: result, count: result.length, error: null };
    };

    const query = {
      select(fields = '', options = {}) {
        state.options = options;

        /*
         * Встроенные связи вида `children ( id, first_name )`.
         * Настоящий PostgREST подставляет связанную строку —
         * здесь делаем то же по соглашению об имени внешнего ключа.
         */
        state.embeds = [...String(fields).matchAll(/(\w+)\s*\(/g)].map(
          (match) => match[1],
        );

        return query;
      },
      insert(payload) {
        state.op = 'insert';
        state.payload = payload;
        return query;
      },
      update(payload) {
        state.op = 'update';
        state.payload = payload;
        return query;
      },
      eq(column, value) {
        state.filters.push({ kind: 'eq', column, value });
        return query;
      },
      /* .not('type', 'is', null) — «поле заполнено» */
      not(column, operator, value) {
        if (operator === 'is' && value === null) {
          state.filters.push({ kind: 'notNull', column });
        }

        return query;
      },
      in(column, value) {
        state.filters.push({ kind: 'in', column, value });
        return query;
      },
      gte(column, value) {
        state.filters.push({ kind: 'gte', column, value });
        return query;
      },
      lte(column, value) {
        state.filters.push({ kind: 'lte', column, value });
        return query;
      },
      order(column, { ascending = true } = {}) {
        state.orderBy = { column, ascending };
        return query;
      },
      limit(value) {
        state.limit = value;
        return query;
      },
      single() {
        state.single = true;
        return query;
      },
      maybeSingle() {
        state.maybeSingle = true;
        return query;
      },
      then(resolve, reject) {
        try {
          resolve(run());
        } catch (error) {
          reject(error);
        }
      },
    };

    return query;
  };

  return {
    client: { from: (table) => makeQuery(table) },
    table: (name) => rowsOf(name),
    /* fail((table, op) => ошибка | null) — включить искусственный сбой */
    fail: (rule) => {
      failRule = rule;
    },
  };
};
