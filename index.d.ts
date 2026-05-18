export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export interface CreatePaymentOptions {
  clientRef?: string;
  idempotencyKey?: string;
}

export interface PgResponse {
  status?: boolean;
  code?: string;
  message?: string;
  retryable?: boolean;
  request_id?: string | null;
  http_status?: number;
  [key: string]: any;
}

export class HeroikzrePaymentClient {
  constructor(options?: ClientOptions);
  createPayment(apikey: string, amount: number, options?: CreatePaymentOptions): Promise<PgResponse>;
  checkPayment(apikey: string, idtrx: string): Promise<PgResponse>;
  deletePayment(apikey: string, idtrx: string, amount?: number): Promise<PgResponse>;
  updateInvoiceAlias(apikey: string, pw: string, invoice: string): Promise<PgResponse>;
  getUserMutationHistory(apikey: string, limit?: number, status?: string): Promise<PgResponse>;
  createPaymentMessage(apikey: string, amount: number, options?: CreatePaymentOptions): Promise<PgResponse>;
  checkPaymentMessage(apikey: string, idtrx: string): Promise<PgResponse>;
}

export function createClient(options?: ClientOptions): HeroikzrePaymentClient;
export function createPayment(apikey: string, amount: number, options?: CreatePaymentOptions): Promise<PgResponse>;
export function checkPayment(apikey: string, idtrx: string): Promise<PgResponse>;
export function deletePayment(apikey: string, idtrx: string, amount?: number): Promise<PgResponse>;
export function updateInvoiceAlias(apikey: string, pw: string, invoice: string): Promise<PgResponse>;
export function getUserMutationHistory(apikey: string, limit?: number, status?: string): Promise<PgResponse>;
export function createPaymentMessage(apikey: string, amount: number, options?: CreatePaymentOptions): Promise<PgResponse>;
export function checkPaymentMessage(apikey: string, idtrx: string): Promise<PgResponse>;

export const constants: {
  DEFAULT_BASE_URL: string;
  DEFAULT_TIMEOUT_MS: number;
};
