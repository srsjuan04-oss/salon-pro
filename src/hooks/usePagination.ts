import { useEffect, useMemo, useState } from "react";

/**
 * Paginación client-side genérica. Reemplaza el bloque de "currentPage +
 * totalPages + slice()" duplicado casi idéntico en SalesPage y ExpensesPage.
 *
 * `resetKey` es cualquier valor que, al cambiar (p. ej. la firma de los
 * filtros activos), debe volver la paginación a la página 1 — antes esto se
 * hacía con un `useMemo` usado solo por su efecto secundario.
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, items.length);

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    total: items.length,
    goPrev: () => setPage((p) => Math.max(1, p - 1)),
    goNext: () => setPage((p) => Math.min(totalPages, p + 1)),
  };
}
