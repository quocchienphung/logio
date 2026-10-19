"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Folder, Moon, Plus, Search, Sun, X } from "lucide-react";
import { CrmIcon } from "./CrmIcon";
import { CrmTable } from "./CrmTable";
import { crmTabs, PipelineBoard, PixelIntegration, SalesDocuments, type CrmTab } from "./CrmViews";
import { useCrmEngine } from "./crm-engine";
import "./reference.css";
import "./crm-overrides.css";

const sideItems = ["Home", "Companies", "Contacts", "Deals", "Reports"];
const pipelines = ["New business", "Renewals", "Partnerships"];
const setupGroups = [
  { title: "Set up your workspace", items: ["Name your workspace", "Invite your teammates", "Connect your first app"] },
  { title: "Start working", items: ["Create a folder", "Start your first chat", "Upload a file"] },
  { title: "Make it yours", items: ["Add a profile picture", "Choose your notifications"] },
];

export function Crm({ workspace = "Acme", user = { name: "Alex Morgan" }, onNavigate, className = "" }: {
  workspace?: string;
  user?: { name: string; avatar?: string };
  onNavigate?: (label: string) => void;
  className?: string;
}) {
  const engine = useCrmEngine();
  const [tab, setTab] = useState<CrmTab>("Company CRM");
  const [view, setView] = useState("Head of Sales");
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [news, setNews] = useState(2);
  const [guide, setGuide] = useState(false);
  const [guideGroup, setGuideGroup] = useState<string | null>("Set up your workspace");
  const [completed, setCompleted] = useState(["Name your workspace"]);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [search, setSearch] = useState("");
  const [workspaceName, setWorkspaceName] = useState(workspace);
  const root = useRef<HTMLDivElement>(null);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const createDialog = useRef<HTMLDialogElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initials = user.name.split(" ").map(part => part[0]).slice(0, 2).join("");
  function notify(text: string) {
    setToast(current => ({ text, id: (current?.id ?? 0) + 1 }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }
  function navigate(label: string) {
    onNavigate?.(label);
    setDrawer(false);
    setMenu(null);
    if (label === "Companies" || label === "Home") setTab("Company CRM");
    else if (label === "Deals" || pipelines.includes(label)) setTab("Team strategy");
    else notify(label);
  }
  function toggleMenu(id: string) { setMenu(current => current === id ? null : id); }
  function closeMenu() { setMenu(null); }
  useEffect(() => {
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { setMenu(null); setGuide(false); setDrawer(false); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchDialog.current?.showModal(); }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(".ui-as-anchor")) setMenu(null);
    };
    const mq = window.matchMedia("(max-width: 900px)");
    const resize = () => setDrawer(false);
    mq.addEventListener("change", resize);
    window.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("pointerdown", outside); mq.removeEventListener("change", resize); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  function popover(id: string, title: string, children: ReactNode, top = false) {
    return menu === id ? <div className="ui-as-popover ui-as-menu" data-side={top ? "top" : undefined} role="menu" onKeyDown={event => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a')];
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const index = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[index]?.focus();
    }}>{title && <span className="ui-as-menu__title">{title}</span>}<div className="ui-as-menu__list">{children}</div></div> : null;
  }

  return <div className={`crm-page ${className}`} data-theme={dark ? "dark" : "light"}>
    <div ref={root} className="ui-as ui-as-app" data-collapsed={collapsed ? "" : undefined} data-drawer={drawer ? "" : undefined}>
      <button type="button" className="ui-as-icon-btn ui-as-side-open" aria-label="Open sidebar" onClick={() => { if (window.matchMedia("(max-width: 900px)").matches) setDrawer(true); else setCollapsed(false); }}><CrmIcon name="Open sidebar" /></button>
      <div className="ui-as-scrim" aria-hidden="true" onClick={() => setDrawer(false)} />
      <aside className="ui-as-side" aria-label="Workspace sidebar" inert={collapsed && !drawer}>
        <header className="ui-as-side__head"><span className="ui-as-anchor"><button type="button" className="ui-as-side__workspace" aria-expanded={menu === "workspace"} onClick={() => toggleMenu("workspace")}><span className="ui-as-side__logo">{workspaceName[0]}</span>{workspaceName}<ChevronDown size={13} /></button>{popover("workspace", "Workspaces", <>
          {["Acme", "Personal"].map(name => <button type="button" role="menuitemradio" aria-checked={workspaceName === name} className="ui-as-menu__item" data-rich="" key={name} onClick={() => { setWorkspaceName(name); closeMenu(); }}><span className="ui-as-side__logo">{name[0]}</span><span className="ui-as-menu__label">{name}<small>{name === "Acme" ? "Pro · 8 members" : "Free"}</small></span>{workspaceName === name && <Check size={14} />}</button>)}<button type="button" role="menuitem" className="ui-as-menu__item" onClick={() => { closeMenu(); createDialog.current?.showModal(); }}><Plus size={14} />Create workspace</button>
        </>)}</span><span className="ui-as-side__tools"><button type="button" className="ui-as-icon-btn" aria-label="Search" onClick={() => searchDialog.current?.showModal()}><CrmIcon name="Search" /></button><button type="button" className="ui-as-icon-btn" aria-label="Collapse sidebar" onClick={() => { setCollapsed(true); setDrawer(false); }}><CrmIcon name="Collapse sidebar" /></button></span></header>
        <nav className="ui-as-side__nav" aria-label="Main menu"><div className="ui-as-side__group">{sideItems.map(label => <button type="button" className="ui-as-side__item" aria-current={label === "Companies" ? "page" : undefined} key={label} onClick={() => navigate(label)}><CrmIcon name={label === "Companies" ? "Companies284" : label} />{label}{label === "Companies" && <span className="ui-as-side__count">{284 + engine.rows.length - 10}</span>}</button>)}</div><div className="ui-as-side__group"><span className="ui-as-side__label">Pipelines</span>{pipelines.map(label => <button type="button" className="ui-as-side__item" key={label} onClick={() => navigate(label)}><CrmIcon name={label} />{label}</button>)}</div></nav>
        <div className="ui-as-side__foot">
          {news > 0 && <div className="ui-as-news" data-count={news}><div className="ui-as-news__card ui-as-news__card--back"><span className="ui-as-news__kicker">New in {workspaceName}</span><X size={12} /></div><div className="ui-as-news__card"><div className="ui-as-news__top"><span className="ui-as-news__kicker">New in {workspaceName}</span><button type="button" className="ui-as-news__close" aria-label="Dismiss" onClick={() => setNews(news - 1)}><X size={12} /></button></div><strong className="ui-as-news__title">{news === 2 ? "Shared folders" : "A better way to work"}</strong><button type="button" className="ui-as-news__more" onClick={() => notify("You're all caught up with the latest updates.")}>Full changelog<ChevronRight size={12} /></button></div></div>}
          <div className="ui-as-guide-slot"><div className="ui-as-guide" data-open={guide ? "" : undefined}>
            {!guide ? <button type="button" className="ui-as-steps ui-as-guide__content" aria-expanded="false" onClick={() => setGuide(true)}><span className="ui-as-steps__title">Getting started<ChevronRight size={12} /></span><span className="ui-as-steps__sub">{Math.round(completed.length / 8 * 100)}% done · <span className="ui-as-steps__cheer">Great start!</span></span><span className="ui-as-steps__bar"><i style={{width:`${completed.length / 8 * 100}%`}} /></span></button> : <div className="crm-guide ui-as-guide__content"><div className="crm-guide__title">Getting started<button type="button" aria-label="Close getting started" onClick={() => setGuide(false)}><X size={14} /></button></div><span className="ui-as-steps__bar"><i style={{width:`${completed.length / 8 * 100}%`}} /></span>{setupGroups.map(group => <section key={group.title} data-expanded={guideGroup === group.title ? "" : undefined}><h3><button type="button" aria-expanded={guideGroup === group.title} onClick={() => setGuideGroup(guideGroup === group.title ? null : group.title)}>{group.title}<ChevronDown size={12} /></button></h3>{guideGroup === group.title && group.items.map(item => <button type="button" role="checkbox" aria-checked={completed.includes(item)} className="crm-guide__step" key={item} disabled={item === "Connect your first app" && !completed.includes("Invite your teammates")} onClick={() => setCompleted(completed.includes(item) ? completed.filter(value=>value!==item) : [...completed,item])}><span className="crm-guide__check">{completed.includes(item) && <Check size={10} />}</span>{item}</button>)}</section>)}</div>}
          </div></div>
          <span className="ui-as-anchor ui-as-user-menu"><button type="button" className="ui-as-user" aria-expanded={menu === "user"} onClick={() => toggleMenu("user")}>{user.avatar ? <img src={user.avatar} alt="" /> : <span className="ui-as-user__initials">{initials}</span>}{user.name}<ChevronDown size={12} /></button>{popover("user", "", <>
            {["Profile", "Settings", "Help & feedback"].map(label => <button type="button" role="menuitem" className="ui-as-menu__item" key={label} onClick={() => { closeMenu(); notify(label); }}>{label}</button>)}<button type="button" role="menuitem" className="ui-as-menu__item" onClick={() => setDark(!dark)}>{dark ? <Sun size={14} /> : <Moon size={14} />}{dark ? "Light mode" : "Dark mode"}</button><Link href="/" role="menuitem" className="ui-as-menu__item"><ArrowLeft size={14} />Back to Stripe</Link>
          </>, true)}</span>
        </div>
      </aside>
      <main className="ui-as-main"><div className="ui-as-crm">
        <div className="ui-as-crm__top"><div className="ui-as-crm__path"><Folder size={16} /><span>Sales</span><i>/</i></div><span className="ui-as-anchor"><button type="button" className="ui-as-crm__view" aria-expanded={menu === "view"} onClick={() => toggleMenu("view")}>{view}<ChevronDown size={12} /></button>{popover("view", "Views", ["Head of Sales", "Account executive", "Partner manager"].map(label => <button type="button" className="ui-as-menu__item" role="menuitemradio" aria-checked={view === label} key={label} onClick={() => { setView(label); closeMenu(); }}>{label}{view === label && <Check size={13} />}</button>))}</span><button type="button" className="ui-as-icon-btn ui-as-crm__star" aria-label={favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorite} onClick={() => setFavorite(!favorite)}><CrmIcon name="Add to favorites" size={15} /></button></div>
        <nav className="ui-as-crm__tabs" aria-label="Open views"><button type="button" className="ui-as-icon-btn" aria-label="New view" onClick={() => { setMenu("new-view"); }}><CrmIcon name="New view" /></button><span className="ui-as-anchor"><button type="button" className="ui-as-icon-btn" aria-label="All views" aria-expanded={menu === "all-views" || menu === "new-view"} onClick={() => toggleMenu("all-views")}><CrmIcon name="All views" /></button>{(menu === "new-view" || menu === "all-views") && popover(menu, menu === "new-view" ? "Open a view" : "All views", crmTabs.map(label => <button type="button" className="ui-as-menu__item" role="menuitem" key={label} onClick={() => { setTab(label); closeMenu(); }}><CrmIcon name={label} size={18} />{label}</button>))}</span><span className="ui-as-crm__sep" />{crmTabs.map(label => <button type="button" className="ui-as-crm__tab" aria-current={tab === label ? "page" : undefined} key={label} onClick={() => setTab(label)}><span className="ui-as-crm__tab-logo" data-tab={label}><CrmIcon name={label} size={11} /></span>{label}</button>)}</nav>
        <div className="ui-as-crm__table" key={tab}>{tab === "Company CRM" ? <CrmTable engine={engine} /> : tab === "Team strategy" ? <PipelineBoard engine={engine} /> : tab === "Pixel integration" ? <PixelIntegration /> : <SalesDocuments />}</div>
      </div></main>
      {toast && <div className="ui-as-toast" role="status" key={toast.id}><Check size={14} />{toast.text}</div>}
      <dialog ref={searchDialog} className="crm-dialog crm-search" onClick={event => { if(event.target === event.currentTarget) searchDialog.current?.close(); }}><div className="crm-dialog__head"><Search size={18} /><input autoFocus aria-label="Search workspace" placeholder="Search companies and views…" value={search} onChange={event => setSearch(event.target.value)} /><button type="button" aria-label="Close search" onClick={() => searchDialog.current?.close()}><X size={16} /></button></div><div className="crm-search__results">{[...crmTabs, ...engine.rows.map(row=>row.company)].filter(label=>label.toLowerCase().includes(search.toLowerCase())).map(label=><button type="button" key={label} onClick={()=>{ if(crmTabs.includes(label as CrmTab)) setTab(label as CrmTab); else {setTab("Company CRM");notify(label);} searchDialog.current?.close(); }}><CrmIcon name={label} />{label}<ChevronRight size={12} /></button>)}</div></dialog>
      <dialog ref={createDialog} className="crm-dialog"><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setWorkspaceName(String(data.get("name"))); createDialog.current?.close(); }}><div className="crm-dialog__head"><h2>Create workspace</h2><button type="button" aria-label="Cancel create workspace" onClick={()=>createDialog.current?.close()}><X size={16} /></button></div><label className="crm-field">Workspace name<input name="name" required autoFocus placeholder="Workspace name" /></label><button type="submit" className="ui-as-tool">Create workspace</button></form></dialog>
    </div>
  </div>;
}
