"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, CirclePlay, FileText, Folder, Map, MessageSquarePlus, Moon, Search, Settings, Star, Sun, Waypoints, Workflow, X } from "lucide-react";
import { CrmIcon } from "./CrmIcon";
import { CrmTable } from "./CrmTable";
import { crmTabs, PipelineBoard, PixelIntegration, SalesDocuments } from "./CrmViews";
import { useCrmEngine, type Company } from "./crm-engine";
import { useWorkspaceRoute, workspaceSections, type WorkspaceSection } from "./workspace-state";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { WorkspaceEditors, type EditorKind } from "./WorkspaceEditors";
import { ContactsPage, DealsPage, WorkspaceHome } from "./WorkspacePages";
import { Analytics } from "../affectui-analytics/Analytics";
import { groupOfSection } from "../guide-navigation/navigation-model";
import { WorkspaceLink } from "../guide-navigation/WorkspaceLink";
import "./reference.css";
import "./crm-overrides.css";
import "./workspace-interactions.css";
import { useResource } from "@/lib/workspace-backend/react";
import { SyncStatus } from "@/lib/workspace-backend/SyncStatus";
import { resources } from "../workspace-resources";

const SettingsBilling=dynamic(()=>import("../affectui-settings/SettingsBilling").then(module=>module.SettingsBilling),{loading:()=> <div className="ui-sb" role="status">Loading settings…</div>});
const AgentRun=dynamic(()=>import("../affectui-run/AgentRun").then(module=>module.AgentRun),{loading:()=> <div className="workspace-page" role="status">Loading run…</div>});
const Mapping=dynamic(()=>import("../mapping/BackendMapping").then(module=>module.BackendMapping),{loading:()=> <div className="workspace-page" role="status">Loading mapping…</div>});
const Invoice=dynamic(()=>import("../invoice/BackendInvoice").then(module=>module.BackendInvoice),{loading:()=> <div className="workspace-page" role="status">Loading invoice…</div>});
const Tracing=dynamic(()=>import("../tracing/BackendTracing").then(module=>module.BackendTracing),{loading:()=> <div className="workspace-page" role="status">Loading tracing…</div>});
const Process=dynamic(()=>import("../process/BackendProcess").then(module=>module.BackendProcess),{loading:()=> <div className="workspace-page" role="status">Loading process…</div>});
const AssistantHome=dynamic(()=>import("../affectui-assistant/AssistantHome").then(module=>module.AssistantHome),{loading:()=> <div className="workspace-page" role="status">Loading chat…</div>});
const Files=dynamic(()=>import("../affectui-files/Files").then(module=>module.Files),{loading:()=> <div className="workspace-page" role="status">Loading files…</div>});
const setupGroups=[
  {title:"Set up your workspace",items:["Name your workspace","Invite your teammates","Connect your first app"]},
  {title:"Start working",items:["Create a folder","Start your first chat","Upload a file"]},
  {title:"Make it yours",items:["Add a profile picture","Choose your notifications"]},
];

export function Crm(props: {workspace?:string;user?:{name:string;avatar?:string};onNavigate?:(label:string)=>void;className?:string}) {
  return <MotionConfig reducedMotion="user"><Workspace {...props} /></MotionConfig>;
}

