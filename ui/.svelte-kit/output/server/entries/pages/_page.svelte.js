import { Z as attr_class, a3 as bind_props, a1 as stringify, _ as ensure_array_like, a4 as head } from "../../chunks/index2.js";
import { c as ssr_context, f as fallback, e as escape_html } from "../../chunks/context.js";
import "clsx";
import "chart.js/auto";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function StatCard($$renderer, $$props) {
  let label = $$props["label"];
  let icon = $$props["icon"];
  let value = fallback($$props["value"], null);
  let loading = fallback($$props["loading"], true);
  $$renderer.push(`<div class="stat-card"><div class="flex items-center justify-between"><span class="stat-label">${escape_html(label)}</span> <i${attr_class(`fi ${stringify(icon)} text-sm`)} style="color: hsl(var(--text-muted));"></i></div> `);
  if (loading) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<div class="shimmer h-8 w-20 rounded mt-2"></div>`);
  } else {
    $$renderer.push("<!--[!-->");
    $$renderer.push(`<div class="stat-value">${escape_html(value)}</div>`);
  }
  $$renderer.push(`<!--]--></div>`);
  bind_props($$props, { label, icon, value, loading });
}
function PerformanceChart($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let data = fallback($$props["data"], () => [], true);
    onDestroy(() => {
    });
    $$renderer2.push(`<div class="card"><div class="card-header flex items-center gap-2"><i class="fi fi-rr-chart-line-up text-sm" style="color: hsl(var(--primary));"></i> <span>Performance</span></div> <div class="p-4 h-48"><canvas></canvas></div></div>`);
    bind_props($$props, { data });
  });
}
function SessionList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let sessions = fallback($$props["sessions"], () => [], true);
    let loading = fallback($$props["loading"], true);
    $$renderer2.push(`<div class="card"><div class="card-header flex justify-between items-center"><div class="flex items-center gap-2"><i class="fi fi-rr-signal-alt-2 text-sm" style="color: hsl(var(--primary));"></i> <span>Instances</span></div> `);
    if (!loading && sessions.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="text-xs px-2 py-0.5 rounded-full" style="background: hsla(var(--primary) / 0.1); color: hsl(var(--primary));">${escape_html(sessions.length)} active</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div>`);
    if (loading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="p-8 text-center" style="color: hsl(var(--text-muted));"><div class="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-2" style="border-color: hsl(var(--border)); border-top-color: hsl(var(--primary));"></div> <p class="text-sm">Loading...</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (sessions.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="p-8 text-center" style="color: hsl(var(--text-muted));"><i class="fi fi-rr-smartphone text-2xl mb-2 block opacity-40"></i> <p class="text-sm">No active sessions</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<!--[-->`);
        const each_array = ensure_array_like(sessions);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let session = each_array[$$index];
          $$renderer2.push(`<div class="session-item"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: hsl(var(--bg)); border: 1px solid hsl(var(--border));"><i class="fi fi-rr-smartphone" style="color: hsl(var(--text-muted));"></i></div> <div><div class="font-medium text-sm" style="color: hsl(var(--text));">${escape_html(session.name)}</div> <div class="flex items-center gap-1.5 mt-0.5"><span${attr_class("status-dot", void 0, {
            "status-online": session.status === "connected",
            "status-offline": session.status !== "connected"
          })}></span> <span class="text-xs" style="color: hsl(var(--text-muted));">${escape_html(session.status)}</span></div></div></div> <div class="flex gap-2"><button class="btn btn-secondary py-2 px-3"><i${attr_class(`fi fi-rr-${stringify(session.status === "paused" ? "play" : "pause")}`)}></i></button> <button class="btn btn-secondary py-2 px-3" style="color: hsl(var(--danger));"><i class="fi fi-rr-trash"></i></button></div></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
    bind_props($$props, { sessions, loading });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let cpu = null;
    let memory = null;
    let disk = null;
    let cpuHistory = [];
    let sessions = [];
    let loading = true;
    let sessionsLoading = true;
    onDestroy(() => {
    });
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Dashboard | Whatsaly</title>`);
      });
    });
    $$renderer2.push(`<section class="space-y-4 md:space-y-6 fade-in"><div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">`);
    StatCard($$renderer2, {
      label: "Processor",
      icon: "fi-rr-microchip",
      value: cpu,
      loading
    });
    $$renderer2.push(`<!----> `);
    StatCard($$renderer2, {
      label: "Memory",
      icon: "fi-rr-database",
      value: memory,
      loading
    });
    $$renderer2.push(`<!----> `);
    StatCard($$renderer2, {
      label: "Disk",
      icon: "fi-rr-folder-open",
      value: disk,
      loading
    });
    $$renderer2.push(`<!----></div> `);
    PerformanceChart($$renderer2, { data: cpuHistory });
    $$renderer2.push(`<!----> `);
    SessionList($$renderer2, { sessions, loading: sessionsLoading });
    $$renderer2.push(`<!----></section>`);
  });
}
export {
  _page as default
};
