<p align="center">
  <img src="https://img.shields.io/npm/v/malawali-payment-gateway?style=for-the-badge&color=0891b2&label=VERSION" alt="npm version" />
  <img src="https://img.shields.io/npm/dt/malawali-payment-gateway?style=for-the-badge&color=6366f1&label=DOWNLOADS" alt="downloads" />
  <img src="https://img.shields.io/npm/l/malawali-payment-gateway?style=for-the-badge&color=10b981&label=LICENSE" alt="license" />
  <img src="https://img.shields.io/node/v/malawali-payment-gateway?style=for-the-badge&color=f59e0b&label=NODE" alt="node version" />
</p>

<h1 align="center">💳 Malawali Payment Gateway</h1>

<p align="center">
  <strong>Node.js SDK resmi untuk integrasi Malawali Payment Gateway API</strong><br/>
  <sub>QRIS Create • Check • Delete • Mutation History</sub>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-fitur">Fitur</a> •
  <a href="#-instalasi">Instalasi</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-contoh-penggunaan">Contoh</a> •
  <a href="#-lisensi">Lisensi</a>
</p>

---

## ✨ Fitur

| Fitur | Deskripsi |
|-------|-----------|
| 🔐 **QRIS Payment** | Buat, cek, dan hapus pembayaran QRIS |
| 📊 **Mutation History** | Ambil riwayat mutasi user |
| 🤖 **Bot-Ready** | Helper function dengan caption siap pakai (Telegram/WA) |
| 🔄 **Auto-Retry Info** | Response sudah membawa flag `retryable` |
| 📝 **TypeScript** | Full type declarations included |
| ⚡ **Lightweight** | Hanya 1 dependency (`axios`) |

---

## 📦 Instalasi

```bash
npm install malawali-payment-gateway
```

```bash
# atau dengan yarn
yarn add malawali-payment-gateway
```

---

## 🚀 Quick Start

```js
const pg = require("malawali-payment-gateway");

async function main() {
  const apikey = "YOUR_API_KEY";

  // 💰 Buat Payment
  const create = await pg.createPayment(apikey, 10000, {
    clientRef: "ORDER-10001"
  });

  if (!create.status) {
    console.log("❌ Gagal:", create.code, create.message);
    return;
  }

  console.log("✅ IDTRX:", create.result.idtrx);
  console.log("🔗 QR URL:", create.result.qris_url);
}

main();
```

---

## 🔄 Flow Deposit Lengkap

> Create → Polling Check → Sukses/Expired

```js
const pg = require("malawali-payment-gateway");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runDepositFlow() {
  const apikey = "YOUR_API_KEY";

  // 1️⃣ Create Payment
  const created = await pg.createPayment(apikey, 15000, {
    clientRef: "DEP-USER123-0001"
  });

  if (!created.status) {
    console.log("❌ Create gagal:", created.code, created.message);
    return;
  }

  const idtrx = created.result.idtrx;
  console.log("📱 Silakan bayar QR:", created.result.qris_url);

  // 2️⃣ Polling Check (max 30x, interval 5s)
  for (let i = 0; i < 30; i++) {
    const check = await pg.checkPayment(apikey, idtrx);
    const code = String(check.code || "").toUpperCase();

    if (code === "PAYMENT_PAID") {
      console.log("✅ PAID!", check);
      return;
    }
    if (code === "PAYMENT_EXPIRED") {
      console.log("⌛ EXPIRED");
      return;
    }
    if (code === "PAYMENT_CANCELLED") {
      console.log("❌ CANCELLED");
      return;
    }

    await sleep(5000);
  }

  console.log("⏱️ Timeout polling.");
}

runDepositFlow();
```

---

## 📖 API Reference

### Core Functions

| Method | Deskripsi |
|--------|-----------|
| `createPayment(apikey, amount, options?)` | Buat pembayaran QRIS baru |
| `checkPayment(apikey, idtrx)` | Cek status pembayaran |
| `deletePayment(apikey, idtrx, amount?)` | Hapus/cancel pembayaran |
| `updateInvoiceAlias(apikey, pw, invoice)` | Update alias invoice |
| `getUserMutationHistory(apikey, limit?, status?)` | Riwayat mutasi user |