function Workspace({workspace="Logio",user={name:"Alex Morgan"},onNavigate,className=""}:{workspace?:string;user?:{name:string;avatar?:string};onNavigate?:(label:string)=>void;className?:string}) {
  const [workspaces,setWorkspaces]=useResource(resources.workspaces, undefined, [{id:"acme",name:workspace},{id:"personal",name:"Personal"}]);
  const [workspaceId,setWorkspaceId]=useResource(resources.activeWorkspace, undefined, "acme");
  const workspaceName=workspaces.find(item=>item.id===workspaceId)?.name || workspace;
  const engine=useCrmEngine(workspaceId);
  const {section,crmView,navigate:routeTo}=useWorkspaceRoute();
  const [profile,setProfile]=useResource(resources.profile, undefined, {name:user.name,email:"alex@logio.com",role:"Head of Sales",avatar:user.avatar});
  const [preferences,setPreferences]=useResource(resources.preferences, undefined, {dark:false,emailNotifications:true,desktopNotifications:true});
  const [customViews,setCustomViews]=useResource(resources.views, workspaceId, []);
  const [tab,setTab]=useResource(resources.activeTab, workspaceId, "Company CRM");
  const [view,setView]=useState("Head of Sales");
  const [favorites,setFavorites]=useResource(resources.favorites, workspaceId, []);
  const [collapsed,setCollapsed]=useState(false);
  const [drawer,setDrawer]=useState(false);
  const [menu,setMenu]=useState<string|null>(null);
  const [news,setNews]=useResource(resources.news, workspaceId, 2);
  const [guide,setGuide]=useState(false);
  const [guideGroup,setGuideGroup]=useState<string|null>("Set up your workspace");
  const [completed,setCompleted]=useResource(resources.checklist, workspaceId, ["Name your workspace"]);
  const [toast,setToast]=useState<{text:string;id:number}|null>(null);
  const [searchOpen,setSearchOpen]=useState(false);
  const [search,setSearch]=useState("");
  const [query,setQuery]=useState("");
  const [tableEpoch,setTableEpoch]=useState(0);
  const [chatEpoch,setChatEpoch]=useState(0);
  const [editor,setEditor]=useState<EditorKind>("Profile");
  const [editorOpen,setEditorOpen]=useState(false);
  const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const reduce=useReducedMotion();
  const allTabs=[...crmTabs.map(name=>({id:name,name})),...customViews.map(item=>({id:item.id,name:item.name}))];
  const selectedTab=crmView ?? tab;
  const custom=customViews.find(item=>item.id===selectedTab);
  const activeTab=allTabs.some(item=>item.id===selectedTab) ? selectedTab : "Company CRM";
  // The sidebar lists only the pages of the group that owns the current page (see guide-navigation/navigation-model.ts).
  const activeGroup=groupOfSection(section);
  const sidebarGroups=[{title:"",items:activeGroup.sections as readonly WorkspaceSection[]},{title:"Pipelines",items:activeGroup.pipelines as readonly WorkspaceSection[]}].filter(group=>group.items.length);
  const viewTitle=custom?.name || view;
  const favorite=favorites.includes(viewTitle);
  const initials=profile.name.split(" ").map(part=>part[0]).slice(0,2).join("");
  const presetOwner=view==="Account executive" ? "Jonas Weber" : view==="Partner manager" ? "Lea Braun" : "";
  const filter=(row:Company)=>(!query || `${row.company} ${row.domain}`.toLowerCase().includes(query.toLowerCase())) && (!(custom?.owner || presetOwner) || row.owner===(custom?.owner || presetOwner));

  function notify(text:string) {
    setToast(current=>({text,id:(current?.id || 0)+1}));
    if(toastTimer.current)clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(null),2600);
  }
  function navigate(label:WorkspaceSection) {
    if(label==="New chat")setChatEpoch(current=>current+1);
    onNavigate?.(label);setDrawer(false);setMenu(null);setQuery("");routeTo(label);
  }
  function inviteToWorkspace() {
    navigate("Settings");
    const url=new URL(window.location.href);url.searchParams.set("settings-tab","members");
    window.history.replaceState({},"",url);window.dispatchEvent(new PopStateEvent("popstate"));
  }
  function openCompany(name:string) {navigate("Companies");setView("Head of Sales");setTab("Company CRM");setQuery(name);setTableEpoch(current=>current+1);}
  function switchTab(id:string) {onNavigate?.("Companies");setDrawer(false);setMenu(null);setQuery("");setTab(id);routeTo("Companies",id);}
  function openEditor(kind:EditorKind) {setMenu(null);setEditor(kind);setEditorOpen(true);}
  function openSearch() {setSearch("");setSearchOpen(true);setMenu(null);}
  function toggleMenu(id:string) {setMenu(current=>current===id ? null : id);}

  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){setMenu(null);setGuide(false);setDrawer(false);}
      if((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==="k"){event.preventDefault();setSearch("");setSearchOpen(true);}
    };
    const outside=(event:PointerEvent)=>{if(event.target instanceof Element && !event.target.closest(".ui-as-anchor"))setMenu(null);};
    const mq=window.matchMedia("(max-width: 900px)");const resize=()=>setDrawer(false);
    window.addEventListener("keydown",key);document.addEventListener("pointerdown",outside);mq.addEventListener("change",resize);
    return()=>{window.removeEventListener("keydown",key);document.removeEventListener("pointerdown",outside);mq.removeEventListener("change",resize);if(toastTimer.current)clearTimeout(toastTimer.current);};
  },[]);

  function popover(id:string,title:string,children:ReactNode,top=false) {
    return <AnimatePresence>{menu===id && <motion.div className="ui-as-popover ui-as-menu" data-motion="" data-side={top ? "top" : undefined} role="menu" initial={{opacity:0,y:top ? 5 : -5,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:top ? 3 : -3,scale:0.98}} transition={{duration:reduce ? 0 : 0.18}} onKeyDown={event=>{
      if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;event.preventDefault();
      const items=[...event.currentTarget.querySelectorAll<HTMLButtonElement|HTMLAnchorElement>('button,a')];const current=items.indexOf(document.activeElement as HTMLButtonElement);
      items[event.key==="Home" ? 0 : event.key==="End" ? items.length-1 : (current+(event.key==="ArrowDown" ? 1 : -1)+items.length)%items.length]?.focus();
    }}>{title && <span className="ui-as-menu__title">{title}</span>}<div className="ui-as-menu__list">{children}</div></motion.div>}</AnimatePresence>;
  }

  const searchItems=[...workspaceSections.map(label=>({id:`section:${label}`,label,kind:"section" as const})),...allTabs.map(item=>({id:item.id,label:item.name,kind:"view" as const})),...engine.rows.map(row=>({id:row.id,label:row.company || "Untitled",kind:"company" as const}))].filter(item=>item.label.toLowerCase().includes(search.toLowerCase()));

  return <LayoutGroup id="sales-workspace"><div className={`crm-page ${className}`} data-theme={preferences.dark ? "dark" : "light"}>
    <div className="ui-as ui-as-app" data-collapsed={collapsed ? "" : undefined} data-drawer={drawer ? "" : undefined}>
      <button type="button" className="ui-as-icon-btn ui-as-side-open" aria-label="Open sidebar" onClick={()=>{if(window.matchMedia("(max-width: 900px)").matches)setDrawer(true);else setCollapsed(false);}}><CrmIcon name="Open sidebar" /></button>
      <div className="ui-as-scrim" aria-hidden="true" onClick={()=>setDrawer(false)} />
      <aside className="ui-as-side" aria-label="Workspace sidebar" inert={collapsed && !drawer}>
        <header className="workspace-sidebar-header">
          <WorkspaceLink className="workspace-explore" href={`/personalize?browse=1&group=${activeGroup.id}`}>Explore pages<ChevronRight size={15} aria-hidden="true" /></WorkspaceLink>
        </header>
        <nav className="ui-as-side__nav" aria-label="Main menu">{sidebarGroups.map(group=><div className="ui-as-side__group" key={group.title || "main"}>{group.title && <span className="ui-as-side__label">{group.title}</span>}{group.items.map(label=><button type="button" className="ui-as-side__item" aria-current={section===label ? "page" : undefined} key={label} onClick={()=>navigate(label)}>{section===label && <motion.span className="workspace-nav-pill" layoutId="active-navigation" transition={{type:"spring",stiffness:450,damping:38}} />}{label==="Files" ? <Folder size={16} strokeWidth={1.7} /> : label==="New chat" ? <MessageSquarePlus size={16} strokeWidth={1.7} /> : label==="Mapping" ? <Map size={16} strokeWidth={1.7} /> : label==="Process" ? <Workflow size={16} strokeWidth={1.7} /> : label==="Tracing" ? <Waypoints size={16} strokeWidth={1.7} /> : label==="Invoice" ? <FileText size={16} strokeWidth={1.7} /> : label==="Run" ? <CirclePlay size={16} strokeWidth={1.7} /> : label==="Settings" ? <Settings size={16} strokeWidth={1.7} /> : <CrmIcon name={label==="Companies" ? "Companies284" : label} />}<span className="workspace-nav-label">{label}</span>{label==="Companies" && <span className="ui-as-side__count">{workspaceId==="acme" ? 284+engine.rows.length-10 : engine.rows.length}</span>}</button>)}</div>)}</nav>
        <SyncStatus />
        <div className="ui-as-side__foot">
          <AnimatePresence>{news>0 && <motion.div className="ui-as-news" data-count={news} initial={false} exit={{opacity:0,height:0,marginBottom:-8}} transition={{duration:reduce ? 0 : 0.22}}><div className="ui-as-news__card ui-as-news__card--back"><span className="ui-as-news__kicker">New in {workspaceName}</span><button type="button" className="ui-as-news__close" aria-label="Dismiss earlier update" onClick={()=>setNews(Math.max(0,news-1))}><X size={12} /></button></div><div className="ui-as-news__card"><div className="ui-as-news__top"><span className="ui-as-news__kicker">New in {workspaceName}</span><button type="button" className="ui-as-news__close" aria-label="Dismiss" onClick={()=>setNews(Math.max(0,news-1))}><X size={12} /></button></div><strong className="ui-as-news__title">{news===2 ? "Shared folders" : "A better way to work"}</strong><button type="button" className="ui-as-news__more" onClick={()=>openEditor("Full changelog")}>Full changelog<ChevronRight size={12} /></button></div></motion.div>}</AnimatePresence>
          <div className="ui-as-guide-slot"><motion.div layout className="ui-as-guide" data-open={guide ? "" : undefined} transition={{layout:{type:"spring",stiffness:350,damping:34}}}>
            {!guide ? <button type="button" className="ui-as-steps ui-as-guide__content" aria-expanded="false" onClick={()=>setGuide(true)}><span className="ui-as-steps__title">Getting started<ChevronRight size={12} /></span><span className="ui-as-steps__sub">{Math.round(completed.length/8*100)}% done · <span className="ui-as-steps__cheer">{completed.length===8 ? "All done!" : "Great start!"}</span></span><span className="ui-as-steps__bar"><i style={{width:`${completed.length/8*100}%`}} /></span></button> : <div className="crm-guide ui-as-guide__content"><div className="crm-guide__title">Getting started<button type="button" aria-label="Close getting started" onClick={()=>setGuide(false)}><X size={14} /></button></div><span className="ui-as-steps__bar"><i style={{width:`${completed.length/8*100}%`}} /></span>{setupGroups.map(group=><section key={group.title} data-expanded={guideGroup===group.title ? "" : undefined}><h3><button type="button" aria-expanded={guideGroup===group.title} onClick={()=>setGuideGroup(guideGroup===group.title ? null : group.title)}>{group.title}<ChevronDown size={12} /></button></h3><AnimatePresence initial={false}>{guideGroup===group.title && <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduce ? 0 : 0.24}} className="workspace-guide-group">{group.items.map(item=><button type="button" role="checkbox" aria-checked={completed.includes(item)} className="crm-guide__step" key={item} disabled={item==="Connect your first app" && !completed.includes("Invite your teammates")} onClick={()=>setCompleted(completed.includes(item) ? completed.filter(value=>value!==item) : [...completed,item])}><span className="crm-guide__check">{completed.includes(item) && <Check size={10} />}</span>{item}</button>)}</motion.div>}</AnimatePresence></section>)}</div>}
          </motion.div></div>
          <span className="ui-as-anchor ui-as-user-menu"><button type="button" className="ui-as-user" aria-expanded={menu==="user"} onClick={()=>toggleMenu("user")}>{profile.avatar ? <img src={profile.avatar} alt="" /> : <span className="ui-as-user__initials">{initials}</span>}{profile.name}<ChevronDown size={12} /></button>{popover("user","",<>
            <div className="workspace-account-heading">Workspaces</div>
            {workspaces.map(item=><button type="button" role="menuitemradio" aria-checked={workspaceId===item.id} className="ui-as-menu__item" key={item.id} onClick={()=>{setWorkspaceId(item.id);setMenu(null);setQuery("");setView("Head of Sales");}}><span className="ui-as-side__logo">{item.logo ? <img className="settings-sidebar-logo" src={item.logo} alt="" /> : item.name[0]}</span><span className="ui-as-menu__label">{item.name}</span>{workspaceId===item.id && <Check size={14} />}</button>)}
            <button type="button" role="menuitem" className="ui-as-menu__item" onClick={()=>openEditor("Create workspace")}>Create workspace</button>
            <div className="workspace-account-divider" />
            <button type="button" role="menuitem" className="ui-as-menu__item" aria-label="Search" onClick={openSearch}><Search size={14} />Search</button>
            <button type="button" role="menuitem" className="ui-as-menu__item" onClick={()=>{setCollapsed(true);setDrawer(false);setMenu(null);}}><CrmIcon name="Collapse sidebar" size={14} />Collapse sidebar</button>
            {(["Profile","Settings","Help & feedback"] as const).map(label=><button type="button" role="menuitem" className="ui-as-menu__item" key={label} onClick={()=>label==="Settings" ? navigate("Settings") : openEditor(label)}>{label}</button>)}<button type="button" role="menuitem" className="ui-as-menu__item" onClick={()=>setPreferences({...preferences,dark:!preferences.dark})}>{preferences.dark ? <Sun size={14} /> : <Moon size={14} />}{preferences.dark ? "Light mode" : "Dark mode"}</button><button type="button" role="menuitem" className="ui-as-menu__item" onClick={()=>openEditor("Settings")}>Appearance &amp; notifications</button><Link href="/" role="menuitem" className="ui-as-menu__item"><ArrowLeft size={14} />Back to Stripe</Link>
          </>,true)}</span>
        </div>
      </aside>
      <main className="ui-as-main"><AnimatePresence mode="wait" initial={false}><motion.div key={section} className="workspace-surface" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:reduce ? 0 : 0.18,ease:[0.22,1,0.36,1]}}>
        {section==="Files" ? <Files key={workspaceId} workspaceId={workspaceId} userName={profile.name} notify={notify} /> : section==="New chat" ? <AssistantHome key={`${workspaceId}:${chatEpoch}`} workspaceId={workspaceId} userName={profile.name} onInvite={inviteToWorkspace} notify={notify} startFresh={chatEpoch>0} /> : section==="Invoice" ? <Invoice key={workspaceId} workspaceId={workspaceId} /> : section==="Mapping" ? <Mapping key={workspaceId} workspaceId={workspaceId} /> : section==="Process" ? <Process key={workspaceId} workspaceId={workspaceId} /> : section==="Tracing" ? <Tracing key={workspaceId} workspaceId={workspaceId} /> : section==="Run" ? <AgentRun key={workspaceId} workspaceId={workspaceId} userName={profile.name} notify={notify} /> : section==="Settings" ? <SettingsBilling key={workspaceId} workspaceId={workspaceId} workspaceName={workspaceName} notify={notify} onRename={name=>setWorkspaces(workspaces.map(item=>item.id===workspaceId ? {...item,name} : item))} onLogoChange={logo=>setWorkspaces(current=>current.map(item=>item.id===workspaceId ? {...item,logo} : item))} /> : section==="Reports" ? <Analytics workspaceId={workspaceId} notify={notify} /> : section==="Home" ? <WorkspaceHome engine={engine} name={profile.name} navigate={navigate} openCompany={openCompany} /> : section==="Contacts" ? <ContactsPage engine={engine} workspaceId={workspaceId} notify={notify} /> : section!=="Companies" ? <DealsPage engine={engine} section={section} openCompany={openCompany} /> : <div className="ui-as-crm">
          <div className="ui-as-crm__top"><div className="ui-as-crm__path"><Folder size={16} /><span>Sales</span><i>/</i></div><span className="ui-as-anchor"><button type="button" className="ui-as-crm__view" aria-expanded={menu==="view"} onClick={()=>toggleMenu("view")}>{viewTitle}<ChevronDown size={12} /></button>{popover("view","Views",["Head of Sales","Account executive","Partner manager"].map(label=><button type="button" className="ui-as-menu__item" role="menuitemradio" aria-checked={view===label && !custom} key={label} onClick={()=>{setView(label);switchTab("Company CRM");}}>{label}{view===label && !custom && <Check size={13} />}</button>))}</span><button type="button" className="ui-as-icon-btn ui-as-crm__star" aria-label={favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorite} onClick={()=>setFavorites(favorite ? favorites.filter(value=>value!==viewTitle) : [...favorites,viewTitle])}><CrmIcon name="Add to favorites" size={15} /></button></div>
          <nav className="ui-as-crm__tabs" aria-label="Open views"><button type="button" className="ui-as-icon-btn" aria-label="New view" onClick={()=>openEditor("New view")}><CrmIcon name="New view" /></button><span className="ui-as-anchor"><button type="button" className="ui-as-icon-btn" aria-label="All views" aria-expanded={menu==="all-views"} onClick={()=>toggleMenu("all-views")}><CrmIcon name="All views" /></button>{popover("all-views","All views",allTabs.map(item=><button type="button" className="ui-as-menu__item" role="menuitem" key={item.id} onClick={()=>{switchTab(item.id);setMenu(null);}}><CrmIcon name={crmTabs.includes(item.name as typeof crmTabs[number]) ? item.name : "Company CRM"} size={18} />{item.name}{favorites.includes(item.name) && <Star size={12} />}</button>))}</span><span className="ui-as-crm__sep" />{allTabs.map(item=><div className="workspace-tab-wrap" key={item.id}><button type="button" className="ui-as-crm__tab" aria-current={activeTab===item.id ? "page" : undefined} onClick={()=>switchTab(item.id)}>{activeTab===item.id && <motion.span className="workspace-tab-pill" layoutId="active-crm-tab" transition={{type:"spring",stiffness:450,damping:38}} />}<span className="ui-as-crm__tab-logo" data-tab={crmTabs.includes(item.name as typeof crmTabs[number]) ? item.name : "Company CRM"}><CrmIcon name={crmTabs.includes(item.name as typeof crmTabs[number]) ? item.name : "Company CRM"} size={11} /></span><span>{item.name}</span></button>{customViews.some(value=>value.id===item.id) && <button type="button" className="workspace-tab-close" aria-label={`Close ${item.name} view`} onClick={()=>{setCustomViews(customViews.filter(value=>value.id!==item.id));if(tab===item.id)setTab("Company CRM");}}><X size={11} /></button>}</div>)}</nav>
          {query && <div className="workspace-filter-chip">Showing companies matching “{query}”<button type="button" aria-label="Clear company search" onClick={()=>setQuery("")}><X size={12} /></button></div>}
          <AnimatePresence mode="wait" initial={false}><motion.div className="ui-as-crm__table" key={`${activeTab}:${workspaceId}:${viewTitle}:${tableEpoch}`} initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:reduce ? 0 : 0.18}}>{activeTab==="Company CRM" || custom?.layout==="table" ? <CrmTable engine={engine} filter={filter} defaultOwner={custom?.owner || presetOwner} onAddRow={()=>setQuery("")} /> : activeTab==="Team strategy" || custom?.layout==="board" ? <PipelineBoard engine={engine} filter={filter} onOpenCompany={openCompany} /> : activeTab==="Pixel integration" ? <PixelIntegration workspaceId={workspaceId} /> : <SalesDocuments engine={engine} workspaceId={workspaceId} />}</motion.div></AnimatePresence>
        </div>}
      </motion.div></AnimatePresence></main>
      <AnimatePresence>{toast && <motion.div className="ui-as-toast" role="status" key={toast.id} initial={{opacity:0,y:8,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:5,scale:0.98}} transition={{duration:reduce ? 0 : 0.2}}><Check size={14} />{toast.text}</motion.div>}</AnimatePresence>
      <WorkspaceDialog open={searchOpen} title="Search workspace" onClose={()=>setSearchOpen(false)}><label className="workspace-search workspace-search--dialog"><Search size={17} /><input autoFocus aria-label="Search workspace" placeholder="Search companies and views…" value={search} onChange={event=>setSearch(event.target.value)} /></label><div className="crm-search__results"><AnimatePresence initial={false}>{searchItems.map(item=><motion.button type="button" layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} key={item.id} onClick={()=>{if(item.kind==="section")navigate(item.label as WorkspaceSection);else if(item.kind==="view")switchTab(item.id);else openCompany(item.label);setSearchOpen(false);}}><CrmIcon name={item.label} /><span>{item.label}</span><small>{item.kind}</small><ChevronRight size={12} /></motion.button>)}</AnimatePresence>{!searchItems.length && <p className="workspace-muted">No companies or views found.</p>}</div></WorkspaceDialog>
      <WorkspaceEditors kind={editor} open={editorOpen} onClose={()=>setEditorOpen(false)} profile={profile} setProfile={setProfile} preferences={preferences} setPreferences={setPreferences} owners={[...new Set(engine.rows.map(row=>row.owner))].filter(Boolean)} notify={notify} createWorkspace={name=>{const id=crypto.randomUUID();setWorkspaces([...workspaces,{id,name}]);setWorkspaceId(id);navigate("Companies");notify("Workspace created");}} createView={newView=>{setCustomViews([...customViews,newView]);navigate("Companies");setTab(newView.id);notify("View created");}} />
    </div>
  </div></LayoutGroup>;
}
