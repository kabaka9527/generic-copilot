# Generic Provider for Copilot

Use frontier open LLMs like Qwen3 Coder, Kimi K2, DeepSeek V3.1, GLM 4.5 and more in VS Code with GitHub Copilot Chat powered by any OpenAI-compatible provider 🔥

## Thanks

Heavily inspired (and then extended) by https://github.com/JohnnyZ93/oai-compatible-copilot

## ✨ Features

- **Provider-First Configuration**: Define providers once with shared settings, then add models that automatically inherit baseUrl, headers, and defaults
- **Multiple Provider Support**: Manage API keys for unlimited providers with automatic per-provider key storage
- **Inheritable Defaults**: Set common parameters (temperature, max_tokens, etc.) at the provider level and override per-model as needed
- **Multiple Configurations per Model**: Define the same model with different settings using `configId` (e.g., thinking vs. no-thinking modes)
- **Vision Model Support**: Configure models with multimodal capabilities for image inputs
- **Thinking & Reasoning**: Control display of model reasoning processes with support for OpenRouter, Zai, and other provider formats
- **Auto-Retry**: Built-in retry mechanism for handling API errors (429, 500, 502, 503, 504)
- **Flexible Headers**: Inherit custom headers from providers or override per-model

---

## Requirements

- **VS Code**: 1.104.0 or higher
- **Dependency**: GitHub Copilot Chat extension
- **API Keys**: OpenAI-compatible provider API keys

---

## ⚡ Quick Start

### 1. Configure Providers

Open VS Code Settings (JSON) and add your provider configuration:

```json
{
  "generic-copilot.providers": [
    {
      "key": "iflow",
      "baseUrl": "https://apis.iflow.cn/v1",
      "defaults": {
        "context_length": 256000,
        "max_tokens": 8192,
        "temperature": 0,
        "top_p": 1
      }
    },
    {
      "key": "synthetic",
      "baseUrl": "https://api.synthetic.new/v1/openai",
      "defaults": {
        "context_length": 192000,
        "max_tokens": 16384,
        "temperature": 0.7
      }
    }
  ],
  "generic-copilot.models": [
    {
      "id": "qwen3-coder",
      "provider": "iflow"
    },
    {
      "id": "minimax-m2",
      "provider": "iflow",
      "temperature": 0.5
    },
    {
      "id": "glm4.6",
      "provider": "synthetic"
    }
  ]
}
```

### 3. Set API Keys

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run: **"GenericCopilot: Set Generic Compatible Multi-Provider Apikey"**
3. Select your provider (e.g., `iflow`)
4. Enter the API key for that provider

Repeat for each provider. Keys are stored securely in VS Code's secret storage as `generic-copilot.apiKey.<provider-key>`.

### 4. Use in Copilot Chat

1. Open GitHub Copilot Chat
2. Click the model picker
3. Select **"Manage Models..."**
4. Choose **"Generic Compatible"** provider
5. Select the models you want to enable
6. Start chatting!

---

## 📖 Configuration Guide

### Provider Configuration

Providers are the foundation of the configuration system. Each provider defines shared settings that cascade to all its models.

#### Provider Schema

```json
{
  "key": "string",           // Required: Unique identifier (lowercase, used for API keys)
  "baseUrl": "string",       // Required: API endpoint base URL
  "headers": {               // Optional: Custom HTTP headers for all requests
    "X-Custom-Header": "value"
  },
  "defaults": {              // Optional: Default parameters inherited by models
    "context_length": 128000,
    "max_tokens": 4096,
    "temperature": 0.7,
    "top_p": 1,
    "family": "generic",
    // ... any model parameter
  }
}
```

#### Example: Multiple Providers

```json
{
  "generic-copilot.providers": [
    {
      "key": "modelscope",
      "baseUrl": "https://api-inference.modelscope.cn/v1",
      "headers": {
        "X-Source": "vscode-extension"
      },
      "defaults": {
        "context_length": 256000,
        "max_tokens": 8192,
        "temperature": 0
      }
    },
    {
      "key": "openrouter",
      "baseUrl": "https://openrouter.ai/api/v1",
      "defaults": {
        "reasoning": {
          "enabled": true,
          "effort": "medium"
        }
      }
    },
    {
      "key": "zai",
      "baseUrl": "https://open.zaidata.com/v1",
      "defaults": {
        "temperature": 0.7
      }
    }
  ]
}
```

### Model Configuration

Models reference providers and automatically inherit their settings. You can override any inherited value at the model level.

#### Model Schema

