# Welcome to hopo-middleware Read Me




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




#### SDLC:

###### Data Structure:

See [Schema](./src/api/schema.graphql)

#### Services
| #    | Type      | Service                                         | Comments / TODO                                  |
| :--- | :-------- | :---------------------------------------------- | :----------------------------------------------- |
|      | api       | /api/open_api.yaml                              |                                                  |
|      | api       | /api/schema.graphql                             | add  `isDeleted:BOOLEAN!`to dwelling, room, item |
|      | resolvers | /resolvers/js-search-resolver.js                |                                                  |
|      | resolvers | /resolvers/dwelling/createDwelling.request.vtl  |                                                  |
|      | resolvers | /resolvers/dwelling/createDwelling.response.vtl |                                                  |
|      | resolvers | /resolvers/dwelling/deleteDwelling.request.vtl  | Revise to PUTITEM TRUE on isDeleted              |
|      | resolvers | /resolvers/dwelling/deleteDwelling.response.vtl |                                                  |
|      | resolvers | /resolvers/dwelling/getDwelling.request.vtl     |                                                  |
|      | resolvers | /resolvers/dwelling/getDwelling.response.vtl    |                                                  |
|      | resolvers | /resolvers/dwelling/js-dwelling-resolvers.js    |                                                  |
|      | resolvers | /resolvers/dwelling/listDwellings.request.vtl   |                                                  |
|      | resolvers | /resolvers/dwelling/listDwellings.response.vtl  |                                                  |
|      | resolvers | /resolvers/dwelling/updateDwelling.request.vtl  |                                                  |
|      | resolvers | /resolvers/dwelling/updateDwelling.response.vtl |                                                  |
|      | resolvers | /resolvers/item/createItem.request.vtl          |                                                  |
|      | resolvers | /resolvers/item/createItem.response.vtl         |                                                  |
|      | resolvers | /resolvers/item/deleteItem.request.vtl          | Missing VTL Code                                 |
|      | resolvers | /resolvers/item/deleteItem.response.vtl         | Missing VTL Code                                 |
|      | resolvers | /resolvers/item/getItem.request.vtl             |                                                  |
|      | resolvers | /resolvers/item/getItem.response.vtl            |                                                  |
|      | resolvers | /resolvers/item/listItems.request.vtl           |                                                  |
|      | resolvers | /resolvers/item/listItems.response.vtl          |                                                  |
|      | resolvers | /resolvers/room/createRoom.request.vtl          |                                                  |
|      | resolvers | /resolvers/room/createRoom.response.vtl         |                                                  |
|      | resolvers | /resolvers/room/deleteRoom.request.vtl          | Missing VTL Code                                 |
|      | resolvers | /resolvers/room/deleteRoom.response.vtl         | Missing VTL Code                                 |
|      | resolvers | /resolvers/room/getRoom.request.vtl             |                                                  |
|      | resolvers | /resolvers/room/getRoom.response.vtl            |                                                  |
|      | resolvers | /resolvers/room/js-room-image-resolver.js       |                                                  |
|      | resolvers | /resolvers/room/listRooms.request.vtl           |                                                  |
|      | resolvers | /resolvers/room/listRooms.response.vtl          |                                                  |
|      | resources | /resources/cognito-config.yml                   |                                                  |
|      | resources | /resources/dynamodb-config.yml                  |                                                  |
|      | resources | /resources/function-configurations.yml          |                                                  |
|      | resources | /resources/mapping-templates.yml                |                                                  |
|      | resources | /resources/s3-config.yml                        |                                                  |
|      | utils     | /utils/calculations.js                          |                                                  |
|      | utils     | /utils/dynamodb.js                              |                                                  |
|      | utils     | /utils/s3.js                                    |                                                  |














# Taken From FDZ

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
## Postman Collection

The repository includes `hopo.postman_collection.json` with sample GraphQL requests.
To use it in Postman:

1. Open Postman and choose **Import**.
2. Select the `hopo.postman_collection.json` file from this project root.
3. Set the environment variable `GRAPHQL_URL` to your deployed AppSync endpoint.
4. Execute any request to test the API.
