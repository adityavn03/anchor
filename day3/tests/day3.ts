import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {createMint,getOrCreateAssociatedTokenAccount, mintTo, getAssociatedTokenAddress, getAccount} from "@solana/spl-token";
import { TokenTransferDemo} from "../target/types/token_transfer_demo";


describe("day3", () => {
  // Configure the client to use the local cluster.
  const provider=anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenTransferDemo as Program<TokenTransferDemo>;
  const wallet = provider.wallet as anchor.Wallet;
  const payer = wallet.payer;
  const sender = wallet;

  let receiver:anchor.web3.Keypair;
  let mintacc:anchor.web3.PublicKey;
  let senderAss:anchor.web3.PublicKey;
  let receiverAss:anchor.web3.PublicKey;



  before("it seting up the test",async()=>{
    receiver=anchor.web3.Keypair.generate();
    mintacc =await createMint(
      provider.connection,
      payer,
      sender.publicKey,
      null,
      6,

    );
    senderAss=(await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mintacc,
      sender.publicKey,


    )).address;

    await mintTo(
      provider.connection,
      payer,
      mintacc,
      senderAss,
      sender.payer,
      100_000,
    )

    



  });

  it("Is initialized!", async () => {

    console.log(mintacc);

    // Add your test here.
   
    const tx = await program.methods.transferTokens(new anchor.BN(100_0)).accounts({
      sender:sender.publicKey,
      fromAta:senderAss,
      receiver:receiver.publicKey,
      mint:mintacc,
    }).rpc();
    receiverAss = await getAssociatedTokenAddress(
        mintacc,
        receiver.publicKey
);

    const senderamount=await getAccount(
      provider.connection,
      senderAss

    );
    const receiveramount=await getAccount(
      provider.connection,
      receiverAss,
    );
    console.log("sender amount "+senderamount.amount);
    console.log("receiver amount "+receiveramount.amount)
    console.log("Your transaction signature ", tx);
  });
});
