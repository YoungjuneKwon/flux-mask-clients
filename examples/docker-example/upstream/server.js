const express = require('express');

const app = express();
app.use(express.json());
app.use(express.text());
app.use(express.static('public'));

// CORS 설정 (nginx proxy 사용 시 필요 없지만 직접 테스트용)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API 엔드포인트 - 평문 처리 (암호화는 nginx에서 처리)
app.post('/api/users', (req, res) => {
  try {
    let userData;
    
    // JSON 또는 텍스트로 받은 데이터 파싱
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch {
        userData = { raw: req.body };
      }
    } else {
      userData = req.body;
    }
    
    console.log('Received user data (plaintext):', userData);
    
    // 비즈니스 로직 처리
    const responseData = {
      id: Math.floor(Math.random() * 1000),
      ...userData,
      createdAt: new Date().toISOString(),
    };
    
    console.log('Sending response (plaintext):', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 공개 API (암호화 없음)
app.get('/api/public/info', (req, res) => {
  res.json({
    name: 'Flux-Mask Nginx Example API',
    version: '1.0.0',
    description: 'This is a public endpoint without encryption',
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log('API endpoint: http://localhost:' + PORT + '/api/users');
  console.log('Public API: http://localhost:' + PORT + '/api/public/info');
  console.log('');
  console.log('Note: This server handles plaintext requests.');
  console.log('Encryption/decryption is handled by nginx with flux-mask plugin.');
});

// 정리
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});