### Helper Functions (Bot-Ready)

| Method | Deskripsi |
|--------|-----------|
| `createPaymentMessage(apikey, amount, options?)` | Buat payment + caption siap kirim |
| `checkPaymentMessage(apikey, idtrx)` | Cek payment + text status siap kirim |

### Factory

```js
const client = pg.createClient({
  baseUrl: "https://restapi.heroikzre.my.id",  // default
  timeout: 15000                                 // default (ms)
});
```

---

### 📋 Options `createPayment`

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `apikey` | `string` | API key kamu |
| `amount` | `number` | Nominal pembayaran |
| `options.clientRef` | `string?` | Reference unik (rekomendasi untuk idempotency) |
| `options.idempotencyKey` | `string?` | Key untuk mencegah duplikat |

---

## 📊 Struktur Response

Setiap response SDK membawa:

```js
{
  status: boolean,       // true = sukses
  code: string,          // kode status (e.g. "PAYMENT_PAID")
  message: string,       // pesan deskriptif
  http_status: number,   // HTTP status code
  
  // Khusus createPayment:
  request_id: string,    // untuk trace/debug
  retryable: boolean     // true = aman untuk retry
}
```

---

## 🔁 Retry Strategy

| HTTP Status | Aksi |
|-------------|------|
| `201` | ✅ Sukses |
| `202` | 🔄 Request diproses, retry sebentar |
| `401` | ❌ API key invalid |
| `409` | ⚠️ Conflict/duplicate |
| `422` | ❌ Input tidak valid |
| `429` | 🔄 Rate limit, retry dengan backoff |
| `503` | 🔄 Service busy, retry dengan backoff |

**Rekomendasi backoff:** `2s → 4s → 8s` (maks 3-5x retry)

```js
// Cek apakah perlu retry
if (result.retryable) {
  // Aman untuk retry dengan backoff
}
```

---

## 🤖 Contoh Integrasi Bot

> Caption siap pakai untuk Telegram / WhatsApp

```js
const pg = require("malawali-payment-gateway");

async function handleDeposit(apikey, amount) {
  const res = await pg.createPaymentMessage(apikey, amount, {
    clientRef: `BOT-${Date.now()}`
  });

  if (!res.status) {
    return `❌ Gagal buat invoice: ${res.message} (${res.code})`;
  }

  // res.caption berisi text formatted siap kirim
  // res.qris_url berisi link QR code
  return res.caption;
}

async function handleCheck(apikey, idtrx) {
  const res = await pg.checkPaymentMessage(apikey, idtrx);
  return res.text; // "✅ Pembayaran Berhasil" / "⏳ Pending" / etc.
}
```

---

## 🛡️ Best Practices

> 💡 Tips untuk production

- ✅ Selalu kirim `clientRef` unik per transaksi
- ✅ Simpan `idtrx` dan `request_id` untuk audit
- ✅ Implementasi retry dengan exponential backoff
- ❌ Jangan hardcode API key di frontend
- ❌ Jangan abaikan field `retryable`

---

## 🧪 TypeScript Support

SDK ini sudah include TypeScript declarations:

```ts
import {
  createPayment,
  checkPayment,
  createClient,
  HeroikzrePaymentClient,
  PgResponse,
  CreatePaymentOptions
} from "malawali-payment-gateway";

const result: PgResponse = await createPayment("key", 10000, {
  clientRef: "TS-001"
});
```

---

## 📄 Lisensi

MIT License © 2026 [Daffa Heroik](https://github.com/DaffaHeroik)

---

<p align="center">
  <sub>Made with ❤️ in Indonesia</sub><br/>
  <sub>
    <a href="https://github.com/DaffaHeroik/malawali-payment-gateway/issues">Report Bug</a> •
    <a href="https://github.com/DaffaHeroik/malawali-payment-gateway/issues">Request Feature</a>
  </sub>
</p>
