# malawali-payment-gateway

<p align="center">
  <a href="https://www.npmjs.com/package/malawali-payment-gateway"><img src="https://img.shields.io/npm/v/malawali-payment-gateway?color=2f80ed&label=npm" alt="npm version"/></a>
  <a href="https://www.npmjs.com/package/malawali-payment-gateway"><img src="https://img.shields.io/npm/dm/malawali-payment-gateway?color=27ae60&label=downloads" alt="npm downloads"/></a>
  <a href="https://github.com/DaffaHeroik/malawali-payment-gateway/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-orange" alt="MIT License"/></a>
  <img src="https://img.shields.io/badge/node-%3E%3D16-1f6feb" alt="Node >= 16"/>
</p>

Node.js SDK resmi untuk integrasi **Malawali Payment Gateway API**.

Mendukung alur utama pembayaran QRIS:
- Create payment
- Check status payment
- Delete/cancel payment
- Update alias invoice
- Ambil mutasi user
- Helper message siap kirim ke bot Telegram/WA

## Daftar Akun

<p align="center">
  <a href="https://t.me/heroikzre_paymentgateawaybot"><img src="https://img.shields.io/badge/Daftar%20via-Telegram%20Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Daftar via Telegram"/></a>
  <a href="https://pay.heroikzre.my.id"><img src="https://img.shields.io/badge/Daftar%20via-Web%20Dashboard-0A7B83?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Daftar via Web"/></a>
</p>

## Install

```bash
npm install malawali-payment-gateway
```

## Quick Start

```js
const pg = require("malawali-payment-gateway");

async function main() {
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

main();
```

## Contoh Flow Deposit (Create -> Check)

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
    console.log("Create gagal:", created.code, created.message);
    return;
  }

  const idtrx = created.result.idtrx;
  console.log("Silakan bayar:", created.result.qris_url);

  for (let i = 0; i < 30; i++) {
    const check = await pg.checkPayment(apikey, idtrx);
    const code = String(check.code || "").toUpperCase();

    if (code === "PAYMENT_PAID") {
      console.log("PAID", check);
      return;
    }

    if (code === "PAYMENT_EXPIRED") {
      console.log("EXPIRED");
      return;
    }

    if (code === "PAYMENT_CANCELLED") {
      console.log("CANCELLED");
      return;
    }

    await sleep(5000);
  }

  console.log("Timeout polling.");
}

runDepositFlow();
```

## API SDK

- `createPayment(apikey, amount, options?)`
- `checkPayment(apikey, idtrx)`
- `deletePayment(apikey, idtrx, amount?)`
- `updateInvoiceAlias(apikey, pw, invoice)`
- `getUserMutationHistory(apikey, limit?, status?)`
- `createPaymentMessage(apikey, amount, options?)`
- `checkPaymentMessage(apikey, idtrx)`
- `createClient({ baseUrl?, timeout? })`

## Struktur Response

Field umum di semua response:
- `status`
- `code`
- `message`
- `http_status`

Field tambahan penting (khusus create):
- `request_id`
- `retryable`

## Rekomendasi Handling Kode Create

- `201`: create berhasil
- `202`: masih diproses (boleh retry)
- `401`: API key invalid
- `409`: transaksi duplikat/conflict
- `422`: parameter tidak valid
- `429`: rate limit / queue penuh
- `503`: service busy

## Retry Strategy

- Retry saat `retryable === true` atau `http_status` `429/503`.
- Gunakan exponential backoff sederhana: `2s -> 4s -> 8s`.
- Simpan `clientRef` unik per transaksi user.

## Endpoint Default

- Base URL default: `https://restapi.heroikzre.my.id`
- Node.js minimal: `>=16`

## Keamanan

- Jangan expose API key di frontend publik.
- Simpan `idtrx` dan `request_id` untuk audit/troubleshooting.

## Support

- Bot daftar: https://t.me/heroikzre_paymentgateawaybot
- Web daftar: https://pay.heroikzre.my.id
- Repository: https://github.com/DaffaHeroik/malawali-payment-gateway
