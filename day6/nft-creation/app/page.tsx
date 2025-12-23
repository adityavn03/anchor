"use client";
import dynamic from "next/dynamic";

export default function Home(){

  const Fullflow=dynamic(()=>import("./wallethandler/page"),{
    ssr:false,
  })

  return(
    <div>
      <Fullflow/>

    </div>
  )

}