```json
{
  "id": "string",              // Required: Model identifier
  "provider": "string",        // Required: Provider key to inherit from
  "configId": "string",        // Optional: Create multiple configs of same model
  "baseUrl": "string",         // Optional: Override provider's baseUrl
  "headers": {},               // Optional: Merge with or override provider headers
  "temperature": 0.5,          // Optional: Override any provider default
  // ... any parameter can be overridden
}
```

#### Example: Models with Inheritance

```json
{
  "generic-copilot.models": [
    {
      "id": "Qwen/Qwen3-Coder-480B",
      "provider": "modelscope"
      // Inherits: baseUrl, headers, all defaults from modelscope
    },
    {
      "id": "deepseek-v3",
      "provider": "modelscope",
      "temperature": 0.5,
      "max_tokens": 16384
      // Inherits from modelscope but overrides temperature and max_tokens
    },
    {
      "id": "claude-3.5-sonnet",
      "provider": "openrouter",
      "reasoning": {
        "effort": "high"
      }
      // Inherits reasoning.enabled from provider, overrides effort
    }
  ]
}
```

### Multi-Config Models

Use `configId` to define multiple configurations for the same model with different settings:

```json
{
  "generic-copilot.models": [
    {
      "id": "glm-4.6",
      "configId": "thinking",
      "provider": "zai",
      "thinking": {
        "type": "enabled"
      }
    },
    {
      "id": "glm-4.6",
      "configId": "fast",
      "provider": "zai",
      "temperature": 0,
      "thinking": {
        "type": "disabled"
      }
    }
  ]
}
```

Models will appear in the picker as:
- `glm-4.6::thinking via zai`
- `glm-4.6::fast via zai`

---

## 🔑 API Key Management

### Per-Provider Keys

Each provider has its own API key stored securely:

- **Storage Key**: `generic-copilot.apiKey.<provider-key>`
- **Example**: For provider `key: "iflow"`, the storage key is `generic-copilot.apiKey.iflow`

### Setting Keys

**Via Command Palette:**

