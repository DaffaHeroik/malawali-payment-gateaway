"use strict";

const axios = require("axios");

const DEFAULT_BASE_URL = "https://restapi.heroikzre.my.id";
const DEFAULT_TIMEOUT_MS = 15000;

function formatRupiah(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function classifyCreateResponse(payload, httpStatus) {
  const code = String(payload?.code || "").toUpperCase();
  const ok = payload?.status === true;
  const retryableCodes = new Set([
    "REQUEST_IN_PROGRESS",
    "CREATE_QUEUE_FULL",
    "CREATE_SERVICE_BUSY",
    "CREATE_LOCK_ERROR",
    "UNIQUE_AMOUNT_ALLOCATOR_ERROR",
    "UNIQUE_AMOUNT_UNAVAILABLE",
    "PAYMENT_CREATE_UNHANDLED",
    "PAYMENT_CREATE_ERROR"
  ]);

  return {
    ok,
    httpStatus: Number(httpStatus || 0),
    code,
    requestId: payload?.request_id || null,
    retryable: retryableCodes.has(code) || [429, 503].includes(Number(httpStatus || 0))
  };
}

class HeroikzrePaymentClient {
  constructor(options = {}) {
    this.baseUrl = String(options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = Number(options.timeout || DEFAULT_TIMEOUT_MS);
    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout
    });
  }

  async _request(endpoint, params = {}) {
    try {
      const response = await this.axios.get(endpoint, { params });
      return {
        ok: true,
        httpStatus: response.status,
        headers: response.headers || {},
        data: response.data
      };
    } catch (error) {
      if (error.response) {
        return {
          ok: false,
          httpStatus: error.response.status,
          headers: error.response.headers || {},
          data: error.response.data || {
            status: false,
            code: "UPSTREAM_HTTP_ERROR",
            message: error.message
          }
        };
      }
      return {
        ok: false,
        httpStatus: 0,
        headers: {},
        data: {
          status: false,
          code: "NETWORK_ERROR",
          message: error.message || "Network error"
        }
      };
    }
  }

  async createPayment(apikey, amount, options = {}) {
    const params = {
      apikey,
      amount
    };
    if (options.clientRef) params.client_ref = options.clientRef;
    if (options.idempotencyKey) params.idempotency_key = options.idempotencyKey;

    const res = await this._request("/payment/create", params);
    const meta = classifyCreateResponse(res.data, res.httpStatus);
    return {
      ...res.data,
      http_status: res.httpStatus,
      request_id: res.data?.request_id || meta.requestId,
      retryable: meta.retryable
    };
  }

  async checkPayment(apikey, idtrx) {
    const res = await this._request("/payment/check", { apikey, idtrx });
    return {
      ...res.data,
      http_status: res.httpStatus
    };
  }

  async deletePayment(apikey, idtrx, amount) {
    const params = { apikey, idtrx };
    if (typeof amount !== "undefined") params.amount = amount;
    const res = await this._request("/payment/delete", params);
    return {
      ...res.data,
      http_status: res.httpStatus
    };
  }

  async updateInvoiceAlias(apikey, pw, invoice) {
    const res = await this._request("/payment/alias/update", { apikey, pw, invoice });
    return {
      ...res.data,
      http_status: res.httpStatus
    };
  }

  async getUserMutationHistory(apikey, limit = 50, status) {
    const params = { apikey, limit };
    if (status) params.status = status;
    const res = await this._request("/payment/mutasi-user", params);
    return {
      ...res.data,
      http_status: res.httpStatus
    };
  }

  async createPaymentMessage(apikey, amount, options = {}) {
    const payment = await this.createPayment(apikey, amount, options);
    if (!payment || payment.status !== true || !payment.result) {
      return {
        status: false,
        code: payment?.code || "PAYMENT_CREATE_FAILED",
        retryable: Boolean(payment?.retryable),
        message: payment?.message || "Gagal membuat pembayaran",
        request_id: payment?.request_id || null,
        http_status: payment?.http_status || 0
      };
    }

    const r = payment.result;
    const caption = [
      "*DEPOSIT QRIS*",
      "",
      `ID Transaksi: ${r.idtrx}`,
      `Alias: ${r.invoice_alias}`,
      `Nominal: Rp ${formatRupiah(r.amount_requested)}`,
      `Fee Admin: Rp ${formatRupiah(r.fee || 0)}`,
      `Kode Unik: ${formatRupiah(r.unique_code || 0)}`,
      `Total Bayar: Rp ${formatRupiah(r.amount_to_pay)}`,
      `Expired: ${new Date(r.expires_at).toLocaleString("id-ID")}`,
      "",
      "Scan QRIS dan lakukan pembayaran."
    ].join("\n");

    return {
      status: true,
      idtrx: r.idtrx,
      qris_url: r.qris_url,
      amount: r.amount_to_pay,
      caption,
      request_id: payment.request_id || null,
      http_status: payment.http_status || 201,
      buttons: [{ id: `CHECK_${r.idtrx}`, text: "Check Payment" }]
    };
  }

  async checkPaymentMessage(apikey, idtrx) {
    const res = await this.checkPayment(apikey, idtrx);
    const msg = String(res?.message || "").toLowerCase();
    const code = String(res?.code || "").toUpperCase();

    if (res?.status === true && (code === "PAYMENT_PAID" || msg.includes("sukses"))) {
      return {
        status: "success",
        text: [
          "\u2705 *Pembayaran Berhasil*",
          "",
          typeof res.saldo !== "undefined" ? `Saldo: Rp ${formatRupiah(res.saldo)}` : null
        ].filter(Boolean).join("\n")
      };
    }

    if (code === "PAYMENT_PENDING" || msg.includes("pending")) {
      return { status: "pending", text: "\u23f3 *Pembayaran masih pending*.\nSilakan cek lagi beberapa detik." };
    }

    if (code === "PAYMENT_EXPIRED" || msg.includes("expired")) {
      return { status: "expired", text: "\u231b *Transaksi expired*. Silakan buat transaksi baru." };
    }

    if (code === "PAYMENT_CANCELLED" || msg.includes("dibatalkan") || msg.includes("cancel")) {
      return { status: "cancelled", text: "\u274c *Transaksi dibatalkan*." };
    }

    return {
      status: "error",
      text: `\u274c Gagal cek pembayaran: ${res?.message || "Unknown error"}`,
      raw: res
    };
  }
}

const defaultClient = new HeroikzrePaymentClient();

module.exports = {
  HeroikzrePaymentClient,
  createClient: (options) => new HeroikzrePaymentClient(options),
  createPayment: (...args) => defaultClient.createPayment(...args),
  checkPayment: (...args) => defaultClient.checkPayment(...args),
  deletePayment: (...args) => defaultClient.deletePayment(...args),
  updateInvoiceAlias: (...args) => defaultClient.updateInvoiceAlias(...args),
  getUserMutationHistory: (...args) => defaultClient.getUserMutationHistory(...args),
  createPaymentMessage: (...args) => defaultClient.createPaymentMessage(...args),
  checkPaymentMessage: (...args) => defaultClient.checkPaymentMessage(...args),
  constants: {
    DEFAULT_BASE_URL,
    DEFAULT_TIMEOUT_MS
  }
};
