import { AgentShowcase } from "./agentShowcase/AgentShowcase";

/* The reference's Sessions on-demand banner slot ("main > section" 3). The section and container keep the
   reference classes so the page rhythm is unchanged; the banner is replaced by the iPhone Duo showcase
   running the Agent Steering demo. */
export function SessionsBanner() {
  return (
    <section className="hds-color-mode section section--white hds-mode--light">
      <div className="section-container sessions-section">
        <AgentShowcase />
      </div>
    </section>
  );
}
