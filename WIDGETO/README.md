# WIDGETO — file import JSON / QR

App **Widgeto** (was API Widgets) import **JSON** hoặc quét **QR** chứa cấu hình widget — không dùng file `.js`.

## File import

| File | Endpoint (W12) |
|------|----------------|
| [`summary.json`](./summary.json) | `/widgeto/summary?format=w12` |
| [`customers.json`](./customers.json) | `/widgeto/customers?format=w12` |
| [`orders.json`](./orders.json) | `/widgeto/orders?format=w12` |
| [`payments.json`](./payments.json) | `/widgeto/payments?format=w12` |

## Cách dùng

1. Mở file JSON tương ứng.
2. Thay mọi chỗ `YOUR_WIDGETO_API_KEY` bằng secret Railway `WIDGETO_API_KEY`.
3. Trong Widgeto:
   - **Import file** → chọn `.json`, **hoặc**
   - **Paste / QR** → dùng field `apiWidgetKey` / `qrPayload` trong JSON (chuỗi `v1::w12::dark::json::https://…`).

URL trong key đã gắn `?format=w12&key=…` nên Widgeto chỉ cần HTTPS URL (không bắt buộc gửi header). App vẫn có thể dùng `request.headers.X-Widgeto-Key` nếu hỗ trợ custom headers.

## Response W12

BE trả mảng tối đa 12 hàng kiểu:

```json
[
  { "key": "DYN CRM", "color": "main" },
  { "key": "Customers", "value": "12", "color": "info" }
]
```

Contract API đầy đủ: [`docs/04-development/api/widgeto.md`](../docs/04-development/api/widgeto.md)

## Bảo mật

Key nằm trong URL/JSON/QR sẽ lộ trên thiết bị. Dùng secret **riêng** cho Widgeto, có thể rotate trên Railway.
