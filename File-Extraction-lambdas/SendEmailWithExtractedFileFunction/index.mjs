import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import axios from 'axios';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'; // Import Secrets Manager client

const s3Client = new S3Client();
const snsClient = new SNSClient();
const secretsManagerClient = new SecretsManagerClient({ region: 'us-east-1' }); // Use your desired region

// Function to get the Bitly access token from Secrets Manager
async function getBitlyAccessToken() {
  const secretName = 'bitly_access_token'; // Name of the secret in Secrets Manager
  try {
    const data = await secretsManagerClient.send(new GetSecretValueCommand({ SecretId: secretName }));
    if (data.SecretString) {
      const secret = JSON.parse(data.SecretString);
      return secret.BITLY_ACCESS_TOKEN; // Assuming the token is stored as a JSON key named BITLY_ACCESS_TOKEN
    } else {
      throw new Error("Secret value is empty or not a string.");
    }
  } catch (error) {
    console.error("Error retrieving Bitly access token:", error);
    throw new Error("Failed to retrieve Bitly access token from Secrets Manager.");
  }
}

// Function to generate a presigned URL for the S3 object
async function generatePresignedUrl(bucketName, objectKey) {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey, ResponseContentDisposition: "attachment" });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
}

// Function to shorten a URL using Bitly
async function shortenUrl(longUrl, bitlyAccessToken) {
  try {
    const response = await axios.post(
      `https://api-ssl.bitly.com/v4/shorten`,
      {
        long_url: longUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${bitlyAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.link; // Return the shortened URL
  } catch (error) {
    console.error("Error shortening URL:", error);
    return longUrl; // Fallback: return the original URL if shortening fails
  }
}

export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event));

  const bucketName = process.env.PROCESSED_BUCKET_NAME || event.Records[0].s3.bucket.name;
  const fileName = event.Records[0].s3.object.key; // The S3 object key (e.g., "processed/testfile.png.txt")

  // Extract the base file name without the extension (to construct the txt and csv file names)
  const baseFileName = fileName.split('/').pop(); // e.g., "testfile.png.txt"
  const fileExtension = baseFileName.split('.').pop(); // e.g., "txt"
  const nameWithoutExtension = baseFileName.replace(`.${fileExtension}`, ""); // e.g., "testfile.png"

  // Construct the keys for the .txt and .csv files
  const txtFileKey = `processed/${nameWithoutExtension}.txt`;  // e.g., "processed/testfile.png.txt"
  const csvFileKey = `processed/${nameWithoutExtension}.csv`; // e.g., "processed/testfile.png.csv"

  try {
    // Retrieve the Bitly access token from Secrets Manager
    const bitlyAccessToken = await getBitlyAccessToken();

    // Generate pre-signed URLs for the .txt and .csv files
    const txtUrl = await generatePresignedUrl(bucketName, txtFileKey);
    const csvUrl = await generatePresignedUrl(bucketName, csvFileKey);

    console.log(`Generated pre-signed URLs: ${txtUrl}, ${csvUrl}`);

    // Shorten the URLs using Bitly
    const shortTxtUrl = await shortenUrl(txtUrl, bitlyAccessToken);
    const shortCsvUrl = await shortenUrl(csvUrl, bitlyAccessToken);

    console.log(`Shortened URLs: ${shortTxtUrl}, ${shortCsvUrl}`);

    // Prepare the SNS message
    const snsMessage = {
      email: `
      Your document has been processed successfully. You can download the files using the links below:

      Text File: ${shortTxtUrl}
      CSV File: ${shortCsvUrl}

      The links will expire in 1 hour.
    `,
    };

    // SNS parameters for the message
    const snsParams = {
      TopicArn: process.env.SNS_TOPIC_ARN, // SNS Topic ARN (configured in environment variables)
      Message: snsMessage.email, // The message content
      MessageStructure: "string", // The message structure (JSON format)
    };

    // Publish the SNS message
    await snsClient.send(new PublishCommand(snsParams));
    console.log("SNS notification sent with download links.");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "SNS notification sent successfully." }),
    };
  } catch (error) {
    console.error("Error processing the request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process the request." }),
    };
  }
};
