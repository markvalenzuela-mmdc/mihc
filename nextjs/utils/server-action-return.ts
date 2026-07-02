export function ok<T>(data: T) {
  return {
    ok: true,
    data,
  } as const;
}

export function err<T>(error: T) {
  return {
    ok: false,
    error,
  } as const;
}
