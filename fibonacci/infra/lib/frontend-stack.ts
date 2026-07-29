import * as fs from 'fs';
import * as path from 'path';
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const distDir = path.join(__dirname, '../../frontend/dist');
    if (!fs.existsSync(distDir)) {
      throw new Error(`${distDir} not found — run "npm run build" in frontend/ before deploying`);
    }

    // No sourceCodeProvider: this app is deployed by uploading a build asset directly
    // (the repo isn't connected to a git provider), via Amplify's startDeployment API.
    const asset = new s3assets.Asset(this, 'FrontendBuild', { path: distDir });

    const app = new amplify.App(this, 'App', { appName: 'fibonacci-frontend' });
    const branch = app.addBranch('main', { asset, autoBuild: false });

    new CfnOutput(this, 'AppUrl', { value: `https://main.${app.defaultDomain}` });

    // DNS for aeyeit.com.au is managed in Cloudflare, not Route 53, so this can't
    // auto-create records. After deploy, fetch the exact CNAME targets with:
    //   aws amplify get-domain-association --app-id <appId> --domain-name aeyeit.com.au
    const domain = app.addDomain('Domain', {
      domainName: 'aeyeit.com.au',
      subDomains: [{ branch, prefix: 'fibonacci' }],
    });

    new CfnOutput(this, 'DomainCertificateRecord', { value: domain.certificateRecord });
  }
}
