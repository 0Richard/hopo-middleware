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


#### SDLC:

###### Existing Database Tables

```json
{
 "dwellingId": "2ee27c70-f5ff-11e7-9fa8-9b57e8cfe7bb",
 "addressLine1": "51 Queen Anne Street",
 "addressLine2": "London",
 "city": "London",
 "created": "2018-01-10T12:10:01.016Z",
 "deletedFlag": 0,
 "dwellingName": "Outlook",
 "dwellingRooms": 1,
 "dwellingType": "House",
 "identityId": "richardbelluk@outlook.com",
 "postCode": "SW1 2NB",
 "updated": "2018-04-10T14:34:39.625Z"
}
```

```json
{
 "roomId": "998a7a60-f4a5-11e7-a21f-0d367e20621a",
 "created": "2018-01-08T18:56:14.086Z",
 "deletedFlag": 0,
 "dwellingId": "986b9ce0-f4a5-11e7-aadd-17fbae39437b",
 "identityId": "shahzaib.shahid912@gmail.com",
 "roomImage": "shahzaib.shahid912@gmail.com_998a7a60-f4a5-11e7-a21f-0d367e20621a_roomImage_2018-01-30T17:40:15.376Z_img",
 "roomName": "Bedroom",
 "roomType": "Bedroom",
 "updated": "2018-01-30T17:40:15.376Z"
}
```

```json
{
 "itemId": "097e4b80-447e-11e8-afce-e583e9b0d13f",
 "brand": "LG",
 "created": "2018-04-20T09:34:35.064Z",
 "deletedFlag": 0,
 "description": "Television",
 "identityId": "richardgoemaat@gmail.com",
 "model": "HD",
 "price": 250,
 "priceCurrency": "£",
 "quantity": 1,
 "retailer": "Richer Sounds",
 "roomId": "1d2e54a0-4478-11e8-8689-052c1b07e549",
 "serialNumber": "hgsjhgdsalhd887987239372",
 "updated": "2018-04-20T09:34:35.064Z"
}
```

##### Existing Services

CRUD services are needed on all entities - DWELLING, ROOM, ITEM, these include:
- batch-create
- create
- read
- update
- delete

Other services needed:
1. get-self  
  - Gets the user's identity (sub_id) from Cognito token
  - Finds the user's dwelling
  - Enriches the dwelling data with:
    - Room count
    - Total item count
    - Total cost of items
    - Currency of items

2. room/thumbnail.js
   - S3 bucket for images
   - Environment variables for thumbnail specs (width, height, quality)
   - IAM permissions for S3 read/write
   - Database table field for image URLs

3. LISTS
  1. LIST DWELLINGS
     1. Input:
        - sub_id (for standard users)
        - isAdmin flag (for admin to see all)
      2. Output:
        - dwelling details
        - count of rooms
        - total items
        - total value
  2. LIST ROOMs
        1. Input:
        - dwelling_id (required)
        - sub_id (for validation)
        1. Optional Input:
        - sort (by name, type)
        1. Output:
        - room details
        - count of items per room
        - value of items per room
  3. LIST ITEMS
        1. Input:
        - room_id (required)
        - sub_id (for validation)
        1. Optional Input:
        - sort (by name, price, date)
        - filter (by type, price range)
        1. Output:
        - item details
        - total value for filtered items
  4. Search All
        1. Input:
        - sub_id (for scope)
        - search_term
        - entity_type (optional: 'dwelling', 'room', 'item')
        1. Optional Input:
        - price_range
        - date_range
        1. Output:
        - matching entities with type indicator
        - grouped by entity type


