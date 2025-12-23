import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CpiContract } from "../target/types/cpi_contract";
import { Keypair,PublicKey } from "@solana/web3.js";
import { getMint,getAccount,getAssociatedTokenAddress} from "@solana/spl-token";

describe("day2", () => {
  // Configure the client to use the local cluster.
  const provider=anchor.AnchorProvider.local();
  anchor.setProvider(provider);


  const program = anchor.workspace.CpiContract as Program<CpiContract>;
  let authority=provider.wallet.publicKey;
  let mintPubkey:anchor.web3.PublicKey;


  it("Is initialized!", async () => {
    // Add your test here.

    let mintKeypair=anchor.web3.Keypair.generate();
    mintPubkey=mintKeypair.publicKey;

    const tx = await program.methods.inizializeMint().accounts({
      mint:mintPubkey,
      authority:authority,
    }).signers([mintKeypair]).rpc();
    console.log("Your transaction signature", tx);
    const mintinfo=await getMint(provider.connection,mintPubkey);
    console.log(mintinfo);
  })

  it("it the mint the token ",async()=>{
    const amountToMint=100_000_000;
    const user_ata=await getAssociatedTokenAddress(
      mintPubkey,
      authority,
      false,
      anchor.utils.token.TOKEN_PROGRAM_ID,
      anchor.utils.token.ASSOCIATED_PROGRAM_ID,

    )
    const tx=await program.methods.mintToken(new anchor.BN(100_000_000)).accounts({
      mint:mintPubkey,
      authority:authority,
  
    }).rpc();
    const tokenacc=await getAccount(provider.connection,user_ata);
    console.log("amount minted : ",tokenacc.amount);
  })
  
});
