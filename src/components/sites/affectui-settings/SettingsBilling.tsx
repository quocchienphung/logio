"use client";

import { memo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Check, CreditCard, Download, Mail } from "lucide-react";
import { UsageMeter } from "../affectui-usage-meter/UsageMeter";
import { AnimatedNumber } from "../affectui-analytics/AnimatedNumber";
import { WorkspaceDialog } from "../affectui-crm/WorkspaceDialog";
import { downloadFile, toCsv, useStoredState } from "../affectui-crm/workspace-state";
import { ApiKeysSettings, GeneralSettings, MembersSettings, initialMembers } from "./SettingsTabs";
import days from "./usage-seed.json";
import icons from "./icons.json";
import "../affectui-usage-meter/usage-meter.css";
import "./settings-reference.css";
import "./settings-overrides.css";

const tabs = ["General", "Members", "Billing", "API keys"] as const;
type Tab = typeof tabs[number];
const plans = [
  { name: "Starter", price: 19, credits: 10000, seats: 3, storage: 10, description: "For individuals trying things out", features: ["10,000 credits / month", "3 seats", "10 GB storage"] },
  { name: "Pro", price: 49, credits: 50000, seats: 10, storage: 100, description: "For small teams shipping every day", features: ["50,000 credits / month", "10 seats", "100 GB storage", "Agents and API access"] },
  { name: "Team", price: 99, credits: 150000, seats: 25, storage: 1000, description: "For growing teams with more seats", features: ["150,000 credits / month", "25 seats", "1 TB storage", "SSO and audit log"] },
];
type Plan = typeof plans[number];
interface BillingState { plan: string; cycle: "Monthly" | "Yearly"; canceled: boolean; email: string; last4: string; expiry: string }
const initialBilling: BillingState = { plan: "Pro", cycle: "Monthly", canceled: false, email: "billing@acme.com", last4: "4242", expiry: "2028-08" };
const invoices = [
  { date: "Oct 12, 2026", id: "INV-2026-0412", amount: 49, status: "Due" },
  { date: "Sep 12, 2026", id: "INV-2026-0371", amount: 49, status: "Paid" },
  { date: "Aug 12, 2026", id: "INV-2026-0329", amount: 69, status: "Paid" },
  { date: "Jul 12, 2026", id: "INV-2026-0288", amount: 49, status: "Paid" },
  { date: "Jun 12, 2026", id: "INV-2026-0240", amount: 49, status: "Paid" },
];
const categories = [{ label: "Chat", value: 18400 }, { label: "Agents", value: 9200 }, { label: "API", value: 4100 }, { label: "Images", value: 2300 }];
const formatPrice = (value: number) => Math.round(value).toString();
function subscribe(listener: () => void) { window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener); }
function tabSnapshot(): Tab { const value = new URLSearchParams(window.location.search).get("settings-tab"); return tabs.find(tab => tab.toLowerCase().replaceAll(" ", "-") === value) || "Billing"; }
function Icon({ name }: { name: string }) { const svg = (icons as Record<string, string>)[name]; return svg ? <span className="crm-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} /> : null; }
const UsagePanel = memo(function UsagePanel({ plan, workspaceId, onUpgrade }: { plan: Plan; workspaceId: string; onUpgrade: () => void }) {
  const [members] = useStoredState(`affectui:${workspaceId}:settings-members`, initialMembers);
  return <div className="ui-sb-usage"><UsageMeter title="Usage this period" plan={`${plan.name} plan`} total={plan.credits} used={categories} daily={days.slice(0,30)} resetLabel="Resets in 24 days" resetTitle="Resets on Nov 12, 2026" limits={[{label:"Seats",used:members.length + 3,total:plan.seats},{label:"Storage",used:42.6,total:plan.storage,unit:"GB",decimals:1}]} onUpgrade={onUpgrade} /></div>;
});

export function SettingsBilling({ workspaceId, workspaceName, onRename, onLogoChange, notify }: { workspaceId: string; workspaceName: string; onRename: (name: string) => void; onLogoChange: (logo: string) => void; notify: (message: string) => void }) {
  const tab = useSyncExternalStore(subscribe, tabSnapshot, () => "Billing" as Tab);
  const [billing, setBilling] = useStoredState(`affectui:${workspaceId}:settings-billing`, initialBilling);
  const [cycle, setCycle] = useState<"Monthly" | "Yearly">("Monthly");
  const [emailEdit, setEmailEdit] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selected, setSelected] = useState<Plan | null>(null);
  const plansRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const plan = plans.find(item => item.name === billing.plan) || plans[1];
  const price = (item: Plan, period = cycle) => period === "Yearly" ? Math.round(item.price * 0.8) : item.price;
  function selectTab(next: Tab) {
    const url = new URL(window.location.href);
    if (next === "Billing") url.searchParams.delete("settings-tab"); else url.searchParams.set("settings-tab", next.toLowerCase().replaceAll(" ", "-"));
    if (url.href !== window.location.href) { window.history.pushState({}, "", url); window.dispatchEvent(new PopStateEvent("popstate")); }
  }
  function showPlans() { plansRef.current?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" }); plansRef.current?.focus({ preventScroll: true }); }
  function exportInvoices(id?: string) {
    const rows = invoices.filter(item => !id || item.id === id);
    downloadFile(`${id || "acme-invoices"}.csv`, toCsv([["Workspace", workspaceName], ["Billing email", billing.email], ["Date", "Invoice", "Amount USD", "Status"], ...rows.map(item => [item.date, item.id, item.amount.toFixed(2), item.status])]), "text/csv;charset=utf-8");
    notify(id ? `${id} downloaded` : "All invoices downloaded");
  }
  return <LayoutGroup id="settings"><div className="ui-sb">
    <h1 className="ui-as-page-title">Settings</h1><p className="ui-as-page-sub">Manage your workspace, your team, your plan and access to the API.</p>
    <div className="ui-as-toolbar ui-sb__bar"><div className="ui-as-tabs" role="tablist" aria-label="Settings" onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const index = tabs.indexOf(tab); const next = tabs[event.key === "Home" ? 0 : event.key === "End" ? 3 : (index + (event.key === "ArrowRight" ? 1 : 3)) % 4]; selectTab(next); event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
    }}>{tabs.map(name => <button type="button" key={name} id={`settings-tab-${name.replaceAll(" ", "-")}`} data-tab={name} role="tab" className="ui-as-tabs__tab" aria-selected={tab === name} aria-controls="settings-panel" tabIndex={tab === name ? 0 : -1} onClick={() => selectTab(name)}>{tab === name && <motion.span className="settings-tab-pill" layoutId="settings-tab" transition={{ type: "spring", stiffness: 450, damping: 38 }} />}<span>{name}</span></button>)}</div></div>
    <AnimatePresence mode="wait" initial={false}><motion.div className="ui-sb__body" id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab.replaceAll(" ", "-")}`} key={`${workspaceId}:${tab}`} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-3}} transition={{duration:reduce ? 0 : 0.16}}>
      {tab === "General" ? <GeneralSettings workspaceId={workspaceId} workspaceName={workspaceName} onRename={onRename} onLogoChange={onLogoChange} notify={notify} /> : tab === "Members" ? <MembersSettings workspaceId={workspaceId} seatLimit={plan.seats} notify={notify} /> : tab === "API keys" ? <ApiKeysSettings workspaceId={workspaceId} notify={notify} /> : <>
        <div className="ui-sb-overview"><UsagePanel plan={plan} workspaceId={workspaceId} onUpgrade={showPlans} /><div className="ui-sb-stack">
          <div className="ui-sb-card ui-sb-plan"><div className="ui-sb-plan__top"><span className="ui-sb-cap">Current plan</span><span className="ui-sb-pill" data-tone={billing.canceled ? "amber" : "green"}>{billing.canceled ? "Cancels soon" : "Active"}</span></div><div className="ui-sb-plan__name">{plan.name} <span>· ${price(plan,billing.cycle)}/mo</span></div><p className="ui-sb-muted">{billing.canceled ? "Your plan ends on Nov 12, 2026. You keep every feature until then." : `Renews on Nov 12, 2026 · billed ${billing.cycle.toLowerCase()}`}</p><div className="ui-sb-actions"><button type="button" className="ui-button" data-variant="primary" data-size="sm" onClick={showPlans}><span className="ui-button__label">Change plan</span></button><button type="button" className="ui-button" data-variant="ghost" data-size="sm" onClick={() => { setBilling({...billing,canceled:!billing.canceled}); notify(billing.canceled ? "Plan resumed in this demo" : "Plan canceled in this demo – active until Nov 12, 2026"); }}><span className="ui-button__label">{billing.canceled ? "Resume plan" : "Cancel plan"}</span></button></div></div>
          <div className="ui-sb-card ui-sb-pay"><div className="ui-sb-pay__row"><span className="ui-sb-visa">VISA</span><div className="ui-sb-pay__text"><b>Visa •••• {billing.last4}</b><span>Expires {billing.expiry.slice(5)}/{billing.expiry.slice(0,4)}</span></div><button type="button" className="ui-button" data-variant="secondary" data-size="sm" onClick={() => setPaymentOpen(true)}><span className="ui-button__icon"><Icon name="Update" /></span><span className="ui-button__label">Update</span></button></div><div className="ui-sb-pay__row"><span className="ui-sb-tile"><Mail size={15} /></span>{emailEdit ? <form className="ui-sb-inline" onSubmit={event => {event.preventDefault();const email = String(new FormData(event.currentTarget).get("email")).trim();setBilling({...billing,email});setEmailEdit(false);notify("Billing email saved");}} onKeyDown={event=>{if(event.key==="Escape")setEmailEdit(false);}}><input className="ui-sb-input" name="email" type="email" aria-label="Billing email" required autoFocus defaultValue={billing.email} /><button className="ui-button" data-variant="primary" data-size="sm" type="submit"><span className="ui-button__label">Save</span></button><button className="ui-button" data-variant="ghost" data-size="sm" type="button" onClick={()=>setEmailEdit(false)}><span className="ui-button__label">Cancel</span></button></form> : <><div className="ui-sb-pay__text"><b>{billing.email}</b><span>Invoices and receipts go here</span></div><button type="button" className="ui-button" data-variant="secondary" data-size="sm" onClick={()=>setEmailEdit(true)}><span className="ui-button__label">Edit</span></button></>}</div></div>
        </div></div>
        <section className="ui-sb-section" ref={plansRef} tabIndex={-1} aria-labelledby="settings-plans"><div className="ui-sb-section__head"><div><h2 className="ui-sb-h2" id="settings-plans">Plans</h2><p className="ui-sb-muted">Switch any time – we prorate the difference.</p></div><div className="ui-seg" data-size="sm"><div className="ui-seg__scroller"><div className="ui-seg__track" role="radiogroup" aria-label="Billing frequency" onKeyDown={event=>{if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();const next=cycle==="Monthly" ? "Yearly" : "Monthly";setCycle(next);event.currentTarget.querySelector<HTMLButtonElement>(`[data-cycle="${next}"]`)?.focus();}}}>{(["Monthly","Yearly"] as const).map(value=><button type="button" className="ui-seg__opt" key={value} data-cycle={value} role="radio" aria-checked={cycle===value} data-active={cycle===value ? "" : undefined} tabIndex={cycle===value ? 0 : -1} onClick={()=>setCycle(value)}>{cycle===value && <motion.span className="settings-cycle-pill" layoutId="billing-frequency" transition={{type:"spring",stiffness:450,damping:38}} />}<span className="ui-seg__content"><span className="ui-seg__label"><span className="ui-seg__text">{value}</span><span className="ui-seg__text ui-seg__text-bold" aria-hidden="true">{value}</span></span>{value==="Yearly" && <span className="ui-seg__badge">−20%</span>}</span></button>)}</div></div></div></div>
          <div className="ui-sb-plans">{plans.map(item=>{const current=plan.name===item.name && billing.cycle===cycle;return <div className="ui-sb-card ui-sb-tier" key={item.name} data-current={current ? "" : undefined}><div className="ui-sb-tier__top"><b>{item.name}</b>{current && <span className="ui-sb-pill">Current</span>}</div><div className="ui-sb-tier__price"><strong>$<AnimatedNumber value={price(item)} format={formatPrice} /></strong><span>/ month</span></div><p className="ui-sb-muted">{item.description}</p><ul className="ui-sb-tier__list">{item.features.map(text=><li key={text}><Check size={14} />{text}</li>)}</ul><button type="button" className="ui-button" data-variant={item.name==="Team" ? "primary" : "secondary"} data-size="sm" disabled={current} onClick={()=>setSelected(item)}><span className="ui-button__label">{current ? "Current plan" : `Switch to ${item.name}`}</span></button></div>;})}</div>
        </section>
        <section className="ui-sb-section"><div className="ui-sb-section__head"><h2 className="ui-sb-h2">Invoices</h2><button type="button" className="ui-button" data-variant="secondary" data-size="sm" onClick={()=>exportInvoices()}><span className="ui-button__icon"><Download size={15} /></span><span className="ui-button__label">Download all</span></button></div><div className="ui-sb-table-wrap" tabIndex={0} role="region" aria-label="Invoice history"><table className="ui-sb-table"><thead><tr><th scope="col">Date</th><th scope="col">Invoice</th><th scope="col" className="ui-sb-num">Amount</th><th scope="col">Status</th><th scope="col" className="ui-sb-end"><span className="settings-sr-only">Download</span></th></tr></thead><tbody>{invoices.map(item=><tr key={item.id}><td>{item.date}</td><td className="ui-sb-mono">{item.id}</td><td className="ui-sb-num">${item.amount.toFixed(2)}</td><td><span className="ui-sb-pill" data-tone={item.status==="Due" ? "amber" : "green"}>{item.status}</span></td><td className="ui-sb-end"><button type="button" className="ui-as-tool" aria-label={`Download ${item.id}`} onClick={()=>exportInvoices(item.id)}><Icon name={`Download ${item.id}`} /></button></td></tr>)}</tbody></table></div></section>
      </>}
    </motion.div></AnimatePresence>
    <WorkspaceDialog open={paymentOpen} title="Update payment method" onClose={()=>setPaymentOpen(false)}><form className="settings-dialog-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setBilling({...billing,last4:String(data.get("last4")),expiry:String(data.get("expiry"))});setPaymentOpen(false);notify("Demo payment method updated");}}><p>Update the card shown in this local demo. No payment is processed.</p><label>Card ending<input className="ui-sb-input" name="last4" aria-label="Card ending" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required defaultValue={billing.last4} /></label><label>Expiry<input className="ui-sb-input" name="expiry" type="month" min="2026-10" required defaultValue={billing.expiry} /></label><div className="ui-sb-actions"><button type="button" className="ui-button" data-variant="secondary" data-size="sm" onClick={()=>setPaymentOpen(false)}><span className="ui-button__label">Cancel</span></button><button type="submit" className="ui-button" data-variant="primary" data-size="sm"><span className="ui-button__icon"><CreditCard size={15} /></span><span className="ui-button__label">Save payment method</span></button></div></form></WorkspaceDialog>
    <WorkspaceDialog open={selected!==null} title="Change plan" onClose={()=>setSelected(null)}>{selected && <div className="settings-dialog-form"><p>Switch {workspaceName} to <strong>{selected.name}</strong> for <strong>${price(selected)}/month</strong>, billed {cycle.toLowerCase()}{cycle==="Yearly" ? ` ($${price(selected)*12}/year)` : ""}.</p><p>This updates the local demo. No charge is made.</p><div className="ui-sb-actions"><button type="button" className="ui-button" data-variant="secondary" data-size="sm" onClick={()=>setSelected(null)}><span className="ui-button__label">Keep {plan.name}</span></button><button type="button" className="ui-button" data-variant="primary" data-size="sm" onClick={()=>{setBilling({...billing,plan:selected.name,cycle,canceled:false});setSelected(null);notify(`Switched to ${selected.name} · billed ${cycle.toLowerCase()}`);}}><span className="ui-button__label">Confirm switch</span></button></div></div>}</WorkspaceDialog>
  </div></LayoutGroup>;
}
