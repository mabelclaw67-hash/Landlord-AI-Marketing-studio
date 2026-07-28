import { useEffect, useRef, useState } from "react";

const SCRIPT_ID = "public-upload-turnstile";

export function usePublicUploadTurnstile() {
  const hostRef = useRef(null);
  const widgetIdRef = useRef(null);
  const tokenRef = useRef("");
  const waitersRef = useRef([]);
  const [token, setToken] = useState("");
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return undefined;
    let active = true;
    const render = () => {
      if (!active || !window.turnstile || !hostRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(hostRef.current, {
        sitekey: siteKey,
        callback: (value) => {
          if (!active) return;
          tokenRef.current = value;
          setToken(value);
          waitersRef.current.splice(0).forEach((resolve) => resolve(value));
        },
        "expired-callback": () => { tokenRef.current = ""; setToken(""); },
        "error-callback": () => { tokenRef.current = ""; setToken(""); },
      });
    };
    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    const timer = window.setInterval(render, 100);
    render();
    return () => { active = false; script.removeEventListener("load", render); window.clearInterval(timer); };
  }, [siteKey]);

  const consumeToken = () => new Promise((resolve, reject) => {
    if (!siteKey) { reject(new Error("Security verification is not configured.")); return; }
    const consume = (value) => {
      tokenRef.current = "";
      setToken("");
      if (widgetIdRef.current !== null && window.turnstile) window.turnstile.reset(widgetIdRef.current);
      resolve(value);
    };
    if (tokenRef.current) consume(tokenRef.current);
    else waitersRef.current.push(consume);
  });

  return { consumeToken, ready: Boolean(token), widget: <div ref={hostRef} /> };
}
