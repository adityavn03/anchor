"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { percentAmount } from "@metaplex-foundation/umi";
import { generateSigner } from "@metaplex-foundation/umi";


const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjODVhNTcyOC1iYThiLTQ3MmMtYThlZi1lZDcyMTAyM2QyZDIiLCJlbWFpbCI6ImFkaXR5YS52bjA1QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI2YTU0YTIxYjI1OWUwMzFkN2IwZCIsInNjb3BlZEtleVNlY3JldCI6ImVjZjc1NGEyZTc0NWQ0MTk0OWIzZmNiNWY3OTJmOTlkZGQ4YjQxYzM4N2I0MjI5OTgyNDU1YzQ0MzkzZjg0YTUiLCJleHAiOjE3OTc5MjM2Mzl9.DHmndCayocaYZ6gQ2xnxkX-eKkvKpwoPT5abFuCMOxE"; // Replace with your JWT

export default function NormalNftMint() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [attributes, setAttributes] = useState<
    { trait_type: string; value: string }[]
  >([{ trait_type: "", value: "" }]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- ATTRIBUTE HANDLERS ---------------- */

  const updateAttribute = (
    index: number,
    field: "trait_type" | "value",
    value: string
  ) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  };

  /* =====================================================
     PINATA UPLOAD FUNCTIONS
  ===================================================== */

  const uploadToPinata = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  };

  const uploadJsonToPinata = async (json: any) => {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: json,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinata JSON upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  };

  /* =====================================================
     MAIN MINT FUNCTION
  ===================================================== */

  const mintNormalNftWithUmi = async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      throw new Error("Wallet not connected or signMessage not supported");
    }

    if (!imageFile) {
      throw new Error("Image not selected");
    }

   

    console.log("Starting mint process...");

    /* ---------------- STEP 1: UPLOAD IMAGE TO IPFS ---------------- */
    console.log("Uploading image to IPFS via Pinata...");
    const imageUri = await uploadToPinata(imageFile);
    console.log("Image uploaded:", imageUri);

    /* ---------------- STEP 2: UPLOAD METADATA TO IPFS ---------------- */
    console.log("Preparing metadata...");

    const metadata = {
      name,
      symbol: "NNFT",
      description,
      image: imageUri,
      attributes: attributes.filter((a) => a.trait_type && a.value),
    };

    console.log("Uploading metadata to IPFS...");
    const metadataUri = await uploadJsonToPinata(metadata);
    console.log("Metadata uploaded:", metadataUri);

    /* ---------------- STEP 3: CREATE UMI ---------------- */
    console.log("Creating UMI instance...");

    const umi = createUmi(clusterApiUrl("devnet"))
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata());

    /* ---------------- STEP 4: MINT NFT ---------------- */
    console.log("Minting NFT...");

    const mint = generateSigner(umi);

    await createNft(umi, {
      mint,
      name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5),
      tokenOwner: umi.identity.publicKey,
      isMutable: false,
    }).sendAndConfirm(umi);

    console.log("NFT minted successfully!");

    return {
      mintAddress: mint.publicKey.toString(),
      imageUri,
      metadataUri,
    };
  };

  /* ---------------- BUTTON HANDLER ---------------- */

  const handleMint = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await mintNormalNftWithUmi();
      setResult(res);
    } catch (err: any) {
      console.error("Mint error:", err);
      setError(err.message || "Mint failed");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="max-w-xl mx-auto p-6 border-2 border-black rounded-lg space-y-4 bg-white">
      <h2 className="text-2xl font-bold text-black">Mint Normal NFT</h2>

      <div className="p-3 bg-gray-100 border border-gray-400 rounded text-sm">
        <p className="font-semibold text-black">Setup Required:</p>
        <p className="text-gray-700">1. Sign up at <a href="https://pinata.cloud" target="_blank" className="text-black underline font-medium">pinata.cloud</a></p>
        <p className="text-gray-700">2. Get your JWT from API Keys section</p>
        <p className="text-gray-700">3. Replace PINATA_JWT in the code</p>
      </div>

      <input
        className="w-full border-2 border-black p-3 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
        placeholder="NFT Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <textarea
        className="w-full border-2 border-black p-3 rounded h-24 focus:outline-none focus:ring-2 focus:ring-gray-400"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="border-2 border-black rounded p-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="w-full"
        />
      </div>

      <div>
        <h3 className="font-semibold mb-3 text-black">Attributes</h3>

        {attributes.map((attr, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              className="border-2 border-black p-2 rounded w-1/2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Trait Type"
              value={attr.trait_type}
              onChange={(e) =>
                updateAttribute(i, "trait_type", e.target.value)
              }
            />
            <input
              className="border-2 border-black p-2 rounded w-1/2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Value"
              value={attr.value}
              onChange={(e) => updateAttribute(i, "value", e.target.value)}
            />
          </div>
        ))}

        <button 
          onClick={addAttribute} 
          className="text-sm font-medium text-black underline hover:no-underline"
        >
          + Add Attribute
        </button>
      </div>

      <button
        onClick={handleMint}
        disabled={loading}
        className="w-full bg-black text-white p-3 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Minting..." : "Mint NFT"}
      </button>

      {error && (
        <div className="p-4 bg-white border-2 border-black rounded">
          <p className="font-semibold text-black">Error:</p>
          <p className="text-sm text-gray-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-black text-white rounded">
          <p className="font-semibold mb-3">NFT Minted Successfully! 🎉</p>
          <div className="text-sm break-all space-y-2">
            <p>
              <b>Mint Address:</b> {result.mintAddress}
            </p>
            <p>
              <b>Image:</b>{" "}
              <a
                href={result.imageUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline hover:no-underline"
              >
                View on IPFS
              </a>
            </p>
            <p>
              <b>Metadata:</b>{" "}
              <a
                href={result.metadataUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline hover:no-underline"
              >
                View Metadata
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}