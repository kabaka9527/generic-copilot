# Generic Provider for Copilot

![Splash Image](/docs/images/splash.jpg)

在 VS Code 中使用 GitHub Copilot Chat 与前沿的开源大语言模型（如 Qwen3 Coder、Kimi K2、DeepSeek V3.1、GLM 4.5 等），由任何兼容 Vercel AI-SDK 的提供商提供支持 🔥

## 致谢

深受 https://github.com/JohnnyZ93/oai-compatible-copilot 的启发（并进行了扩展）

## 贡献与 PR

...[非常欢迎！](https://github.com/mcowger/generic-copilot)

## 修改

- 增加了 webview-ui 中文汉化

## ✨ 功能特点

- **配置 GUI**: 直观的基于 webview 的界面，用于管理提供程序和模型，包含验证和错误处理。通过快速选择器入口 "GenericCopilot: Open Configuration GUI" 访问
- **提供程序优先配置**: 定义一次提供程序和共享设置（baseUrl、headers、API 密钥），这些设置将被模型自动继承
- **多提供程序支持**: 管理无限数量提供程序的 API 密钥，使用 VS Code 机密存储自动为每个提供程序存储 API 密钥
- **灵活的 Headers 和参数**: 为任何模型设置自定义参数
- **支持自动补全和内联建议**: 配置启用 "用于自动补全" 选项的模型，它将用于提供建议
- **可配置重试**: 为每个模型设置失败请求的重试次数（默认：3 次）

---

## 系统要求

- **VS Code**: 1.105.0 或更高版本
- **依赖**: GitHub Copilot Chat 扩展
- **API 密钥**: 兼容提供程序的 API 密钥

- **支持的 Vercel AI SDK 提供程序**: 此扩展当前支持以下提供程序类型：`openai`、`openai-compatible`、`openrouter`、`google`、`deepseek` 和 `claude-code`（实验性）。

---

## ⚡ 快速开始

### 选项 A：使用配置 GUI（推荐）

### 1. 使用 GUI

1. **打开配置 GUI**:
   - 按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）
   - 输入 "GenericCopilot: Open Configuration GUI"
   - 按 Enter 键

2. **添加提供程序**:
   - 点击 "+ Add Provider"
   - 输入提供程序 ID（例如 "iflow"）和基础 URL
   - 可选择配置默认参数

3. **添加模型**:
   - 点击 "+ Add Model"
   - 输入模型 ID 并选择提供程序
   - 根据需要配置模型特定设置

4. **保存**: 点击 "Save Configuration" 按钮


### 2. 设置 API 密钥

如果找不到提供程序的 API 密钥，系统将在 QuickPick 框中提示您。

1. 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
2. 运行: **"GenericCopilot: Set Generic Compatible Multi-Provider Apikey"**
3. 选择您的提供程序（例如 `iflow`）
4. 输入该提供程序的 API 密钥

对每个提供程序重复此操作。密钥安全存储在 VS Code 的机密存储中，格式为 `generic-copilot.apiKey.<provider-id>`。

### 3. 在 Copilot Chat 中使用

1. 打开 GitHub Copilot Chat
2. 点击模型选择器
3. 选择 **"Manage Models..."**
4. 选择 **"Generic Compatible"** 提供程序
5. 选择要启用的模型
6. 开始聊天！

---

## 📖 配置指南

详细配置说明，包括模式定义、示例和高级设置，可以在 [docs/CONFIGURATION.md](docs/CONFIGURATION.md) 中找到。

## 📖 控制台指南

Generic Copilot 控制台的详细描述可以在 [docs/CONSOLE.md](docs/CONSOLE.md) 中找到。


---

## 📄 许可证

- **许可证**:
MIT 许可证 Copyright (c) 2025