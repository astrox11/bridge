import "clsx";
import { Z as attr_class, _ as ensure_array_like, $ as attr, a0 as store_get, a1 as stringify, a2 as unsubscribe_stores } from "../../chunks/index2.js";
import { g as getContext, e as escape_html } from "../../chunks/context.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function ThemeToggle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let mode = "auto";
    $$renderer2.push(`<div class="flex items-center gap-0.5 p-1 rounded-lg" style="background: hsl(var(--bg)); border: 1px solid hsl(var(--border));"><button${attr_class("theme-btn", void 0, { "active": mode === "light" })} title="Light mode"><i class="fi fi-rr-sun text-sm"></i></button> <button${attr_class("theme-btn", void 0, { "active": mode === "dark" })} title="Dark mode"><i class="fi fi-rr-moon text-sm"></i></button> <button${attr_class("theme-btn", void 0, { "active": mode === "auto" })} title="Auto (system)"><i class="fi fi-rr-computer text-sm"></i></button></div>`);
  });
}
function Header($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const navItems = [
      {
        href: "/",
        label: "Dashboard",
        mobileLabel: "Overview",
        icon: "fi-rr-apps"
      },
      {
        href: "/news",
        label: "Updates",
        mobileLabel: "Updates",
        icon: "fi-rr-bell"
      },
      {
        href: "/pair",
        label: "Link",
        mobileLabel: "Connect",
        icon: "fi-rr-add"
      }
    ];
    $$renderer2.push(`<header class="header"><div class="max-w-5xl mx-auto px-4 flex items-center justify-between h-14"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: hsl(var(--primary));"><i class="fi fi-rr-cloud-share text-white text-sm"></i></div> <span class="font-semibold" style="color: hsl(var(--text));">Whatsaly</span></div> <nav class="hidden md:flex gap-1"><!--[-->`);
    const each_array = ensure_array_like(navItems);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class("nav-link", void 0, {
        "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === item.href
      })}><i${attr_class(`fi ${stringify(item.icon)}`)}></i> ${escape_html(item.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></nav> <div class="flex items-center gap-3"><div class="hidden sm:flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-full" style="background: hsla(var(--primary) / 0.1); color: hsl(var(--primary));"><span class="status-dot status-online"></span> Active</div> `);
    ThemeToggle($$renderer2);
    $$renderer2.push(`<!----></div></div></header> <nav class="md:hidden mobile-nav"><!--[-->`);
    const each_array_1 = ensure_array_like(navItems);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let item = each_array_1[$$index_1];
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class("nav-link", void 0, {
        "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === item.href
      })}><i${attr_class(`fi ${stringify(item.icon)}`)}></i> <span>${escape_html(item.mobileLabel)}</span></a>`);
    }
    $$renderer2.push(`<!--]--></nav>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _layout($$renderer, $$props) {
  let { children } = $$props;
  $$renderer.push(`<div class="min-h-screen">`);
  Header($$renderer);
  $$renderer.push(`<!----> <main class="max-w-5xl mx-auto px-4 pt-20 pb-24 md:pb-8">`);
  children($$renderer);
  $$renderer.push(`<!----></main></div>`);
}
export {
  _layout as default
};
