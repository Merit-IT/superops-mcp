import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
  {
    name: "list_tickets",
    description: `Fetch tickets with optional filtering and sorting.

      Common filterable attributes:
      - status: Ticket status
      - priority: Ticket priority
      - subject: Ticket subject/title (use 'contains' or 'startsWith' operators)
      - createdTime: When the ticket was created (supports date operators)
      - client: Client name

      Date Filtering:
      For date fields like 'createdTime', use the 'on' operator with special placeholder values:
      - placeholder.today, placeholder.tomorrow, placeholder.yesterday
      - placeholder.this.week, placeholder.last.week, placeholder.next.week
      - placeholder.this.month, placeholder.last.month, placeholder.next.month
      - placeholder.this.quarter, placeholder.last.quarter, placeholder.next.quarter

      Or use operators like 'after', 'before', 'between', 'inNext', 'inLast' with actual dates.

      Examples:
      - To fetch today's tickets: filter by createdTime "on" "placeholder.today"
      - To fetch last week's tickets: filter by createdTime "on" "placeholder.last.week"
      - To fetch high priority tickets: filter by priority "is" "High"`,
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "number",
          default: 1,
          description: "Page number for pagination"
        },
        pageSize: {
          type: "number",
          default: 5,
          description: "Number of tickets per page"
        },
        condition: {
          type: "object",
          description: "Filtering conditions",
          properties: {
            joinOperator: {
              type: "string",
              enum: ["OR", "AND"],
              description: "How to combine multiple filter conditions"
            },
            operands: {
              type: "array",
              description: "Array of filter conditions",
              items: {
                type: "object",
                properties: {
                  attribute: {
                    type: "string",
                    description: "Field to filter on (e.g., 'status', 'priority', 'subject', 'createdTime', 'client')"
                  },
                  operator: {
                    type: "string",
                    enum: ["is", "isNot", "isEmpty", "isNotEmpty", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "contains", "notContains", "startsWith", "endsWith", "on", "after", "before", "between", "inNext", "inLast"],
                    description: "Comparison operator. For dates, use 'on' with placeholder values, or 'after'/'before' with actual dates"
                  },
                  value: {
                    type: ["string", "number", "boolean", "array"],
                    description: "Value to compare against. For date placeholders use: placeholder.today, placeholder.yesterday, placeholder.last.week, placeholder.this.month, etc."
                  },
                },
                required: ["attribute", "operator", "value"],
              },
            },
          },
        },
        sort: {
          type: ["object", "array"],
          description: "Sort order for results",
          items: {
            type: "object",
            properties: {
              attribute: {
                type: "string",
                description: "Field to sort by (e.g., 'createdTime', 'priority', 'status')"
              },
              order: {
                type: "string",
                enum: ["ASC", "DESC"],
                description: "Sort direction"
              },
            },
            required: ["attribute", "order"],
          },
          properties: {
            attribute: {
              type: "string",
              description: "Field to sort by"
            },
            order: {
              type: "string",
              enum: ["ASC", "DESC"],
              description: "Sort direction"
            },
          },
        },
      },
    },
  },
  {
    name: "list_clients",
    description: `Fetch a paginated list of clients with optional sorting.

      Common sortable attributes:
      - name: Client name
      - createdTime: When the client was created

      Examples:
      - To fetch all clients sorted alphabetically: sort by name "ASC"
      - To fetch the most recently added clients: sort by createdTime "DESC"
      - To fetch a clients by name starting with "Acme": filter by attribute name "contains" "Acme"`,  

    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", default: 1 },
        pageSize: { type: "number", default: 100 },
        condition: {
          type: "object",
          properties: {
            joinOperator: { type: "string", enum: ["OR", "AND"] },
            operands: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  attribute: { type: "string" },
                  operator: { type: "string" },
                  value: { type: ["string", "number", "boolean", "array"] },
                },
                required: ["attribute", "operator", "value"],
              },
            },
          },
        },
        sort: {
          type: ["object", "array"],
          items: {
            type: "object",
            properties: {
              attribute: { type: "string" },
              order: { type: "string", enum: ["ASC", "DESC"] },
            },
            required: ["attribute", "order"],
          },
          properties: {
            attribute: { type: "string" },
            order: { type: "string", enum: ["ASC", "DESC"] },
          },
        },
      },
    },
  },
   {
    name: "list_client",
    description: "Fetch indiviual client by Id",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Client ID" }
      },
    },
  },
   {
    name: "list_worklog_entries",
    description: `Fetch worklog entries with optional filtering and sorting. Requires a module ("TICKETS" or "PROJECTS").
    Common filterable attributes:
    - status: Entry status (e.g., "APPROVED")
    - billable: Whether the entry is billable (boolean)
    - billDateTime: When the work was performed (supports date operators)
    - technician.name: Technician name
    - serviceItem.name: Service item name (e.g., "Remote Support")
    - workItem.displayId: Ticket or project display ID
    - afterHours: Whether work was performed after hours (boolean)

    Date Filtering:
    For date fields like 'billDateTime', use the 'on' operator with special placeholder values:
    - placeholder.today, placeholder.tomorrow, placeholder.yesterday
    - placeholder.this.week, placeholder.last.week, placeholder.next.week
    - placeholder.this.month, placeholder.last.month, placeholder.next.month
    - placeholder.this.quarter, placeholder.last.quarter, placeholder.next.quarter

    Or use operators like 'after', 'before', 'between', 'inNext', 'inLast' with actual dates.

    Examples:
    - To fetch today's worklog entries: filter by billDateTime "on" "placeholder.today"
    - To fetch last week's worklog entries: filter by billDateTime "on" "placeholder.last.week"
    - To fetch billable entries only: filter by billable "is" true
    - To fetch entries for a specific technician: filter by technician.name "is" "Kevin McGillicuddy"
    - To fetch approved entries from this month: combine status "is" "APPROVED" AND billDateTime "on" "placeholder.this.month"`,
    inputSchema: {
      type: "object",
      properties: {
        module: { type: "string", enum: ["TICKETS", "PROJECTS"] },
        page: { type: "number", default: 1 },
         pageSize: { type: "number", default: 100 },
         condition: {
           type: "object",
           description: "Filtering conditions",
           properties: {
             joinOperator: {
               type: "string",
               enum: ["OR", "AND"],
               description: "How to combine multiple filter conditions"
             },
             operands: {
               type: "array",
               description: "Array of filter conditions",
               items: {
                 type: "object",
                 properties: {
                   attribute: {
                     type: "string",
                     description: "Field to filter on (e.g., 'name', 'stage', 'primaryContact', 'accountManager')"
                   },
                   operator: {
                     type: "string",
                     enum: ["is", "isNot", "isEmpty", "isNotEmpty", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "contains", "notContains", "on", "after", "before", "between", "inNext", "inLast"],
                     description: "Comparison operator. For dates, use 'on' with placeholder values, or 'after'/'before' with actual dates"
                   },
                   value: {
                     type: ["string", "number", "boolean", "array"],
                     description: "Value to compare against. For date placeholders use: placeholder.today, placeholder.yesterday, placeholder.last.week, placeholder.this.month, etc."
                   },
                 },
                 required: ["attribute", "operator", "value"],
               },
             },
           },
         },
         sort: {
           type: ["object", "array"],
           items: {
             type: "object",
             properties: {
               attribute: { type: "string" },
               order: { type: "string", enum: ["ASC", "DESC"] },
             },
             required: ["attribute", "order"],
           },
           properties: {
             attribute: { type: "string" },
             order: { type: "string", enum: ["ASC", "DESC"] },
           },
         },
       },
       required: ["module"],
     },
  },
  {
    name: "list_client_site",
    description: "Fetch client site by Id",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Client Site ID" }
      },
    },
  },
  {
    name: "list_invoice",
    description: "Fetch invoice by Id",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Invoice ID" }
      },
    },
  },
  {
    name: "list_invoices",
    description: `Fetch invoices with optional filtering and sorting.

      Common filterable attributes:
      - statusEnum: Invoice status (use values: "DRAFT", "APPROVED", "PAID", "OVERDUE", "VOID")
      - invoiceDate: Date the invoice was created (supports date operators)
      - dueDate: Date the invoice is due (supports date operators)
      - paymentDate: Date the invoice was paid (supports date operators)
      - totalAmount: Total invoice amount
      - client: Client name

      Date Filtering:
      For date fields like 'invoiceDate', 'dueDate', or 'paymentDate', use the 'on' operator with special placeholder values:
      - placeholder.today, placeholder.tomorrow, placeholder.yesterday
      - placeholder.this.week, placeholder.last.week, placeholder.next.week
      - placeholder.this.month, placeholder.last.month, placeholder.next.month
      - placeholder.this.quarter, placeholder.last.quarter, placeholder.next.quarter

      Or use operators like 'after', 'before', 'between', 'inNext', 'inLast' with actual dates.

      Examples:
      - To fetch open/unpaid invoices: filter by statusEnum "is" "APPROVED" OR statusEnum "is" "OVERDUE"
      - To fetch paid invoices: filter by statusEnum "is" "PAID"
      - To fetch invoices from last month: filter by invoiceDate "on" "placeholder.last.month"
      - To fetch invoices due this week: filter by dueDate "on" "placeholder.this.week"
      - To fetch overdue invoices from last quarter: combine statusEnum "is" "OVERDUE" AND dueDate "on" "placeholder.last.quarter"`,
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "number",
          default: 1,
          description: "Page number for pagination"
        },
        pageSize: {
          type: "number",
          default: 5,
          description: "Number of invoices per page"
        },
        condition: {
          type: "object",
          description: "Filtering conditions",
          properties: {
            joinOperator: {
              type: "string",
              enum: ["OR", "AND"],
              description: "How to combine multiple filter conditions"
            },
            operands: {
              type: "array",
              description: "Array of filter conditions",
              items: {
                type: "object",
                properties: {
                  attribute: {
                    type: "string",
                    description: "Field to filter on (e.g., 'statusEnum', 'invoiceDate', 'dueDate', 'paymentDate', 'totalAmount', 'client')"
                  },
                  operator: {
                    type: "string",
                    enum: ["is", "isNot", "isEmpty", "isNotEmpty", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "contains", "notContains", "on", "after", "before", "between", "inNext", "inLast"],
                    description: "Comparison operator. For dates, use 'on' with placeholder values, or 'after'/'before' with actual dates"
                  },
                  value: {
                    type: ["string", "number", "boolean", "array"],
                    description: "Value to compare against. For statusEnum, must be one of: DRAFT, APPROVED, PAID, OVERDUE, VOID. For date placeholders use: placeholder.today, placeholder.yesterday, placeholder.last.week, placeholder.this.month, etc."
                  },
                },
                required: ["attribute", "operator", "value"],
              },
            },
          },
        },
        sort: {
          type: ["object", "array"],
          description: "Sort order for results",
          items: {
            type: "object",
            properties: {
              attribute: {
                type: "string",
                description: "Field to sort by (e.g., 'invoiceDate', 'dueDate', 'totalAmount')"
              },
              order: {
                type: "string",
                enum: ["ASC", "DESC"],
                description: "Sort direction"
              },
            },
            required: ["attribute", "order"],
          },
          properties: {
            attribute: {
              type: "string",
              description: "Field to sort by"
            },
            order: {
              type: "string",
              enum: ["ASC", "DESC"],
              description: "Sort direction"
            },
          },
        },
      },
    },
  },
  {
    name: "list_client_contracts",
    description: `Fetch client contracts with optional filtering and sorting. Returns contracts associated with a client, including contract type, billing details, pricing, quantities, and recurring billing schedule.

      Common filterable attributes:
      - contractType: Type of contract (use values: "USAGE", "TIME_AND_MATERIAL")
      - name: Contract name (e.g., "Managed Device", "Office 365 Management")
      - description: Contract description text
      - startDate: Date the contract began (supports date operators)

      Response fields include:
      - contractId: Unique contract identifier
      - contractType: "USAGE" (product/subscription-based) or "TIME_AND_MATERIAL" (hourly/labor-based)
      - name: Contract name
      - description: Contract description
      - startDate: Contract start date
      - contractType: Type of contract (e.g., "USAGE", "TIME_AND_MATERIAL", "SERVICE", "ONE_TIME")
      - ClientContractStatus: Status of the client contract (e.g., "ACTIVE", "DRAFT", "INACTIVE")
      - itemType: Type of item (e.g., "PRODUCT", "SERVICE")
      - recurringMode: If recurring, the mode (e.g., "ARREAR", "UPFRONT", "ADVANCE")
      - billableContract: Billing details (null for TIME_AND_MATERIAL contracts), including:
        - chargeItem: The product/service item being billed (name, itemId, itemType)
        - sellingPrice: Price details with model (e.g., "PER_UNIT") and value
        - quantityCalculationType: How quantity is determined (e.g., "FIXED")
        - recurringContract: Recurring billing info (nextBillDate, recurringMode, frequencyInterval)
        - changes: Quantity change history (quantity, effectiveDate, quantityChangeOperation like "BASELINE")

      Date Filtering:
      For date fields like 'startDate', use the 'on' operator with special placeholder values:
      - placeholder.today, placeholder.tomorrow, placeholder.yesterday
      - placeholder.this.week, placeholder.last.week, placeholder.next.week
      - placeholder.this.month, placeholder.last.month, placeholder.next.month
      - placeholder.this.quarter, placeholder.last.quarter, placeholder.next.quarter

      Or use operators like 'after', 'before', 'between', 'inNext', 'inLast' with actual dates.

      Examples:
      - To fetch all usage-based contracts: filter by contractType "is" "USAGE"
      - To fetch time-and-material contracts: filter by contractType "is" "TIME_AND_MATERIAL"
      - To fetch a specific contract by name: filter by name "is" "Managed Device"
      - To find contracts containing a keyword: filter by name "contains" "Backup"
      - To fetch contracts started this month: filter by startDate "on" "placeholder.this.month"
      - To fetch usage contracts started after a date: combine contractType "is" "USAGE" AND startDate "after" "2025-08-01"`,
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "number",
          default: 1,
          description: "Page number for pagination"
        },
        pageSize: {
          type: "number",
          default: 5,
          description: "Number of contracts per page"
        },
        condition: {
          type: "object",
          description: "Filtering conditions for contracts",
          properties: {
            joinOperator: {
              type: "string",
              enum: ["OR", "AND"],
              description: "How to combine multiple filter conditions"
            },
            operands: {
              type: "array",
              description: "Array of filter conditions",
              items: {
                type: "object",
                properties: {
                  attribute: {
                    type: "string",
                    description: "Field to filter on (e.g., 'contractType', 'name', 'description', 'startDate')"
                  },
                  operator: {
                    type: "string",
                    enum: ["is", "isNot", "isEmpty", "isNotEmpty", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "contains", "notContains", "on", "after", "before", "between", "inNext", "inLast"],
                    description: "Comparison operator. Use 'is'/'isNot' for exact match, 'contains'/'notContains' for partial text match, 'on' with placeholder values for dates, or 'after'/'before' with actual date strings"
                  },
                  value: {
                    type: ["string", "number", "boolean", "array"],
                    description: "Value to compare against. For contractType, use: USAGE, TIME_AND_MATERIAL. For name/description, use string values. For date placeholders use: placeholder.today, placeholder.yesterday, placeholder.last.week, placeholder.this.month, etc."
                  },
                },
                required: ["attribute", "operator", "value"],
              },
            },
          },
        },
        sort: {
          type: ["object", "array"],
          description: "Sort order for results",
          items: {
            type: "object",
            properties: {
              attribute: {
                type: "string",
                description: "Field to sort by (e.g., 'name', 'startDate', 'contractType')"
              },
              order: {
                type: "string",
                enum: ["ASC", "DESC"],
                description: "Sort direction"
              },
            },
            required: ["attribute", "order"],
          },
          properties: {
            attribute: {
              type: "string",
              description: "Field to sort by (e.g., 'name', 'startDate', 'contractType')"
            },
            order: {
              type: "string",
              enum: ["ASC", "DESC"],
              description: "Sort direction"
            },
          },
        },
      },
    },
  },
   {
    name: "list_client_contract",
    description: `Fetch indiviudal client contract by id`,
    inputSchema: {
      type: "object",
      properties: {
      id: { type: "string", description: "Client Contract ID" }
      },
    },
  },
  {
    name: "client_custom_fields",
    description: `Fetch a client custom field by id that can be applied to clients. Custom fields are user-defined attributes that can be associated with clients to capture additional information specific to your business needs.
    Examples of custom fields are:
     - Business Review Date
     - Agreement Type (eg. "MSA - Remote Unlimited , MSA - Remote Unlimited Plus, On-Demand - T&M, Residential with Essentials, On-Demand with Essentials, Legacy SLA - Block Hours, Legacy SLA - T&M (Budgeted Hours)", etc.)

     These can be used to filter clients 
    `,

    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string", description: "custom field ID to fetch" }
      },
    },
  },
    {
    name: "list_client_custom_fields",
    description: `Fetchs a client custom fields and their values for a given client. Custom fields are user-defined attributes that can be associated with clients to capture additional information specific to your business needs.
    Examples of custom fields are:
     - Business Review Date
     - Agreement Type (eg. "MSA - Remote Unlimited , MSA - Remote Unlimited Plus, On-Demand - T&M, Residential with Essentials, On-Demand with Essentials, Legacy SLA - Block Hours, Legacy SLA - T&M (Budgeted Hours)", etc.)

     These can be used to filter clients 
    `,
    inputSchema: {
      type: "object",
    },
  },
];
