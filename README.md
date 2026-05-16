# malawali-payment-gateway

Node.js SDK resmi untuk integrasi **Malawali Payment Gateway API** (QRIS create/check/delete + mutation history).

## Install

```bash
npm install malawali-payment-gateway
```

## 1) Quick Start

```js
const pg = require("malawali-payment-gateway");

async function quickStart() {
  const apikey = "YOUR_API_KEY";

  const create = await pg.createPayment(apikey, 10000, {
    clientRef: "ORDER-10001"
  });

  if (!create.status) {
    console.log("Create gagal:", create.code, create.message, create.http_status);
    return;
  }

  console.log("IDTRX:", create.result.idtrx);
  console.log("QR URL:", create.result.qris_url);
}

quickStart();
```

## 2) Flow Deposit Lengkap (Create -> Polling Check -> Sukses/Expired)

```js
const pg = require("malawali-payment-gateway");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDepositFlow() {
  const apikey = "YOUR_API_KEY";

  const created = await pg.createPayment(apikey, 15000, {
    clientRef: "DEP-USER123-0001"
  });

  if (!created.status) {
    console.log("Create gagal:", created.code, created.message, created.http_status);
    return;
  }

  const idtrx = created.result.idtrx;
  console.log("Silakan bayar QR:", created.result.qris_url);

  for (let i = 0; i < 30; i++) {
    const check = await pg.checkPayment(apikey, idtrx);
    const code = String(check.code || "").toUpperCase();

    if (code === "PAYMENT_PAID" || String(check.message || "").toLowerCase().includes("sukses")) {
      console.log("PAID ✅", check);
      return;
    }

    if (code === "PAYMENT_EXPIRED") {
      console.log("EXPIRED ⌛");
      return;
    }

    if (code === "PAYMENT_CANCELLED") {
      console.log("CANCELLED ❌");
      return;
    }

    await sleep(5000);
  }

  console.log("Timeout polling check.");
}

runDepositFlow();
```

## 3) API Reference

### `createPayment(apikey, amount, options?)`
- `options.clientRef` (opsional, direkomendasikan untuk idempotency)
- `options.idempotencyKey` (opsional)

### `checkPayment(apikey, idtrx)`

### `deletePayment(apikey, idtrx, amount?)`

### `updateInvoiceAlias(apikey, pw, invoice)`

### `getUserMutationHistory(apikey, limit?, status?)`

### Helper:
- `createPaymentMessage(apikey, amount, options?)`
- `checkPaymentMessage(apikey, idtrx)`

### Factory Client:
- `createClient({ baseUrl?, timeout? })`

## 4) Struktur Response Penting

Setiap response SDK membawa:
- `status`
- `code`
- `message`
- `http_status`

Khusus `createPayment`:
- `request_id` (untuk trace)
- `retryable` (true jika aman dicoba ulang)

## 5) Rekomendasi Handling Kode Create

- `201`: sukses create
- `202`: request sedang diproses (retry sebentar)
- `401`: apikey invalid
- `409`: conflict duplicate/create
- `422`: input tidak valid
- `429`: rate/queue limit
- `503`: service busy (retry dengan backoff)

## 6) Retry Strategy (Disarankan)

- Jika `retryable === true` atau `http_status` = `429/503`, retry.
- Backoff sederhana: `2s -> 4s -> 8s` (maks 3-5x).
- Selalu kirim `clientRef` unik per transaksi user.

## 7) Contoh Integrasi Bot (Caption Siap Pakai)

```js
const pg = require("malawali-payment-gateway");

async function createCaption(apikey, amount) {
  const res = await pg.createPaymentMessage(apikey, amount, {
    clientRef: `BOTDEP-${Date.now()}`
  });

  if (!res.status) {
    return `❌ Gagal buat invoice: ${res.message} (${res.code})`;
  }

  return res.caption; // kirim ke Telegram/WA
}
```

## 8) Notes

- Pastikan endpoint kamu aktif: `https://restapi.heroikzre.my.id`
- Jangan hardcode API key di client frontend publik.
- Simpan `idtrx` dan `request_id` untuk audit/troubleshooting.
