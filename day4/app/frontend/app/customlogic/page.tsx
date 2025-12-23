'use client';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import idl from "@/idl/escrow_application.json";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccount,
  getMinimumBalanceForRentExemptAccount,
  createMintToInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token"

import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from "@solana/web3.js";

export default function Customlogic(){
  const {connection} = useConnection();
  const wallet = useWallet();

  if (!wallet.connect && !connection){
    return null;
  }

  let provider = new anchor.AnchorProvider(
    connection,
    wallet as any,
    { preflightCommitment: "processed" }
  );
  
  let program = new Program(
    idl as anchor.Idl,
    provider
  );

  const runtimeescrowflow = async() => {
    const maker_mint = Keypair.generate();
    const taker_mint = Keypair.generate();

    let rent_exemption = await getMinimumBalanceForRentExemptMint(connection);
    
    if (!wallet.publicKey) {
      console.error("Wallet not connected");
      return;
    }

    // Create both mints
    let tx_create_mint = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: maker_mint.publicKey,
        space: MINT_SIZE,
        lamports: rent_exemption,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        maker_mint.publicKey,
        6,
        wallet.publicKey,
        wallet.publicKey,
        TOKEN_PROGRAM_ID,
      ),
      // Taker mint
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: taker_mint.publicKey,
        space: MINT_SIZE,
        lamports: rent_exemption,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        taker_mint.publicKey,
        6,
        wallet.publicKey,
        wallet.publicKey,
        TOKEN_PROGRAM_ID,
      ),
    );

    let tx = await wallet.sendTransaction(tx_create_mint, connection, {
      signers: [maker_mint, taker_mint],
    });
    console.log("Transaction for the mint: " + tx);

    // Create 4 ATAs: 
    // 1. Maker's ATA for maker_mint (to deposit from)
    // 2. Maker's ATA for taker_mint (to receive swapped tokens)
    // 3. Taker's ATA for taker_mint (to deposit from - but using same wallet, so it's wallet's ATA)
    // 4. Taker's ATA for maker_mint (to receive swapped tokens - but using same wallet)

    const maker_ata_maker_mint = await getAssociatedTokenAddress(
      maker_mint.publicKey,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    const maker_ata_taker_mint = await getAssociatedTokenAddress(
      taker_mint.publicKey,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    // Since you're using the same wallet for both maker and taker,
    // these are the same as above, but I'm keeping them separate for clarity
    const taker_ata_taker_mint = await getAssociatedTokenAddress(
      taker_mint.publicKey,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    const taker_ata_maker_mint = await getAssociatedTokenAddress(
      maker_mint.publicKey,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const tx_create_ata = new Transaction().add(
      // Create maker's ATA for maker_mint
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        maker_ata_maker_mint,
        wallet.publicKey,
        maker_mint.publicKey,
        TOKEN_PROGRAM_ID,
      ),
      // Create maker's ATA for taker_mint (to receive swapped tokens)
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        maker_ata_taker_mint,
        wallet.publicKey,
        taker_mint.publicKey,
        TOKEN_PROGRAM_ID,
      ),
      // Mint tokens to maker's maker_mint ATA
      createMintToInstruction(
        maker_mint.publicKey,
        maker_ata_maker_mint,
        wallet.publicKey,
        100_000,
        [],
        TOKEN_PROGRAM_ID
      ),
      // Mint tokens to taker's taker_mint ATA (same wallet)
      createMintToInstruction(
        taker_mint.publicKey,
        taker_ata_taker_mint,
        wallet.publicKey,
        100_000,
        [],
        TOKEN_PROGRAM_ID
      ),
    );
    
    let tx_sample = await wallet.sendTransaction(tx_create_ata, connection);
    console.log("Transaction for creating the Token Accounts: " + tx_sample);

    // Find escrow PDA
    const [escrowpda, escrowbump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        wallet.publicKey.toBuffer(),
        maker_mint.publicKey.toBuffer(),
      ],
      program.programId
    );

    const escrow_maker_pda = await getAssociatedTokenAddress(
      maker_mint.publicKey,
      escrowpda,
      true,
      TOKEN_PROGRAM_ID
    );

    const escrow_taker_pda = await getAssociatedTokenAddress(
      taker_mint.publicKey,
      escrowpda,
      true,
      TOKEN_PROGRAM_ID
    );
  
    // Initialize escrow
    let tx_inizialse = await program.methods.inizialiseEscrow(
      new anchor.BN(100),
      new anchor.BN(100)
    ).accounts({
      maker: wallet.publicKey,
      taker: wallet.publicKey,
      mintMaker: maker_mint.publicKey,
      mintTaker: taker_mint.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();
    console.log("Initialize escrow tx: " + tx_inizialse);

    // Deposit maker tokens
    let tx_deposit_maker = await program.methods.depositMaker().accounts({
      escrow: escrowpda,
      maker: wallet.publicKey,
      mintAta: maker_ata_maker_mint,
      mintMaker: maker_mint.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();
    console.log("Deposit maker tx: " + tx_deposit_maker);
  
    // Deposit taker tokens
    let tx_deposit_taker = await program.methods.depositTaker().accounts({
      escrow: escrowpda,
      taker: wallet.publicKey,
      mintTakerAta: taker_ata_taker_mint,
      mintTaker: taker_mint.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();
    console.log("Deposit taker tx: " + tx_deposit_taker);

    // Execute swap
    const tx1 = await program.methods.execute().accounts({
            escrow: escrowpda,
            maker: wallet.publicKey!,
            makeAta: maker_ata_taker_mint,
            takerAta: taker_ata_maker_mint,
            escrowMakerAta: escrow_maker_pda,
            escrowTakeAta: escrow_taker_pda,
            tokenProgram: TOKEN_PROGRAM_ID,
            }).transaction();

    tx1.feePayer = wallet.publicKey!;
    tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const sig = await wallet.sendTransaction(tx1, connection);
        console.log("Execute swap tx:", sig);
  }
    
  return (
    <div>
      <div style={{ padding: 24 }}>
        <h2>Escrow Application (Production Style)</h2>
        <button onClick={runtimeescrowflow}>
          Run Escrow Flow
        </button>
      </div>
    </div>
  )
}