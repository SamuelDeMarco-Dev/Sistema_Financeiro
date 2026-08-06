import { useEffect, useState } from 'react';

/** Atrasa a propagação de `valor` por `atrasoMs` — usado pela busca da
 * página de movimentações para disparar uma requisição por pausa de
 * digitação, não por tecla (RF-34). */
export function useDebounce<T>(valor: T, atrasoMs: number): T {
  const [valorAtrasado, setValorAtrasado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setValorAtrasado(valor);
    }, atrasoMs);
    return () => {
      clearTimeout(temporizador);
    };
  }, [valor, atrasoMs]);

  return valorAtrasado;
}
