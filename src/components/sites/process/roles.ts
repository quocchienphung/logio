/**
 * What a block is for. A role is a label and a starting set of instructions: picking one fills the instructions of a new
 * block (the person can rewrite them) and tells a connected engine what the block is meant to do. The wording below is this
 * page's own default text, not something an AI vendor defines. `custom` is a block without a role.
 */
export type Role = "coordinator" | "planner" | "coder" | "fixer" | "reverter" | "revoker" | "instructor" | "helper" | "processor" | "custom";

export interface RoleInfo { id: Role; label: string; description: string; instructions: string; color: string }

export const roles: readonly RoleInfo[] = [
  { id: "coordinator", label: "Coordinator", color: "#4f46e5", description: "Splits the goal, hands each part to the right block and reports when everything is done.",
    instructions: "You coordinate this work. Split the goal into parts, hand each part to the block that fits it, keep track of what is finished and report when all of it is done. Do not do the parts yourself." },
  { id: "planner", label: "Planner", color: "#2f6bff", description: "Breaks a goal into small ordered steps and says who should do each one.",
    instructions: "You plan. Break the goal into small, ordered steps. For each step say what must be true when it is done and which block should do it. Do not carry the steps out." },
  { id: "coder", label: "Coder", color: "#0d9488", description: "Writes or changes code for the step it is given and explains what it changed.",
    instructions: "You write code. Make the change the step asks for, keep it small, and finish with a short note of what you changed and why." },
  { id: "fixer", label: "Fixer", color: "#d97706", description: "Finds why something fails, fixes the smallest part that is wrong and checks it works again.",
    instructions: "You fix problems. Find out why it fails, change the smallest part that is wrong, and run the check again. Say what was wrong and what you changed." },
  { id: "reverter", label: "Reverter", color: "#dc2626", description: "Undoes a change that went wrong and puts things back as they were.",
    instructions: "You undo changes. Put things back exactly as they were before the change that went wrong, check that they are, and list what you restored." },
  { id: "revoker", label: "Revoker", color: "#be185d", description: "Withdraws access, keys or permissions that are no longer needed or are no longer safe.",
    instructions: "You withdraw access. Revoke the keys, tokens and permissions that are no longer needed or are no longer safe, confirm each one is gone, and list what you revoked." },
  { id: "instructor", label: "Instructor", color: "#7c3aed", description: "Explains the result step by step, in plain words, for whoever has to follow it.",
    instructions: "You explain. Describe the result step by step in plain words for someone who was not here. Say what to do next and what to watch for." },
  { id: "helper", label: "Helper", color: "#0891b2", description: "Looks things up and answers the other blocks so they can keep working.",
    instructions: "You help the other blocks. Look up what they ask for, answer briefly and say how sure you are. Do not take over their work." },
  { id: "processor", label: "Processor", color: "#65a30d", description: "Takes in data or files, cleans and transforms them and passes the result on.",
    instructions: "You process data. Read what you are given, clean and transform it as the task says, and pass on a result in the same shape every time." },
  { id: "custom", label: "No role", color: "#8f8f8f", description: "A block you define yourself.", instructions: "" },
];

export const roleIds = roles.map(role => role.id);
export const roleOf = (id: Role) => roles.find(role => role.id === id) ?? roles[roles.length - 1];