| Ref  | Path / Filename                               |
| :--- | :-------------------------------------------- |
|      |                                               |
|      | ./handlers/dwelling/create/batch-create.js    |
|      | ./handlers/dwelling/create/create.js          |
|      | ./handlers/dwelling/delete/delete.js          |
|      | ./handlers/dwelling/get/get-self.js           |
|      | ./handlers/dwelling/get/get.js                |
|      | ./handlers/dwelling/list/list.js              |
|      | ./handlers/dwelling/update/update.js          |
| ---  | ----                                          |
|      | ./handlers/item/create/batch-create.js        |
|      | ./handlers/item/create/create.js              |
|      | ./handlers/item/delete/delete.js              |
|      | ./handlers/item/get/get.js                    |
|      | ./handlers/item/list/list.js                  |
|      | ./handlers/item/update/update.js              |
| ---  | ----                                          |
|      | ./handlers/room/create/batch-create.js        |
|      | ./handlers/room/create/create.js              |
|      | ./handlers/room/delete/delete.js              |
|      | ./handlers/room/get/get.js                    |
|      | ./handlers/room/list/list.js                  |
|      | ./handlers/room/thumbnail/thumbnail.js        |
|      | ./handlers/room/update/update.js              |
| ---  | ----                                          |
|      | ./handlers/search/search.js                   |
|      | ./handlers/search/stream.js                   |
|      | ./handlers/search/suggest.js                  |
| ---  | ----                                          |
|      | ./handlers/test/clear-user-data.js            |
|      | ./handlers/test/create-test-data.js           |
|      | ./handlers/test/get-or-create.js              |
| ---  | ----                                          |
|      | ./handlers/user/login                         |
|      | ./handlers/user/refresh                       |
|      | ./handlers/user/login/login.js                |
|      | ./handlers/user/refresh/invalidate-refresh.js |
|      | ./handlers/user/refresh/refresh.js            |
| ---  | ----                                          |
|      | ./utils/305_fnd_dbAccess_wp.js                |
|      | ./utils/315_fnd_secretsAccess_wp.js           |
|      | ./utils/320_fnu_logHandler_wp.js              |
|      | ./utils/350_fnu_environmentVariables_wp.js    |
| ---  | ----                                          |
|      | ./utils/lib/Callbacker.js                     |
|      | ./utils/lib/index.js                          |


##### New Proposed Services and Data Structure

###### Data Structure:
```json
// Dwelling record
{
  "PK": "SUB#123e4567-e89b-12d3-a456-426614174000",
  "SK": "DWELLING#2ee27c70-f5ff-11e7-9fa8-9b57e8cfe7bb",
  "type": "dwelling",
  "dwellingId": "2ee27c70-f5ff-11e7-9fa8-9b57e8cfe7bb",
  "sub_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Outlook",
  "address": {
    "line1": "51 Queen Anne Street",
    "line2": "London",
    "city": "London",
    "postCode": "SW1 2NB"
  },
  "roomCount": 1,
  "dwellingType": "House",
  "created": "2018-01-10T12:10:01.016Z",
  "updated": "2018-04-10T14:34:39.625Z"
}

// Room record
{
  "PK": "SUB#123e4567-e89b-12d3-a456-426614174000",
  "SK": "ROOM#998a7a60-f4a5-11e7-a21f-0d367e20621a",
  "type": "room",
  "roomId": "998a7a60-f4a5-11e7-a21f-0d367e20621a",
  "dwellingId": "2ee27c70-f5ff-11e7-9fa8-9b57e8cfe7bb",
  "sub_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Bedroom",
  "roomType": "Bedroom",
  "imageUrl": "room_998a7a60-f4a5-11e7-a21f-0d367e20621a.jpg",
  "created": "2018-01-08T18:56:14.086Z",
  "updated": "2018-01-30T17:40:15.376Z"
}

// Item record
{
  "PK": "SUB#123e4567-e89b-12d3-a456-426614174000",
  "SK": "ITEM#097e4b80-447e-11e8-afce-e583e9b0d13f",
  "type": "item",
  "itemId": "097e4b80-447e-11e8-afce-e583e9b0d13f",
  "roomId": "1d2e54a0-4478-11e8-8689-052c1b07e549",
  "sub_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Television",
  "details": {
    "brand": "LG",
    "model": "HD",
    "serialNumber": "hgsjhgdsalhd887987239372"
  },
  "price": {
    "amount": 250,
    "currency": "GBP"
  },
  "quantity": 1,
  "retailer": "Richer Sounds",
  "created": "2018-04-20T09:34:35.064Z",
  "updated": "2018-04-20T09:34:35.064Z"
}

```

###### Services:
```bash
/src
  /utils
    data.js                # DynamoDB operations
    secrets.js             # AWS Secrets Manager
    environment.js         # Environment vars
    responses.js          # HTTP responses
    validation.js         # Input validation
    imageProcessor.js     # Image handling    
  /services
    /dwelling
      handler.js          # Single handler for all dwelling CRUD
    /room
      handler.js          # Single handler for all room CRUD
      process-image.js    # Image processing (separate due to S3 trigger)    
    /item
      handler.js          # Single handler for all item CRUD
    /search
      handler.js          # Global search functionality
    /user
      get-self.js        # User-specific operations
    /services
    /list
      handler.js         #(Single consolidated list service for ADMIN)
```








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
