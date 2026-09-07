import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { getAzureConnectionString, getAzureContainer } from "@/lib/env";

const getBlobServiceClient = (): BlobServiceClient => {
  const connectionString = getAzureConnectionString();
  return BlobServiceClient.fromConnectionString(connectionString);
};

/**
 * Parse a value out of an Azure Storage connection string. Connection strings
 * are semicolon-delimited `Key=Value` pairs, e.g.
 * `DefaultEndpointsProtocol=https;AccountName=acct;AccountKey=abc==;...`.
 */
const getConnectionStringValue = (
  connectionString: string,
  key: string
): string | undefined => {
  for (const segment of connectionString.split(";")) {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const currentKey = segment.slice(0, separatorIndex).trim();
    if (currentKey.toLowerCase() === key.toLowerCase()) {
      return segment.slice(separatorIndex + 1).trim();
    }
  }
  return undefined;
};

export const uploadVideoToAzure = async (
  file: File,
  containerName: string = getAzureContainer()
): Promise<{ url: string; blobName: string }> => {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create container if it doesn't exist
    await containerClient.createIfNotExists({
      access: "blob",
    });

    // Generate unique blob name
    const blobName = `movies/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload file
    const buffer = await file.arrayBuffer();
    const blobOptions = {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    };

    await blockBlobClient.upload(buffer, file.size, blobOptions);

    // Return URL
    const url = blockBlobClient.url;
    return { url, blobName };
  } catch (error) {
    console.error("Error uploading to Azure Blob Storage:", error);
    throw new Error("Failed to upload video");
  }
};

export const deleteVideoFromAzure = async (
  blobName: string,
  containerName: string = getAzureContainer()
): Promise<boolean> => {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    return true;
  } catch (error) {
    console.error("Error deleting from Azure Blob Storage:", error);
    return false;
  }
};

/**
 * Generate a read-only SAS URL for a blob using the correct
 * @azure/storage-blob API: build a StorageSharedKeyCredential from the account
 * name and account key, then sign SAS query parameters with
 * generateBlobSASQueryParameters + BlobSASPermissions.
 *
 * The account name is sourced from AZURE_STORAGE_ACCOUNT_NAME (falling back to
 * the AccountName in the connection string) and the account key is parsed out
 * of the connection string. Reads env/config lazily; never throws at import
 * time.
 */
export const generateSasToken = async (
  containerName: string,
  blobName: string,
  expiryHours: number = 24
): Promise<string> => {
  const connectionString = getAzureConnectionString();

  const accountName =
    process.env.AZURE_STORAGE_ACCOUNT_NAME ||
    getConnectionStringValue(connectionString, "AccountName");
  const accountKey = getConnectionStringValue(connectionString, "AccountKey");

  if (!accountName) {
    throw new Error(
      "Azure storage account name is not configured (set AZURE_STORAGE_ACCOUNT_NAME or include AccountName in the connection string)"
    );
  }
  if (!accountKey) {
    throw new Error(
      "Azure storage account key could not be found in the connection string"
    );
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiryHours * 60 * 60 * 1000);

  const sasQueryParameters = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
    },
    sharedKeyCredential
  );

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  return `${blobClient.url}?${sasQueryParameters.toString()}`;
};
