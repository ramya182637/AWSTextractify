import { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from "@aws-sdk/client-textract";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const textractClient = new TextractClient();
const s3Client = new S3Client();

export const handler = async (event) => {
  const bucketName = event.Records[0].s3.bucket.name;
  const fileName = event.Records[0].s3.object.key;

  // Skip processing if the file is not in the 'incoming/' folder
  if (!fileName.startsWith('incoming/')) {
    console.log("File is not in the 'incoming/' folder, skipping.");
    return;
  }

  try {
    // Start Textract text detection
    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: { S3Object: { Bucket: bucketName, Name: fileName } },
    });
    const textractResponse = await textractClient.send(startCommand);
    const jobId = textractResponse.JobId;
    console.log("Textract processing started for:", fileName);

    let jobStatus;
    let textractResult;
    do {
      const getJobResultsCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
      const jobResults = await textractClient.send(getJobResultsCommand);
      jobStatus = jobResults.JobStatus;
      console.log("Textract job status:", jobStatus);

      if (jobStatus === "IN_PROGRESS") {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      } else if (jobStatus === "SUCCEEDED") {
        textractResult = jobResults.Blocks.filter(block => block.BlockType === "LINE").map(block => block.Text).join('\n');
      }
    } while (jobStatus === "IN_PROGRESS");

    if (jobStatus !== "SUCCEEDED") {
      throw new Error(`Textract job failed with status: ${jobStatus}`);
    }

    // Store processed files in the 'processed/' folder
    const processedFileNameText = fileName.replace("incoming/", "processed/") + ".txt";
    const processedFileNameCsv = fileName.replace("incoming/", "processed/") + ".csv";

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: processedFileNameText,
      Body: textractResult,
      ContentType: 'text/plain',
    }));

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: processedFileNameCsv,
      Body: textractResult.split('\n').map(line => `"${line.replace(/"/g, '""')}"`).join('\n'),
      ContentType: 'text/csv',
    }));

    console.log(`Processed files saved at: ${processedFileNameText} and ${processedFileNameCsv}`);
  } catch (error) {
    console.error("Error processing file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
