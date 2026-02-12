
import { Connection, PublicKey, Keypair, Transaction, clusterApiUrl } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as functions from "firebase-functions/v1";

const secretClient = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
    const [version] = await secretClient.accessSecretVersion({
        name: `projects/studio-7279145746-e15dc/secrets/${secretName}/versions/latest`,
    });

    const payload = version.payload?.data?.toString();

    if (!payload) {
        throw new Error(`Secret ${secretName} not found or empty`);
    }

    return payload;
}

async function loadWallet(secretName: string): Promise<Keypair> {
    const secret = await getSecret(secretName);
    const secretUint8 = Uint8Array.from(JSON.parse(secret));
    return Keypair.fromSecretKey(secretUint8);
}

const USDC_MINT_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Mainnet USDC
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

export async function isValidSolanaAddress(address: string): Promise<boolean> {
    try {
        const publicKey = new PublicKey(address);
        // A simple check to see if it's a valid public key on the curve.
        return PublicKey.isOnCurve(publicKey.toBuffer());
    } catch (error) {
        // If new PublicKey(address) fails (e.g., invalid base58 string), it will throw.
        console.error("Error validating Solana address:", error);
        return false;
    }
}


export async function transferUsdc(toAddressString: string, amountMicroUsdc: number): Promise<string> {
    try {
        const feePayer = await loadWallet("SOLANA_FEE_WALLET_KEY");
        const hotWallet = await loadWallet("SOLANA_HOT_WALLET_KEY");

        const toPublicKey = new PublicKey(toAddressString);

        const fromTokenAccount = await getAssociatedTokenAddress(
            USDC_MINT_ADDRESS,
            hotWallet.publicKey
        );

        const toTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
            connection,
            feePayer,
            USDC_MINT_ADDRESS,
            toPublicKey
        );

        const transaction = new Transaction().add(
            createTransferInstruction(
                fromTokenAccount,
                toTokenAccountInfo.address,
                hotWallet.publicKey,
                amountMicroUsdc
            )
        );

        const signature = await connection.sendTransaction(transaction, [feePayer, hotWallet]);
        await connection.confirmTransaction(signature, 'confirmed');

        return signature;

    } catch (error) {
        console.error("USDC Transfer failed:", error);

        if (error instanceof Error) {
            throw new functions.https.HttpsError('internal', `USDC Transfer failed: ${error.message}`);
        }

        throw new functions.https.HttpsError('internal', "Unknown error during USDC transfer");
    }
}
