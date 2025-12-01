import axios from 'axios';
import { setupFluxMaskInterceptor } from '@flux-mask/axios-interceptor';

const serverUrlInput = document.getElementById('serverUrl');
const requestDataInput = document.getElementById('requestData');
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');
const step1Div = document.getElementById('step1');
const step2Div = document.getElementById('step2');
const step3Div = document.getElementById('step3');
const step4Div = document.getElementById('step4');
const step5Div = document.getElementById('step5');
const step6Div = document.getElementById('step6');
const step7Div = document.getElementById('step7');

async function sendRequest() {
  const url = serverUrlInput.value;
  const dataStr = requestDataInput.value;
  let data;

  try {
    data = JSON.parse(dataStr);
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
    return;
  }

  // Reset UI
  statusDiv.style.display = 'block';
  statusDiv.className = 'status loading';
  statusDiv.textContent = 'Initializing...';
  step1Div.textContent = JSON.stringify(data, null, 2);
  step2Div.textContent = 'Waiting...';
  step3Div.textContent = 'Nginx Lua plugin decrypts the request using the session key and forwards plaintext to backend';
  step4Div.textContent = 'Backend processes plaintext request and returns plaintext response';
  step5Div.textContent = 'Nginx Lua plugin encrypts the response using the session key';
  step6Div.textContent = 'Waiting...';
  step7Div.textContent = 'Waiting...';

  try {
    // Create axios instance with flux-mask interceptor
    const api = axios.create({ baseURL: url });
    
    // Variables to capture encrypted data for display
    let encryptedRequestData = null;
    let encryptedResponseData = null;
    
    // Add request interceptor BEFORE flux-mask to capture encrypted data
    // This will run AFTER flux-mask encryption (interceptors run in reverse order)
    api.interceptors.request.use((config) => {
      if (config.url === '/api/users' && typeof config.data === 'string' && config.data.length > 100) {
        // This is the encrypted data (long base64 string)
        encryptedRequestData = config.data;
      }
      return config;
    });

    // Add response interceptor BEFORE flux-mask to capture encrypted response
    // This will run BEFORE flux-mask decryption (interceptors run in order for responses)
    api.interceptors.response.use((response) => {
      if (typeof response.data === 'string' && response.data.length > 100) {
        // This is the encrypted response (long base64 string)
        encryptedResponseData = response.data;
      }
      return response;
    });
    
    // Setup flux-mask interceptor with default configuration
    // The interceptor will automatically:
    // 1. Fetch public key from /__flux-mask/key/public
    // 2. Generate and exchange symmetric key via /__flux-mask/key
    // 3. Encrypt request bodies
    // 4. Add X-Flux-Mask and X-Flux-Mask-Session headers
    // 5. Decrypt response bodies
    setupFluxMaskInterceptor(api);

    // Debug: Log the interceptor's internal state if possible, or hook into it
    // Since we can't easily hook into the internal state, we'll rely on the network logs
    // But we can try to manually perform the encryption to verify
    
    statusDiv.textContent = 'Initializing flux-mask (key exchange)...';
    
    statusDiv.textContent = 'Sending request...';
    
    // Update step 3 to show nginx is processing
    step3Div.textContent = '⏳ Nginx receiving encrypted request...\n→ Decrypting with session key\n→ Forwarding plaintext to backend';

    // The interceptor will automatically encrypt the request and decrypt the response
    const response = await api.post('/api/users', data);

    // Display encrypted request (captured by our interceptor)
    if (encryptedRequestData) {
      step2Div.textContent = encryptedRequestData;
    } else {
      step2Div.textContent = '(Encrypted data - see network tab)';
    }

    // Update nginx processing steps
    step3Div.textContent = '✓ Nginx decrypted request:\n' + JSON.stringify(data, null, 2);
    step4Div.textContent = '✓ Backend processed plaintext request and returned plaintext response';
    step5Div.textContent = '✓ Nginx encrypted the response using session key';

    // Display encrypted response (captured by our interceptor)
    if (encryptedResponseData) {
      step6Div.textContent = encryptedResponseData;
    } else {
      step6Div.textContent = '(Encrypted response - see network tab)';
    }

    // Display decrypted response (automatically decrypted by interceptor)
    step7Div.textContent = JSON.stringify(response.data, null, 2);

    statusDiv.className = 'status success';
    statusDiv.textContent = '✓ Success! Encryption flow via Nginx completed.';

  } catch (error) {
    console.error('Request error:', error);
    statusDiv.className = 'status error';
    statusDiv.textContent = '✗ Error: ' + error.message;

    if (step2Div.textContent === 'Waiting...') {
      step2Div.textContent = 'Failed during encryption';
    }
    if (step6Div.textContent === 'Waiting...') {
      step6Div.textContent = 'No response received';
    }
    step7Div.textContent = 'Error: ' + (error.response?.data?.error || error.message);
  }
}

sendBtn.addEventListener('click', sendRequest);
