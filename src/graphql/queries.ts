import { gql } from 'graphql-request';

// #region --- TICKET QUERIES ---

export const GET_TICKET_LIST = gql`
  query getTicketList($input: ListInfoInput) {
    getTicketList(input: $input) {
      tickets {
        ticketNumber
        subject
        status
        createdTime
        priority
        client
      }
    }
  }
`;
export const GET_WORKLOG_ENTRIES = gql`
  query getWorklogEntries($input: GetWorklogEntriesInput!) {
    getWorklogEntries(input: $input) {
      entries {
        itemId
        status
        billDateTime
        workItem
        notes
        unitPrice
        serviceItem
        afterHours
        billable
        qty
        technician
      }
      listInfo {
      page
      pageSize
      }
    }
  }
`;
export const GET_TICKET_LIST_FULL = gql`
  query getTicketList($input: ListInfoInput!) {
    getTicketList(input: $input) {
      tickets {
        ticketId
        displayId
        subject
        createdTime
        status
        client
      }
      listInfo {
        totalCount
        page
        hasMore
      }
    }
  }
`;

// #endregion

// #region --- INVOICE QUERIES ---

export const GET_INVOICE_LIST = gql`
  query getInvoiceList($input: ListInfoInput!) {
    getInvoiceList(input: $input) {
      invoices {
        paymentDate
        invoiceId
        statusEnum
        displayId
        invoiceDate
        client
        items {
          quantity
          amount
          unitPrice
          taxable
          taxAmount
          tax
          serviceItem
        }
        dueDate
        totalAmount
        paymentLink
      }
      listInfo {
        totalCount
        page
        hasMore
      }
    }
  }
`;
export const GET_INVOICE = gql`
  query getInvoice($input: InvoiceIdentifierInput!) {
    getInvoice(input: $input) {
      invoiceId
      displayId
      client
      site
      invoiceDate
      dueDate
      statusEnum
      sentToClient
      discountAmount
      additionalDiscount
      additionalDiscountRate
      totalAmount
      notes
      paymentDate
      paymentMethod
      paymentReference
      invoicePaymentTerm
      items {
        itemId
        billedDate
        details
        amount
      }
    }
  }
`;

// #endregion

// #region --- CLIENT QUERIES ---

export const GET_CLIENT_LIST = gql`
  query getClientList($input: ListInfoInput!) {
    getClientList(input: $input) {
      clients {
        accountId
        name
        accountManager
        createdTime
        emailDomains
        hqSite
        status
        customFields
      }
      listInfo {
        totalCount
        page
        hasMore
      }
    }
  }
`;

export const GET_CLIENT_CUSTOM_FIELD_LIST = gql`
  query getClientCustomFieldList {
    getClientCustomFieldList {
      id
      columnName
      label
      description
      fieldType
      showToClient
    }
  }
`;

export const GET_CLIENT_CUSTOM_FIELD = gql`
query getClientCustomField($input: CustomFieldIdentifierInput) {
  getClientCustomField(input: $input) {
    id
    columnName
    label
    description
    fieldType
    showToClient
  }
}
`;
export const GET_CLIENT = gql`
  query getClient($input: ClientIdentifierInput!) {
      getClient(input: $input) {
      accountId
      name
      stage
      status
      emailDomains
      accountManager
      primaryContact
      secondaryContact
      hqSite
      technicianGroups
      customFields
    }
  }
`;
export const GET_CLIENT_SITE = gql`
  query getClientSite($input: ClientSiteIdentifierInput!) {
    getClientSite(input: $input) {
      id
      name
      businessHour {
        day
        end
        start
      }
      holidayList {
        id
        name
      }
      timezoneCode
      working24x7
      line1
      line2
      line3
      city
      postalCode
      countryCode
      stateCode
      contactNumber
      client
      hq
    }
  }
`;

// #endregion

// #region --- CONTRACT QUERIES ---
export const GET_CLIENT_CONTRACT_LIST = gql`
query getClientContractList($input: ListInfoInput) {
  getClientContractList(input: $input) {
    clientContracts {
      contractId
      startDate
      contract {
        contractId
        contractType
        description
        name
        billableContract {
          chargeItem
          discountRate
          includedItems
          perpetualContract {
            autoRenew
            contractId
          }
          sellingPrice {
            details {
              afterHoursValue
              value
            }
            model
          }
          blockItemsInfo {
            balance
            blockItemId
          }
          recurringContract {
            nextBillDate
            contractId
            recurringMode
            frequencyInterval
          }
          changes {
            effectiveDate
            quantity
            changeId
            endDate
            quantityChangeOperation
          }
        }
      }
    }
    listInfo {
      totalCount
      page
      hasMore
    }
  }
}

`;

export const GET_CLIENT_CONTRACT = gql`
query getClientContractList($input: ListInfoInput) {
  getClientContractList(input: $input) {
    clientContracts {
      contractId
      startDate
      contract {
        contractId
        contractType
        description
        name
        billableContract {
          chargeItem
          discountRate
          includedItems
          perpetualContract {
            autoRenew
            contractId
          }
          sellingPrice {
            details {
              afterHoursValue
              value
            }
            model
          }
          blockItemsInfo {
            balance
            blockItemId
          }
          recurringContract {
            nextBillDate
            contractId
            recurringMode
            frequencyInterval
          }
          changes {
            effectiveDate
            quantity
            changeId
            endDate
            quantityChangeOperation
          }
        }
      }
    }
  }
}

`;
// #endregion