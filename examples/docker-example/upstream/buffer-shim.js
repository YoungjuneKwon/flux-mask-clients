import { Buffer } from 'buffer';
export { Buffer };
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}