1. `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. **"GenericCopilot: Set Generic Compatible Multi-Provider Apikey"**
3. Select provider from list
4. Enter API key (or clear by leaving empty)

**Automatic Prompting:**

If a model is selected without an API key configured, you'll be prompted to enter one when making your first request.

### Key Resolution

When making a request:

1. Check for provider-specific key: `generic-copilot.apiKey.<provider-key>`
2. If not found and no custom `Authorization` header is set, the request proceeds without authentication (some providers allow this)

---

## 🎛️ Advanced Configuration

### Custom Headers

Headers can be set at provider or model level and are merged with model taking precedence:

```json
{
  "generic-copilot.providers": [
    {
      "key": "custom",
      "baseUrl": "https://api.example.com/v1",
      "headers": {
        "X-Provider-ID": "vscode",
        "X-Region": "us-west"
      }
    }
  ],
  "generic-copilot.models": [
    {
      "id": "model-1",
      "provider": "custom",
      "headers": {
        "X-Region": "eu-central",  // Overrides provider's X-Region
        "X-Model-Tier": "premium"   // Adds new header
      }
    }
  ]
}
```

Final headers for `model-1`:
- `X-Provider-ID: vscode` (from provider)
- `X-Region: eu-central` (overridden by model)
- `X-Model-Tier: premium` (from model)

### Vision Models

Enable image input support:

```json
{
  "generic-copilot.providers": [
    {
      "key": "vision-provider",
      "baseUrl": "https://api.vision.example/v1",
      "defaults": {
        "vision": true  // All models inherit vision capability
      }
    }
  ],
  "generic-copilot.models": [
    {
      "id": "gpt-4-vision",
      "provider": "vision-provider"
    },
    {
      "id": "text-only-model",
      "provider": "vision-provider",
      "vision": false  // Override to disable vision
    }
  ]
}
```

### Thinking & Reasoning Models

Configure display of model reasoning:

**Zai Provider (Thinking):**

```json
{
  "id": "glm-4.6",
  "provider": "zai",
  "thinking": {
    "type": "enabled"
  },
  "thinking_budget": 2048
}
```

**OpenRouter (Reasoning):**

```json
{
  "id": "claude-3-opus",
  "provider": "openrouter",
  "reasoning": {
    "enabled": true,
    "effort": "high",
    "exclude": false
  }
}
```

**OpenAI (Reasoning Effort):**

```json
{
  "id": "o1-preview",
  "provider": "openai",
  "reasoning_effort": "high"
}
```

### Retry Configuration

Configure automatic retries for transient errors:

```json
{
  "generic-copilot.retry": {
    "enabled": true,
    "max_attempts": 3,
    "interval_ms": 1000
  }
}
```

Retries apply to HTTP status codes: 429, 500, 502, 503, 504.

### Request Delay

Add fixed delay between consecutive requests:

```json
{
  "generic-copilot.delay": 500  // milliseconds
}
```

---

## 📋 Complete Parameter Reference

### Provider Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | ✅ | Unique provider identifier (lowercase) |
| `baseUrl` | string | ✅ | API endpoint base URL |
| `headers` | object | ❌ | Custom HTTP headers for requests |
| `defaults` | object | ❌ | Default parameters inherited by models |

### Model Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | string | — | **Required.** Model identifier |
| `provider` | string | — | **Required.** Provider key to inherit from |
| `configId` | string | — | Optional config ID for multiple variants |
| `baseUrl` | string | inherited | Override provider's baseUrl |
| `headers` | object | inherited | Merge with provider headers |
| `family` | string | `"generic"` | Model family (gpt-4, claude-3, etc.) |
| `context_length` | number | `128000` | Maximum context window |
| `max_tokens` | number | `4096` | Maximum output tokens |
| `max_completion_tokens` | number | — | OpenAI standard max output |
| `vision` | boolean | `false` | Enable image input support |
| `temperature` | number \| null | `0` | Sampling temperature (0-2) |
| `top_p` | number \| null | `1` | Nucleus sampling (0-1] |
| `top_k` | number | — | Top-k sampling [1, ∞) |
| `min_p` | number | — | Minimum probability [0, 1] |
| `frequency_penalty` | number | — | Frequency penalty [-2, 2] |
| `presence_penalty` | number | — | Presence penalty [-2, 2] |
| `repetition_penalty` | number | — | Repetition penalty (0, 2] |
| `enable_thinking` | boolean | `false` | Enable thinking display |
| `thinking_budget` | number | — | Max thinking tokens |
| `thinking` | object | — | Zai thinking config |
| `reasoning` | object | — | OpenRouter reasoning config |
| `reasoning_effort` | string | — | OpenAI reasoning effort |
| `extra` | object | — | Additional request parameters |

**Note:** Setting `temperature` or `top_p` to `null` omits the parameter from requests, using provider defaults.


---

## 💡 Tips & Best Practices

### Use family and model names carefully.  Copilot changes behavior based on these names:

#### Model Name variations
* gpt-5-codex | gpt-5-codex : uses Codex-style prompt branch
* gpt-5* | gpt-5 : can use apply_patch exclusively; agent prompts differ for gpt-5
* o4-mini | o4-mini : allowed apply_patch and prefers JSON notebook representation
c* laude-3.5-sonnet | claude-3.5-sonnet : prefers instructions in user message and after history

#### Family Name variations
* GPT family | gpt (excl. gpt-4o) : supports apply_patch, prefers JSON notebook representation
* Claude / Anthropic | claude / Anthropic : supports multi_replace/replace_string, can use replace_string exclusively, MCP image_url disallowed
* Gemini | gemini : supports replace_string, healing/strong-replace hints required, cannot accept image_url in requests
* Grok | grok-code : supports replace_string and can use replace_string exclusively

### Organize by Provider

Group models by provider to make configuration easier to manage and reduce duplication.

### Use Defaults Strategically

Set common parameters in provider defaults and only override when needed:

```json
{
  "key": "provider",
  "defaults": {
    "temperature": 0.7,
    "max_tokens": 4096
  }
}
```

### Naming Convention

Use lowercase provider keys that match the service name for consistency:
- ✅ `"key": "openai"`
- ✅ `"key": "anthropic"`
- ❌ `"key": "OpenAI"`

### ConfigId for Variants

Use descriptive `configId` values:
- `"thinking"` / `"no-thinking"`
- `"fast"` / `"accurate"`
- `"vision"` / `"text-only"`

### Headers for Custom Auth

If a provider uses non-standard authentication, set it in headers:

```json
{
  "headers": {
    "X-API-Key": "your-key-here"
  }
}
```

---

## 🐛 Troubleshooting

### Models Not Appearing

1. Check provider `key` matches exactly in both provider and model config
2. Verify `baseUrl` is correct and accessible
3. Look for errors in VS Code Developer Console (`Help > Toggle Developer Tools`)

### Authentication Errors

1. Verify API key is set: Run "Set Multi-Provider Apikey" command
2. Check if provider requires custom headers
3. Ensure `baseUrl` includes correct path (usually `/v1`)

### Inheritance Not Working

1. Confirm `provider` field matches a provider's `key` exactly (case-sensitive)
2. Check Developer Console for warnings about missing providers
3. Verify JSON syntax is valid (no trailing commas, quotes closed)

### Duplicate Model IDs

Use `configId` to disambiguate models with the same `id`:

```json
{
  "id": "same-model",
  "configId": "variant-a",
  "provider": "provider1"
}
```

---


## 📄 License

- **License**: MIT License Copyright (c) 2025