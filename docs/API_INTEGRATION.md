# Real AI API Integration Guide

This guide explains how to connect your external AI Image Generation / Virtual Try-On API to the **AI Digital Standee** application.

---

## 1. Environment Configuration (`.env`)

Open `.env` in the root directory (or environment variables settings) and configure:

```env
# Switch AI provider mode to custom
AI_PROVIDER=custom

# Real AI API Details
AI_API_URL=https://api.your-ai-provider.com/v1/generate
AI_API_KEY=sk_live_your_actual_secret_key
AI_MODEL=fashion-tryon-v1
```

> [!IMPORTANT]
> Never expose your `AI_API_KEY` to the frontend. All external API requests are performed securely on the Node.js backend.

---

## 2. File Location for Custom AI Code

All Custom AI integration logic is located in:
`backend/src/services/ai/CustomAIProvider.ts`

---

## 3. Customizing the API Adapter (`CustomAIProvider.ts`)

The adapter handles image submission, status polling, and output image processing. Update the marked TODO blocks inside `CustomAIProvider.ts` depending on your API pattern:

### Pattern A: Direct Image Response (Synchronous API)
If your API returns the generated image directly in the `POST` response:

```typescript
const response = await axios.post(this.apiUrl, {
  model: this.model,
  image: base64Image,
  prompt: input.prompt,
}, {
  headers: {
    'Authorization': `Bearer ${this.apiKey}`,
    'Content-Type': 'application/json',
  },
});

// Extract image URL or base64 from response
const imageUrl = response.data.image_url;
```

### Pattern B: Job ID + Status Polling (Asynchronous API)
If your API returns a `job_id` and requires polling a status endpoint:

```typescript
// 1. Submit Job
const response = await axios.post(this.apiUrl, requestPayload, { headers });
const jobId = response.data.job_id;

// 2. Poll Status Endpoint inside getStatus(jobId)
const statusRes = await axios.get(`${this.apiUrl}/status/${jobId}`, { headers });
if (statusRes.data.status === 'succeeded') {
  const resultUrl = statusRes.data.output_url;
  // Provider downloads image automatically to local storage
}
```

### Pattern C: Polling URL Provided in Response
If your API returns a specific polling URL:

```typescript
const pollingUrl = response.data.status_url;
```

### Pattern D: Webhook Notifications
If your API sends webhooks upon completion, configure your endpoint URL to:
`POST http://<YOUR_DOMAIN>/api/webhooks/ai`

---

## 4. Verification

After updating `.env` and `CustomAIProvider.ts`:

1. Restart backend server (`npm run dev`)
2. Perform a test generation on the kiosk
3. Inspect backend logs:
   ```bash
   [INFO] Sending generation request to Custom AI Provider: https://api.your-ai-provider.com/v1/generate
   ```
