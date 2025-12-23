import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Nftescrow } from "../target/types/Nftescrow";
import {createAccount, createMint, getAccount, getAssociatedTokenAddress, mintTo, TOKEN_PROGRAM_ID} from "@solana/spl-token"
import { min } from "bn.js";

describe("day5", () => {
  // Configure the client to use the local cluster.
  let provider= anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Nftescrow as Program<Nftescrow>;

  let seller=provider.wallet;
  let buyer=anchor.web3.Keypair.generate();

  //mints
  let nft_mint:anchor.web3.PublicKey;
  let sellet_nft_ata:anchor.web3.PublicKey;
  let escrow_pda:anchor.web3.PublicKey;
  let escrow_ata:anchor.web3.PublicKey;
  let buyer_ata:anchor.web3.PublicKey;
  const price = new anchor.BN(1_000_000_000); // 1 SOL

 before("inzialising the mint accounts",async()=>{
   nft_mint=await createMint(
    provider.connection,
    seller.payer,
    seller.publicKey,
    null,
    0,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID,
  );
  
  sellet_nft_ata = await createAccount(
  provider.connection,
  seller.payer,
  nft_mint,
  seller.publicKey,
  undefined,
  undefined,
  TOKEN_PROGRAM_ID,

);

  await mintTo(
    provider.connection,
    seller.payer,
    nft_mint,
    sellet_nft_ata,
    seller.payer,
    1,

  )
  let seller_nft=await getAccount(
    provider.connection,
    sellet_nft_ata,

  )
  console.log(seller_nft.amount);

  [escrow_pda]=anchor.web3.PublicKey.findProgramAddressSync([
    Buffer.from("nftescrow"),
    seller.publicKey.toBuffer(),
    nft_mint.toBuffer()
  ],
  program.programId
);

 escrow_ata=await getAssociatedTokenAddress(
  nft_mint,
  escrow_pda,
  true
 );
 });
  it("airdrop the sol for the buyer",async()=>{
    let airdrop=await provider.connection.requestAirdrop(buyer.publicKey,2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(airdrop,"confirmed");
  });


  it("Is initialized!", async () => {
    const tx = await program.methods.listnft(price).accounts({
      seller:seller.publicKey,
      mint:nft_mint,
      sellerNftAta:sellet_nft_ata,
    }).rpc();
    console.log("Your transaction signature", tx);
    console.log("seller acount :"+ (await provider.connection.getBalance( seller.publicKey)));
    console.log("buyers acount :"+ (await provider.connection.getBalance( buyer.publicKey)));


  });
  it("buyer buys the nft from the from the list",async()=>{
    const tx=await program.methods.buynft().accounts({
      seller:seller.publicKey,
      buyer:buyer.publicKey,
      mint:nft_mint,
      escrowNft:escrow_ata,
    }).signers([buyer]).rpc();
    
    console.log("buyers nft account is :"+ (await getAssociatedTokenAddress(
      nft_mint,
      buyer.publicKey

    )));
    

    console.log("tx"+tx);
  })
});
