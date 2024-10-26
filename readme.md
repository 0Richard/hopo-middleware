# Welcome to hopo-middleware Read Me


### Claude Review Recommendations
#### Runtime & Dependencies:
You're using nodejs6.10 which is very outdated and has reached end-of-life. You should upgrade to at least Node.js 18.x (current AWS Lambda LTS version).
Several dependencies using "latest" version which is risky for production:

- bluebird
- gm
- moment
- underscore
- uuid
- request (dev dependency)


#### Security:

Your IAM role has very broad permissions (*) for several services. Consider restricting them to specific resources:

- cloudsearch:*
- cognito-idp:*
- dynamodb:*
- s3:*

#### Architecture & Configuration:
Good separation of concerns with dwelling/room/item resources
Well-organized API endpoints with proper HTTP methods
Appropriate use of Cognito authorizer for protected endpoints
Memory size (512MB) and timeout (60s) seem reasonable


Modernization Suggestions:


Consider replacing:

1. bluebird with native Promises - NOT NEEDED use native
2. moment with date-fns or native Date methods - NOT NEEDED use native
3. underscore with native array methods or lodash - NOT NEEDED use native 
4. request (deprecated) with axios or node-fetch - Use Axios

##### Existing packages
```javascript
const AWS = require('aws-sdk')
//const Promise = require('bluebird') NOT REQUIRED
//const u = require('underscore')
const lib = require('../../../lib')
```

##### Replace with:
```javascript
import AWS from 'aws-sdk';
import axios from 'axios';
import lib from '../../../lib';
```
#### Other packages to use
```javascript
import axios from "axios";
import axiosRetry from 'axios-retry';
import crypto from "crypto";
import * as dotenv from 'dotenv';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { send } from "../utils/sqs.js"; // TODO: #7 sqs util needs a name
import { v4 as uuidv4 } from "uuid";



import { DynamoDBClient, QueryCommand, UpdateItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  createItemInDynamoDB,
  updateItemInDynamoDB,
  queryItemsFromDynamoDB,
  getItemFromDynamoDB,
} from "../utils/305_fnd_dbAccess_wp.js";
import {
  getSecret,
} from "../utils/315_fnd_secretsAccess_wp.js";
import { Logger } from "../utils/320_fnu_logHandler_wp.js";
import { getEnvVars } from "../utils/350_fnu_environmentVariables_wp.js";

```

##### NPM Installs for the above packages
```javascript
npm install axios
npm install axios-retry
npm install dotenv
npm install @aws-sdk/util-dynamodb
npm install uuid
npm install @aws-sdk/client-dynamodb
npm install --save-dev jsdoc
```

##### Or as a single command
```javascript
npm install axios axios-retry dotenv @aws-sdk/util-dynamodb uuid @aws-sdk/client-dynamodb --save-dev jsdoc
```


#### Environment Variables:
- Good organization of configuration
- Consider using AWS Systems Manager Parameter Store for sensitive values

# Taken From FDZ
## API (API Gateway)

This service uses the Serverless AWS Api Gateway integration helper plugin to ingest the OpenAPI schema, generate the `x-amazon-apigateway-integration` objects for the API Gateway and build the API Gateway resource at deployment time.

```yaml
plugins:
  - serverless-aws-api-gateway-integration-helper
```

Generate the `x-amazon-apigateway-integration` objects for mocking on test stage. Output is written to `mocks` directory.

```console
sls integration create --output mocks --type mock --stage=test
```

Generate the `x-amazon-apigateway-integration` objects for aws_proxy on dev stage. Output is written to `integrations` directory.

```console
sls integration create --output integrations --type aws_proxy --stage=dev
```

N.B. The `x-amazon-apigateway-integration` object generates a placeholder `uri`. Therefore each integration object must be manually updated with the correct `uri` value to the corresponding lambda function.

Note the naming convention for the lambda function in `functions` block of serverless.yml  e.g. `resolveTnxPayload` maps to the `x-amazon-apigateway-integration.uri` using the format `ResolveTnxPayloadLambdaFunction`.

Note when `x-amazon-apigateway-integration.type` is `aws_proxy` the response is defined in the respective lambda function therefore the `x-amazon-apigateway-integration.responses` object is not required.

Example:

```yaml
paths:
  /resolve-tnx-payload/{payload_hash}/:
    get:
      x-amazon-apigateway-integration:
        type: aws_proxy
        passthroughBehavior: when_no_match
        httpMethod: POST
        uri:
          Fn::Sub: 
            - arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations
            - LambdaArn: 
                Fn::GetAtt:
                  # Update here
                  - ResolveTnxPayloadLambdaFunction
                  - Arn
        requestParameters:
          integration.request.querystring.signature: method.request.querystring.signature
          integration.request.path.payload_hash: method.request.path.payload_hash
        responses: {}
```

Upon deployment, the plugin uses the Open API `schema.yml` and `x-amazon-apigateway-integration` objects file to automatically generate a merged file `openapi-integration/api.yml`. This is automatically injected in the `resources.Resources.ApiGatewayRestApi.Properties.Body` section of the serverless.yml file.

N.B. The `openapi-integration/api.yml` file can be manually generated using the following command:

```console
sls integration merge --stage=dev
```

N.B. Serverless struggles to know when changes to the resources e.g. Lambda functions, warrant a re-deployment of the API Gateway. The Serverless Plugin Random Gateway deploymentId plugin is used to force a re-deployment of the API Gateway upon deployment. No configuration required, just add the plugin:

```yaml
plugins:
  - serverless-plugin-random-gateway-deployment-id
```

## Local Development

### Unit Tests

Run all tests:

```bash
npm test
```

Run a specific test:

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 020_fns_sendRequestToPay_wp
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 110_fns_checkReceiver_wp
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 135_fns_resolveTransactionPayload_wp
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 140_fns_confirmTransaction_wp
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 145_fns_sendRefundRequest_wp
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 210_fns_rateTransaction_wp.test.js
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 215_fns_flagTransaction_wp.test.js
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 315_fnd_secretsAccess_wp.test.js
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 360_fnu_validateNewUser_wp.test.js
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 365_fnu_confirmNewUser_wp.test.js
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 370_fnu_validatePnpId_wp.test.js
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 375_fnu_generatePnpIds_wp.test.js
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 220_fns_calculateMonthlyFlow_wp.test.js
```

```bash
NODE_ENV='local' \
NODE_OPTIONS='--experimental-vm-modules' \
npx jest -- 355_fnu_dataBaseStats_wp.test.js
```

> The test script assumes you have an AWS Profile set within `~/.aws/credentials` with the appropriate permissions to test the stack. If you have a different profile name from `default`, you can set the `AWS_PROFILE` environment variable to the correct profile name within `.env.local`.


### Invoke Lambda Functions

Install dependencies:

```console
npm install
```

The API Lambda functions can be invoked locally using the `./invoke-local.sh` script. The script will invoke the listed function with its event payload defined in `./test/eventLambdaFunction.json`.

> If envoking commonJS functions you must set `package.json` property `type: "commonjs"` before running the script. Ensure you revert this change to `type: "module"` before deployment.

## Deployment

Available stages are: `test`, `dev` and `prod`.

> The `test` stage is used for mocking the API Gateway.

Install dependencies:

```console
npm install
```

Set environment variables:

Create and edit `.env`
```console
cp .env.example .env
```

Deploy to AWS on the specified stage:

```bash
bash deploy.sh
```

## Destroy

Destroy the AWS resources on the specified stage:

```bash
bash destroy.sh
```
