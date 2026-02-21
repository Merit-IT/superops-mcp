
//https://support.superops.com/en/articles/6632220-search-pagination-and-sorting
export type StringOperator =
  | 'is'
  | 'isNot'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'startsWith'
  | 'endsWith'
  | 'contains'
  | 'notContains'
  | 'includes'
  | 'notIncludes';

export type NumberOperator =
  | 'is'
  | 'isNot'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual';

export type DateTimeOperator =
  | 'on'
  | 'between'
  | 'inNext'
  | 'inLast'
  | 'after'
  | 'before';

export type BooleanOperator = 'is';

export interface Operands {
  attribute: string;
  operator:
  | StringOperator
  | NumberOperator
  | DateTimeOperator
  | BooleanOperator;
  value: string | string[] | number | boolean;
}

export interface RuleConditionInput {
  joinOperator?: 'OR' | 'AND';
  operands?: Operands[];
}

export type SortOrder = 'ASC' | 'DESC';

export interface SortInput {
  attribute?: string;
  order?: SortOrder;
}

export interface ListInfoInput {
  page?: number;
  pageSize?: number;
  condition?: RuleConditionInput;
  sort?: SortInput[] | SortInput;
}

export interface Sort {
  attribute?: string;
  order?: SortOrder;
}

export interface ListInfo {
  page?: number;
  pageSize?: number;
  sort?: Sort[] | Sort;
  condition?: Record<string, unknown>;
  hasMore?: boolean | null;
  totalCount?: number;
}