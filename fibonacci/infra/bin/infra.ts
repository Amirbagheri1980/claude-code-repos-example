import { App } from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';

const env = { account: '806880856266', region: 'ap-southeast-2' };

const app = new App();

new BackendStack(app, 'FibonacciBackend', {
  env,
  corsAllowedOrigin: process.env.CORS_ALLOWED_ORIGIN,
});

new FrontendStack(app, 'FibonacciFrontend', { env });
