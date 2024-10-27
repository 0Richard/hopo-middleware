export const getEnvVars = () => {
  return {
    region: process.env.AWS_REGION || "eu-west-2",
    vpc: process.env.VPC || "",
    stage: process.env.STAGE || "dev",
    wp: process.env.WP || "",
    // TODO: Needs refactor see issue #1
    wp_name: process.env.WP_NAME || "PNPD",
    domainName: process.env.DOMAIN_NAME || "",
    receive_queue_url: process.env.RECEIVE_QUEUE_URL || "",
    receive_queue_message_group_id: process.env.RECEIVE_MESSAGE_GROUP_ID || "testing_receive",
    balance_queue_url: process.env.BALANCE_QUEUE_URL || "",
    balance_queue_message_group_id: process.env.BALANCE_MESSAGE_GROUP_ID || "testing_balance",
    log_level: process.env.LOG_LEVEL || "info",
    awsClientConfig: {},
    userPoolId: process.env.USER_POOL_ID || "",
    currency_table_name: process.env.CURRENCY_TABLE_NAME || "",
    // TODO: Remove CUSTCURRACCOUNT_TABLE_NAME from here once the table is removed
    customer_currency_account_table_name: process.env.CUSTCURRACCOUNT_TABLE_NAME || "",
    customer_table_name: process.env.CUSTOMER_TABLE_NAME || "",
    account_table_name: process.env.ACCOUNT_TABLE_NAME || "",
    customer_account_table_name: process.env.CUSTOMER_ACCOUNT_TABLE_NAME || "",
    account_currency_table_name: process.env.ACCOUNT_CURRENCY_TABLE_NAME || "",
    transaction_table_name: process.env.TRANSACTION_TABLE_NAME || "",
    notification_table_name: process.env.NOTIFICATION_TABLE_NAME || "",
    dlt_wallet_table_name: process.env.DLT_WALLET_TABLE_NAME || "",
    dlt_contract_table_name: process.env.DLT_CONTRACT_TABLE_NAME || "",
    dlt_network_table_name: process.env.DLT_NETWORK_TABLE_NAME || "",
  };
}
