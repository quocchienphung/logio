"use client";

import { useEffect, useState } from "react";

/** Only text clocks tick while approval is pending. The workflow and storage remain paused. */
export function RunClock({base,waitingSince,format}:{base:number;waitingSince?:number;format:(ms:number)=>string}){
  const [now,setNow]=useState(0);
  useEffect(()=>{
    if(!waitingSince)return;
    const frame=requestAnimationFrame(()=>setNow(Date.now()));
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")setNow(Date.now());},100);
    return()=>{cancelAnimationFrame(frame);clearInterval(timer);};
  },[waitingSince]);
  return <>{format(base+(waitingSince ? Math.max(0,now-waitingSince) : 0))}</>;
}
