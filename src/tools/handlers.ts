import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ListInfoInput } from "../models/Superops.js";
import { superopsQuery, superopsListQuery, type ClientSiteIdentifierInput, type InvoiceIdentifierInput, ClientIdentifierInput, ContractIdentifierInput } from "../graphql/executor.js";
import {
  GET_TICKET_LIST_FULL,
  GET_INVOICE_LIST,
  GET_INVOICE,
  GET_CLIENT_LIST,
  GET_CLIENT_SITE,
  GET_WORKLOG_ENTRIES,
  GET_CLIENT_CONTRACT_LIST,
  GET_CLIENT,
  GET_CLIENT_CONTRACT,
  GET_CLIENT_CUSTOM_FIELD_LIST,
  GET_CLIENT_CUSTOM_FIELD,
} from "../graphql/queries.js";

export async function handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_tickets":
        return await handleListTickets(request);

      case "list_invoices":
        return await handleListInvoices(request);

      case "list_clients":
        return await handleListClients(request);

      case "list_client_site":
        return await handleListClientSite(request);

      case "list_invoice":
        return await handleInvoice(request);

      case "list_client":
        return await handleClient(request);

      case "list_worklog_entries":
        return await handleListWorklogEntries(request);

      case "list_client_contract":
        return await handleClientContract(request);

      case "list_client_contracts":
        return await handleListClientContract(request);

      case "client_custom_fields":
        return await handleClientCustomFields(request);

      case "client_custom_field":
        return await handleClientCustomField(request);
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
}

async function handleListTickets(request: CallToolRequest): Promise<CallToolResult> {
  const args = request.params?.arguments;
  const data = await superopsListQuery(GET_TICKET_LIST_FULL, {
    condition: args?.condition,
    page: args?.page || 1,
    pageSize: args?.pageSize || 5,
  } as ListInfoInput);

  const ticketsData = data?.data?.getTicketList;
  if (!ticketsData) {
    throw new Error("No ticket data returned from API. Check your filters or API response.");
  }

  const tickets = ticketsData.tickets || [];
  return { content: [{ type: "text", text: JSON.stringify(tickets, null, 2) }] };
}

async function handleListInvoices(request: CallToolRequest): Promise<CallToolResult> {
  const limit = request.params?.arguments?.limit || 5;
  const data = await superopsListQuery(GET_INVOICE_LIST, {
    pageSize: Number(limit),
  });

  const invoicesData = data?.data?.getInvoiceList;
  if (!invoicesData) {
    throw new Error("No invoice data returned from API. Check your filters or API response.");
  }

  const invoices = invoicesData.invoices || [];
  return { content: [{ type: "text", text: JSON.stringify(invoices, null, 2) }] };
}

async function handleListClients(request: CallToolRequest): Promise<CallToolResult> {
  const data = await superopsListQuery(GET_CLIENT_LIST, {
    condition: request.params?.arguments?.condition,
    page: request.params?.arguments?.page || 1,
    pageSize: request.params?.arguments?.pageSize || 100,
  } as ListInfoInput);

  const clientsData = data?.data?.getClientList;
  if (!clientsData) {
    throw new Error("No client data returned from API. Check your filters or API response.");
  }

  const clients = clientsData.clients || [];
  return { content: [{ type: "text", text: JSON.stringify(clients, null, 2) }] };
}

async function handleClientCustomFields(request: CallToolRequest): Promise<CallToolResult> {
  const data = await superopsQuery(GET_CLIENT_CUSTOM_FIELD_LIST);

  const clientCustomFields = data?.data?.getClientCustomFieldList;
  if (!clientCustomFields) {
    throw new Error("No client custom field data returned from API. Check your filters or API response.");
  }

  return { content: [{ type: "text", text: JSON.stringify(clientCustomFields, null, 2) }] };
}

async function handleClientCustomField(request: CallToolRequest): Promise<CallToolResult> {
  const data = await superopsQuery(GET_CLIENT_CUSTOM_FIELD, {
    fieldId: request.params?.arguments?.id,
  } as { fieldId : string });

  const getClientCustomField = data?.data?.getClientCustomField;
  if (!getClientCustomField) {
    throw new Error("No client custom field data returned from API. Check your filters or API response.");
  }

  return { content: [{ type: "text", text: JSON.stringify(getClientCustomField, null, 2) }] };
}

