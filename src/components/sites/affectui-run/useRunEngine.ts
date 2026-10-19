"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStoredState } from "../affectui-crm/workspace-state";
import { createRun, runReducer, type RunAction } from "./run-model";
import { defaultRunSteps } from "./run-seed";

const initialRun=createRun(defaultRunSteps);
export function useRunEngine(workspaceId:string){
  const [snapshot,setSnapshot]=useStoredState(`affectui:${workspaceId}:agent-run`,initialRun);
  const [replay,setReplay]=useState(0);
  const latest=useRef(snapshot);
  useEffect(()=>{latest.current=snapshot;},[snapshot]);
  const dispatch=useCallback((action:RunAction)=>setSnapshot(current=>runReducer(current,action)),[setSnapshot]);
  useEffect(()=>{
    const timer=window.setTimeout(()=>dispatch({type:"start",now:Date.now()}),0);
    return()=>window.clearTimeout(timer);
  },[dispatch,workspaceId]);
  useEffect(()=>{
    if(snapshot.phase!=="running")return;
    let previous=performance.now();
    const timer=window.setInterval(()=>{
      const now=performance.now();
      if(document.visibilityState==="visible")dispatch({type:"tick",delta:Math.min(250,now-previous)});
      previous=now;
    },100);
    return()=>window.clearInterval(timer);
  },[snapshot.phase,dispatch]);
  function restart(){setSnapshot(createRun(latest.current.steps,Date.now()));setReplay(value=>value+1);}
  return {snapshot,dispatch,restart,replay};
}
