'use server';
/**
 * @fileOverview An AI flow to make customer support replies more professional.
 *
 * - professionalizeReply - A function that handles the reply professionalization.
 * - ProfessionalReplyInput - The input type for the professionalizeReply function.
 * - ProfessionalReplyOutput - The return type for the professionalizeReply function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProfessionalReplyInputSchema = z.object({
  rawReply: z.string().describe('The raw, unedited reply from the admin.'),
});
export type ProfessionalReplyInput = z.infer<
  typeof ProfessionalReplyInputSchema
>;

const ProfessionalReplyOutputSchema = z.object({
  professionalReply: z
    .string()
    .describe('The rewritten, professional version of the reply.'),
});
export type ProfessionalReplyOutput = z.infer<
  typeof ProfessionalReplyOutputSchema
>;

export async function professionalizeReply(
  input: ProfessionalReplyInput
): Promise<ProfessionalReplyOutput> {
  return professionalizeReplyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'professionalizeReplyPrompt',
  input: {schema: ProfessionalReplyInputSchema},
  output: {schema: ProfessionalReplyOutputSchema},
  prompt: `You are an expert customer support agent. Your task is to rewrite the following reply to a user's support ticket. The rewritten reply should be professional, empathetic, and clear. Do not add any greetings or sign-offs that are not present in the original text. Just rewrite the core message.

Original Reply:
\'\'\'
{{{rawReply}}}
\'\'\'
`,
});

const professionalizeReplyFlow = ai.defineFlow(
  {
    name: 'professionalizeReplyFlow',
    inputSchema: ProfessionalReplyInputSchema,
    outputSchema: ProfessionalReplyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
