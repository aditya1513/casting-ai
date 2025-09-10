# Simple OpenAI Chat Integration

## ✅ What's Been Created

A **minimal, working OpenAI chat integration** that actually functions - no complex agent systems, just direct chat.

### Files Created/Modified:

1. **`src/services/simple-chat.service.ts`** - Simple AI chat service using OpenAI
2. **`src/trpc/routers/simple-chat.ts`** - tRPC router with chat endpoints
3. **`src/trpc/router.ts`** - Updated to include simple chat router
4. **`src/test-simple-chat.ts`** - Test file to verify functionality

## 🚀 How to Use

### 1. Set up OpenAI API Key

Add to your `.env` file:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Start the Backend

```bash
cd apps/backend
bun run dev
```

### 3. Test the Chat Endpoint

```bash
# Run the test script
bun run src/test-simple-chat.ts
```

## 📡 API Endpoints

### tRPC Endpoints (via `/trpc`):

- **`simpleChat.chat`** - Main chat endpoint
  - Input: `{ message: string }`
  - Output: `{ userMessage, aiResponse, conversationId }`

- **`simpleChat.getHistory`** - Get chat history
  - Input: `{ conversationId: string, limit?: number }`
  - Output: `{ messages: Message[] }`

- **`simpleChat.test`** - Health check
  - No input required
  - Output: `{ status, message, hasApiKey }`

## 💻 Frontend Integration Example

```typescript
// In your React/Vue component
import { trpc } from './utils/trpc';

function ChatComponent() {
  const [message, setMessage] = useState('');
  
  const sendMessage = trpc.simpleChat.chat.useMutation();
  
  const handleSend = async () => {
    const result = await sendMessage.mutateAsync({
      message: message
    });
    
    console.log('AI Response:', result.aiResponse);
  };
  
  return (
    <div>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

## 🎯 Features

- ✅ **Simple & Working** - No complex architectures
- ✅ **Uses GPT-3.5** - Cost-efficient model
- ✅ **Conversation History** - Maintains context
- ✅ **Database Storage** - Uses existing tables
- ✅ **Rate Limiting** - Built-in protection
- ✅ **Error Handling** - Graceful failures
- ✅ **Casting Context** - Industry-specific prompts

## 🏗️ Architecture

```
User Message → tRPC Endpoint → Simple Chat Service → OpenAI API
                                        ↓
                               Database (conversations, messages)
                                        ↓
                                   AI Response → User
```

## 🔧 Configuration

### Environment Variables:
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `DATABASE_URL` - PostgreSQL connection (already configured)

### Service Settings (in `simple-chat.service.ts`):
- `MODEL = 'gpt-3.5-turbo'` - Can change to 'gpt-4' for better quality
- `MAX_TOKENS = 500` - Adjust response length
- `TEMPERATURE = 0.7` - Adjust creativity (0-1)

## 🧪 Testing

### Quick Test:
```bash
# Test if the service is running (should show hasApiKey status)
curl http://localhost:3001/api/trpc/simpleChat.test

# Test chat via curl (requires OPENAI_API_KEY in .env)
curl -X POST http://localhost:3001/api/trpc/simpleChat.chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-123" \
  -d '{"0": {"json": {"message": "Hello, I need help casting a movie"}}}'
```

### Using the Test Script:
```bash
bun run src/test-simple-chat.ts
```

## 🚨 Troubleshooting

### "OpenAI API key not configured"
- Add `OPENAI_API_KEY` to your `.env` file
- Restart the backend server

### "Rate limit exceeded"
- Wait 1 minute between requests
- Or adjust `MAX_REQUESTS_PER_MINUTE` in service

### "Failed to process chat"
- Check OpenAI API key is valid
- Check you have credits in OpenAI account
- Check database connection is working

## 📊 Database Schema

Uses existing tables:
- `conversations` - Stores chat sessions
- `messages` - Stores individual messages

No new tables needed!

## 🎉 That's It!

You now have a **working OpenAI chat integration** that:
- Actually works
- Is simple to understand
- Can be tested immediately
- Ready for frontend integration

No complex agent systems, no external dependencies beyond OpenAI SDK, just a simple chat that works!