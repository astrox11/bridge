import { $ as attr, a3 as bind_props, a4 as head } from "../../../chunks/index2.js";
import { f as fallback } from "../../../chunks/context.js";
function PairingModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let open = fallback($$props["open"], false);
    let country = "234";
    let phone = "";
    if (open) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal-card" role="document"><div class="card-header flex justify-between items-center"><span>Link Device</span> <button class="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" style="color: hsl(var(--text-muted));"><i class="fi fi-rr-cross-small"></i></button></div> `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="p-5 space-y-4"><div><label for="country-select" class="label">Region</label> `);
        $$renderer2.select({ id: "country-select", value: country, class: "input" }, ($$renderer3) => {
          $$renderer3.option({ value: "234" }, ($$renderer4) => {
            $$renderer4.push(`Nigeria (+234)`);
          });
          $$renderer3.option({ value: "1" }, ($$renderer4) => {
            $$renderer4.push(`USA (+1)`);
          });
        });
        $$renderer2.push(`</div> <div><label for="phone-input" class="label">Phone Number</label> <input id="phone-input" type="text"${attr("value", phone)} placeholder="8123456789" class="input"/></div> <button class="btn btn-primary w-full">Generate Code</button></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open });
  });
}
function _page($$renderer) {
  let modalOpen = false;
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    head("aj1tv1", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Link Device | Whatsaly</title>`);
      });
    });
    $$renderer2.push(`<section class="fade-in"><div class="card max-w-sm mx-auto p-8 text-center"><div class="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5" style="background: hsla(var(--primary) / 0.1);"><i class="fi fi-rr-smartphone text-xl" style="color: hsl(var(--primary));"></i></div> <h2 class="text-lg font-semibold mb-2" style="color: hsl(var(--text));">Connect Device</h2> <p class="text-sm mb-6" style="color: hsl(var(--text-muted));">Generate an 8-digit code to link your phone.</p> <button class="btn btn-primary w-full"><i class="fi fi-rr-link-alt"></i> Start Connection</button></div></section> `);
    PairingModal($$renderer2, {
      get open() {
        return modalOpen;
      },
      set open($$value) {
        modalOpen = $$value;
        $$settled = false;
      }
    });
    $$renderer2.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_renderer = $$renderer.copy();
    $$render_inner($$inner_renderer);
  } while (!$$settled);
  $$renderer.subsume($$inner_renderer);
}
export {
  _page as default
};
