import './orchestrator';
import { setupMessageListener } from './orchestrator';

// Initialize background worker
console.log('Background Service Worker initialized.');
setupMessageListener();