async function handleListClientSite(request: CallToolRequest): Promise<CallToolResult> {
  if (!request.params?.arguments?.id) {
    throw new Error("Client Site ID is required.");
  }

  const data = await superopsQuery(GET_CLIENT_SITE, {
    id: request.params?.arguments?.id,
  } as ClientSiteIdentifierInput);

  const clientSite = data?.data?.getClientSite;
  if (!clientSite) {
    throw new Error("No client site data returned from API. Check your filters or API response.");
  }

  return { content: [{ type: "text", text: JSON.stringify(clientSite, null, 2) }] };
}

async function handleInvoice(request: CallToolRequest): Promise<CallToolResult> {
  if (!request.params?.arguments?.id) {
    throw new Error("Invoice ID is required.");
  }

  const data = await superopsQuery(GET_INVOICE, {
    invoiceId: request.params?.arguments?.invoiceId,
  } as InvoiceIdentifierInput);

  const invoice = data?.data?.getInvoice;
  if (!invoice) {
    throw new Error("No invoice data returned from API. Check your filters or API response.");
  }

  return { content: [{ type: "text", text: JSON.stringify(invoice, null, 2) }] };
}

async function handleClient(request: CallToolRequest): Promise<CallToolResult> {
  if (!request.params?.arguments?.id) {
    throw new Error("Client ID is required.");
  }

  const data = await superopsQuery(GET_CLIENT, {
    accountId: request.params?.arguments?.id,
  } as ClientIdentifierInput);

  const client = data?.data?.getClient;
  if (!client) {
    throw new Error("No client data returned from API. Check your filters or API response.");
  }

  return { content: [{ type: "text", text: JSON.stringify(client, null, 2) }] };
}

async function handleClientContract(request: CallToolRequest): Promise<CallToolResult> {
  if (!request.params?.arguments?.id) {
    throw new Error("Client Contract ID is required.");
  }

  const data = await superopsQuery(GET_CLIENT_CONTRACT, {
    contractId: request.params?.arguments?.id,
  } as ContractIdentifierInput);

  const clientContract = data?.data?.getClientContract;
  if (!clientContract) {
    throw new Error("No client contract data returned from API. Check your filters or API response.");
  }

  return { content: [{ type: "text", text: JSON.stringify(clientContract, null, 2) }] };
}

async function handleListClientContract(request: CallToolRequest): Promise<CallToolResult> {
  const data = await superopsListQuery(GET_CLIENT_CONTRACT_LIST, {
    condition: request.params?.arguments?.condition,
    page: request.params?.arguments?.page || 1,
    pageSize: request.params?.arguments?.pageSize || 100,
  } as ListInfoInput);

  const clientContractsData = data?.data?.getClientContractList;
  if (!clientContractsData) {
    throw new Error("No client contract data returned from API. Check your filters or API response.");
  }

  const clientContracts = clientContractsData.clientContracts || [];
  return { content: [{ type: "text", text: JSON.stringify(clientContracts, null, 2) }] };
}

  async function handleListWorklogEntries(request: CallToolRequest): Promise<CallToolResult> {
  if (!request.params?.arguments?.module) {
    throw new Error("Module is required of type \"TICKETS\" or \"PROJECTS\".");
  }
    const data = await superopsListQuery(GET_WORKLOG_ENTRIES, {
      module: request.params?.arguments?.module,
      listInfo: {
        page: request.params?.arguments?.page || 1,
        sort: request.params?.arguments?.sort,
        condition: request.params?.arguments?.condition,
        pageSize: request.params?.arguments?.pageSize || 100,
      } as ListInfoInput,
    });

  const workLogEntry = data?.data?.getWorklogEntries;
  if (!workLogEntry) {
    throw new Error("No worklog entry data returned from API. Check your filters or API response.");
  }

  return { content: [{ type: "text", text: JSON.stringify(workLogEntry, null, 2) }] };
}

