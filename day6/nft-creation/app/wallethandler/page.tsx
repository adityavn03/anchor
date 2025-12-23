"use client"
import {ConnectionProvider,WalletProvider} from "@solana/wallet-adapter-react";
import {WalletModalProvider,WalletMultiButton} from "@solana/wallet-adapter-react-ui"
import "@solana/wallet-adapter-react-ui/styles.css"
import {PhantomWalletAdapter} from "@solana/wallet-adapter-wallets"
import Nftcreation from "../custom/page";

export default function Wallethandler(){
    const wallets=[new PhantomWalletAdapter()]

    return(
        <div>
            <ConnectionProvider endpoint="https://api.devnet.solana.com">
              <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletMultiButton/>
                    <Nftcreation/>

                </WalletModalProvider>

              </WalletProvider>


            </ConnectionProvider>



        </div>
    )
}