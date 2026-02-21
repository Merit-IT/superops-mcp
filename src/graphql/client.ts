import { GraphQLClient } from 'graphql-request';

// --- CONFIGURATION ---
const API_KEY = process.env.SUPEROPS_API_KEY;
const SUBDOMAIN = process.env.SUPEROPS_SUBDOMAIN;
const API_URL = "https://api.superops.ai/msp";

if (!API_KEY || !SUBDOMAIN) {
  console.error("Error: Missing API_KEY or SUBDOMAIN.");
  process.exit(1);
}

// --- GRAPHQL CLIENT SETUP ---
export const graphQLClient = new GraphQLClient(API_URL, {
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    CustomerSubDomain: SUBDOMAIN,
    "Content-Type": "application/json",
  },
});
