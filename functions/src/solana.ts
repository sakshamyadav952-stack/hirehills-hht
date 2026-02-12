import { Connection, PublicKey, Keypair, Transaction, clusterApiUrl } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

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

export async function isValidUsdcAccount(address: string): Promise<boolean> {
    try {
        const publicKey = new PublicKey(address);
        const accountInfo = await connection.getParsedAccountInfo(publicKey);

        if (!accountInfo.value) return false;

        const data = accountInfo.value.data;

        // ✅ Safe type guard for ParsedAccountData
        if (typeof data === "object" && "parsed" in data) {
            const parsedData: any = data.parsed;

            return (
                accountInfo.value.owner.toBase58() === TOKEN_PROGRAM_ID.toBase58() &&
                parsedData.info?.mint === USDC_MINT_ADDRESS.toBase58()
            );
        }

        return false;

    } catch (error) {
        console.error("Error validating USDC account:", error);
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
            throw new Error(`USDC Transfer failed: ${error.message}`);
        }

        throw new Error("Unknown error during USDC transfer");
    }
}
