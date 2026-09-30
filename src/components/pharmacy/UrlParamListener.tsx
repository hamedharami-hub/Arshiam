import { useEffect, useRef } from "react";
import { useInRouterContext, useSearchParams } from "react-router-dom";

/** Calls onValue whenever ?name= changes; renders nothing and is safe outside a router. */
export function UrlParamListener({ name, onValue }: { name: string; onValue: (value: string) => void }) {
  return useInRouterContext() ? <Listener name={name} onValue={onValue} /> : null;
}

function Listener({ name, onValue }: { name: string; onValue: (value: string) => void }) {
  const [params] = useSearchParams();
  const value = params.get(name);
  const callback = useRef(onValue);
  callback.current = onValue;
  useEffect(() => {
    if (value) callback.current(value);
  }, [value]);
  return null;
}
