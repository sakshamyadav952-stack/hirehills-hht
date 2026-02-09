
'use server';
/**
 * @fileOverview A flow to translate text using a shared Firestore cache.
 *
 * - translateText - A function that handles text translation.
 * - TranslateInput - The input type for the translateText function.
 * - TranslateOutput - The return type for the translateText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Firebase Admin SDK initialization failed:', e);
  }
}
const db = getFirestore();

const TranslateInputSchema = z.object({
  texts: z.array(z.string()).describe('An array of strings to translate.'),
  targetLanguage: z.string().describe("The language code to translate to (e.g., 'es', 'fr')."),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

const TranslateOutputSchema = z.object({
  translations: z.record(z.string()).describe('A map of original text to translated text.'),
});
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

export async function translateText(
  input: TranslateInput
): Promise<TranslateOutput> {
  return translateFlow(input);
}

const translateFlow = ai.defineFlow(
  {
    name: 'translateFlow',
    inputSchema: TranslateInputSchema,
    outputSchema: TranslateOutputSchema,
  },
  async ({ texts, targetLanguage }) => {
    const translations: Record<string, string> = {};
    const textsToTranslate: string[] = [];
    const hashToTextMap: Record<string, string> = {};

    // 1. Check cache first
    const uniqueTexts = [...new Set(texts)]; // Remove duplicates
    
    for (const text of uniqueTexts) {
      if (!text) continue;
      const hash = createHash('sha256').update(text).digest('hex');
      hashToTextMap[hash] = text;
      const docRef = db.collection('translations').doc(targetLanguage).collection('phrases').doc(hash);
      const docSnap = await docRef.get();
      if (docSnap.exists()) {
        translations[text] = docSnap.data()?.translatedText;
      } else {
        textsToTranslate.push(text);
      }
    }

    // 2. Translate texts that were not in the cache
    if (textsToTranslate.length > 0) {
      try {
        const prompt = `Translate the following JSON array of strings from English into ${targetLanguage}.
        Your response MUST be a valid JSON object where each key is the original English string and the value is its translation.
        Do not include any other text or explanation in your response.

        Example Input: ["Hello World", "Start Mining"]
        Example Output for Spanish: {"Hello World": "Hola Mundo", "Start Mining": "Empezar a Minar"}

        Translate this array:
        ${JSON.stringify(textsToTranslate)}
        `;

        const aiResponse = await ai.generate({
          prompt: prompt,
          config: {
            responseFormat: "json",
          }
        });
        
        const responseText = aiResponse.text.trim();
        const newTranslations = JSON.parse(responseText);
        
        // 3. Save new translations to cache and add to our response object
        const batch = db.batch();
        for (const originalText in newTranslations) {
          if (Object.prototype.hasOwnProperty.call(newTranslations, originalText)) {
            const translatedText = newTranslations[originalText];
            translations[originalText] = translatedText;
            const hash = createHash('sha256').update(originalText).digest('hex');
            const docRef = db.collection('translations').doc(targetLanguage).collection('phrases').doc(hash);
            batch.set(docRef, { originalText, translatedText, createdAt: admin.firestore.FieldValue.serverTimestamp() });
          }
        }
        await batch.commit();

      } catch(e) {
        console.error("AI translation failed:", e);
        // In case of error, just return the original texts
        textsToTranslate.forEach(text => {
            translations[text] = text;
        });
      }
    }

    return { translations };
  }
);
