const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

// Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

async function uploadToAzure(containerName, blobName, buffer) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer);
    return blockBlobClient.url;
}

function generateSASToken(containerName, blobName) {
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 1); // Token expires in 1 hour

    const sasToken = generateBlobSASQueryParameters({
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse("r"), // Read permission
        startsOn: new Date(),
        expiresOn
    }, sharedKeyCredential).toString();

    return sasToken;
}

module.exports = { uploadToAzure, generateSASToken };
