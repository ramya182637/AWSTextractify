import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

export const handler = async (event) => {
  const body = JSON.parse(event.body);
  const fileName = body.fileName;
  const email = body.email;

  // Generate pre-signed URL for S3 upload to the 'incoming/' folder
  const s3Client = new S3Client();
  const s3Command = new PutObjectCommand({
    Bucket: process.env.INPUT_BUCKET_NAME,
    Key: `incoming/${fileName}`, // Store in the 'incoming/' folder
    Tagging: `email=${email}`,   // Store the email as a tag on the S3 object
  });
  const s3Response = await getSignedUrl(s3Client, s3Command, {
    expiresIn: 3600,
    unhoistableHeaders: new Set(["x-amz-tagging"]),
  });

  // Optional: Send SNS notification
  const snsClient = new SNSClient();
  const publishParams = {
    TopicArn: process.env.SNS_TOPIC_ARN,
    Message: `A new file has been uploaded: ${fileName}`,
    Subject: 'File Upload Notification',
  };

  try {
    await snsClient.send(new PublishCommand(publishParams));
    return {
      statusCode: 200,
      body: JSON.stringify({
        preSignedURL: s3Response,
        message: 'Pre-signed URL generated and notification sent',
      }),
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
      },
    };
  } catch (error) {
    console.error("Error generating pre-signed URL or sending SNS message:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate URL or send notification' }),
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
      },
    };
  }
};
