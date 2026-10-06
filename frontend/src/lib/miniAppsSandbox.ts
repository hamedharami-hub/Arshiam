export interface MiniAppContext {
  language: "fa" | "en";
  direction: "rtl" | "ltr";
  theme: "light" | "dark";
  colors: {
    background: string;
    foreground: string;
    surface: string;
    primary: string;
    muted: string;
    border: string;
    radius: string;
  };
}

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "worker-src 'none'",
  "navigate-to 'none'",
].join("; ");

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function makeBridgeScript(token: string, context: MiniAppContext): string {
  return `(()=>{
    const token=${safeJson(token)};
    const context=${safeJson(context)};
    const send=(action,payload)=>window.parent.postMessage({channel:"arshiam-mini-app",token,action,payload},"*");
    const api=Object.freeze({
      getContext:()=>context,
      copyText:(value)=>{
        if(typeof value!=="string") return false;
        send("copyText",{text:value.slice(0,20000)});
        return true;
      },
      createTask:(value)=>{
        if(!value||typeof value!=="object") return false;
        send("createTask",{title:typeof value.title==="string"?value.title.slice(0,160):"",description:typeof value.description==="string"?value.description.slice(0,5000):""});
        return true;
      }
    });
    Object.defineProperty(window,"Arshiam",{value:api,writable:false,configurable:false});
    document.addEventListener("click",(event)=>{
      const link=event.target instanceof Element?event.target.closest("a[href]"):null;
      if(link && !link.getAttribute("href")?.startsWith("#")){
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },true);
  })();`;
}

/**
 * Prepends policy and the narrow bridge before any user supplied markup. Do not
 * parse the untrusted source in the parent document: even inert HTML parsers can
 * initiate resource fetches for elements such as images and frames.
 */
export function buildMiniAppPreview(html: string, token: string, context: MiniAppContext): string {
  const source = html || "<html><head></head><body></body></html>";
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${CSP}"><script>${makeBridgeScript(token, context)}</script>\n${source}`;
}
