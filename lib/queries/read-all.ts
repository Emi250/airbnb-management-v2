type QueryError = { message: string } | null;
type Page<T> = { data: T[] | null; error: QueryError };

/** La fábrica debe ordenar por una clave estable (incluido id como desempate). */
export async function readAll<T>(
  query: () => { range: (from: number, to: number) => PromiseLike<Page<T>> },
  label = "los datos"
): Promise<{ data: T[] }> {
  const rows: T[] = [];
  while (true) {
    const { data, error } = await query().range(rows.length, rows.length + 499);
    if (error) {
      console.error(`[datos] ${label}:`, error.message);
      throw new Error(`No se pudieron cargar ${label}. Volvé a intentar.`);
    }
    // El servidor puede imponer un límite menor a 500. Solo una página vacía
    // demuestra el final; avanzar por lo efectivamente recibido evita omisiones.
    if (!data?.length) return { data: rows };
    rows.push(...data);
  }
}

export function checkQueryErrors(results: { error?: QueryError }[]): void {
  const failure = results.find((result) => result.error);
  if (failure?.error) {
    console.error("[datos] consulta fallida:", failure.error.message);
    throw new Error("No se pudieron cargar los datos. Volvé a intentar.");
  }
}
